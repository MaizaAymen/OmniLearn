const express = require("express");
const router = express.Router();
const { User, SavedRoadmap, Class, Enrollment } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");
const {
  generateRoadmapGraph,
  enrichGraphWithResources,
  fetchStackOverflow,
  fetchYouTube,
  fetchDocs,
} = require("../ai/RoadmapService");

/* ── helpers ───────────────────────────────────────────────────────── */
function computeProgress(graph) {
  const nodes = graph?.nodes || [];
  if (!nodes.length) return 0;
  return Math.round(nodes.filter((n) => n.status === "completed").length / nodes.length * 100);
}

async function getActive(userId) {
  return SavedRoadmap.findOne({ where: { userId, isActive: true } });
}

async function setActive(userId, id) {
  await SavedRoadmap.update({ isActive: false }, { where: { userId } });
  await SavedRoadmap.update({ isActive: true  }, { where: { id, userId } });
}

/* ── GET /me — active roadmap + profile ────────────────────────────── */
router.get("/me", authenticate, async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ["id", "careerGoal", "interests", "programmingLanguages", "problems"],
  });
  if (!user) return res.status(404).json({ error: "user not found" });

  const active = await getActive(req.user.id);
  res.json({
    careerGoal: user.careerGoal || "",
    interests: user.interests || [],
    programmingLanguages: user.programmingLanguages || [],
    problems: user.problems || [],
    roadmap: active?.graph || null,
    roadmapProgress: active?.progress || 0,
    activeRoadmapId: active?.id || null,
    certificateIssuedAt: active?.certificateIssuedAt || null,
  });
});

/* ── GET /list — all roadmaps for the user ─────────────────────────── */
router.get("/list", authenticate, async (req, res) => {
  const roadmaps = await SavedRoadmap.findAll({
    where: { userId: req.user.id },
    attributes: ["id", "title", "progress", "isActive", "certificateIssuedAt", "createdAt", "updatedAt"],
    order: [["createdAt", "DESC"]],
  });
  res.json(roadmaps);
});

/* ── POST /switch/:id — activate a saved roadmap ───────────────────── */
router.post("/switch/:id", authenticate, async (req, res) => {
  const rm = await SavedRoadmap.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!rm) return res.status(404).json({ error: "roadmap not found" });
  await setActive(req.user.id, rm.id);
  res.json({ ok: true, roadmap: rm.graph, progress: rm.progress });
});

/* ── DELETE /:id — remove a roadmap ───────────────────────────────── */
router.delete("/:id", authenticate, async (req, res) => {
  const rm = await SavedRoadmap.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!rm) return res.status(404).json({ error: "roadmap not found" });

  const wasActive = rm.isActive;
  await rm.destroy();

  // If deleted was active, promote the most recent remaining one.
  if (wasActive) {
    const next = await SavedRoadmap.findOne({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    if (next) { next.isActive = true; await next.save(); }
  }
  res.json({ ok: true });
});

/* ── PATCH /:id/title — rename a roadmap ──────────────────────────── */
router.patch("/:id/title", authenticate, async (req, res) => {
  const { title } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "title required" });
  const rm = await SavedRoadmap.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!rm) return res.status(404).json({ error: "roadmap not found" });
  rm.title = String(title).slice(0, 255);
  await rm.save();
  res.json({ ok: true, title: rm.title });
});

/* ── PUT /profile ──────────────────────────────────────────────────── */
router.put("/profile", authenticate, async (req, res) => {
  const { careerGoal, interests, programmingLanguages, problems } = req.body || {};
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: "user not found" });
  if (careerGoal !== undefined) user.careerGoal = String(careerGoal).slice(0, 255);
  if (Array.isArray(interests)) user.interests = interests.slice(0, 30);
  if (Array.isArray(programmingLanguages)) user.programmingLanguages = programmingLanguages.slice(0, 30);
  if (Array.isArray(problems)) user.problems = problems.slice(0, 50);
  user.changed("careerGoal", true);
  await user.save();
  res.json({ ok: true });
});

const ROADMAP_LIMITS = { free: 2, pro: 20, institution: Infinity };

