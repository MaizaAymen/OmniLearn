// Minimal collaborative coding hub.
// Two modes:
//   - "classroom": only the host (teacher) can edit; everyone else is read-only.
//   - "pair":      everyone in the room can edit.
// Realtime via Socket.IO; rooms live in memory only.

const express = require("express");

const router = express.Router();
router.use(express.json());

// rooms: Map<roomId, Room>
// Room: {
//   id, mode, code, language,
//   hostId,                       // socket.id of current host (null until first join)
//   hostName,                     // intended host name from /create
//   createdAt,                    // ms epoch
//   users: Map<socketId, {id, name}>,
//   reapTimer: NodeJS.Timeout|null  // TTL for "created but nobody joined"
// }
const rooms = new Map();

const VALID_MODES = new Set(["classroom", "pair"]);
const ORPHAN_TTL_MS = 60 * 1000; // delete created-but-never-joined rooms after 60s

function generateId() {
  return `R-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function publicRoom(room) {
  return {
    id: room.id,
    mode: room.mode,
    language: room.language,
    hostId: room.hostId,
    hostName: room.hostName,
    createdAt: room.createdAt,
    users: [...room.users.values()],
  };
}

function clearReap(room) {
  if (room?.reapTimer) {
    clearTimeout(room.reapTimer);
    room.reapTimer = null;
  }
}

// ---------- HTTP ----------

router.post("/create", (req, res) => {
  const {
    mode = "pair",
    language = "javascript",
    code = "",
    hostName = "Host",
  } = req.body || {};
  if (!VALID_MODES.has(mode)) return res.status(400).json({ error: "Invalid mode" });

  const id = generateId();
  const room = {
    id,
    mode,
    code,
    language,
    hostId: null,
    hostName: String(hostName).slice(0, 60) || "Host",
    createdAt: Date.now(),
    users: new Map(),
    reapTimer: null,
  };
  // Reap orphan rooms that no one ever joins, so the list never fills with ghosts.
  room.reapTimer = setTimeout(() => {
    const r = rooms.get(id);
    if (r && r.users.size === 0) rooms.delete(id);
  }, ORPHAN_TTL_MS);
  rooms.set(id, room);
  res.json({ roomId: id, mode, language, hostName: room.hostName });
});

// List only rooms that have at least one connected user. Empty rooms are either
// being cleaned up or ghosts; either way the UI shouldn't show them.
router.get("/", (req, res) => {
  const list = [...rooms.values()]
    .filter((r) => r.users.size > 0)
    .map(publicRoom);
  res.json({ rooms: list });
});

router.get("/:id", (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({ ...publicRoom(room), code: room.code });
});

// ---------- Socket.IO ----------

function setupSessionHub(io) {
  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, name }, ack) => {
      const room = rooms.get(roomId);
      if (!room) return ack && ack({ error: "Room not found" });

      // First arrival becomes host (teacher in classroom mode). Once anyone is
      // in, the orphan-reap timer is no longer needed.
      if (!room.hostId) {
        room.hostId = socket.id;
        if (name) room.hostName = name;
      }
      clearReap(room);

      room.users.set(socket.id, { id: socket.id, name: name || "Guest" });
      socket.join(roomId);
      socket.data.roomId = roomId;

      ack && ack({
        ok: true,
        room: publicRoom(room),
        code: room.code,
        isHost: room.hostId === socket.id,
      });
      io.to(roomId).emit("room-users", [...room.users.values()]);
    });

    socket.on("code-change", ({ roomId, code }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.mode === "classroom" && socket.id !== room.hostId) return; // students read-only
      room.code = code;
      socket.to(roomId).emit("receive-code", { code });
    });

    socket.on("chat-message", ({ roomId, text }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const user = room.users.get(socket.id);
      const msg = {
        id: `${socket.id}-${Date.now()}`,
        socketId: socket.id,
        name: user?.name || "Guest",
        time: Date.now(),
        text: String(text || "").slice(0, 500),
      };
      io.to(roomId).emit("chat-message", msg);
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;

      room.users.delete(socket.id);
      if (room.hostId === socket.id) {
        room.hostId = room.users.keys().next().value || null;
      }
      if (room.users.size === 0) {
        clearReap(room);
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit("room-users", [...room.users.values()]);
        io.to(roomId).emit("host-changed", { hostId: room.hostId });
      }
    });
  });
}

module.exports = { router, setupSessionHub };
