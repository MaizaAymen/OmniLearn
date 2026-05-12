// AI-driven roadmap generation + Stack Overflow / YouTube enrichment.
// Roadmap focus: problem solving, debugging, practical coding skills.
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "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",
});

const NODE_TYPES = ["concept", "debugging", "challenge", "project", "stackoverflow", "youtube"];

// ── AI: generate a graph of problem-solving nodes for the user ───────────────
async function generateRoadmapGraph({ careerGoal, interests, programmingLanguages, problems, solved = [] }) {
  const sys = `You are a senior engineer that designs personalized PROBLEM-SOLVING roadmaps for developers.
You DO NOT teach theory passively. You output a graph of practical, hands-on nodes.

The roadmap MUST be a PYRAMID of progressive levels (Step 1 → Step 2 → … → Advanced Topics).
NEVER produce random/parallel nodes — every node must build on prior steps.

Allowed node types: ${NODE_TYPES.join(", ")}.
Node type meaning:
  - concept: a focused practical concept tied to a real bug or pattern
  - debugging: a real-world debugging scenario the user must reproduce and fix
  - challenge: a coding exercise (algorithmic or applied)
  - project: a small project to build end-to-end
  - stackoverflow: a cluster of common SO issues to study and solve
  - youtube: a focused video learning topic

Return ONLY valid JSON:
{
  "nodes": [
    {
      "id": "n1",
      "title": "...",
      "type": "concept|debugging|challenge|project|stackoverflow|youtube",
      "difficulty": "easy|medium|hard",
      "description": "1-2 sentence practical description",
      "stackoverflowQuery": "search query for stackoverflow",
      "youtubeQuery": "search query for youtube",
      "challenge": "a concrete practice challenge (1-2 sentences)",
      "level": 1,
      "next": ["n2","n3"]
    }
  ]
}

PYRAMID ORDERING RULES (CRITICAL):
- Output EXACTLY 15 nodes in this exact order to fill a 5-level pyramid:
    Level 1 (Step 1, foundations): 1 node            → ids n1
    Level 2 (Step 2, core skills):  2 nodes          → ids n2, n3
    Level 3 (Step 3, applied):      3 nodes          → ids n4, n5, n6
    Level 4 (Step 4, integration):  4 nodes          → ids n7..n10
    Level 5 (Advanced Topics):      5 nodes          → ids n11..n15
- Each node's "level" field MUST match its level (1..5).
- ids MUST be exactly n1..n15 in that order.
- "next" of a node at level L must reference 1-2 nodes at level L+1 directly below it.
- Difficulty grows top→bottom: easy at L1-L2, medium at L3, medium/hard at L4, hard at L5.
- Step 1 = the user's biggest single weakness, recast as a foundational debugging concept.
- Steps 2-3 = practical concepts/debugging tied to listed weaknesses + languages.
- Step 4 = integration challenges (mix of debugging/challenge/project).
- Advanced Topics = projects + advanced patterns aligned with the career goal.
- Every node MUST have stackoverflowQuery and youtubeQuery.`;

  const usr = `User profile:
- careerGoal: ${careerGoal || "Full Stack Developer"}
- interests: ${JSON.stringify(interests || [])}
- programmingLanguages: ${JSON.stringify(programmingLanguages || [])}
- weaknesses/problems: ${JSON.stringify(problems || [])}
- already solved nodes: ${JSON.stringify(solved)}

Generate the 15-node pyramid roadmap exactly as specified.
- Step 1 attacks the user's biggest weakness.
- Each step strictly builds on the previous step.
- Advanced Topics (level 5) targets projects/patterns for the career goal.
Return ONLY the JSON object.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.6,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: usr },
    ],
  });

  let text = completion.choices[0].message.content || "";
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  // best effort: extract JSON object
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error("AI returned invalid JSON: " + e.message);
  }
  if (!parsed?.nodes?.length) throw new Error("AI returned no nodes");

  // Layout: simple layered (left → right) based on graph depth.
  const byId = Object.fromEntries(parsed.nodes.map((n) => [n.id, n]));
  const depth = {};
  const visit = (id, d = 0, seen = new Set()) => {
    if (seen.has(id)) return;
    seen.add(id);
    depth[id] = Math.max(depth[id] ?? 0, d);
    (byId[id]?.next || []).forEach((nx) => byId[nx] && visit(nx, d + 1, seen));
  };
  // roots = no incoming
  const incoming = new Set();
  parsed.nodes.forEach((n) => (n.next || []).forEach((nx) => incoming.add(nx)));
  parsed.nodes.forEach((n) => { if (!incoming.has(n.id)) visit(n.id, 0); });
  parsed.nodes.forEach((n) => { if (depth[n.id] === undefined) depth[n.id] = 0; });

  const cols = {};
  parsed.nodes.forEach((n) => {
    const d = depth[n.id] || 0;
    cols[d] = (cols[d] || 0) + 1;
    n.position = {
      x: d * 320,
      y: (cols[d] - 1) * 180,
    };
    n.status = "pending";
  });

  // edges
  const edges = [];
  parsed.nodes.forEach((n) => {
    (n.next || []).forEach((nx) => {
      if (byId[nx]) edges.push({ id: `e_${n.id}_${nx}`, source: n.id, target: nx });
    });
  });

  return { nodes: parsed.nodes, edges, generatedAt: new Date().toISOString() };
}

// ── Stack Overflow public API (no key required, ~300 req/day per IP) ──────────
async function fetchStackOverflow(query, pagesize = 5) {
  if (!query) return [];
  const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${pagesize}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return (data.items || []).map((it) => ({
      title: decodeHtml(it.title),
      votes: it.score,
      answers: it.answer_count,
      isAnswered: it.is_answered,
      link: it.link,
      tags: it.tags || [],
    }));
  } catch {
    return [];
  }
}

// ── YouTube Data API v3 — order by viewCount, same as the chat /video command ─
async function fetchYouTube(query, max = 3) {
  if (!query) return [];
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  try {
    const url =
      "https://www.googleapis.com/youtube/v3/search" +
      `?part=snippet&type=video&order=viewCount&maxResults=${max}` +
      `&q=${encodeURIComponent(query)}&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return (data.items || []).map((it) => ({
      title: decodeHtml(it.snippet?.title || ""),
      channel: it.snippet?.channelTitle || "",
      thumbnail: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || null,
      link: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
    }));
  } catch {
    return [];
  }
}