/* ── POST /generate — create a new SavedRoadmap ────────────────────── */
router.post("/generate", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "user not found" });

    // Enforce per-plan roadmap cap.
    const existing = await SavedRoadmap.findAll({ where: { userId: req.user.id }, attributes: ["graph"] });
    const limit = ROADMAP_LIMITS[user.plan] ?? ROADMAP_LIMITS.free;
    if (user.role !== "admin" && isFinite(limit) && existing.length >= limit) {
      return res.status(403).json({
        error: `${user.plan === "free" ? "Free" : "Pro"} plan is limited to ${limit} roadmaps.${user.plan === "free" ? " Upgrade to Pro to create more." : ""}`,
        limitReached: true,
        limit,
        count: existing.length,
      });
    }
    const solved = existing.flatMap((r) =>
      (r.graph?.nodes || []).filter((n) => n.status === "completed").map((n) => n.title)
    );

    const graph = await generateRoadmapGraph({
      careerGoal: user.careerGoal,
      interests: user.interests,
      programmingLanguages: user.programmingLanguages,
      problems: user.problems,
      solved,
    });

    await enrichGraphWithResources(graph);

    const title = user.careerGoal
      ? `${user.careerGoal} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : `Roadmap ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    // Deactivate all, then create new active one.
    await SavedRoadmap.update({ isActive: false }, { where: { userId: req.user.id } });
    const rm = await SavedRoadmap.create({
      userId: req.user.id,
      title,
      graph: JSON.parse(JSON.stringify(graph)),
      progress: computeProgress(graph),
      isActive: true,
    });

    res.json({ ...graph, roadmapId: rm.id, title: rm.title });
  } catch (err) {
    console.error("[roadmap/generate]", err);
    res.status(500).json({ error: err.message || "generation failed" });
  }
});

/* ── POST /node/:nodeId/status ─────────────────────────────────────── */
router.post("/node/:nodeId/status", authenticate, async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "in_progress", "completed"].includes(status))
    return res.status(400).json({ error: "invalid status" });

  const rm = await getActive(req.user.id);
  if (!rm) return res.status(404).json({ error: "no active roadmap" });

  const graph = JSON.parse(JSON.stringify(rm.graph));
  const node = (graph.nodes || []).find((n) => n.id === req.params.nodeId);
  if (!node) return res.status(404).json({ error: "node not found" });

  node.status = status;
  rm.graph = graph;
  rm.progress = computeProgress(graph);
  rm.changed("graph", true);
  await rm.save();

  res.json({ ok: true, roadmapProgress: rm.progress });
});

/* ── POST /node/:nodeId/quiz-submit — score quiz, auto-update status ── */
// Body: { score: 0-100 }
// score >= passingScore  → status = "completed"
// score >= 50            → status = "in_progress"
// score < 50             → status stays, return feedback
router.post("/node/:nodeId/quiz-submit", authenticate, async (req, res) => {
  const { score } = req.body || {};
  if (typeof score !== "number") return res.status(400).json({ error: "score required" });

  const rm = await getActive(req.user.id);
  if (!rm) return res.status(404).json({ error: "no active roadmap" });

  const graph = JSON.parse(JSON.stringify(rm.graph));
  const node  = (graph.nodes || []).find((n) => n.id === req.params.nodeId);
  if (!node) return res.status(404).json({ error: "node not found" });

  const passing = node.quiz?.passingScore ?? 80;
  const passed  = score >= passing;

  // Update status
  node.status = passed ? "completed" : score >= 50 ? "in_progress" : node.status || "pending";

  // Save this attempt so the client can show it next time
  if (!node.quizAttempts) node.quizAttempts = [];
  node.quizAttempts.push({ score, passed, date: new Date().toISOString() });

  // Keep track of the best score ever
  node.bestScore = Math.max(node.bestScore ?? 0, score);

  rm.graph    = graph;
  rm.progress = computeProgress(graph);
  rm.changed("graph", true);
  await rm.save();

  res.json({ ok: true, status: node.status, passed, progress: rm.progress, bestScore: node.bestScore });
});

/* ── POST /certificate/issue — mark certificate as earned ─────────── */
// The client already verified eligibility; we just stamp the date.
router.post("/certificate/issue", authenticate, async (req, res) => {
  const rm = await getActive(req.user.id);
  if (!rm) return res.status(404).json({ error: "no active roadmap" });

  // Double-check on server: all nodes completed + all quizzed + avg >= 80
  const nodes = rm.graph?.nodes || [];
  const allCompleted = nodes.every((n) => n.status === "completed");
  const allQuizzed   = nodes.every((n) => (n.quizAttempts || []).length > 0);
  const avgScore     = nodes.length
    ? Math.round(nodes.reduce((sum, n) => sum + (n.bestScore || 0), 0) / nodes.length)
    : 0;

  if (!allCompleted ) {
    return res.status(400).json({ error: "Not eligible yet", allCompleted, allQuizzed, avgScore });
  }

  rm.certificateIssuedAt = new Date();
  await rm.save();

  res.json({ ok: true, issuedAt: rm.certificateIssuedAt, avgScore, title: rm.title });
});

