const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");

// ── Role permission matrix ─────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  host:       { canEdit: true,  canComment: true, canKick: true,  canMute: true,  canChangePermissions: true  },
  "co-host":  { canEdit: true,  canComment: true, canKick: true,  canMute: true,  canChangePermissions: true  },
  editor:     { canEdit: true,  canComment: true, canKick: false, canMute: false, canChangePermissions: false },
  viewer:     { canEdit: false, canComment: true, canKick: false, canMute: false, canChangePermissions: false },
};

const VALID_ROLES        = new Set(["host", "co-host", "editor", "viewer"]);
const VALID_COLLAB_MODES = new Set(["free", "controlled", "turn-based"]);
const VALID_VISIBILITIES = new Set(["public", "private", "unlisted"]);

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
  return p ? Boolean(ROLE_PERMISSIONS[p.role]?.[action]) : false;
}

function buildParticipantList(session) {
  return Object.entries(session.participants).map(([socketId, p]) => ({
    socketId,
    name: p.name,
    role: p.role,
    permissions: ROLE_PERMISSIONS[p.role] || {},
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
  io.to(getSessionRoom(session.problemId, session.id)).emit("session:participants", {
    participants:       Object.values(session.participants).map((p) => p.name),
    participantDetails: buildParticipantList(session),
  });
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
function createSession({
  problemId, sessionName, hostName, language, starterCode,
  maxParticipants, autoLock, allowOverflow,
  password, visibility, allowAnonymous,
  whitelist, blacklist, requireJoinApproval,
  defaultRole, collab,
}) {
  if (!sessionsByProblem[problemId]) sessionsByProblem[problemId] = {};

  const safeMax        = Math.max(1, Math.min(200, Number(maxParticipants) || 10));
  const safeVisibility = VALID_VISIBILITIES.has(visibility) ? visibility : "public";
  const safeDefault    = ["editor", "viewer"].includes(defaultRole) ? defaultRole : "editor";
  const safeMode       = VALID_COLLAB_MODES.has(collab?.mode) ? collab.mode : "free";
  const passwordHash   = password ? bcrypt.hashSync(String(password), 8) : "";

  const sessionId = generateUniqueSessionId();

  sessionsByProblem[problemId][sessionId] = {
    id:        sessionId,
    problemId,
    name:      sessionName || "Untitled Session",
    hostName:  normalizeName(hostName || "host"),

    // B. Access & Security
    visibility:         safeVisibility,
    passwordHash,
    allowAnonymous:     allowAnonymous !== false,
    whitelist:          parseNameList(whitelist),
    blacklist:          parseNameList(blacklist),
    requireJoinApproval: Boolean(requireJoinApproval),
    waitingRoom:        {},   // { [socketId]: { socketId, name, requestedAt } }

    // C. Limits
    maxParticipants: safeMax,
    autoLock:        Boolean(autoLock),
    locked:          false,
    allowOverflow:   Boolean(allowOverflow),

    // D. Roles
    defaultRole: safeDefault,

    // E. Collaboration
    collab: {
      mode:              safeMode,
      turnDuration:      Math.max(5, Number(collab?.turnDuration) || 30),
      showLiveCursors:   collab?.showLiveCursors !== false,
      showSelections:    collab?.showSelections !== false,
      typingIndicators:  collab?.typingIndicators !== false,
      currentTurnSocketId: null,
      turnStartedAt:     null,
    },

    participants:    {},
    codeByLanguage:  { [language]: starterCode || "" },
    drawStrokes:     [],
    tldrawStore:     {},
    createdAt:       Date.now(),
  };

  return sessionsByProblem[problemId][sessionId];
}

function addParticipant(session, socketId, userName, role) {
  session.participants[socketId] = { name: userName, role };

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

    // Unlock if no longer at capacity
    if (session.locked && !session.allowOverflow) {
      if (Object.keys(session.participants).length < session.maxParticipants) {
        session.locked = false;
      }
    }

    const entries = Object.entries(session.participants);

    if (entries.length === 0) {
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
    name:           session.name,
    hostName:       session.hostName,
    visibility:     session.visibility,
    maxParticipants: session.maxParticipants,
    locked:         session.locked,
    requireJoinApproval: session.requireJoinApproval,
    allowAnonymous: session.allowAnonymous,
    collab:         session.collab,
    defaultRole:    session.defaultRole,
    codeByLanguage: session.codeByLanguage,
    drawStrokes:    session.drawStrokes,
    tldrawStore:    session.tldrawStore,
  };
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
    socket.on("session:create", (payload, ack) => {
      const {
        problemId, sessionName, hostName, language, starterCode,
        maxParticipants, autoLock, allowOverflow,
        password, visibility, allowAnonymous,
        whitelist, blacklist, requireJoinApproval,
        defaultRole, collab,
      } = payload || {};

      if (!problemId || !language) {
        return ack?.({ ok: false, message: "Missing problemId or language" });
      }

      const safeHostName = (hostName || "Host").trim() || "Host";
      const session = createSession({
        problemId, sessionName, hostName: safeHostName, language, starterCode,
        maxParticipants, autoLock, allowOverflow,
        password, visibility, allowAnonymous,
        whitelist, blacklist, requireJoinApproval,
        defaultRole, collab,
      });

      // Leave any previous session
      const old = removeMembership(socket.id);
      if (old?.problemId) socket.leave(getSessionRoom(old.problemId, old.sessionId));
      removeFromWaiting(socket.id);

      // Join as host
      addParticipant(session, socket.id, safeHostName, "host");
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
