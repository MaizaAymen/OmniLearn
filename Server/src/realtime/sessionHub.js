const crypto = require("crypto");
const { Server } = require("socket.io");

// In-memory store: { [problemId]: { [sessionId]: session } }
const sessionsByProblem = {};
const socketToMembership = new Map();

const ROLE_PERMISSIONS = {
  host: {
    canEdit: true,
    canComment: true,
    canKick: true,
    canMute: true,
    canChangePermissions: true,
  },
  "co-host": {
    canEdit: true,
    canComment: true,
    canKick: true,
    canMute: true,
    canChangePermissions: true,
  },
  editor: {
    canEdit: true,
    canComment: true,
    canKick: false,
    canMute: false,
    canChangePermissions: false,
  },
  viewer: {
    canEdit: false,
    canComment: true,
    canKick: false,
    canMute: false,
    canChangePermissions: false,
  },
};

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function parseNameList(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return Array.from(new Set(values.map((item) => normalizeName(item)).filter(Boolean)));
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function parsePositiveNumber(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
}

function parseDateMs(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function buildPasswordRecord(password) {
  const raw = String(password || "").trim();
  if (!raw) return { passwordHash: "", passwordSalt: "" };
  const passwordSalt = crypto.randomBytes(12).toString("hex");
  return {
    passwordSalt,
    passwordHash: hashPassword(raw, passwordSalt),
  };
}

function verifyPassword(password, session) {
  if (!session?.accessSecurity?.passwordHash) return true;
  const incoming = String(password || "");
  const incomingHash = hashPassword(incoming, session.accessSecurity.passwordSalt);
  return incomingHash === session.accessSecurity.passwordHash;
}

function listAllSessions() {
  return Object.values(sessionsByProblem).flatMap((problemSessions) =>
    Object.values(problemSessions)
  );
}

function isSessionIdTaken(sessionId) {
  return listAllSessions().some((session) => session.id === sessionId);
}

function generateUniqueSessionId() {
  let sessionId = "";
  do {
    sessionId = `S-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  } while (isSessionIdTaken(sessionId));

  return sessionId;
}

function generateRequestId() {
  return `REQ-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

function getProblemSessions(problemId) {
  return sessionsByProblem[problemId] || {};
}

function getSessionRoom(problemId, sessionId) {
  return `problem:${problemId}:session:${sessionId}`;
}

function getSessionCountdownInfo(session) {
  if (!session?.timing?.autoCloseAt) return null;
  const remainingMs = session.timing.autoCloseAt - Date.now();
  return {
    remainingMs,
    remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
  };
}

function shouldListInLobby(session) {
  return session?.accessSecurity?.visibility !== "unlisted";
}

function buildSessionSummary(session) {
  return {
    id: session.id,
    problemId: session.problemId,
    name: session.name,
    hostName: session.hostName,
    participantCount: Object.keys(session.participants).length,
    maxParticipants: session.limits.maxParticipants,
    visibility: session.accessSecurity.visibility,
    requiresPassword: Boolean(session.accessSecurity.passwordHash),
    waitingRoom: session.accessSecurity.waitingRoom,
    isLocked: session.limits.isLocked,
    collaborationMode: session.collaboration.mode,
    createdAt: session.createdAt,
    timing: {
      startTime: session.timing.startTime,
      endTime: session.timing.endTime,
      maxDurationMinutes: session.timing.maxDurationMinutes,
      autoClose: session.timing.autoClose,
      countdownWarnings: session.timing.countdownWarnings,
    },
  };
}

function buildSessionList(problemId) {
  const sessions = Object.values(getProblemSessions(problemId));
  return sessions.filter(shouldListInLobby).map((session) => buildSessionSummary(session));
}

function buildGlobalSessionList() {
  return listAllSessions().filter(shouldListInLobby).map((session) => buildSessionSummary(session));
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
  if (problemId) {
    broadcastProblemSessionList(io, problemId);
  }
  broadcastGlobalSessionList(io);
}

function findSessionById(sessionId) {
  const normalized = String(sessionId || "").trim();
  if (!normalized) return null;

  const problemIds = Object.keys(sessionsByProblem);
  for (const problemId of problemIds) {
    const session = sessionsByProblem?.[problemId]?.[normalized];
    if (session) return { problemId, session };
  }

  return null;
}

function resolveRoleForUser(session, normalizedName) {
  if (normalizedName === session.hostNormalizedName) return "host";
  return session.roles.assignments[normalizedName] || session.roles.defaultRole;
}

function resolvePermissionsForRole(session, role) {
  const perms = session.roles.permissionsByRole[role] || ROLE_PERMISSIONS.viewer;
  return {
    canEdit: Boolean(perms.canEdit),
    canComment: Boolean(perms.canComment),
    canKick: Boolean(perms.canKick),
    canMute: Boolean(perms.canMute),
    canChangePermissions: Boolean(perms.canChangePermissions),
  };
}

function resolveParticipantAccess(session, userName) {
  const normalizedName = normalizeName(userName);
  const role = resolveRoleForUser(session, normalizedName);
  const permissions = resolvePermissionsForRole(session, role);
  return {
    normalizedName,
    role,
    permissions,
    permission: permissions.canEdit ? "editable" : "read-only",
  };
}

function getParticipantDetails(session) {
  return Object.values(session.participants).map((participant) => ({
    name: participant.name,
    role: participant.role,
    permission: participant.permission,
    muted: Boolean(participant.muted),
  }));
}

function emitSessionParticipants(io, problemId, sessionId) {
  const session = sessionsByProblem?.[problemId]?.[sessionId];
  if (!session) return;

  io.to(getSessionRoom(problemId, sessionId)).emit("session:participants", {
    participants: Object.values(session.participants).map((participant) => participant.name),
    participantDetails: getParticipantDetails(session),
  });
}

function canActor(session, socketId, capability) {
  return Boolean(session?.participants?.[socketId]?.permissions?.[capability]);
}

function canEditSession(session, socketId) {
  const participant = session?.participants?.[socketId];
  if (!participant?.permissions?.canEdit) return false;

  if (session.collaboration.mode !== "turn-based") {
    return true;
  }

  if (participant.permissions.canChangePermissions) {
    return true;
  }

  return participant.normalizedName === session.collaboration.currentTurnName;
}

function removeSession(problemId, sessionId) {
  if (!sessionsByProblem?.[problemId]?.[sessionId]) return;

  delete sessionsByProblem[problemId][sessionId];
  if (Object.keys(sessionsByProblem[problemId]).length === 0) {
    delete sessionsByProblem[problemId];
  }
}

function cleanupExpiredSessions(io) {
  const now = Date.now();
  const problemIds = Object.keys(sessionsByProblem);

  for (const problemId of problemIds) {
    const sessionIds = Object.keys(sessionsByProblem[problemId]);
    for (const sessionId of sessionIds) {
      const session = sessionsByProblem[problemId][sessionId];
      if (!session?.timing?.autoClose || !session?.timing?.autoCloseAt) continue;

      if (now < session.timing.autoCloseAt) continue;

      io.to(getSessionRoom(problemId, sessionId)).emit("session:closed", {
        reason: "Session closed automatically by timing rules",
      });

      Object.keys(session.participants).forEach((socketId) => {
        socketToMembership.delete(socketId);
      });

      removeSession(problemId, sessionId);
      broadcastSessionLists(io, problemId);
    }
  }
}

function createSession({
  problemId,
  sessionName,
  hostName,
  language,
  starterCode,
  maxParticipants,
  visibility,
  password,
  allowAnonymous,
  whitelist,
  blacklist,
  waitingRoom,
  autoLockWhenFull,
  allowOverflow,
  roles,
  collaboration,
  communication,
  timing,
}) {
  if (!sessionsByProblem[problemId]) {
    sessionsByProblem[problemId] = {};
  }

  const safeHostName = String(hostName || "Host").trim() || "Host";
  const hostNormalizedName = normalizeName(safeHostName);
  const safeMaxParticipants = Math.max(1, Number(maxParticipants) || 10);

  const safeVisibility = ["public", "private", "unlisted"].includes(visibility)
    ? visibility
    : "public";

  const safeWhitelist = parseNameList(whitelist);
  const safeBlacklist = parseNameList(blacklist);

  const safeRoles = {
    defaultRole: ["host", "co-host", "editor", "viewer"].includes(roles?.defaultRole)
      ? roles.defaultRole
      : "viewer",
    permissionsByRole: {
      host: {
        ...ROLE_PERMISSIONS.host,
        ...(roles?.permissionsByRole?.host || {}),
      },
      "co-host": {
        ...ROLE_PERMISSIONS["co-host"],
        ...(roles?.permissionsByRole?.["co-host"] || {}),
      },
      editor: {
        ...ROLE_PERMISSIONS.editor,
        ...(roles?.permissionsByRole?.editor || {}),
      },
      viewer: {
        ...ROLE_PERMISSIONS.viewer,
        ...(roles?.permissionsByRole?.viewer || {}),
      },
    },
    assignments: {
      [hostNormalizedName]: "host",
      ...(roles?.assignments || {}),
    },
  };

  const safeCollaborationMode = ["free", "controlled", "turn-based"].includes(
    collaboration?.mode
  )
    ? collaboration.mode
    : "free";

  const safeTurnDurationSeconds = parsePositiveNumber(collaboration?.turnDurationSeconds, 60);

  const safeTiming = {
    startTime: parseDateMs(timing?.startTime),
    endTime: parseDateMs(timing?.endTime),
    maxDurationMinutes: parsePositiveNumber(timing?.maxDurationMinutes, null),
    autoClose: parseBoolean(timing?.autoClose, false),
    countdownWarnings: Array.isArray(timing?.countdownWarnings)
      ? timing.countdownWarnings
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v) && v > 0)
      : [10, 5, 1],
    warnedMinutes: {},
    createdAt: Date.now(),
    autoCloseAt: null,
  };

  if (safeTiming.maxDurationMinutes) {
    safeTiming.autoCloseAt = safeTiming.createdAt + safeTiming.maxDurationMinutes * 60 * 1000;
  }
  if (safeTiming.endTime) {
    safeTiming.autoCloseAt = safeTiming.autoCloseAt
      ? Math.min(safeTiming.autoCloseAt, safeTiming.endTime)
      : safeTiming.endTime;
  }

  const passwordRecord = buildPasswordRecord(password);
  const sessionId = generateUniqueSessionId();

  const initialTurnName = hostNormalizedName;

  sessionsByProblem[problemId][sessionId] = {
    id: sessionId,
    problemId,
    name: sessionName || "Untitled Session",
    hostName: safeHostName,
    hostNormalizedName,
    createdAt: Date.now(),
    accessSecurity: {
      visibility: safeVisibility,
      passwordHash: passwordRecord.passwordHash,
      passwordSalt: passwordRecord.passwordSalt,
      allowAnonymous: parseBoolean(allowAnonymous, true),
      whitelist: safeWhitelist,
      blacklist: safeBlacklist,
      waitingRoom: parseBoolean(waitingRoom, false),
    },
    limits: {
      maxParticipants: safeMaxParticipants,
      autoLockWhenFull: parseBoolean(autoLockWhenFull, true),
      allowOverflow: parseBoolean(allowOverflow, false),
      isLocked: false,
    },
    roles: safeRoles,
    collaboration: {
      mode: safeCollaborationMode,
      turnDurationSeconds: safeTurnDurationSeconds,
      showLiveCursors: parseBoolean(collaboration?.showLiveCursors, true),
      showSelections: parseBoolean(collaboration?.showSelections, true),
      typingIndicators: parseBoolean(collaboration?.typingIndicators, true),
      currentTurnName: initialTurnName,
      turnStartedAt: Date.now(),
    },
    communication: {
      enableChat: parseBoolean(communication?.enableChat, true),
      enableReactions: parseBoolean(communication?.enableReactions, true),
      enableVoice: parseBoolean(communication?.enableVoice, false),
      messageModeration: parseBoolean(communication?.messageModeration, false),
    },
    timing: safeTiming,
    codeByLanguage: {
      [language]: starterCode || "",
    },
    drawStrokes: [],
    participants: {},
    pendingApprovals: [],
  };

  return sessionsByProblem[problemId][sessionId];
}

function findSession(problemId, sessionId) {
  return sessionsByProblem?.[problemId]?.[sessionId] || null;
}

function removeMembership(socketId) {
  const member = socketToMembership.get(socketId);
  if (!member) return null;

  const { problemId, sessionId } = member;
  const session = findSession(problemId, sessionId);
  if (session) {
    delete session.participants[socketId];

    if (Object.keys(session.participants).length === 0) {
      removeSession(problemId, sessionId);
    }
  }

  socketToMembership.delete(socketId);
  return { problemId, sessionId };
}

function isAnonymousName(userName) {
  const normalized = normalizeName(userName);
  return !normalized || normalized.startsWith("guest");
}

function tryJoinChecks(session, userName, password) {
  const normalizedName = normalizeName(userName);
  const now = Date.now();

  if (session.timing.startTime && now < session.timing.startTime) {
    return { ok: false, message: "Session has not started yet" };
  }

  if (session.timing.endTime && now > session.timing.endTime) {
    return { ok: false, message: "Session has ended" };
  }

  if (session.timing.maxDurationMinutes) {
    const sessionDeadline =
      session.timing.createdAt + session.timing.maxDurationMinutes * 60 * 1000;
    if (now > sessionDeadline) {
      return { ok: false, message: "Session maximum duration has passed" };
    }
  }

  if (!session.accessSecurity.allowAnonymous && isAnonymousName(userName)) {
    return { ok: false, message: "Anonymous users are not allowed" };
  }

  if (session.accessSecurity.blacklist.includes(normalizedName)) {
    return { ok: false, message: "You are banned from this session" };
  }

  if (
    session.accessSecurity.whitelist.length > 0 &&
    !session.accessSecurity.whitelist.includes(normalizedName)
  ) {
    return { ok: false, message: "You are not in the allowed users list" };
  }

  if (!verifyPassword(password, session)) {
    return { ok: false, message: "Wrong session password" };
  }

  const participantCount = Object.keys(session.participants).length;
  if (participantCount >= session.limits.maxParticipants) {
    if (session.limits.autoLockWhenFull) {
      session.limits.isLocked = true;
    }

    if (!session.limits.allowOverflow) {
      return { ok: false, message: "Session is full" };
    }
  }

  if (session.limits.isLocked && !session.limits.allowOverflow) {
    return { ok: false, message: "Session is locked" };
  }

  return { ok: true };
}

function attachParticipant(io, socket, problemId, sessionId, userName) {
  const session = findSession(problemId, sessionId);
  if (!session) {
    return { ok: false, message: "Session not found" };
  }

  const safeUserName = String(userName || "Guest").trim() || "Guest";
  const access = resolveParticipantAccess(session, safeUserName);

  session.participants[socket.id] = {
    name: safeUserName,
    normalizedName: access.normalizedName,
    role: access.role,
    permissions: access.permissions,
    permission: access.permission,
    muted: false,
    isAnonymous: isAnonymousName(safeUserName),
  };

  if (session.collaboration.mode === "turn-based" && !session.collaboration.currentTurnName) {
    session.collaboration.currentTurnName = access.normalizedName;
    session.collaboration.turnStartedAt = Date.now();
  }

  socketToMembership.set(socket.id, { problemId, sessionId });
  socket.join(getSessionRoom(problemId, sessionId));

  emitSessionParticipants(io, problemId, sessionId);
  broadcastSessionLists(io, problemId);

  return {
    ok: true,
    participant: session.participants[socket.id],
    session,
  };
}

function setupSessionHub(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  setInterval(() => {
    cleanupExpiredSessions(io);

    const now = Date.now();
    listAllSessions().forEach((session) => {
      if (!session?.timing?.autoCloseAt) return;
      const remainingMs = session.timing.autoCloseAt - now;
      if (remainingMs <= 0) return;

      const remainingMinutes = Math.ceil(remainingMs / 60000);
      session.timing.countdownWarnings.forEach((warning) => {
        if (remainingMinutes <= warning && !session.timing.warnedMinutes[warning]) {
          session.timing.warnedMinutes[warning] = true;
          io.to(getSessionRoom(session.problemId, session.id)).emit("session:countdown", {
            warningMinutes: warning,
            remainingSeconds: Math.ceil(remainingMs / 1000),
          });
        }
      });

      if (
        session.collaboration.mode === "turn-based" &&
        session.collaboration.turnDurationSeconds > 0 &&
        Object.keys(session.participants).length > 1
      ) {
        const elapsed = Math.floor((now - session.collaboration.turnStartedAt) / 1000);
        if (elapsed >= session.collaboration.turnDurationSeconds) {
          const orderedParticipants = Object.values(session.participants).map(
            (participant) => participant.normalizedName
          );

          const currentIndex = orderedParticipants.indexOf(session.collaboration.currentTurnName);
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % orderedParticipants.length : 0;
          session.collaboration.currentTurnName = orderedParticipants[nextIndex];
          session.collaboration.turnStartedAt = now;

          io.to(getSessionRoom(session.problemId, session.id)).emit("session:turn:changed", {
            currentTurnName: session.collaboration.currentTurnName,
            turnDurationSeconds: session.collaboration.turnDurationSeconds,
          });
        }
      }
    });
  }, 5000);

  io.on("connection", (socket) => {
    socket.on("session:global:list:subscribe", () => {
      if (socket.data.currentGlobalLobby !== "session:global:lobby") {
        socket.join("session:global:lobby");
        socket.data.currentGlobalLobby = "session:global:lobby";
      }

      socket.emit("session:global:list", {
        sessions: buildGlobalSessionList(),
      });
    });

    socket.on("session:list:subscribe", ({ problemId }) => {
      if (!problemId) return;

      cleanupExpiredSessions(io);

      if (socket.data.currentLobby && socket.data.currentLobby !== `problem:${problemId}:lobby`) {
        socket.leave(socket.data.currentLobby);
      }

      socket.join(`problem:${problemId}:lobby`);
      socket.data.currentLobby = `problem:${problemId}:lobby`;
      socket.emit("session:list", {
        problemId,
        sessions: buildSessionList(problemId),
      });
    });

    socket.on("session:create", (payload, ack) => {
      const {
        problemId,
        sessionName,
        hostName,
        language,
        starterCode,
        maxParticipants,
        visibility,
        password,
        allowAnonymous,
        whitelist,
        blacklist,
        waitingRoom,
        autoLockWhenFull,
        allowOverflow,
        roles,
        collaboration,
        communication,
        timing,
      } = payload || {};

      if (!problemId || !language) {
        if (ack) ack({ ok: false, message: "Missing problemId or language" });
        return;
      }

      const session = createSession({
        problemId,
        sessionName,
        hostName: hostName || "Host",
        language,
        starterCode,
        maxParticipants,
        visibility,
        password,
        allowAnonymous,
        whitelist,
        blacklist,
        waitingRoom,
        autoLockWhenFull,
        allowOverflow,
        roles,
        collaboration,
        communication,
        timing,
      });

      broadcastSessionLists(io, problemId);

      if (ack) {
        ack({
          ok: true,
          sessionId: session.id,
          problemId: session.problemId,
          sessionSummary: buildSessionSummary(session),
        });
      }
    });

    socket.on("session:join", (payload, ack) => {
      const { problemId: providedProblemId, sessionId, userName, password } = payload || {};

      cleanupExpiredSessions(io);

      let problemId = providedProblemId;
      let session = findSession(problemId, sessionId);

      if (!session && sessionId) {
        const found = findSessionById(sessionId);
        if (found) {
          problemId = found.problemId;
          session = found.session;
        }
      }

      if (!session) {
        if (ack) ack({ ok: false, message: "Session not found" });
        return;
      }

      const safeUserName = (userName || "Guest").trim() || "Guest";
      const checks = tryJoinChecks(session, safeUserName, password);
      if (!checks.ok) {
        if (ack) ack(checks);
        return;
      }

      if (session.accessSecurity.waitingRoom) {
        const requestId = generateRequestId();
        session.pendingApprovals.push({
          requestId,
          socketId: socket.id,
          userName: safeUserName,
          normalizedName: normalizeName(safeUserName),
          requestedAt: Date.now(),
          password: String(password || ""),
        });

        io.to(getSessionRoom(problemId, sessionId)).emit("session:join:pending", {
          pendingApprovals: session.pendingApprovals.map((request) => ({
            requestId: request.requestId,
            userName: request.userName,
            requestedAt: request.requestedAt,
          })),
        });

        if (ack) {
          ack({
            ok: false,
            waitingApproval: true,
            message: "Waiting room enabled. Host approval required.",
          });
        }
        return;
      }

      const oldMembership = removeMembership(socket.id);
      if (oldMembership?.problemId) {
        socket.leave(getSessionRoom(oldMembership.problemId, oldMembership.sessionId));
        emitSessionParticipants(io, oldMembership.problemId, oldMembership.sessionId);
        broadcastSessionLists(io, oldMembership.problemId);
      }

      const attached = attachParticipant(io, socket, problemId, sessionId, safeUserName);
      if (!attached.ok) {
        if (ack) ack(attached);
        return;
      }

      if (ack) {
        ack({
          ok: true,
          userPermission: attached.participant.permission,
          userRole: attached.participant.role,
          pendingApprovals: session.pendingApprovals.map((request) => ({
            requestId: request.requestId,
            userName: request.userName,
            requestedAt: request.requestedAt,
          })),
          session: {
            id: session.id,
            problemId: session.problemId,
            name: session.name,
            visibility: session.accessSecurity.visibility,
            maxParticipants: session.limits.maxParticipants,
            codeByLanguage: session.codeByLanguage,
            drawStrokes: session.drawStrokes,
            settings: {
              accessSecurity: {
                visibility: session.accessSecurity.visibility,
                allowAnonymous: session.accessSecurity.allowAnonymous,
                whitelist: session.accessSecurity.whitelist,
                blacklist: session.accessSecurity.blacklist,
                waitingRoom: session.accessSecurity.waitingRoom,
              },
              limits: session.limits,
              roles: {
                defaultRole: session.roles.defaultRole,
                permissionsByRole: session.roles.permissionsByRole,
              },
              collaboration: session.collaboration,
              communication: session.communication,
              timing: {
                ...session.timing,
                ...getSessionCountdownInfo(session),
              },
            },
          },
        });
      }
    });

    socket.on("session:join:approval", ({ problemId, sessionId, requestId, action } = {}, ack) => {
      const session = findSession(problemId, sessionId);
      if (!session) {
        if (ack) ack({ ok: false, message: "Session not found" });
        return;
      }

      if (!canActor(session, socket.id, "canChangePermissions")) {
        if (ack) ack({ ok: false, message: "Permission denied" });
        return;
      }

      const requestIndex = session.pendingApprovals.findIndex((request) => request.requestId === requestId);
      if (requestIndex === -1) {
        if (ack) ack({ ok: false, message: "Join request not found" });
        return;
      }

      const request = session.pendingApprovals[requestIndex];
      session.pendingApprovals.splice(requestIndex, 1);

      if (action === "approve") {
        const targetSocket = io.sockets.sockets.get(request.socketId);
        if (targetSocket) {
          const checks = tryJoinChecks(session, request.userName, request.password);
          if (checks.ok) {
            const oldMembership = removeMembership(targetSocket.id);
            if (oldMembership?.problemId) {
              targetSocket.leave(getSessionRoom(oldMembership.problemId, oldMembership.sessionId));
              emitSessionParticipants(io, oldMembership.problemId, oldMembership.sessionId);
            }

            const attached = attachParticipant(io, targetSocket, problemId, sessionId, request.userName);
            if (attached.ok) {
              targetSocket.emit("session:join:approved", {
                joined: {
                  id: session.id,
                  problemId: session.problemId,
                  name: session.name,
                  visibility: session.accessSecurity.visibility,
                  maxParticipants: session.limits.maxParticipants,
                  codeByLanguage: session.codeByLanguage,
                  drawStrokes: session.drawStrokes,
                  userRole: attached.participant.role,
                  userPermission: attached.participant.permission,
                  pendingApprovals: session.pendingApprovals.map((pending) => ({
                    requestId: pending.requestId,
                    userName: pending.userName,
                    requestedAt: pending.requestedAt,
                  })),
                  settings: {
                    accessSecurity: {
                      visibility: session.accessSecurity.visibility,
                      allowAnonymous: session.accessSecurity.allowAnonymous,
                      whitelist: session.accessSecurity.whitelist,
                      blacklist: session.accessSecurity.blacklist,
                      waitingRoom: session.accessSecurity.waitingRoom,
                    },
                    limits: session.limits,
                    roles: {
                      defaultRole: session.roles.defaultRole,
                      permissionsByRole: session.roles.permissionsByRole,
                    },
                    collaboration: session.collaboration,
                    communication: session.communication,
                    timing: {
                      ...session.timing,
                      ...getSessionCountdownInfo(session),
                    },
                  },
                },
              });
            }
          } else {
            targetSocket.emit("session:join:denied", { message: checks.message });
          }
        }
      } else {
        const targetSocket = io.sockets.sockets.get(request.socketId);
        if (targetSocket) {
          targetSocket.emit("session:join:denied", {
            message: "Join request denied by host",
          });
        }
      }

      io.to(getSessionRoom(problemId, sessionId)).emit("session:join:pending", {
        pendingApprovals: session.pendingApprovals.map((pending) => ({
          requestId: pending.requestId,
          userName: pending.userName,
          requestedAt: pending.requestedAt,
        })),
      });

      if (ack) ack({ ok: true });
    });

    socket.on("session:participant:role", ({ problemId, sessionId, targetName, role } = {}, ack) => {
      const session = findSession(problemId, sessionId);
      if (!session) {
        if (ack) ack({ ok: false, message: "Session not found" });
        return;
      }

      if (!canActor(session, socket.id, "canChangePermissions")) {
        if (ack) ack({ ok: false, message: "Permission denied" });
        return;
      }

      if (!["host", "co-host", "editor", "viewer"].includes(role)) {
        if (ack) ack({ ok: false, message: "Invalid role" });
        return;
      }

      const normalizedTarget = normalizeName(targetName);
      if (!normalizedTarget) {
        if (ack) ack({ ok: false, message: "Target user is required" });
        return;
      }

      session.roles.assignments[normalizedTarget] = role;

      Object.entries(session.participants).forEach(([targetSocketId, participant]) => {
        if (participant.normalizedName !== normalizedTarget) return;

        participant.role = role;
        participant.permissions = resolvePermissionsForRole(session, role);
        participant.permission = participant.permissions.canEdit ? "editable" : "read-only";

        io.to(targetSocketId).emit("session:participant:role:updated", {
          role: participant.role,
          permission: participant.permission,
        });
      });

      emitSessionParticipants(io, problemId, sessionId);

      if (ack) ack({ ok: true });
    });

    socket.on("session:participant:kick", ({ problemId, sessionId, targetName } = {}, ack) => {
      const session = findSession(problemId, sessionId);
      if (!session) {
        if (ack) ack({ ok: false, message: "Session not found" });
        return;
      }

      if (!canActor(session, socket.id, "canKick")) {
        if (ack) ack({ ok: false, message: "Permission denied" });
        return;
      }

      const normalizedTarget = normalizeName(targetName);
      const hit = Object.entries(session.participants).find(
        ([, participant]) => participant.normalizedName === normalizedTarget
      );

      if (!hit) {
        if (ack) ack({ ok: false, message: "Participant not found" });
        return;
      }

      const [targetSocketId] = hit;
      const targetSocket = io.sockets.sockets.get(targetSocketId);

      session.accessSecurity.blacklist = Array.from(
        new Set([...session.accessSecurity.blacklist, normalizedTarget])
      );

      if (targetSocket) {
        targetSocket.emit("session:kicked", { message: "You were removed from the session" });
        targetSocket.leave(getSessionRoom(problemId, sessionId));
      }

      delete session.participants[targetSocketId];
      socketToMembership.delete(targetSocketId);

      emitSessionParticipants(io, problemId, sessionId);
      broadcastSessionLists(io, problemId);

      if (ack) ack({ ok: true });
    });

    socket.on("session:participant:mute", ({ problemId, sessionId, targetName, muted } = {}, ack) => {
      const session = findSession(problemId, sessionId);
      if (!session) {
        if (ack) ack({ ok: false, message: "Session not found" });
        return;
      }

      if (!canActor(session, socket.id, "canMute")) {
        if (ack) ack({ ok: false, message: "Permission denied" });
        return;
      }

      const normalizedTarget = normalizeName(targetName);
      const hit = Object.entries(session.participants).find(
        ([, participant]) => participant.normalizedName === normalizedTarget
      );

      if (!hit) {
        if (ack) ack({ ok: false, message: "Participant not found" });
        return;
      }

      const [targetSocketId, participant] = hit;
      participant.muted = Boolean(muted);

      io.to(targetSocketId).emit("session:participant:muted", {
        muted: participant.muted,
      });

      emitSessionParticipants(io, problemId, sessionId);
      if (ack) ack({ ok: true });
    });

    socket.on("session:leave", () => {
      const oldMembership = removeMembership(socket.id);
      if (!oldMembership) return;

      socket.leave(getSessionRoom(oldMembership.problemId, oldMembership.sessionId));
      emitSessionParticipants(io, oldMembership.problemId, oldMembership.sessionId);
      broadcastSessionLists(io, oldMembership.problemId);
    });

    socket.on("session:code:update", (payload) => {
      const { problemId, sessionId, language, code } = payload || {};
      const session = findSession(problemId, sessionId);
      if (!session || !language) return;

      if (!canEditSession(session, socket.id)) {
        socket.emit("session:permission:error", {
          message: "You do not have edit permission right now",
        });
        return;
      }

      session.codeByLanguage[language] = code || "";

      socket.to(getSessionRoom(problemId, sessionId)).emit("session:code:updated", {
        language,
        code: code || "",
      });
    });

    socket.on("session:draw:add", (payload) => {
      const { problemId, sessionId, stroke } = payload || {};
      const session = findSession(problemId, sessionId);
      if (!session || !stroke) return;

      if (!canEditSession(session, socket.id)) {
        socket.emit("session:permission:error", {
          message: "You do not have edit permission right now",
        });
        return;
      }

      session.drawStrokes.push(stroke);
      socket.to(getSessionRoom(problemId, sessionId)).emit("session:draw:added", { stroke });
    });

    socket.on("session:draw:clear", ({ problemId, sessionId } = {}) => {
      const session = findSession(problemId, sessionId);
      if (!session) return;

      if (!canEditSession(session, socket.id)) {
        socket.emit("session:permission:error", {
          message: "You do not have edit permission right now",
        });
        return;
      }

      session.drawStrokes = [];
      io.to(getSessionRoom(problemId, sessionId)).emit("session:draw:cleared");
    });

    socket.on("disconnect", () => {
      const oldMembership = removeMembership(socket.id);
      if (!oldMembership) return;

      emitSessionParticipants(io, oldMembership.problemId, oldMembership.sessionId);
      broadcastSessionLists(io, oldMembership.problemId);
    });
  });

  return io;
}

module.exports = { setupSessionHub };
