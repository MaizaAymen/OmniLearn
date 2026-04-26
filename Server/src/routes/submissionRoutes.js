const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { CodeSubmission, StudentProblemSet, Problem } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");

router.use(authenticate);

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
    // Students can only see their own submissions
    if (req.user.role === "student" && req.user.id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const [submissions, problemSets, yearSubmissions] = await Promise.all([
      CodeSubmission.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        limit: 50,
      }),
      StudentProblemSet.findAll({ where: { studentId: userId } }),
      CodeSubmission.findAll({
        where: { userId, createdAt: { [Op.gte]: yearStart } },
        attributes: ["createdAt", "language"],
        raw: true,
      }),
    ]);

    const solvedProblemIds = problemSets
      .filter((p) => p.status === "solved")
      .map((p) => p.problemId);
    const solved = solvedProblemIds.length;
    const attempted = problemSets.filter((p) => p.status === "attempted").length;

    const languageBreakdown = {};
    for (const s of yearSubmissions) {
      const lang = (s.language || "unknown").toLowerCase();
      languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;
    }

    const difficultyBreakdown = { Easy: 0, Medium: 0, Hard: 0 };
    if (solvedProblemIds.length && Problem) {
      const solvedProblems = await Problem.findAll({
        where: { id: { [Op.in]: solvedProblemIds } },
        attributes: ["id", "difficulty"],
        raw: true,
      });
      for (const p of solvedProblems) {
        if (difficultyBreakdown[p.difficulty] !== undefined) {
          difficultyBreakdown[p.difficulty]++;
        }
      }
    }

    res.json({
      submissions,
      solvedProblemIds,
      stats: { solved, attempted, total: problemSets.length },
      yearSubmissions: yearSubmissions.map((s) => ({
        createdAt: s.createdAt,
        language: s.language,
      })),
      languageBreakdown,
      difficultyBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
