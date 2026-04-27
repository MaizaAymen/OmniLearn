// Simple Socket.IO setup for messaging + notifications.
// Reuses the io instance created by sessionHub.

function setupMessageHub(io) {
  io.on("connection", (socket) => {
    // Client passes its userId via handshake auth: io(url, { auth: { userId } })
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
    }

    socket.on("conversation:join", ({ conversationId }) => {
      if (conversationId) socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", ({ conversationId }) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });
  });
}

// Emit a new message to all conversation members in real time.
function emitMessage(io, conversationId, message) {
  if (!io || !conversationId) return;
  io.to(`conversation:${conversationId}`).emit("message:new", message);
}

// Emit a new notification to its target user in real time.
function emitNotification(io, userId, notification) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit("notification:new", notification);
}

module.exports = { setupMessageHub, emitMessage, emitNotification };
