const express = require("express");
const { Op } = require("sequelize");
const router = express.Router();
const { Conversation, Message, Notification } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");
const { emitNotification } = require("../realtime/messageHub");

router.use(authenticate);

const io = (req) => req.app.get("io");

// Case-insensitive uniqueness check for group names.
async function isGroupNameTaken(name, excludeId = null) {
  const where = {
    type: "group",
    name: { [Op.iLike]: name },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await Conversation.findOne({ where });
  return Boolean(existing);
}

// POST /api/conversations/create-group
// body: { name, memberIds: [userId, ...] }
router.post("/create-group", async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body || {};
    const creatorId = req.user.id;

    const trimmedName = String(name || "").trim().slice(0, 120);
    if (!trimmedName) {
      return res.status(400).json({ error: "Group name is required" });
    }
    if (await isGroupNameTaken(trimmedName)) {
      return res.status(409).json({ error: "A group with this name already exists" });
    }

    const pendingInvites = Array.from(
      new Set(memberIds.filter((id) => id && id !== creatorId))
    );

    const conversation = await Conversation.create({
      type: "group",
      name: trimmedName,
      ownerId: creatorId,
      members: [creatorId],
      pendingInvites,
    });

    // Send an invite notification to each invited user.
    for (const userId of pendingInvites) {
      const notif = await Notification.create({
        userId,
        type: "invite",
        message: `${req.user.firstname || "Someone"} invited you to "${conversation.name}"`,
        data: { conversationId: conversation.id },
      });
      emitNotification(io(req), userId, notif);
    }

    res.status(201).json(conversation);
  } catch (err) {
    console.error("create-group:", err);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// POST /api/conversations/invite — owner only
// body: { conversationId, userId }
router.post("/invite", async (req, res) => {
  try {
    const { conversationId, userId } = req.body || {};
    if (!conversationId || !userId) {
      return res.status(400).json({ error: "conversationId and userId are required" });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (conversation.type !== "group") {
      return res.status(400).json({ error: "Can only invite to group conversations" });
    }
    if (conversation.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Only the owner can invite users" });
    }
    if (conversation.members.includes(userId)) {
      return res.status(400).json({ error: "User is already a member" });
    }
    if (conversation.pendingInvites.includes(userId)) {
      return res.status(400).json({ error: "User has already been invited" });
    }
    if (conversation.bannedIds.includes(userId)) {
      return res.status(403).json({ error: "This user is banned from the group" });
    }

    conversation.pendingInvites = [...conversation.pendingInvites, userId];
    await conversation.save();

    const notif = await Notification.create({
      userId,
      type: "invite",
      message: `${req.user.firstname || "Someone"} invited you to "${conversation.name}"`,
      data: { conversationId: conversation.id },
    });
    emitNotification(io(req), userId, notif);

    res.json(conversation);
  } catch (err) {
    console.error("invite:", err);
    res.status(500).json({ error: "Failed to invite user" });
  }
});

// POST /api/conversations/:id/accept — invited user joins the group
router.post("/:id/accept", async (req, res) => {
  try {
    const conversation = await Conversation.findByPk(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (!conversation.pendingInvites.includes(req.user.id)) {
      return res.status(403).json({ error: "No pending invite for this group" });
    }
    if (conversation.bannedIds.includes(req.user.id)) {
      return res.status(403).json({ error: "You are banned from this group" });
    }

    conversation.pendingInvites = conversation.pendingInvites.filter((id) => id !== req.user.id);
    if (!conversation.members.includes(req.user.id)) {
      conversation.members = [...conversation.members, req.user.id];
    }
    await conversation.save();

    res.json(conversation);
  } catch (err) {
    console.error("accept:", err);
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

// POST /api/conversations/:id/reject — invited user dismisses the invite
router.post("/:id/reject", async (req, res) => {
  try {
    const conversation = await Conversation.findByPk(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (!conversation.pendingInvites.includes(req.user.id)) {
      return res.status(403).json({ error: "No pending invite for this group" });
    }

    conversation.pendingInvites = conversation.pendingInvites.filter((id) => id !== req.user.id);
    await conversation.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("reject:", err);
    res.status(500).json({ error: "Failed to reject invite" });
  }
});

// PUT /api/conversations/:id — rename group (owner only)
router.put("/:id", async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });

    const conversation = await Conversation.findByPk(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (conversation.type !== "group") {
      return res.status(400).json({ error: "Only groups can be renamed" });
    }
    if (conversation.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Only the owner can rename this group" });
    }

    const trimmedName = name.trim().slice(0, 120);
    if (await isGroupNameTaken(trimmedName, conversation.id)) {
      return res.status(409).json({ error: "A group with this name already exists" });
    }

    conversation.name = trimmedName;
    await conversation.save();

    // Notify members of the new name (skip owner).
    for (const userId of conversation.members) {
      if (userId === req.user.id) continue;
      const notif = await Notification.create({
        userId,
        type: "info",
        message: `Group renamed to "${conversation.name}"`,
        data: { conversationId: conversation.id },
      });
      emitNotification(io(req), userId, notif);
    }

    res.json(conversation);
  } catch (err) {
    console.error("rename:", err);
    res.status(500).json({ error: "Failed to rename group" });
  }
});

// DELETE /api/conversations/:id — owner only
router.delete("/:id", async (req, res) => {
  try {
    const conversation = await Conversation.findByPk(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (conversation.type !== "group") {
      return res.status(400).json({ error: "Only groups can be deleted this way" });
    }
    if (conversation.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Only the owner can delete this group" });
    }

    const recipients = [...new Set([...conversation.members, ...conversation.pendingInvites])]
      .filter((id) => id !== req.user.id);
    const groupName = conversation.name;

    await Message.destroy({ where: { conversationId: conversation.id } });
    await conversation.destroy();

    for (const userId of recipients) {
      const notif = await Notification.create({
        userId,
        type: "info",
        message: `The group "${groupName}" was deleted by the owner`,
      });
      emitNotification(io(req), userId, notif);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("delete:", err);
    res.status(500).json({ error: "Failed to delete group" });
  }
});

// POST /api/conversations/:id/leave
router.post("/:id/leave", async (req, res) => {
  const c = await Conversation.findByPk(req.params.id);
  if (!c) return res.status(404).json({ error: "Not found" });
  c.members = c.members.filter((id) => id !== req.user.id);
  await c.save();
  res.json({ ok: true });
});

// POST /api/conversations/:id/ban — body: { userId } (owner only)
router.post("/:id/ban", async (req, res) => {
  const { userId } = req.body || {};
  const c = await Conversation.findByPk(req.params.id);
  if (!c) return res.status(404).json({ error: "Not found" });
  if (c.ownerId !== req.user.id) return res.status(403).json({ error: "Owner only" });
  c.members   = c.members.filter((id) => id !== userId);
  c.bannedIds = Array.from(new Set([...c.bannedIds, userId]));
  await c.save();

  const notif = await Notification.create({
    userId,
    type: "info",
    message: `You were banned from "${c.name}"`,
  });
  emitNotification(io(req), userId, notif);

  res.json(c);
});

// GET /api/conversations  — list current user's conversations
router.get("/", async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      where: { members: { [Op.contains]: [req.user.id] } },
      order: [["updatedAt", "DESC"]],
    });
    res.json(conversations);
  } catch (err) {
    console.error("list conversations:", err);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// GET /api/conversations/:id/messages
router.get("/:id/messages", async (req, res) => {
  try {
    const conversation = await Conversation.findByPk(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Not found" });
    if (!conversation.members.includes(req.user.id)) {
      return res.status(403).json({ error: "Not a member" });
    }
    const messages = await Message.findAll({
      where: { conversationId: conversation.id },
      order: [["createdAt", "ASC"]],
    });
    res.json(messages);
  } catch (err) {
    console.error("list messages:", err);
    res.status(500).json({ error: "Failed to list messages" });
  }
});

module.exports = router;
