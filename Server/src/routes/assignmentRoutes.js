const express = require("express");
const router = express.Router();
const { ClassAssignment, StudentProblemSet } = require("../models");

// POST /api/assignments — teacher creates an assignment inside a module
router.post("/", async (req, res) => {
  try {
    const { moduleId, title, problemIds, dueDate, maxAttempts } = req.body;
    if (!moduleId || !title || !problemIds?.length) {
      return res.status(400).json({ error: "moduleId, title, and problemIds are required" });
    }
    const assignment = await ClassAssignment.create({
      moduleId, title, problemIds, dueDate: dueDate || null,
      maxAttempts: maxAttempts || null,
    });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/module/:moduleId — teacher: all assignments for a module
router.get("/module/:moduleId", async (req, res) => {
  try {
    const assignments = await ClassAssignment.findAll({
      where: { moduleId: req.params.moduleId },
      order: [["createdAt", "ASC"]],
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/student/:studentId/module/:moduleId
// Returns assignments + per-problem solved status for the student
router.get("/student/:studentId/module/:moduleId", async (req, res) => {
  try {
    const { studentId, moduleId } = req.params;

    const [assignments, solvedRecords] = await Promise.all([
      ClassAssignment.findAll({ where: { moduleId }, order: [["createdAt", "ASC"]] }),
      StudentProblemSet.findAll({ where: { studentId, status: "solved" } }),
    ]);

    const solvedIds = new Set(solvedRecords.map((r) => r.problemId));

    const result = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      problemIds: a.problemIds,
      dueDate: a.dueDate,
      maxAttempts: a.maxAttempts,
      solvedIds: a.problemIds.filter((pid) => solvedIds.has(pid)),
      solved: a.problemIds.filter((pid) => solvedIds.has(pid)).length,
      total: a.problemIds.length,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/:id/stats — teacher: how many students solved each problem
router.get("/:id/stats", async (req, res) => {
  try {
    const assignment = await ClassAssignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Not found" });

    const records = await StudentProblemSet.findAll({
      where: { problemId: assignment.problemIds, status: "solved" },
    });

    const countByProblem = {};
    for (const pid of assignment.problemIds) countByProblem[pid] = 0;
    for (const r of records) {
      if (countByProblem[r.problemId] !== undefined) countByProblem[r.problemId]++;
    }

    res.json({ assignmentId: assignment.id, countByProblem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/assignments/:id
router.delete("/:id", async (req, res) => {
  try {
    const a = await ClassAssignment.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: "Not found" });
    await a.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
