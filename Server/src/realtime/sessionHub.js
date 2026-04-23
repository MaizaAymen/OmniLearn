const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const { ExamSubmission } = require("../models");

// ── Role permission matrix ─────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  host:       { canEdit: true,  canComment: true, canKick: true,  canMute: true,  canChangePermissions: true  },
  "co-host":  { canEdit: true,  canComment: true, canKick: true,  canMute: true,  canChangePermissions: true  },
  editor:     { canEdit: true,  canComment: true, canKick: false, canMute: false, canChangePermissions: false },
  viewer:     { canEdit: false, canComment: true, canKick: false, canMute: false, canChangePermissions: false },
};

const VALID_ROLES         = new Set(["host", "co-host", "editor", "viewer"]);
const VALID_COLLAB_MODES  = new Set(["free", "controlled", "turn-based"]);
const VALID_VISIBILITIES  = new Set(["public", "private", "unlisted"]);
const VALID_IDENTITY      = new Set(["real", "anonymous", "pseudonymous"]);
const VALID_SESSION_TYPES = new Set(["study", "classroom", "exam", "pair"]);
const PERMISSION_KEYS     = ["canEdit", "canComment", "canKick", "canMute", "canChangePermissions"];

// ── Limits & defaults (one place to tweak) ────────────────────────────────
const LIMITS = {
  minParticipants: 1,
  maxParticipants: 200,
  minTurnSeconds:  5,
};

const DEFAULTS = {
  sessionName:     "Untitled Session",
  hostName:        "host",
  maxParticipants: 10,
  visibility:      "public",
  defaultRole:     "editor",
  collabMode:      "free",
  turnDuration:    30,
};

// Clamp a number into [min, max]; if invalid, return fallback.
function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ── #1 Permission matrix ──────────────────────────────────────────────────
// Clients can override the default permission map per-role. Only editor and
// viewer can be overridden (host/co-host stay privileged).
function normalizePermissionOverrides(raw = {}) {
  const out = {};
  for (const role of ["editor", "viewer"]) {
    const src = raw?.[role];
    if (!src || typeof src !== "object") continue;
    out[role] = {};
    for (const key of PERMISSION_KEYS) {
      if (src[key] !== undefined) out[role][key] = Boolean(src[key]);
    }
  }
  return out;
}

// Effective permissions for a role: defaults merged with session overrides.
function effectivePerms(session, role) {
  return { ...(ROLE_PERMISSIONS[role] || {}), ...(session?.permissionOverrides?.[role] || {}) };
}

// ── #8 Identity modes ─────────────────────────────────────────────────────
// Given a real name, produce what a non-teacher viewer should see.
function maskedName(realName, identityMode, index) {
  if (identityMode === "anonymous")    return `Student ${index + 1}`;
  if (identityMode === "pseudonymous") return `User-${String(realName).slice(0, 2).toUpperCase()}${index + 1}`;
  return realName;
}

// Build the default exam block. `enabled: false` means this is a
// normal session; when true, teacher calls exam:start to begin the timer.
function defaultExam(raw = {}) {
  return {
    enabled:             Boolean(raw?.enabled),
    durationMinutes:     clampNumber(raw?.durationMinutes, 1, 300, 30),
    lockLanguage:        raw?.lockLanguage !== false,
    autoSubmitOnTimeout: raw?.autoSubmitOnTimeout !== false,

    // Runtime state (filled in when exam:start fires)
    phase:     "waiting",   // "waiting" | "active" | "ended"
    startedAt: null,
    endsAt:    null,
  };
}

// Build the default collab block. Used by createSession and by any
// future migration that needs to fill in missing fields.
function defaultCollab(raw = {}) {
  return {
    mode:                VALID_COLLAB_MODES.has(raw.mode) ? raw.mode : DEFAULTS.collabMode,
    turnDuration:        clampNumber(raw.turnDuration, LIMITS.minTurnSeconds, 3600, DEFAULTS.turnDuration),
    showLiveCursors:     raw.showLiveCursors  !== false,
    showSelections:      raw.showSelections   !== false,
    typingIndicators:    raw.typingIndicators !== false,
    currentTurnSocketId: null,
    turnStartedAt:       null,
  };
}

// Take the raw client payload and produce a clean, validated config.
// Pure function — no side effects, easy to unit-test.
function normalizeCreateConfig(raw = {}) {
  // #2 Playlist: array of problem IDs. If a single `problemId` is provided,
  // fall back to a one-element playlist.
  const rawIds = Array.isArray(raw.problemIds) && raw.problemIds.length
    ? raw.problemIds
    : (raw.problemId ? [raw.problemId] : []);
  const problemIds = rawIds.map((s) => String(s)).filter(Boolean).slice(0, 50);

  return {
    // Identity
    problemId:   problemIds[0] || raw.problemId,
    problemIds,
    playlistMode: ["free", "sequential"].includes(raw.playlistMode) ? raw.playlistMode : "free",
    name:        (raw.sessionName || DEFAULTS.sessionName).toString().slice(0, 100),
    hostName:    normalizeName(raw.hostName || DEFAULTS.hostName),
    language:    raw.language,
    starterCode: raw.starterCode || "",

    // Access & security
    visibility:          VALID_VISIBILITIES.has(raw.visibility) ? raw.visibility : DEFAULTS.visibility,
    passwordHash:        raw.password ? bcrypt.hashSync(String(raw.password), 8) : "",
    allowAnonymous:      raw.allowAnonymous !== false,
    whitelist:           parseNameList(raw.whitelist),
    blacklist:           parseNameList(raw.blacklist),
    requireJoinApproval: Boolean(raw.requireJoinApproval),
    identityMode:        VALID_IDENTITY.has(raw.identityMode) ? raw.identityMode : "real",  // #8

    // Limits
    maxParticipants: clampNumber(raw.maxParticipants, LIMITS.minParticipants, LIMITS.maxParticipants, DEFAULTS.maxParticipants),
    autoLock:        Boolean(raw.autoLock),
    allowOverflow:   Boolean(raw.allowOverflow),

    // Roles + #1 permission overrides
    defaultRole:         ["editor", "viewer"].includes(raw.defaultRole) ? raw.defaultRole : DEFAULTS.defaultRole,
    permissionOverrides: normalizePermissionOverrides(raw.permissionOverrides),

    // Collaboration
    collab: defaultCollab(raw.collab),

    // Classroom
    teacherMode: Boolean(raw.teacherMode),

    // Exam
    exam: defaultExam(raw.exam),

    // #10 Post-session
    postSession: {
      saveSnapshots:    Boolean(raw.postSession?.saveSnapshots),
      publishSolution:  Boolean(raw.postSession?.publishSolution),
      autoCloseOnEmpty: raw.postSession?.autoCloseOnEmpty !== false,
    },
  };
}