// ── Quiz: generate 5 multiple-choice questions for a node ────────────────────
async function generateQuiz(nodeTitle, description) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      messages: [
        {
          role: "user",
          content: `Create a 5-question multiple-choice quiz about: "${nodeTitle}"
${description ? `Context: ${description}` : ""}

Return ONLY valid JSON, no markdown:
{
  "questions": [
    {
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A",
      "explanation": "one sentence why this is correct"
    }
  ]
}

Rules:
- Questions test practical understanding, not memorization
- One clearly correct answer per question
- "answer" is the letter only: A, B, C, or D
- Keep questions short and clear`,
        },
      ],
    });

    let text = completion.choices[0].message.content || "{}";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    const parsed = JSON.parse(text);
    return parsed.questions || [];
  } catch {
    return [];
  }
}

// ── Docs: use Groq to return 2-3 real official documentation links ────────────
async function fetchDocs(nodeTitle, youtubeQuery) {
  const topic = youtubeQuery || nodeTitle || "programming";
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: `For the programming topic: "${topic}"
Give me exactly 3 official documentation links.
Return ONLY a valid JSON array, no markdown, no explanation:
[
  {"title":"...","url":"https://...","source":"MDN|Python Docs|React Docs|etc","description":"one short sentence"}
]
Rules:
- Use ONLY real URLs from official sources (MDN, Python.org, React.dev, docs.oracle.com, developer.mozilla.org, docs.python.org, nodejs.org, typescript-lang.org, etc.)
- Never invent or guess URLs — only use ones you are certain exist
- If unsure about a URL, omit that entry`,
        },
      ],
    });
    let text = completion.choices[0].message.content || "[]";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function decodeHtml(s = "") {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ── Pre-fetch SO + YouTube + Docs for every node and embed into node.resources ─
// Called once at generation time so the panel never re-fetches.
// Batched in groups of 5 to avoid hammering rate limits.
async function enrichGraphWithResources(graph) {
  const nodes = graph.nodes || [];
  const BATCH = 5;
  for (let i = 0; i < nodes.length; i += BATCH) {
    await Promise.all(
      nodes.slice(i, i + BATCH).map(async (node) => {
        const [stackoverflow, youtube, docs, quizQuestions] = await Promise.all([
          fetchStackOverflow(node.stackoverflowQuery || node.title, 5),
          fetchYouTube(node.youtubeQuery || node.title, 3),
          fetchDocs(node.title, node.youtubeQuery),
          generateQuiz(node.title, node.description),
        ]);
        node.resources = { stackoverflow, youtube, docs };
        node.quiz = { questions: quizQuestions, passingScore: 80 };
      })
    );
  }
  return graph;
}

module.exports = {
  generateRoadmapGraph,
  enrichGraphWithResources,
  generateQuiz,
  fetchStackOverflow,
  fetchYouTube,
  fetchDocs,
  NODE_TYPES,
};
