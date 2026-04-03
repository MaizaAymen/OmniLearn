const { Server } = require("socket.io");

// In-memory store: { [problemId]: { [sessionId]: session } }
const sessionsByProblem = {};

const socketToMembership = new Map();

function getProblemSessions(problemId) {
  return sessionsByProblem[problemId] || {};
}

function getSessionRoom(problemId, sessionId) {
  return `problem:${problemId}:session:${sessionId}`;
}

function buildSessionList(problemId) {
  const sessions = Object.values(getProblemSessions(problemId));
  return sessions.map((session) => ({
    id: session.id,
    name: session.name,
    hostName: session.hostName,
    participantCount: Object.keys(session.participants).length,
    createdAt: session.createdAt,
  }));
}

function broadcastSessionList(io, problemId) {
  io.to(`problem:${problemId}:lobby`).emit("session:list", {
    problemId,
    sessions: buildSessionList(problemId),
  });
}

function createSession({ problemId, sessionName, hostName, language, starterCode }) {
  if (!sessionsByProblem[problemId]) {
    sessionsByProblem[problemId] = {};
  }

  const sessionId = `s-${Math.random().toString(36).slice(2, 8)}`;
  sessionsByProblem[problemId][sessionId] = {
    id: sessionId,
    problemId,
    name: sessionName || "Untitled Session",
    hostName,
    createdAt: Date.now(),
    codeByLanguage: {
      [language]: starterCode || "",
    },
    drawStrokes: [],
    participants: {},
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
      delete sessionsByProblem[problemId][sessionId];
      if (Object.keys(sessionsByProblem[problemId]).length === 0) {
        delete sessionsByProblem[problemId];
      }
    }
  }

  socketToMembership.delete(socketId);
  return { problemId, sessionId };
}

function setupSessionHub(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("session:list:subscribe", ({ problemId }) => {
      if (!problemId) return;

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
      const { problemId, sessionName, hostName, language, starterCode } = payload || {};
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
      });

      broadcastSessionList(io, problemId);

      if (ack) {
        ack({ ok: true, sessionId: session.id });
      }
    });

    socket.on("session:join", (payload, ack) => {
      const { problemId, sessionId, userName } = payload || {};
      const session = findSession(problemId, sessionId);

      if (!session) {
        if (ack) ack({ ok: false, message: "Session not found" });
        return;
      }

      const oldMembership = removeMembership(socket.id);
      if (oldMembership?.problemId) {
        socket.leave(getSessionRoom(oldMembership.problemId, oldMembership.sessionId));
        broadcastSessionList(io, oldMembership.problemId);
      }

      socket.join(getSessionRoom(problemId, sessionId));
      session.participants[socket.id] = userName || "Guest";
      socketToMembership.set(socket.id, { problemId, sessionId });

      io.to(getSessionRoom(problemId, sessionId)).emit("session:participants", {
        participants: Object.values(session.participants),
      });

      broadcastSessionList(io, problemId);

      if (ack) {
        ack({
          ok: true,
          session: {
            id: session.id,
            name: session.name,
            codeByLanguage: session.codeByLanguage,
            drawStrokes: session.drawStrokes,
          },
        });
      }
    });

    socket.on("session:leave", () => {
      const oldMembership = removeMembership(socket.id);
      if (!oldMembership) return;

      socket.leave(getSessionRoom(oldMembership.problemId, oldMembership.sessionId));
      const session = findSession(oldMembership.problemId, oldMembership.sessionId);
      if (session) {
        io.to(getSessionRoom(oldMembership.problemId, oldMembership.sessionId)).emit(
          "session:participants",
          { participants: Object.values(session.participants) }
        );
      }
      broadcastSessionList(io, oldMembership.problemId);
    });

    socket.on("session:code:update", (payload) => {
      const { problemId, sessionId, language, code } = payload || {};
      const session = findSession(problemId, sessionId);
      if (!session || !language) return;

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

      session.drawStrokes.push(stroke);
      socket.to(getSessionRoom(problemId, sessionId)).emit("session:draw:added", { stroke });
    });

    socket.on("session:draw:clear", ({ problemId, sessionId } = {}) => {
      const session = findSession(problemId, sessionId);
      if (!session) return;

      session.drawStrokes = [];
      io.to(getSessionRoom(problemId, sessionId)).emit("session:draw:cleared");
    });

    socket.on("disconnect", () => {
      const oldMembership = removeMembership(socket.id);
      if (!oldMembership) return;

      const session = findSession(oldMembership.problemId, oldMembership.sessionId);
      if (session) {
        io.to(getSessionRoom(oldMembership.problemId, oldMembership.sessionId)).emit(
          "session:participants",
          { participants: Object.values(session.participants) }
        );
      }
      broadcastSessionList(io, oldMembership.problemId);
    });
  });

  return io;
}

module.exports = { setupSessionHub };