// ── In-memory stores ──────────────────────────────────────────────────────
// { [problemId]: { [sessionId]: session } }
const sessionsByProblem = {};
// socketId → { problemId, sessionId }
const socketToMembership = new Map();
// socketId → { problemId, sessionId }  (waiting room reverse-lookup)
const socketToWaiting = new Map();

// ── Utilities ──────────────────────────────────────────────────────────────
function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function parseNameList(value) {
  const arr = Array.isArray(value)
    ? value
    : String(value || "").split(",").map((v) => v.trim()).filter(Boolean);
  return Array.from(new Set(arr.map(normalizeName).filter(Boolean)));
}

function listAllSessions() {
  return Object.values(sessionsByProblem).flatMap((ps) => Object.values(ps));
}

function isSessionIdTaken(id) {
  return listAllSessions().some((s) => s.id === id);
}

function generateUniqueSessionId() {
  let id;
  do { id = `S-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }
  while (isSessionIdTaken(id));
  return id;
}

function getProblemSessions(problemId) {
  return sessionsByProblem[problemId] || {};
}

function getSessionRoom(problemId, sessionId) {
  return `problem:${problemId}:session:${sessionId}`;
}

function hasPermission(session, socketId, action) {
  const p = session?.participants?.[socketId];
  return p ? Boolean(effectivePerms(session, p.role)[action]) : false;
}

// Real (unmasked) participant list — used for host/co-host viewers.
function buildParticipantList(session) {
  return Object.entries(session.participants).map(([socketId, p]) => ({
    socketId,
    name: p.name,
    role: p.role,
    permissions: effectivePerms(session, p.role),
  }));
}

// #8 Same list but with names masked per `session.identityMode`.
function buildMaskedParticipantList(session) {
  const entries = Object.entries(session.participants);
  return entries.map(([socketId, p], i) => ({
    socketId,
    name: maskedName(p.name, session.identityMode, i),
    role: p.role,
    permissions: effectivePerms(session, p.role),
  }));
}

function buildSessionSummary(session) {
  return {
    id:                 session.id,
    problemId:          session.problemId,
    name:               session.name,
    hostName:           session.hostName,
    participantCount:   Object.keys(session.participants).length,
    waitingCount:       Object.keys(session.waitingRoom).length,
    maxParticipants:    session.maxParticipants,
    visibility:         session.visibility,
    requiresPassword:   Boolean(session.passwordHash),
    locked:             session.locked,
    requireJoinApproval: session.requireJoinApproval,
    collab:             session.collab,
    createdAt:          session.createdAt,
  };
}

function buildSessionList(problemId) {
  return Object.values(getProblemSessions(problemId))
    .filter((s) => s.visibility !== "unlisted")
    .map(buildSessionSummary);
}

function buildGlobalSessionList() {
  return listAllSessions()
    .filter((s) => s.visibility !== "unlisted")
    .map(buildSessionSummary);
}

function broadcastProblemSessionList(io, problemId) {
  io.to(`problem:${problemId}:lobby`).emit("session:list", {
    problemId,
    sessions: buildSessionList(problemId),
  });
}

function broadcastGlobalSessionList(io) {
  io.to("session:global:lobby").emit("session:global:list", {
    sessions: buildGlobalSessionList(),
  });
}

function broadcastSessionLists(io, problemId) {
  if (problemId) broadcastProblemSessionList(io, problemId);
  broadcastGlobalSessionList(io);
}

function broadcastParticipants(io, session) {
  // #8 Teachers (host/co-host) always see real names; everyone else may see
  // masked names depending on `identityMode`. Fast path when mode is "real".
  const realList = buildParticipantList(session);
  if (session.identityMode === "real" || !session.identityMode) {
    io.to(getSessionRoom(session.problemId, session.id)).emit("session:participants", {
      participants:       realList.map((p) => p.name),
      participantDetails: realList,
    });
    return;
  }

  const maskedList = buildMaskedParticipantList(session);
  const realPayload   = { participants: realList.map((p) => p.name),   participantDetails: realList };
  const maskedPayload = { participants: maskedList.map((p) => p.name), participantDetails: maskedList };
  for (const [sid, p] of Object.entries(session.participants)) {
    const payload = (p.role === "host" || p.role === "co-host") ? realPayload : maskedPayload;
    io.sockets.sockets.get(sid)?.emit("session:participants", payload);
  }
}

function broadcastWaitingRoom(io, session) {
  io.to(getSessionRoom(session.problemId, session.id)).emit("session:waiting:update", {
    waiting: Object.values(session.waitingRoom),
  });
}

function findSession(problemId, sessionId) {
  return sessionsByProblem?.[problemId]?.[sessionId] || null;
}

function findSessionById(sessionId) {
  const normalized = String(sessionId || "").trim();
  if (!normalized) return null;
  for (const problemId of Object.keys(sessionsByProblem)) {
    const session = sessionsByProblem[problemId]?.[normalized];
    if (session) return { problemId, session };
  }
  return null;
}

// ── Session lifecycle ─────────────────────────────────────────────────────
function createSession(rawConfig) {
  const cfg = normalizeCreateConfig(rawConfig);
  const { problemId, language, starterCode } = cfg;

  if (!sessionsByProblem[problemId]) sessionsByProblem[problemId] = {};

  const sessionId = generateUniqueSessionId();

  sessionsByProblem[problemId][sessionId] = {
    id:        sessionId,
    problemId,
    name:      cfg.name,
    hostName:  cfg.hostName,

    // #2 Playlist
    problemIds:          cfg.problemIds,
    playlistMode:        cfg.playlistMode,
    currentProblemIndex: 0,

    // Access & security
    visibility:          cfg.visibility,
    passwordHash:        cfg.passwordHash,
    allowAnonymous:      cfg.allowAnonymous,
    whitelist:           cfg.whitelist,
    blacklist:           cfg.blacklist,
    requireJoinApproval: cfg.requireJoinApproval,
    identityMode:        cfg.identityMode,    // #8
    waitingRoom:         {},

    // Limits
    maxParticipants: cfg.maxParticipants,
    autoLock:        cfg.autoLock,
    allowOverflow:   cfg.allowOverflow,
    locked:          false,

    // Roles + #1 overrides
    defaultRole:         cfg.defaultRole,
    permissionOverrides: cfg.permissionOverrides,

    // #10 Post-session
    postSession: cfg.postSession,

    // Collaboration
    collab: cfg.collab,

    // Workspace
    participants:   {},
    codeByLanguage: { [language]: starterCode },
    drawStrokes:    [],
    tldrawStore:    {},
    studentWork:    {},
    teacherMode:    cfg.teacherMode,

    // Exam
    exam:         cfg.exam,
    _examTimer:   null,   // setTimeout handle; not serialized to clients

    createdAt:    Date.now(),
  };

  return sessionsByProblem[problemId][sessionId];
}

function addParticipant(session, socketId, userName, role) {
  session.participants[socketId] = { name: userName, role };
  if (!session.studentWork) session.studentWork = {};
  if (!session.studentWork[socketId]) session.studentWork[socketId] = { code: "", tldrawStore: {} };

  // Auto-lock when full
  if (
    session.autoLock &&
    !session.locked &&
    Object.keys(session.participants).length >= session.maxParticipants
  ) {
    session.locked = true;
  }

  // Bootstrap turn-based
  if (session.collab.mode === "turn-based" && !session.collab.currentTurnSocketId) {
    session.collab.currentTurnSocketId = socketId;
    session.collab.turnStartedAt = Date.now();
  }
}

function removeMembership(socketId) {
  const member = socketToMembership.get(socketId);
  if (!member) return null;

  const { problemId, sessionId } = member;
  const session = findSession(problemId, sessionId);

  if (session) {
    delete session.participants[socketId];
    if (session.studentWork) delete session.studentWork[socketId];

    // Unlock if no longer at capacity
    if (session.locked && !session.allowOverflow) {
      if (Object.keys(session.participants).length < session.maxParticipants) {
        session.locked = false;
      }
    }

    const entries = Object.entries(session.participants);

    if (entries.length === 0) {
      // Cancel any pending exam timer so it doesn't fire on an orphan session
      if (session._examTimer) {
        clearTimeout(session._examTimer);
        session._examTimer = null;
      }
      // #10 Post-session: save final snapshots if requested (and not already
      // captured by endExam). Fire-and-forget — removeMembership is sync.
      if (session.postSession?.saveSnapshots && !session._snapshotsSaved) {
        flushFinalSnapshots(session).catch((err) =>
          console.error("post-session snapshot save failed:", err.message)
        );
      }
      delete sessionsByProblem[problemId][sessionId];
      if (Object.keys(sessionsByProblem[problemId]).length === 0) {
        delete sessionsByProblem[problemId];
      }
    } else {
      // Promote a new host if the host left
      const hasHost = entries.some(([, p]) => p.role === "host");
      if (!hasHost) {
        const newHost =
          entries.find(([, p]) => p.role === "co-host") ||
          entries.find(([, p]) => p.role === "editor") ||
          entries[0];
        if (newHost) newHost[1].role = "host";
      }

      // Advance turn if it was the leaver's turn
      if (session.collab.currentTurnSocketId === socketId) {
        const ids = Object.keys(session.participants);
        session.collab.currentTurnSocketId = ids[0] ?? null;
        session.collab.turnStartedAt = ids[0] ? Date.now() : null;
      }
    }
  }

  socketToMembership.delete(socketId);
  return { problemId, sessionId };
}

function removeFromWaiting(socketId) {
  const entry = socketToWaiting.get(socketId);
  if (!entry) return null;
  const session = findSession(entry.problemId, entry.sessionId);
  if (session) delete session.waitingRoom[socketId];
  socketToWaiting.delete(socketId);
  return entry;
}

// ── Build shared session payload (used in create + join acks) ─────────────
function buildSessionPayload(session) {
  return {
    id:             session.id,
    problemId:      session.problemId,
    problemIds:         session.problemIds,            // #2
    playlistMode:       session.playlistMode,          // #2
    currentProblemIndex: session.currentProblemIndex,  // #2
    name:           session.name,
    hostName:       session.hostName,
    visibility:     session.visibility,
    maxParticipants: session.maxParticipants,
    locked:         session.locked,
    requireJoinApproval: session.requireJoinApproval,
    allowAnonymous: session.allowAnonymous,
    identityMode:   session.identityMode,              // #8
    collab:         session.collab,
    defaultRole:    session.defaultRole,
    permissionOverrides: session.permissionOverrides,  // #1
    codeByLanguage: session.codeByLanguage,
    drawStrokes:    session.drawStrokes,
    tldrawStore:    session.tldrawStore,
    teacherMode:    Boolean(session.teacherMode),
    exam:           publicExam(session.exam),
    postSession:    session.postSession,               // #10
  };
}

// Strip non-serializable fields before sending exam state to clients.
function publicExam(exam) {
  if (!exam) return null;
  return {
    enabled:         exam.enabled,
    durationMinutes: exam.durationMinutes,
    lockLanguage:    exam.lockLanguage,
    phase:           exam.phase,
    startedAt:       exam.startedAt,
    endsAt:          exam.endsAt,
  };
}

// ── Exam helpers ──────────────────────────────────────────────────────────

// Save one row per student's current code and emit exam:ended.
// Called by the timer or if the teacher ends the exam early.
async function endExam(io, session, reason = "timed-out") {
  if (!session?.exam || session.exam.phase === "ended") return;

  session.exam.phase = "ended";
  if (session._examTimer) {
    clearTimeout(session._examTimer);
    session._examTimer = null;
  }

  const startedAt = session.exam.startedAt || Date.now();
  const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

  // Snapshot each participant who has a studentWork buffer
  const rows = [];
  for (const [socketId, participant] of Object.entries(session.participants)) {
    // Skip the host/co-host — they aren't sitting the exam
    if (participant.role === "host" || participant.role === "co-host") continue;

    const work = session.studentWork?.[socketId] || { code: "" };
    rows.push({
      sessionId:       session.id,
      problemId:       session.problemId || null,
      studentSocketId: socketId,
      studentName:     participant.name,
      userId:          participant.userId || null,
      code:            work.code || "",
      language:        Object.keys(session.codeByLanguage || {})[0] || null,
      finalStatus:     reason,   // "timed-out" | "submitted" | "abandoned"
      durationSeconds,
    });
  }

  if (rows.length > 0) {
    try {
      await ExamSubmission.bulkCreate(rows);
      session._snapshotsSaved = true;  // #10: don't double-save in post-session
    } catch (err) {
      console.error("ExamSubmission save failed:", err.message);
    }
  }

  io.to(getSessionRoom(session.problemId, session.id)).emit("exam:ended", {
    reason,
    endedAt: Date.now(),
    count:   rows.length,
  });
}

// #10 Post-session: at close time, snapshot every student's final buffer into
// ExamSubmission (reusing the same audit table). Separate from endExam so
// non-exam sessions can opt in too.
async function flushFinalSnapshots(session) {
  const rows = [];
  for (const [socketId, participant] of Object.entries(session.participants || {})) {
    if (participant.role === "host" || participant.role === "co-host") continue;
    const work = session.studentWork?.[socketId] || { code: "" };
    rows.push({
      sessionId:       session.id,
      problemId:       session.problemId || null,
      studentSocketId: socketId,
      studentName:     participant.name,
      userId:          participant.userId || null,
      code:            work.code || "",
      language:        Object.keys(session.codeByLanguage || {})[0] || null,
      finalStatus:     "abandoned",   // session just closed, not explicitly submitted
      durationSeconds: Math.floor((Date.now() - (session.createdAt || Date.now())) / 1000),
    });
  }
  if (rows.length > 0) await ExamSubmission.bulkCreate(rows);
}

// ── Socket.IO setup ───────────────────────────────────────────────────────
function setupSessionHub(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {

    // ── Global lobby ──────────────────────────────────────────────────────
    socket.on("session:global:list:subscribe", () => {
      if (socket.data.currentGlobalLobby !== "session:global:lobby") {
        socket.join("session:global:lobby");
        socket.data.currentGlobalLobby = "session:global:lobby";
      }
      socket.emit("session:global:list", { sessions: buildGlobalSessionList() });
    });

    // ── Problem lobby ─────────────────────────────────────────────────────
    socket.on("session:list:subscribe", ({ problemId }) => {
      if (!problemId) return;
      const lobbyRoom = `problem:${problemId}:lobby`;
      if (socket.data.currentLobby && socket.data.currentLobby !== lobbyRoom) {
        socket.leave(socket.data.currentLobby);
      }
      socket.join(lobbyRoom);
      socket.data.currentLobby = lobbyRoom;
      socket.emit("session:list", { problemId, sessions: buildSessionList(problemId) });
    });

    // ── Create session (auto-joins creator as host) ───────────────────────
    socket.on("session:create", (payload = {}, ack) => {
      if (!payload.problemId || !payload.language) {
        return ack?.({ ok: false, message: "Missing problemId or language" });
      }

      const session = createSession(payload);
      const { problemId } = session;

      // Leave any previous session
      const old = removeMembership(socket.id);
      if (old?.problemId) socket.leave(getSessionRoom(old.problemId, old.sessionId));
      removeFromWaiting(socket.id);

      // Join as host. session.hostName is lowercase (for matching); the
      // participant entry keeps the original casing for display.
      const displayHostName = String(payload.hostName || "Host").trim() || "Host";
      addParticipant(session, socket.id, displayHostName, "host");
      socket.join(getSessionRoom(problemId, session.id));
      socketToMembership.set(socket.id, { problemId, sessionId: session.id });

      broadcastSessionLists(io, problemId);

      ack?.({
        ok:             true,
        sessionId:      session.id,
        userRole:       "host",
        userPermission: "editable",
        session:        buildSessionPayload(session),
      });
    });

    // ── Join session ──────────────────────────────────────────────────────
    socket.on("session:join", (payload, ack) => {
      const { problemId: givenProblemId, sessionId, userName, password } = payload || {};

      let problemId = givenProblemId;
      let session = findSession(problemId, sessionId);

      if (!session && sessionId) {
        const found = findSessionById(sessionId);
        if (found) { problemId = found.problemId; session = found.session; }
      }

      if (!session) return ack?.({ ok: false, message: "Session not found" });

      const safeUser      = (userName || "Guest").trim() || "Guest";
      const normalizedUser = normalizeName(safeUser);

      // Blacklist
      if (session.blacklist.length > 0 && session.blacklist.includes(normalizedUser)) {
        return ack?.({ ok: false, message: "You are banned from this session" });
      }

      // Anonymous guard
      if (!session.allowAnonymous && normalizedUser.startsWith("guest")) {
        return ack?.({ ok: false, message: "Anonymous users are not allowed in this session" });
      }

      // Whitelist
      if (
        session.whitelist.length > 0 &&
        normalizedUser !== session.hostName &&
        !session.whitelist.includes(normalizedUser)
      ) {
        return ack?.({ ok: false, message: "You are not on the allowed users list" });
      }

      // Password
      if (session.passwordHash && !bcrypt.compareSync(String(password || ""), session.passwordHash)) {
        return ack?.({ ok: false, message: "Wrong session password" });
      }

      // Capacity
      const count = Object.keys(session.participants).length;
      if (session.locked && !session.allowOverflow) {
        return ack?.({ ok: false, message: "Session is locked" });
      }
      if (!session.allowOverflow && count >= session.maxParticipants) {
        return ack?.({ ok: false, message: "Session is full" });
      }

      // Waiting room (skip for host)
      const isHost = normalizedUser === session.hostName;
      if (session.requireJoinApproval && !isHost) {
        session.waitingRoom[socket.id] = {
          socketId:    socket.id,
          name:        safeUser,
          requestedAt: Date.now(),
        };
        socketToWaiting.set(socket.id, { problemId, sessionId: session.id });
        socket.emit("session:waiting:placed", { sessionId: session.id, sessionName: session.name });
        broadcastWaitingRoom(io, session);
        return ack?.({ ok: true, waiting: true, message: "Waiting for host approval" });
      }

      // All checks passed — perform join
      const old = removeMembership(socket.id);
      if (old?.problemId) {
        socket.leave(getSessionRoom(old.problemId, old.sessionId));
        broadcastSessionLists(io, old.problemId);
      }
      removeFromWaiting(socket.id);

      const role = isHost ? "host" : session.defaultRole;
      addParticipant(session, socket.id, safeUser, role);
      socket.join(getSessionRoom(problemId, session.id));
      socketToMembership.set(socket.id, { problemId, sessionId: session.id });

      broadcastParticipants(io, session);
      broadcastSessionLists(io, problemId);

      ack?.({
        ok:             true,
        waiting:        false,
        userRole:       role,
        userPermission: ROLE_PERMISSIONS[role]?.canEdit ? "editable" : "read-only",
        session:        buildSessionPayload(session),
      });
    });

    // ── Approve waiting user ──────────────────────────────────────────────
    socket.on("session:waiting:approve", ({ socketId: targetId } = {}, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canKick")) {
        return ack?.({ ok: false, message: "No permission to approve users" });
      }

      const entry = session.waitingRoom[targetId];
      if (!entry) return ack?.({ ok: false, message: "User not in waiting room" });

      // Re-check capacity
      const count = Object.keys(session.participants).length;
      if (!session.allowOverflow && count >= session.maxParticipants) {
        io.sockets.sockets.get(targetId)?.emit("session:waiting:rejected", { reason: "Session is now full" });
        delete session.waitingRoom[targetId];
        socketToWaiting.delete(targetId);
        broadcastWaitingRoom(io, session);
        return ack?.({ ok: false, message: "Session full" });
      }

      delete session.waitingRoom[targetId];
      socketToWaiting.delete(targetId);

      const role = session.defaultRole;
      addParticipant(session, targetId, entry.name, role);

      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.join(getSessionRoom(mem.problemId, mem.sessionId));
        socketToMembership.set(targetId, { problemId: mem.problemId, sessionId: mem.sessionId });
        targetSocket.emit("session:waiting:approved", {
          userRole:       role,
          userPermission: ROLE_PERMISSIONS[role]?.canEdit ? "editable" : "read-only",
          session:        buildSessionPayload(session),
        });
      }

      broadcastParticipants(io, session);
      broadcastWaitingRoom(io, session);
      broadcastSessionLists(io, mem.problemId);
      ack?.({ ok: true });
    });

    // ── Reject waiting user ───────────────────────────────────────────────
    socket.on("session:waiting:reject", ({ socketId: targetId, reason } = {}, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canKick")) {
        return ack?.({ ok: false, message: "No permission to reject users" });
      }

      const entry = session.waitingRoom[targetId];
      if (!entry) return ack?.({ ok: false, message: "User not in waiting room" });

      delete session.waitingRoom[targetId];
      socketToWaiting.delete(targetId);
      io.sockets.sockets.get(targetId)?.emit("session:waiting:rejected", {
        reason: reason || "Request denied by host",
      });

      broadcastWaitingRoom(io, session);
      ack?.({ ok: true });
    });

    // ── Change participant role ────────────────────────────────────────────
    socket.on("session:role:change", ({ socketId: targetId, newRole } = {}, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canChangePermissions")) {
        return ack?.({ ok: false, message: "No permission to change roles" });
      }

      if (!VALID_ROLES.has(newRole) || newRole === "host") {
        return ack?.({ ok: false, message: "Invalid target role" });
      }

      const target = session.participants[targetId];
      if (!target) return ack?.({ ok: false, message: "User not in session" });
      if (target.role === "host") return ack?.({ ok: false, message: "Cannot demote the host" });

      target.role = newRole;

      io.sockets.sockets.get(targetId)?.emit("session:role:changed", {
        newRole,
        userPermission: ROLE_PERMISSIONS[newRole]?.canEdit ? "editable" : "read-only",
      });

      broadcastParticipants(io, session);
      ack?.({ ok: true });
    });

    // ── Update collab settings ────────────────────────────────────────────
    socket.on("session:collab:update", (payload, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canChangePermissions")) {
        return ack?.({ ok: false, message: "No permission to change settings" });
      }

      const { mode, turnDuration, showLiveCursors, showSelections, typingIndicators } = payload || {};
      const c = session.collab;

      if (mode !== undefined && VALID_COLLAB_MODES.has(mode)) c.mode = mode;
      if (turnDuration !== undefined) c.turnDuration = Math.max(5, Number(turnDuration) || 30);
      if (showLiveCursors !== undefined) c.showLiveCursors = Boolean(showLiveCursors);
      if (showSelections !== undefined) c.showSelections = Boolean(showSelections);
      if (typingIndicators !== undefined) c.typingIndicators = Boolean(typingIndicators);

      io.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("session:collab:updated", {
        collab: session.collab,
      });
      ack?.({ ok: true, collab: session.collab });
    });

    // ── Update post-creation session settings (host only) ─────────────────
    socket.on("session:settings:update", (payload, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canChangePermissions")) {
        return ack?.({ ok: false, message: "No permission to change settings" });
      }

      const { name, teacherMode, locked, requireJoinApproval, maxParticipants, visibility } = payload || {};

      if (typeof name === "string" && name.trim())   session.name = name.trim().slice(0, 100);
      if (teacherMode !== undefined)                 session.teacherMode = Boolean(teacherMode);
      if (locked !== undefined)                      session.locked = Boolean(locked);
      if (requireJoinApproval !== undefined)         session.requireJoinApproval = Boolean(requireJoinApproval);
      if (maxParticipants !== undefined)             session.maxParticipants = Math.max(1, Math.min(200, Number(maxParticipants) || session.maxParticipants));
      if (visibility !== undefined && VALID_VISIBILITIES.has(visibility)) session.visibility = visibility;

      const updated = {
        name:                session.name,
        teacherMode:         Boolean(session.teacherMode),
        locked:              session.locked,
        requireJoinApproval: session.requireJoinApproval,
        maxParticipants:     session.maxParticipants,
        visibility:          session.visibility,
      };

      io.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("session:settings:updated", updated);
      broadcastSessionLists(io, mem.problemId);
      ack?.({ ok: true, settings: updated });
    });

    // ── Exam: teacher starts the timer ────────────────────────────────────
    socket.on("exam:start", (_payload, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canChangePermissions")) {
        return ack?.({ ok: false, message: "Only the host can start an exam" });
      }
      if (!session.exam?.enabled) {
        return ack?.({ ok: false, message: "Exam mode is not enabled for this session" });
      }
      if (session.exam.phase !== "waiting") {
        return ack?.({ ok: false, message: "Exam has already started or ended" });
      }

      const now = Date.now();
      const durationMs = session.exam.durationMinutes * 60 * 1000;

      session.exam.phase     = "active";
      session.exam.startedAt = now;
      session.exam.endsAt    = now + durationMs;

      // Server-side timer — the only clock that matters
      session._examTimer = setTimeout(() => {
        endExam(io, session, "timed-out");
      }, durationMs);

      io.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("exam:state", {
        exam: publicExam(session.exam),
      });
      ack?.({ ok: true, exam: publicExam(session.exam) });
    });

    // ── Exam: teacher ends early ──────────────────────────────────────────
    socket.on("exam:end", async (_payload, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canChangePermissions")) {
        return ack?.({ ok: false, message: "Only the host can end the exam" });
      }

      await endExam(io, session, "submitted");
      ack?.({ ok: true });
    });

    // ── #2 Playlist: advance to the next problem (host-only) ──────────────
    socket.on("session:problem:advance", ({ index } = {}, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canChangePermissions")) {
        return ack?.({ ok: false, message: "Only the host can change the problem" });
      }

      const ids = session.problemIds || [];
      if (ids.length < 2) return ack?.({ ok: false, message: "No more problems in playlist" });

      // "sequential" advances by 1; "free" jumps to a specific index.
      let next;
      if (session.playlistMode === "sequential") {
        next = session.currentProblemIndex + 1;
        if (next >= ids.length) return ack?.({ ok: false, message: "Playlist finished" });
      } else {
        next = Number.isInteger(index) ? index : session.currentProblemIndex + 1;
        if (next < 0 || next >= ids.length) return ack?.({ ok: false, message: "Invalid playlist index" });
      }

      session.currentProblemIndex = next;
      session.problemId           = ids[next];
      session.codeByLanguage      = {};                  // fresh workspace
      session.studentWork         = {};

      io.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("session:problem:changed", {
        index:     next,
        problemId: ids[next],
      });
      ack?.({ ok: true, index: next, problemId: ids[next] });
    });

    // ── #3 Mid-session mode transition (host-only) ────────────────────────
    // Re-applies server defaults for the given type without recreating the
    // session, so collab mode / teacher mode / exam enablement can flip live.
    socket.on("session:mode:transition", ({ type } = {}, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false, message: "Not in a session" });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false, message: "Session not found" });
      if (!hasPermission(session, socket.id, "canChangePermissions")) {
        return ack?.({ ok: false, message: "Only the host can switch mode" });
      }
      if (!VALID_SESSION_TYPES.has(type)) {
        return ack?.({ ok: false, message: "Unknown session type" });
      }

      const PRESETS = {
        study:     { collabMode: "free",       teacherMode: false, examEnabled: false },
        classroom: { collabMode: "controlled", teacherMode: true,  examEnabled: false },
        exam:      { collabMode: "free",       teacherMode: true,  examEnabled: true  },
        pair:      { collabMode: "turn-based", teacherMode: false, examEnabled: false },
      };
      const preset = PRESETS[type];

      session.collab.mode     = preset.collabMode;
      session.teacherMode     = preset.teacherMode;
      if (!preset.examEnabled && session.exam) {
        // Cancel any running exam when leaving exam mode.
        if (session._examTimer) { clearTimeout(session._examTimer); session._examTimer = null; }
        session.exam.enabled = false;
        session.exam.phase   = "waiting";
        session.exam.startedAt = null;
        session.exam.endsAt    = null;
      } else if (preset.examEnabled) {
        session.exam = session.exam || defaultExam({ enabled: true });
        session.exam.enabled = true;
      }

      io.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("session:mode:transitioned", {
        type,
        collab:      session.collab,
        teacherMode: session.teacherMode,
        exam:        publicExam(session.exam),
      });
      ack?.({ ok: true, type });
    });

    // ── Advance turn ──────────────────────────────────────────────────────
    socket.on("session:turn:next", (_payload, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false });

      const session = findSession(mem.problemId, mem.sessionId);
      if (!session || session.collab.mode !== "turn-based") return ack?.({ ok: false });

      const isAuthority = hasPermission(session, socket.id, "canChangePermissions");
      const isTurnHolder = session.collab.currentTurnSocketId === socket.id;
      if (!isAuthority && !isTurnHolder) return ack?.({ ok: false, message: "Not your turn" });

      const ids = Object.keys(session.participants);
      const idx = ids.indexOf(session.collab.currentTurnSocketId);
      session.collab.currentTurnSocketId = ids[(idx + 1) % ids.length] ?? null;
      session.collab.turnStartedAt = Date.now();

      io.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("session:turn:changed", {
        currentTurnSocketId: session.collab.currentTurnSocketId,
        turnStartedAt:       session.collab.turnStartedAt,
        turnDuration:        session.collab.turnDuration,
      });
      ack?.({ ok: true });
    });

    // ── Live cursor ───────────────────────────────────────────────────────
    socket.on("session:cursor:update", (payload) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return;
      const session = findSession(mem.problemId, mem.sessionId);
      if (!session?.collab?.showLiveCursors) return;

      socket.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("session:cursor:updated", {
        socketId: socket.id,
        name:     session.participants[socket.id]?.name,
        ...payload,
      });
    });

    // ── Typing indicator ──────────────────────────────────────────────────
    socket.on("session:typing", (payload) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return;
      const session = findSession(mem.problemId, mem.sessionId);
      if (!session?.collab?.typingIndicators) return;

      socket.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("session:typing:update", {
        socketId: socket.id,
        name:     session.participants[socket.id]?.name,
        isTyping: Boolean(payload?.isTyping),
      });
    });

    // ── Leave session ─────────────────────────────────────────────────────
    socket.on("session:leave", () => {
      removeFromWaiting(socket.id);
      const old = removeMembership(socket.id);
      if (!old) return;

      socket.leave(getSessionRoom(old.problemId, old.sessionId));
      const session = findSession(old.problemId, old.sessionId);
      if (session) broadcastParticipants(io, session);
      broadcastSessionLists(io, old.problemId);
    });

    // ── Code update ───────────────────────────────────────────────────────
    socket.on("session:code:update", (payload) => {
      const { problemId, sessionId, language, code } = payload || {};
      const session = findSession(problemId, sessionId);
      if (!session || !language) return;

      // Exam has ended — reject further edits
      if (session.exam?.phase === "ended") {
        socket.emit("session:permission:error", { message: "Exam is over" });
        return;
      }

      if (!hasPermission(session, socket.id, "canEdit")) {
        socket.emit("session:permission:error", { message: "You do not have edit access" });
        return;
      }

      const { mode, currentTurnSocketId } = session.collab;
      if (mode === "controlled" && !hasPermission(session, socket.id, "canChangePermissions")) {
        socket.emit("session:permission:error", { message: "Session is in controlled mode — only host/co-host can edit" });
        return;
      }
      if (
        mode === "turn-based" &&
        currentTurnSocketId !== socket.id &&
        !hasPermission(session, socket.id, "canChangePermissions")
      ) {
        socket.emit("session:permission:error", { message: "It is not your turn" });
        return;
      }

      session.codeByLanguage[language] = code || "";
      socket.to(getSessionRoom(problemId, sessionId)).emit("session:code:updated", {
        language,
        code: code || "",
      });
    });

    // ── Draw ──────────────────────────────────────────────────────────────
    socket.on("session:draw:add", (payload) => {
      const { problemId, sessionId, stroke } = payload || {};
      const session = findSession(problemId, sessionId);
      if (!session || !stroke) return;

      if (!hasPermission(session, socket.id, "canEdit")) {
        socket.emit("session:permission:error", { message: "You do not have edit access" });
        return;
      }

      session.drawStrokes.push(stroke);
      socket.to(getSessionRoom(problemId, sessionId)).emit("session:draw:added", { stroke });
    });

    socket.on("session:draw:clear", ({ problemId, sessionId } = {}) => {
      const session = findSession(problemId, sessionId);
      if (!session || !hasPermission(session, socket.id, "canEdit")) return;
      session.drawStrokes = [];
      io.to(getSessionRoom(problemId, sessionId)).emit("session:draw:cleared");
    });

    // ── tldraw collaborative whiteboard ───────────────────────────────────
    socket.on("session:tldraw:change", (payload) => {
      const { problemId, sessionId, changes } = payload || {};
      const session = findSession(problemId, sessionId);
      if (!session || !changes) return;
      if (!hasPermission(session, socket.id, "canEdit")) {
        socket.emit("session:permission:error", { message: "You do not have edit access" });
        return;
      }
      const { added, updated, removed } = changes;
      if (added)   for (const r of Object.values(added))         session.tldrawStore[r.id] = r;
      if (updated) for (const [, next] of Object.values(updated)) session.tldrawStore[next.id] = next;
      if (removed) for (const r of Object.values(removed))        delete session.tldrawStore[r.id];
      socket.to(getSessionRoom(problemId, sessionId)).emit("session:tldraw:change", { changes });
    });

    // Helper: make sure a student has a per-desk work slot.
    const ensureWork = (session, sid) => {
      if (!session.studentWork) session.studentWork = {};
      if (!session.studentWork[sid]) session.studentWork[sid] = { code: "", tldrawStore: {} };
      if (!session.studentWork[sid].tldrawStore) session.studentWork[sid].tldrawStore = {};
      return session.studentWork[sid];
    };

    // ── Student's private code (stored per-student, forwarded to teacher only)
    socket.on("student:code", ({ code } = {}) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return;
      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return;

      // Exam ended — silently ignore further writes
      if (session.exam?.phase === "ended") return;

      const work = ensureWork(session, socket.id);
      work.code = code || "";
      const studentName = session.participants[socket.id]?.name;
      for (const [sid, p] of Object.entries(session.participants)) {
        if (p.role === "host" || p.role === "co-host") {
          io.sockets.sockets.get(sid)?.emit("student:code", {
            socketId: socket.id,
            name: studentName,
            code: code || "",
          });
        }
      }
    });

    // ── Student's private tldraw (paint) changes, forwarded to teacher only
    socket.on("student:tldraw:change", ({ changes } = {}) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem || !changes) return;
      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return;
      const work = ensureWork(session, socket.id);
      const { added, updated, removed } = changes;
      if (added)   for (const r of Object.values(added))           work.tldrawStore[r.id] = r;
      if (updated) for (const [, next] of Object.values(updated))  work.tldrawStore[next.id] = next;
      if (removed) for (const r of Object.values(removed))         delete work.tldrawStore[r.id];
      for (const [sid, p] of Object.entries(session.participants)) {
        if (p.role === "host" || p.role === "co-host") {
          io.sockets.sockets.get(sid)?.emit("student:tldraw:change", {
            socketId: socket.id,
            changes,
          });
        }
      }
    });

    // ── Teacher asks for a student's full snapshot (code + tldraw) ────────
    socket.on("teacher:focus", ({ socketId: studentId } = {}, ack) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return ack?.({ ok: false });
      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return ack?.({ ok: false });
      if (!hasPermission(session, socket.id, "canKick")) {
        return ack?.({ ok: false, message: "Not a teacher" });
      }
      const work = session.studentWork?.[studentId] || { code: "", tldrawStore: {} };
      ack?.({ ok: true, code: work.code, tldrawStore: work.tldrawStore || {} });
    });

    // ── Session chat (collab messages) ────────────────────────────────────
    socket.on("session:chat:send", ({ text } = {}) => {
      const mem = socketToMembership.get(socket.id);
      if (!mem) return;
      const session = findSession(mem.problemId, mem.sessionId);
      if (!session) return;
      const trimmed = String(text || "").slice(0, 500).trim();
      if (!trimmed) return;
      const sender = session.participants[socket.id];
      if (!sender) return;
      io.to(getSessionRoom(mem.problemId, mem.sessionId)).emit("session:chat:message", {
        id: `${socket.id}-${Date.now()}`,
        socketId: socket.id,
        name: sender.name,
        text: trimmed,
        time: Date.now(),
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      removeFromWaiting(socket.id);
      const old = removeMembership(socket.id);
      if (!old) return;

      const session = findSession(old.problemId, old.sessionId);
      if (session) broadcastParticipants(io, session);
      broadcastSessionLists(io, old.problemId);
    });
  });

  return io;
}

module.exports = { setupSessionHub };
