const express = require("express");
const router = express.Router();
const { Notification, Enrollment, Class } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");

router.use(authenticate);

// GET /api/notifications  — list current user's notifications
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    res.json(notifications);
  } catch (err) {
    console.error("list notifications:", err);
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", async (req, res) => {
  try {
    const notif = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    notif.isRead = true;
    await notif.save();
    res.json(notif);
  } catch (err) {
    console.error("read notification:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// POST /api/notifications/:id/accept — accept a classroom-invite notification
router.post("/:id/accept", async (req, res) => {
  try {
    const notif = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    if (notif.type !== "classroom-invite") {
      return res.status(400).json({ error: "Notification is not an invitation" });
    }
    const classId = notif.data?.classId;
    if (!classId) return res.status(400).json({ error: "Invitation is missing classId" });

    const classroom = await Class.findByPk(classId);
    if (!classroom) {
      await notif.destroy();
      return res.status(404).json({ error: "Classroom no longer exists" });
    }

    await Enrollment.findOrCreate({
      where: { classId, studentId: req.user.id },
      defaults: { classId, studentId: req.user.id, status: "active" },
    });
    await notif.destroy();
    res.json({ ok: true, classId });
  } catch (err) {
    console.error("accept invitation:", err);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

// POST /api/notifications/:id/decline — decline a classroom-invite notification
router.post("/:id/decline", async (req, res) => {
  try {
    const notif = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    if (notif.type !== "classroom-invite") {
      return res.status(400).json({ error: "Notification is not an invitation" });
    }
    await notif.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error("decline invitation:", err);
    res.status(500).json({ error: "Failed to decline invitation" });
  }
});

module.exports = router;
