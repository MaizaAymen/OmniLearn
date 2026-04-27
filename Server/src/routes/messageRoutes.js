const express = require("express");
const { Op } = require("sequelize");
const router = express.Router();
const { Conversation, Message, Notification } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");
const { emitMessage, emitNotification } = require("../realtime/messageHub");

router.use(authenticate);

const io = (req) => req.app.get("io");

// POST /api/messages/send
// body: { conversationId, content }
router.post("/send", async (req, res) => {
  try {
    const { conversationId, content } = req.body || {};
    if (!conversationId || !content) {
      return res.status(400).json({ error: "conversationId and content are required" });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (!conversation.members.includes(req.user.id)) {
      return res.status(403).json({ error: "Not a member of this conversation" });
    }

    const message = await Message.create({
      conversationId: conversation.id,
      senderId: req.user.id,
      content: String(content).slice(0, 5000),
    });

    // Bump conversation updatedAt for sorting in lists.
    conversation.changed("updatedAt", true);
    await conversation.save();

    emitMessage(io(req), conversation.id, message);

    res.status(201).json(message);
  } catch (err) {
    console.error("send:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/messages/private
// body: { recipientId, content }
// Auto-creates the 1-to-1 conversation if it does not exist.
router.post("/private", async (req, res) => {
  try {
    const { recipientId, content } = req.body || {};
    if (!recipientId || !content) {
      return res.status(400).json({ error: "recipientId and content are required" });
    }
    if (recipientId === req.user.id) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    // Find existing private conversation between these two users.
    let conversation = await Conversation.findOne({
      where: {
        type: "private",
        members: { [Op.contains]: [req.user.id, recipientId] },
      },
    });
    // Tighten match: members must be exactly 2.
    if (conversation && conversation.members.length !== 2) conversation = null;

    if (!conversation) {
      conversation = await Conversation.create({
        type: "private",
        members: [req.user.id, recipientId],
      });
    }

    const message = await Message.create({
      conversationId: conversation.id,
      senderId: req.user.id,
      content: String(content).slice(0, 5000),
    });

    conversation.changed("updatedAt", true);
    await conversation.save();

    emitMessage(io(req), conversation.id, message);

    // Notify recipient.
    const notif = await Notification.create({
      userId: recipientId,
      type: "message",
      message: `${req.user.firstname || "Someone"} sent you a message`,
      link: `/conversations/${conversation.id}`,
    });
    emitNotification(io(req), recipientId, notif);

    res.status(201).json({ conversation, message });
  } catch (err) {
    console.error("private:", err);
    res.status(500).json({ error: "Failed to send private message" });
  }
});

module.exports = router;