/* ── GET /node/:nodeId/resources — serve cached or live ────────────── */
router.get("/node/:nodeId/resources", authenticate, async (req, res) => {
  const rm = await getActive(req.user.id);
  const node = (rm?.graph?.nodes || []).find((n) => n.id === req.params.nodeId);
  if (!node) return res.status(404).json({ error: "node not found" });

  if (node.resources) return res.json(node.resources);

  // Legacy fallback for roadmaps generated before enrichment.
  const [stackoverflow, youtube, docs] = await Promise.all([
    fetchStackOverflow(node.stackoverflowQuery || node.title, 5),
    fetchYouTube(node.youtubeQuery || node.title, 3),
    fetchDocs(node.title, node.youtubeQuery),
  ]);
  res.json({ stackoverflow, youtube, docs });
});

/* ═════════════════════════════════════════════════════════════════════
 * CLASSROOM ROADMAPS — teacher publishes one master roadmap to a class,
 * every enrolled student gets their own copy with personal progress.
 * ═════════════════════════════════════════════════════════════════════ */

// helper: is this user the teacher of this classroom (or platform admin)?
async function isClassTeacher(user, classId) {
  if (user.role === "admin") return true;
  const klass = await Class.findByPk(classId);
  return !!klass && klass.teacherId === user.id;
}

// helper: is this user enrolled in this classroom?
async function isEnrolledStudent(user, classId) {
  const e = await Enrollment.findOne({ where: { classId, studentId: user.id } });
  return !!e;
}

/* ── POST /classroom/:classId/generate — teacher creates + auto-shares ── */
router.post("/classroom/:classId/generate", authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    if (!(await isClassTeacher(req.user, classId))) {
      return res.status(403).json({ error: "Only the classroom's teacher can create a roadmap." });
    }

    const { title, careerGoal, interests = [], programmingLanguages = [] } = req.body || {};

    // Generate + enrich using the SAME pipeline as personal roadmaps.
    const graph = await generateRoadmapGraph({
      careerGoal: careerGoal || title || "General Learning",
      interests,
      programmingLanguages,
      problems: [],
      solved: [],
    });
    await enrichGraphWithResources(graph);

    // Remove any previous master for this class (only one classroom roadmap at a time).
    const oldMasters = await SavedRoadmap.findAll({ where: { classId, parentRoadmapId: null } });
    for (const m of oldMasters) {
      await SavedRoadmap.destroy({ where: { parentRoadmapId: m.id } }); // drop old student copies
      await m.destroy();
    }

    // Create the teacher's master roadmap.
    const master = await SavedRoadmap.create({
      userId: req.user.id,
      classId,
      parentRoadmapId: null,
      title: title || careerGoal || "Classroom Roadmap",
      graph: JSON.parse(JSON.stringify(graph)),
      progress: 0,
      isActive: false,
    });

    // Clone one copy per enrolled student.
    const enrollments = await Enrollment.findAll({ where: { classId } });
    for (const e of enrollments) {
      const cleanGraph = JSON.parse(JSON.stringify(graph));
      (cleanGraph.nodes || []).forEach((n) => {
        n.status = "pending";
        n.quizAttempts = [];
        n.bestScore = 0;
      });
      await SavedRoadmap.create({
        userId: e.studentId,
        classId,
        parentRoadmapId: master.id,
        title: master.title,
        graph: cleanGraph,
        progress: 0,
        isActive: false,
      });
    }

    res.json({ ok: true, roadmapId: master.id, title: master.title, graph: master.graph });
  } catch (err) {
    console.error("[classroom-roadmap/generate]", err);
    res.status(500).json({ error: err.message || "generation failed" });
  }
});

/* ── GET /classroom/:classId — current roadmap for this user in this class ── */
// Teacher: returns the master. Student: returns their own copy (auto-creates one if missing).
router.get("/classroom/:classId", authenticate, async (req, res) => {
  const { classId } = req.params;

  const master = await SavedRoadmap.findOne({ where: { classId, parentRoadmapId: null } });
  if (!master) return res.json({ roadmap: null });

  if (await isClassTeacher(req.user, classId)) {
    return res.json({ roadmap: master, isTeacher: true });
  }

  if (!(await isEnrolledStudent(req.user, classId))) {
    return res.status(403).json({ error: "Not enrolled in this classroom." });
  }

  let mine = await SavedRoadmap.findOne({
    where: { classId, parentRoadmapId: master.id, userId: req.user.id },
  });

  // Student joined after publish — create their copy on the fly.
  if (!mine) {
    const cleanGraph = JSON.parse(JSON.stringify(master.graph || { nodes: [], edges: [] }));
    (cleanGraph.nodes || []).forEach((n) => {
      n.status = "pending";
      n.quizAttempts = [];
      n.bestScore = 0;
    });
    mine = await SavedRoadmap.create({
      userId: req.user.id,
      classId,
      parentRoadmapId: master.id,
      title: master.title,
      graph: cleanGraph,
      progress: 0,
      isActive: false,
    });
  }

  res.json({ roadmap: mine, isTeacher: false });
});

