const express = require("express");
const router = express.Router();
const { CodeSubmission, StudentProblemSet } = require("../models");

// POST /api/submissions — save a submission and upsert the problem record
router.post("/", async (req, res) => {
  try {
    const { userId, problemId, userCode, language, status, score, isCorrect } = req.body;
    if (!userId || !userCode || !language) {
      return res.status(400).json({ error: "userId, userCode, and language are required" });
    }

    const prevCount = await CodeSubmission.count({
      where: { userId, exerciseTitle: problemId || "unknown" },
    });

    const submission = await CodeSubmission.create({
      userId,
      exerciseTitle: problemId || "unknown",
      userCode,
      language,
      status: status || "passed",
      score: score || 0,
      isCorrect: isCorrect || false,
      attemptNumber: prevCount + 1,
    });

    const [record, created] = await StudentProblemSet.findOrCreate({
      where: { studentId: userId, problemId: problemId || "unknown" },
      defaults: {
        status: isCorrect ? "solved" : "attempted",
        bestScore: score || 0,
        attempts: 1,
        lastAttemptAt: new Date(),
      },
    });

    if (!created) {
      await record.update({
        status: isCorrect ? "solved" : record.status,
        bestScore: Math.max(record.bestScore, score || 0),
        attempts: record.attempts + 1,
        lastAttemptAt: new Date(),
      });
    }

    res.json({ submission, problemRecord: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/submissions/:userId — fetch submissions + stats for a student
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [submissions, problemSets] = await Promise.all([
      CodeSubmission.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        limit: 50,
      }),
      StudentProblemSet.findAll({ where: { studentId: userId } }),
    ]);

    const solved = problemSets.filter((p) => p.status === "solved").length;
    const attempted = problemSets.filter((p) => p.status === "attempted").length;

    res.json({
      submissions,
      stats: { solved, attempted, total: problemSets.length },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
