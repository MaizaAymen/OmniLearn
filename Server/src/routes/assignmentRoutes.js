const express = require("express");
const router = express.Router();
const { ClassAssignment, StudentProblemSet, Enrollment, User, Notification } = require("../models");
const { authenticate, requireAdminOrTeacher } = require("../middleware/Authmiddleware");
const { emitNotification } = require("../realtime/messageHub");

router.use(authenticate);

// POST /api/assignments — teacher creates a draft assignment
router.post("/", requireAdminOrTeacher, async (req, res) => {
  try {
    const { moduleId, classId, title, problemIds, dueDate, maxAttempts, language } = req.body;
    if (!title || !problemIds?.length) {
      return res.status(400).json({ error: "title and problemIds are required" });
    }
    const assignment = await ClassAssignment.create({
      moduleId: moduleId || null,
      classId: classId || null,
      title,
      problemIds,
      dueDate: dueDate || null,
      maxAttempts: maxAttempts || null,
      language: language || null,
      isPublished: false,
    });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/module/:moduleId
// Teacher sees all (draft + published); student sees only published
router.get("/module/:moduleId", async (req, res) => {
  try {
    const isTeacher = ["admin", "teacher", "institution_admin"].includes(req.user.role);
    const where = { moduleId: req.params.moduleId };
    if (!isTeacher) where.isPublished = true;
    const assignments = await ClassAssignment.findAll({ where, order: [["createdAt", "ASC"]] });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/student/:studentId/module/:moduleId
// Returns published assignments enriched with per-student solved status
router.get("/student/:studentId/module/:moduleId", async (req, res) => {
  try {
    const { studentId, moduleId } = req.params;
    const [assignments, solvedRecords] = await Promise.all([
      ClassAssignment.findAll({ where: { moduleId, isPublished: true }, order: [["createdAt", "ASC"]] }),
      StudentProblemSet.findAll({ where: { studentId, status: "solved" } }),
    ]);
    const solvedSet = new Set(solvedRecords.map((r) => r.problemId));
    const result = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      problemIds: a.problemIds,
      dueDate: a.dueDate,
      maxAttempts: a.maxAttempts,
      isPublished: a.isPublished,
      language: a.language,
      solvedIds: a.problemIds.filter((pid) => solvedSet.has(pid)),
      solved: a.problemIds.filter((pid) => solvedSet.has(pid)).length,
      total: a.problemIds.length,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/assignments/:id — edit title, problems, due date, max attempts
router.put("/:id", requireAdminOrTeacher, async (req, res) => {
  try {
    const a = await ClassAssignment.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: "Not found" });
    const { title, problemIds, dueDate, maxAttempts, language } = req.body;
    await a.update({
      title: title ?? a.title,
      problemIds: problemIds ?? a.problemIds,
      dueDate: dueDate !== undefined ? (dueDate || null) : a.dueDate,
      maxAttempts: maxAttempts !== undefined ? (maxAttempts || null) : a.maxAttempts,
      language: language !== undefined ? (language || null) : a.language,
    });
    res.json(a);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/assignments/:id/publish — toggle published + notify students on first publish
router.put("/:id/publish", requireAdminOrTeacher, async (req, res) => {
  try {
    const a = await ClassAssignment.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: "Not found" });
    const wasPublished = a.isPublished;
    await a.update({ isPublished: !wasPublished });

    if (!wasPublished && a.classId) {
      const io = req.app.get("io");
      const enrollments = await Enrollment.findAll({ where: { classId: a.classId } });
      for (const e of enrollments) {
        const notif = await Notification.create({
          userId: e.studentId,
          type: "assignment",
          title: "New assignment",
          message: `New assignment published: "${a.title}"`,
        });
        emitNotification(io, e.studentId, notif);
      }
    }
    res.json(a);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/:id/roster — per-student completion grid for teacher
router.get("/:id/roster", requireAdminOrTeacher, async (req, res) => {
  try {
    const assignment = await ClassAssignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Not found" });

    if (!assignment.classId) return res.json({ students: [], total: 0 });

    const enrollments = await Enrollment.findAll({
      where: { classId: assignment.classId },
      include: [{ model: User, as: "student", attributes: ["id", "firstname", "lastname", "email"] }],
    });

    const studentIds = enrollments.map((e) => e.studentId);
    const solved = await StudentProblemSet.findAll({
      where: { studentId: studentIds, problemId: assignment.problemIds, status: "solved" },
    });

    const solvedMap = {};
    for (const r of solved) {
      if (!solvedMap[r.studentId]) solvedMap[r.studentId] = new Set();
      solvedMap[r.studentId].add(r.problemId);
    }

    const students = enrollments.map((e) => ({
      id: e.student.id,
      name: `${e.student.firstname} ${e.student.lastname}`,
      email: e.student.email,
      solvedIds: assignment.problemIds.filter((pid) => solvedMap[e.studentId]?.has(pid)),
    }));

    res.json({ students, total: enrollments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/:id/stats — aggregate solve counts per problem
router.get("/:id/stats", requireAdminOrTeacher, async (req, res) => {
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
router.delete("/:id", requireAdminOrTeacher, async (req, res) => {
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