/* ── GET /classroom/:classId/dashboard — teacher only ── */
router.get("/classroom/:classId/dashboard", authenticate, async (req, res) => {
  const { classId } = req.params;
  if (!(await isClassTeacher(req.user, classId))) {
    return res.status(403).json({ error: "Teacher only." });
  }

  const master = await SavedRoadmap.findOne({ where: { classId, parentRoadmapId: null } });
  if (!master) return res.json({ master: null, students: [], classAverage: 0 });

  const copies = await SavedRoadmap.findAll({
    where: { classId, parentRoadmapId: master.id },
    include: [{ model: User, as: "user", attributes: ["id", "firstname", "lastname", "email"] }],
  });

  const students = copies.map((c) => {
    const nodes = c.graph?.nodes || [];
    const scored = nodes.filter((n) => typeof n.bestScore === "number" && (n.quizAttempts || []).length);
    const avgQuizScore = scored.length
      ? Math.round(scored.reduce((s, n) => s + (n.bestScore || 0), 0) / scored.length)
      : 0;
    return {
      studentId: c.user?.id,
      name: c.user ? `${c.user.firstname || ""} ${c.user.lastname || ""}`.trim() || c.user.email : "—",
      email: c.user?.email,
      progress: c.progress || 0,
      avgQuizScore,
      lastActivityAt: c.updatedAt,
      certificateIssuedAt: c.certificateIssuedAt,
    };
  });

  const classAverage = students.length
    ? Math.round(students.reduce((s, x) => s + x.progress, 0) / students.length)
    : 0;

  res.json({
    master: { id: master.id, title: master.title, graph: master.graph, createdAt: master.createdAt },
    classAverage,
    students,
  });
});

/* ── DELETE /classroom/:classId — teacher removes the class roadmap ── */
router.delete("/classroom/:classId", authenticate, async (req, res) => {
  const { classId } = req.params;
  if (!(await isClassTeacher(req.user, classId))) {
    return res.status(403).json({ error: "Teacher only." });
  }
  const master = await SavedRoadmap.findOne({ where: { classId, parentRoadmapId: null } });
  if (!master) return res.json({ ok: true });
  await SavedRoadmap.destroy({ where: { parentRoadmapId: master.id } });
  await master.destroy();
  res.json({ ok: true });
});

/* ── POST /classroom/:classId/node/:nodeId/status — student marks status on own copy ── */
router.post("/classroom/:classId/node/:nodeId/status", authenticate, async (req, res) => {
  const { classId, nodeId } = req.params;
  const { status } = req.body || {};
  if (!["pending", "in_progress", "completed"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  const mine = await SavedRoadmap.findOne({
    where: { classId, userId: req.user.id },
  });
  if (!mine || mine.parentRoadmapId == null) {
    return res.status(404).json({ error: "no student copy found" });
  }
  const graph = JSON.parse(JSON.stringify(mine.graph));
  const node = (graph.nodes || []).find((n) => n.id === nodeId);
  if (!node) return res.status(404).json({ error: "node not found" });
  node.status = status;
  mine.graph = graph;
  mine.progress = computeProgress(graph);
  mine.changed("graph", true);
  await mine.save();
  res.json({ ok: true, progress: mine.progress });
});

/* ── POST /classroom/:classId/node/:nodeId/quiz-submit — same as personal, on own copy ── */
router.post("/classroom/:classId/node/:nodeId/quiz-submit", authenticate, async (req, res) => {
  const { classId, nodeId } = req.params;
  const { score } = req.body || {};
  if (typeof score !== "number") return res.status(400).json({ error: "score required" });

  const mine = await SavedRoadmap.findOne({
    where: { classId, userId: req.user.id },
  });
  if (!mine || mine.parentRoadmapId == null) {
    return res.status(404).json({ error: "no student copy found" });
  }
  const graph = JSON.parse(JSON.stringify(mine.graph));
  const node = (graph.nodes || []).find((n) => n.id === nodeId);
  if (!node) return res.status(404).json({ error: "node not found" });

  const passing = node.quiz?.passingScore ?? 80;
  const passed = score >= passing;
  node.status = passed ? "completed" : score >= 50 ? "in_progress" : node.status || "pending";
  if (!node.quizAttempts) node.quizAttempts = [];
  node.quizAttempts.push({ score, passed, date: new Date().toISOString() });
  node.bestScore = Math.max(node.bestScore ?? 0, score);

  mine.graph = graph;
  mine.progress = computeProgress(graph);
  mine.changed("graph", true);
  await mine.save();

  res.json({ ok: true, status: node.status, passed, progress: mine.progress, bestScore: node.bestScore });
});

module.exports = router;
