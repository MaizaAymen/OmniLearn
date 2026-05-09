// Roadmap REST endpoints — personalized AI problem-solving graph.
const express = require("express");
const router = express.Router();
const { User } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");
const {
  generateRoadmapGraph,
  fetchStackOverflow,
  fetchYouTube,
} = require("../ai/RoadmapService");

// GET current user's roadmap + profile fields used to seed it.
router.get("/me", authenticate, async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: [
      "id", "careerGoal", "interests", "programmingLanguages",
      "problems", "roadmap", "roadmapProgress",
    ],
  });
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json({
    careerGoal: user.careerGoal || "",
    interests: user.interests || [],
    programmingLanguages: user.programmingLanguages || [],
    problems: user.problems || [],
    roadmap: user.roadmap || null,
    roadmapProgress: user.roadmapProgress || 0,
  });
});

// PUT onboarding fields (interests, languages, weaknesses, careerGoal).
router.put("/profile", authenticate, async (req, res) => {
  const { careerGoal, interests, programmingLanguages, problems } = req.body || {};
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: "user not found" });
  if (careerGoal !== undefined) user.careerGoal = String(careerGoal).slice(0, 255);
  if (Array.isArray(interests)) user.interests = interests.slice(0, 30);
  if (Array.isArray(programmingLanguages)) user.programmingLanguages = programmingLanguages.slice(0, 30);
  if (Array.isArray(problems)) user.problems = problems.slice(0, 50);
  await user.save();
  res.json({ ok: true });
});

// POST regenerate the roadmap graph from current profile + solved nodes.
router.post("/generate", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "user not found" });

    const previous = user.roadmap || {};
    const solved = (previous.nodes || [])
      .filter((n) => n.status === "completed")
      .map((n) => n.title);

    const graph = await generateRoadmapGraph({
      careerGoal: user.careerGoal,
      interests: user.interests,
      programmingLanguages: user.programmingLanguages,
      problems: user.problems,
      solved,
    });

    // Preserve completion state when titles match across regenerations.
    const prevByTitle = Object.fromEntries(
      (previous.nodes || []).map((n) => [n.title, n.status])
    );
    graph.nodes.forEach((n) => {
      if (prevByTitle[n.title]) n.status = prevByTitle[n.title];
    });

    user.roadmap = graph;
    user.roadmapProgress = computeProgress(graph);
    await user.save();
    res.json(graph);
  } catch (err) {
    console.error("[roadmap/generate]", err);
    res.status(500).json({ error: err.message || "generation failed" });
  }
});

// POST mark a node's status (pending|in_progress|completed).
router.post("/node/:nodeId/status", authenticate, async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "in_progress", "completed"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  const user = await User.findByPk(req.user.id);
  if (!user || !user.roadmap) return res.status(404).json({ error: "no roadmap" });

  const graph = user.roadmap;
  const node = (graph.nodes || []).find((n) => n.id === req.params.nodeId);
  if (!node) return res.status(404).json({ error: "node not found" });
  node.status = status;
  user.roadmap = graph;
  user.roadmapProgress = computeProgress(graph);
  await user.save();
  res.json({ ok: true, roadmapProgress: user.roadmapProgress });
});

// GET enrichment for a single node — Stack Overflow + YouTube results.
router.get("/node/:nodeId/resources", authenticate, async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: ["roadmap"] });
  const node = (user?.roadmap?.nodes || []).find((n) => n.id === req.params.nodeId);
  if (!node) return res.status(404).json({ error: "node not found" });

  const [stackoverflow, youtube] = await Promise.all([
    fetchStackOverflow(node.stackoverflowQuery || node.title),
    fetchYouTube(node.youtubeQuery || node.title),
  ]);
  res.json({ stackoverflow, youtube });
});

function computeProgress(graph) {
  const nodes = graph?.nodes || [];
  if (!nodes.length) return 0;
  const done = nodes.filter((n) => n.status === "completed").length;
  return Math.round((done / nodes.length) * 100);
}

module.exports = router;
