const express = require("express");
const router = express.Router();
const { ExamSubmission } = require("../models");

// GET /api/exams/session/:sessionId/submissions
// Teacher fetches all student snapshots for one exam session.
router.get("/session/:sessionId/submissions", async (req, res) => {
  try {
    const rows = await ExamSubmission.findAll({
      where: { sessionId: req.params.sessionId },
      order: [["createdAt", "ASC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exams/submissions/:id — one submission detail
router.get("/submissions/:id", async (req, res) => {
  try {
    const row = await ExamSubmission.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
