const express = require("express");
const router = express.Router();
const { Notification } = require("../models");
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

module.exports = router;
