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
Allowed node types: ${NODE_TYPES.join(", ")}.
Node type meaning:
  - concept: a focused practical concept tied to a real bug or pattern
  - debugging: a real-world debugging scenario the user must reproduce and fix
  - challenge: a coding exercise (algorithmic or applied)
  - project: a small project to build end-to-end
  - stackoverflow: a cluster of common SO issues to study and solve
  - youtube: a focused video learning topic
You MUST return ONLY valid JSON with the schema:
{
  "nodes": [
    {
      "id": "n1",
      "title": "...",
      "type": "concept|debugging|challenge|project|stackoverflow|youtube",
      "difficulty": "easy|medium|hard",
      "description": "1-2 sentence practical description",
      "stackoverflowQuery": "search query string for stackoverflow",
      "youtubeQuery": "search query string for youtube",
      "challenge": "a concrete practice challenge (1-2 sentences)",
      "next": ["n2","n3"]
    }
  ]
}
Rules:
- 12-18 nodes total.
- Order from foundational weaknesses to applied projects.
- Every node MUST have stackoverflowQuery and youtubeQuery.
- "next" must reference real ids already in the list.
- Bias the FIRST nodes toward the user's listed weaknesses/problems.
- Bias later nodes toward the user's career goal.`;

  const usr = `User profile:
- careerGoal: ${careerGoal || "Full Stack Developer"}
- interests: ${JSON.stringify(interests || [])}
- programmingLanguages: ${JSON.stringify(programmingLanguages || [])}
- weaknesses/problems: ${JSON.stringify(problems || [])}
- already solved nodes: ${JSON.stringify(solved)}

Generate a fresh roadmap graph that targets the weaknesses first, then evolves toward the career goal.
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

// ── YouTube: real Data API v3 if key provided, else search-link fallback ─────
async function fetchYouTube(query, max = 5) {
  if (!query) return [];
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    try {
      const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${max}&q=${encodeURIComponent(query)}&key=${key}`;
      const r = await fetch(u);
      if (r.ok) {
        const data = await r.json();
        return (data.items || []).map((it) => ({
          title: it.snippet?.title,
          channel: it.snippet?.channelTitle,
          thumbnail: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url,
          duration: null,
          link: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
        }));
      }
    } catch {
      /* fall through */
    }
  }
  // Fallback: a single "search YouTube" card so the UI still works without a key.
  return [
    {
      title: `YouTube search: ${query}`,
      channel: "YouTube",
      thumbnail: `https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
      duration: null,
      link: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      isFallback: true,
    },
  ];
}

function decodeHtml(s = "") {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

module.exports = {
  generateRoadmapGraph,
  fetchStackOverflow,
  fetchYouTube,
  NODE_TYPES,
};
