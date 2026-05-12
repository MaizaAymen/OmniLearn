const express = require("express");
const router = express.Router();
const { User, SavedRoadmap } = require("../models");
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
    attributes: ["id", "title", "progress", "isActive", "createdAt", "updatedAt"],
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

  if (!allCompleted || !allQuizzed || avgScore < 80) {
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

module.exports = router;
