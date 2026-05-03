const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const { Op } = require("sequelize");
const Problem = require("../models/Problem");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { emitNotification } = require("../realtime/messageHub");
const {slugify} = require("../utils/slugify");
const { authenticate, optionalAuth, requirePro } = require("../middleware/Authmiddleware");

async function notifyAllOnProblemPublished(req, problem) {
  try {
    const users = await User.findAll({
      where: { role: ["student", "teacher"], isActive: true },
      attributes: ["id"],
    });
    const io = req.app.get("io");
    for (const u of users) {
      const notif = await Notification.create({
        userId: u.id,
        type: "problem-published",
        title: "New problem published",
        message: `A new problem "${problem.title}" is now available`,
        link: `/problems/${problem.id}`,
        data: { problemId: problem.id },
      });
      emitNotification(io, u.id, notif);
    }
  } catch (err) {
    console.error("notify problem published:", err.message);
  }
}


const groq = new Groq({
  apiKey: "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",
});

async function generateRoadmap(topic) {

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You generate learning roadmaps."
      },
      {
        role: "user",
        content: `Create a roadmap to learn ${topic}. Return ONLY JSON array.`
      }
    ]
  });

  let text = completion.choices[0].message.content;

  // remove markdown ```json ```
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  return JSON.parse(text);
}

router.post("/ai/generate/roadmaps", async (req, res) => {

  try {

    const { topic } = req.body;

    const steps = await generateRoadmap(topic);

const nodes = steps.map((step, index) => ({
  id: `${index}`,
  position: { x: index * 200, y: index * 100 },
  data: { label: step.topic }
}));

    const edges = steps.slice(1).map((_, index) => ({
      id: `e${index}-${index+1}`,
      source: `${index}`,
      target: `${index+1}`
    }));

    res.json({ nodes, edges });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generating roadmap" });
  }

});


// ─── Problem Learning Roadmap ────────────────────────────────────────────────

function buildProblemSummary(problemPayload) {
  if (typeof problemPayload === "string") return problemPayload;
  if (!problemPayload || typeof problemPayload !== "object") return "";

  const title = problemPayload.title || "";
  const difficulty = problemPayload.difficulty || "";
  const description = problemPayload.description?.text || "";
  const notes = Array.isArray(problemPayload.description?.notes)
    ? problemPayload.description.notes.join(" ")
    : "";
  const examples = Array.isArray(problemPayload.examples)
    ? problemPayload.examples
        .map(
          (ex, idx) =>
            `Example ${idx + 1}: input=${ex.input} output=${ex.output} explanation=${ex.explanation || ""}`
        )
        .join("\n")
    : "";
  const constraints = Array.isArray(problemPayload.constraints)
    ? problemPayload.constraints.join("; ")
    : "";

  return `Problem Title: ${title}\nDifficulty: ${difficulty}\nDescription: ${description}\nNotes: ${notes}\nExamples:\n${examples}\nConstraints: ${constraints}`.trim();
}

function normalizeRoadmap(roadmap) {
  if (!roadmap || typeof roadmap !== "object") return null;
  const nodes = Array.isArray(roadmap.nodes) ? roadmap.nodes : [];
  const edges = Array.isArray(roadmap.edges) ? roadmap.edges : [];
  return {
    title: roadmap.title || "",
    difficulty: (roadmap.difficulty || "").toLowerCase(),
    nodes,
    edges,
  };
}

async function generateProblemRoadmap(problemPayload) {
  const problemText = buildProblemSummary(problemPayload);
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are an expert algorithms mentor and software engineering teacher.
Analyze the given coding problem and generate a structured learning roadmap.
Return ONLY valid JSON — no markdown fences, no extra text, just the JSON object.

Required schema (strictly follow this):
{
  "title": "string",
  "difficulty": "easy" | "medium" | "hard",
  "nodes": [
    {
      "id": "string",
      "title": "string",
      "description": "short clear explanation (2-3 lines max)",
      "example": "short code example",
      "hint": "short helpful hint",
      "type": "theory" | "practice" | "implementation" | "optimization",
      "position": { "x": number, "y": number }
    }
  ],
  "edges": [
    { "from": "node_id", "to": "node_id" }
  ]
}

Rules:
- The roadmap must be step-by-step from basic to advanced.
- Each node must represent ONE small concept.
- Descriptions must be simple and beginner-friendly.
- Examples must be SHORT and relevant.
- Hints must guide thinking, not give full answers.
- Include at least: 1 theory node, 2 practice nodes, 1 implementation node, 1 optimization node.
- Final node must represent the "Final Solution".
- Positions must form a readable graph (top to bottom or left to right).
- Do NOT include unnecessary text outside JSON.`
      },
      {
        role: "user",
        content: `Generate a roadmap for this coding problem:\n\n${problemText}`
      }
    ],
    temperature: 0.5,
    max_tokens: 4096,
  });

  let text = completion.choices[0].message.content;
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  return normalizeRoadmap(JSON.parse(text));
}

router.post("/generate/problem-roadmap", async (req, res) => {
  try {
    const { problem } = req.body;
    if (!problem || (typeof problem === "string" && !problem.trim())) {
      return res.status(400).json({ error: "Problem description is required" });
    }
    const roadmap = await generateProblemRoadmap(problem);
    res.json(roadmap);
  } catch (error) {
    console.error("Problem roadmap error:", error);
    res.status(500).json({ error: "Error generating problem roadmap" });
  }
});

router.post("/ai/generate/problems", async (req, res) => {
  try {
    const { topic } = req.body;

    // 1. Ask AI to generate 5 problems
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert coding problem designer. Generate problems that exactly match the schema used in the frontend.

CRITICAL JSON FORMATTING RULES:
- Output ONLY a valid JSON array – no markdown, no extra text
- All strings must use escaped characters: \\n for newlines, \\" for quotes, \\\\ for backslashes
- Code examples must have all special characters properly escaped
- No trailing commas in arrays or objects
- Use double quotes for all strings, never single quotes
- Test your JSON validity before outputting`
        },
        {
          role: "user",
          content: `Generate 5 distinct coding problems about "${topic}". The problems should cover different difficulty levels (Easy, Medium, Hard).

IMPORTANT: Keep code examples SHORT and SIMPLE to ensure valid JSON. Use single-line comments instead of multi-line. Keep function bodies minimal.

Each problem must follow this schema:

[
  {
    "title": "string",
    "difficulty": "Easy" | "Medium" | "Hard",
    "category": "string",               // include "${topic}" and optionally subcategories separated by " • " (e.g., "Array • Hash Table")
    "description": {
      "text": "string",                //make 2 line  description 
      "notes": ["string"]
    },
    "examples": [
      {
        "input": "string",
        "output": "string",
        "explanation": "string"
      }
    ],
    "constraints": ["string"],
    "hints": ["string"],
    "starterCode": {
      "javascript": "string",
      "python": "string",
      "java": "string"
    },
    "expectedOutput": {
      "javascript": "string",
      "python": "string",
      "java": "string"
      },
      "roadmap": {
        "title": "string",
        "difficulty": "easy" | "medium" | "hard",
        "nodes": [
          {
            "id": "string",
            "title": "string",
            "description": "short clear explanation (2-3 lines max)",
            "example": "short code example",
            "hint": "short helpful hint",
            "type": "theory" | "practice" | "implementation" | "optimization",
            "position": { "x": number, "y": number }
          }
        ],
        "edges": [
          { "from": "node_id", "to": "node_id" }
        ]
      }
  }
]

**Requirements:**
- Generate exactly 5 problems.
- Include at least 2 examples per problem.
- Include 2 to 4 hints per problem. Keep hints short and actionable.
- starterCode must contain a function skeleton and the same test cases as the examples.
- expectedOutput must contain the exact output (including newlines) that the test cases would produce.
- The roadmap must follow the schema above and be ordered from basic to advanced with a final "Final Solution" node.
- **CRITICAL**: All strings must be properly escaped for valid JSON:
  - Use \\n for line breaks in code/descriptions
  - Use \\" for quotes inside strings
  - Use \\\\ for backslashes
  - Example: "function test() {\\n  return \\"hello\\";\\n}"
- Do not include any text outside the JSON array.`
        }
      ]
    });

    let text = completion.choices[0].message.content;

    // 2. Clean markdown code fences and extract JSON array
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const startIndex = text.indexOf("[");
    const endIndex = text.lastIndexOf("]");
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      text = text.slice(startIndex, endIndex + 1);
    }

    // 3. Parse JSON with better error handling and retry mechanism
    let problemsData;
    try {
      problemsData = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parse Error on first attempt:", parseError.message);
      console.error("Failed at position:", parseError.message.match(/position (\d+)/)?.[1]);
      const errorPos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || 0);
      console.error("Text around error:", text.substring(
        Math.max(0, errorPos - 100),
        Math.min(text.length, errorPos + 100)
      ));

      // Try asking the AI to fix the JSON
      console.log("Attempting to fix JSON with AI...");
      const fixCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a JSON repair expert. Fix the provided malformed JSON and return ONLY the repaired valid JSON array. Do not add any explanation or markdown.

Rules:
- Ensure all strings are properly terminated with closing quotes
- Ensure all code strings have escaped special characters: \\n for newlines, \\" for quotes, \\\\ for backslashes
- Remove any trailing commas
- Ensure all brackets and braces are properly closed
- Return ONLY the fixed JSON array, nothing else`
          },
          {
            role: "user",
            content: `Fix this malformed JSON (error at position ${errorPos}):\n\n${text}`
          }
        ],
        temperature: 0.1,
        max_tokens: 8000
      });

      let fixedText = fixCompletion.choices[0].message.content;
      fixedText = fixedText.replace(/```json/g, "").replace(/```/g, "").trim();
      const fixedStartIndex = fixedText.indexOf("[");
      const fixedEndIndex = fixedText.lastIndexOf("]");
      if (fixedStartIndex !== -1 && fixedEndIndex !== -1 && fixedEndIndex > fixedStartIndex) {
        fixedText = fixedText.slice(fixedStartIndex, fixedEndIndex + 1);
      }

      try {
        problemsData = JSON.parse(fixedText);
        console.log("Successfully parsed JSON after AI repair");
      } catch (secondError) {
        console.error("Failed to parse even after AI repair:", secondError.message);
        throw new Error(`Invalid JSON from AI even after repair attempt: ${secondError.message}`);
      }
    }

    // 4. Add a slug as the primary key id for each problem
    const problemsToInsert = problemsData.map((problem) => ({
      id: slugify(problem.title),
      ...problem,
      status: 'draft',
      scope: 'global',
      tags: Array.isArray(problem.tags) ? problem.tags : [],
      version: 1,
      testCasesValidated: false,
      hints: Array.isArray(problem.hints) ? problem.hints : [],
      roadmap: normalizeRoadmap(problem.roadmap),
    }));

    // 5. Insert all problems into the database in one go
    const createdProblems = await Problem.bulkCreate(problemsToInsert, {
      returning: true,      // give me back the inserted records
      ignoreDuplicates: false, // if a problem with same id exists, throw an error
    });

    // 6. Send the newly created problems back to the client
    res.json(createdProblems);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generating problems" });
  }
});

router.get("/ai/getallproblems", optionalAuth, async (req, res) => {
  try {
    const { status, scope: scopeFilter } = req.query;
    let where = {};
    if (status === 'all') {
      where = {};
    } else if (status) {
      where.status = status;
    } else {
      // default: published + legacy rows with no status
      where[Op.or] = [{ status: 'published' }, { status: null }];
    }

    // ─── FILTRE PAR PLAN ───────────────────────────────────────────────────
    // Étape 1 : staff (admin / teacher) → voit tout pour pouvoir gérer.
    // Étape 2 : sinon on filtre selon le plan :
    //   free        → uniquement les problèmes "isFreeTier"
    //   pro         → "isFreeTier" + "isProTier"  (Pro voit Free aussi)
    //   institution → tous les problèmes (pas de filtre)
    const isStaff = req.user && (req.user.role === "admin" || req.user.role === "teacher" || req.user.role === "institution_admin");
    if (!isStaff) {
      const plan = req.user?.plan || "free";
      if (plan === "free") {
        where.isFreeTier = true;
      } else if (plan === "pro") {
        where[Op.and] = [
          { [Op.or]: [{ isFreeTier: true }, { isProTier: true }] },
        ];
      }
      // institution → pas de filtre
    }

    // ─── SCOPE INSTITUTION ────────────────────────────────────────────────
    // Les problèmes "institution" sont privés. On ne les expose qu'aux
    // membres de cette institution. Tout le monde voit les "global"/"module".
    const userInstId = req.user?.institutionId || null;
    if (scopeFilter === "institution") {
      // L'admin demande explicitement la banque de son institution.
      if (!userInstId) return res.json([]);
      where.scope = "institution";
      where.institutionId = userInstId;
    } else {
      // Vue par défaut : on cache les problèmes d'institution qui ne sont pas la nôtre.
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [
            { scope: { [Op.ne]: "institution" } },
            ...(userInstId ? [{ institutionId: userInstId }] : []),
          ],
        },
      ];
    }

    const problems = await Problem.findAll({ where });

    // Attach creator info so the UI can show "Forked by <teacher name>"
    const creatorIds = [...new Set(problems.map(p => p.createdBy).filter(Boolean))];
    const creators = creatorIds.length
      ? await User.findAll({
          where: { id: creatorIds },
          attributes: ["id", "firstname", "lastname", "role"],
        })
      : [];
    const creatorMap = Object.fromEntries(
      creators.map(u => [u.id, { id: u.id, firstname: u.firstname, lastname: u.lastname, role: u.role }])
    );

    const result = problems.map(p => {
      const obj = p.toJSON();
      obj.creator = obj.createdBy ? creatorMap[obj.createdBy] || null : null;
      return obj;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching problems" });
  }
});

// ─── Manual Problem Create ────────────────────────────────────────────────────
router.post("/ai/problems", optionalAuth, async (req, res) => {
  try {
    const { title, difficulty, category, description, examples, constraints, hints, starterCode, expectedOutput, tags, scope, createdBy, institutionId } = req.body;
    if (!title || !difficulty || !category) {
      return res.status(400).json({ error: "title, difficulty, category are required" });
    }
    // Si scope = institution, on attache l'id de l'institution (du body ou du user connecté).
    const finalScope = scope || 'global';
    const finalInstitutionId = finalScope === 'institution'
      ? (institutionId || req.user?.institutionId || null)
      : null;
    const id = slugify(title);
    const problem = await Problem.create({
      id, title, difficulty, category,
      description: description || { text: '', notes: [] },
      examples: examples || [],
      constraints: constraints || [],
      hints: hints || [],
      starterCode: starterCode || { javascript: '', python: '', java: '' },
      expectedOutput: expectedOutput || { javascript: '', python: '', java: '' },
      roadmap: null,
      status: 'published',
      scope: finalScope,
      institutionId: finalInstitutionId,
      tags: Array.isArray(tags) ? tags : [],
      version: 1,
      testCasesValidated: false,
      createdBy: createdBy || null,
      forkedFrom: null,
    });
    notifyAllOnProblemPublished(req, problem);
    res.json(problem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating problem" });
  }
});

// ─── AI Generate Draft (not saved) — supports count 1/3/5 ───────────────────
router.post("/ai/problems/generate-draft", async (req, res) => {
  try {
    const { topic, difficulty, count = 1 } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    const n = Math.min(Math.max(parseInt(count) || 1, 1), 5);
    const isArray = n > 1;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert coding problem designer and algorithms mentor. Generate ${isArray ? `${n} distinct, well-crafted coding problems` : 'ONE well-crafted coding problem'} — each complete with a full learning roadmap. Return ONLY valid JSON${isArray ? ' array' : ' object'}, no markdown, no extra text.

CRITICAL JSON RULES:
- Use double quotes for all strings
- Escape newlines as \\n, quotes as \\", backslashes as \\\\
- No trailing commas
- No comments inside the JSON`
        },
        {
          role: "user",
          content: `Generate ${n}${difficulty ? ` ${difficulty}` : ''} coding problem${n > 1 ? 's' : ''} about "${topic}".

Each problem must follow this EXACT schema:
{
  "title": "string",
  "difficulty": "Easy" | "Medium" | "Hard",
  "category": "string (include \\"${topic}\\" and optionally subcategories separated by \\" • \\", e.g. \\"Array • Hash Table\\")",
  "description": {
    "text": "string — a CLEAR, DETAILED problem statement (4 to 7 sentences). Explain the task, the inputs, the expected output, and any edge cases in plain language. Write like a good LeetCode/HackerRank problem. Do NOT dump code in here.",
    "notes": ["optional extra clarifications, one per string"]
  },
  "examples": [
    { "input": "string", "output": "string", "explanation": "why the output is what it is" }
  ],
  "constraints": ["string — e.g. 1 <= n <= 10^4"],
  "hints": ["short actionable hint", "another hint"],
  "starterCode": {
    "javascript": "function skeleton with signature and a TODO comment",
    "python": "def skeleton with signature and a TODO comment",
    "java": "class skeleton with method signature and a TODO comment"
  },
  "expectedOutput": {
    "javascript": "exact expected stdout for the example inputs",
    "python": "exact expected stdout",
    "java": "exact expected stdout"
  },
  "tags": ["topic", "data-structure", "algorithm"],
  "roadmap": {
    "title": "string (e.g. \\"Two Sum Roadmap\\")",
    "difficulty": "easy" | "medium" | "hard",
    "nodes": [
      {
        "id": "n1",
        "title": "short node title",
        "description": "clear 2-3 line beginner-friendly explanation",
        "example": "short code example",
        "hint": "nudge without giving away the full answer",
        "type": "theory" | "practice" | "implementation" | "optimization",
        "position": { "x": number, "y": number }
      }
    ],
    "edges": [
      { "from": "n1", "to": "n2" }
    ]
  }
}

REQUIREMENTS:
- Description MUST be a proper multi-sentence problem statement, like a real practice platform. Not a one-liner.
- At least 2 examples per problem, each with an explanation.
- 2 to 4 hints per problem.
- starterCode signatures must match across all three languages.
- expectedOutput must be the real output the examples produce.
- Roadmap MUST be present and non-empty for every problem, ordered basic → advanced, ending with a "Final Solution" node. Include at least: 1 theory, 2 practice, 1 implementation, 1 optimization node. Edges must connect them in order. Positions should form a readable top-to-bottom graph.
- ${isArray ? `Return a JSON array of ${n} objects.` : 'Return ONLY the JSON object.'}
- No text outside the JSON.`
        }
      ],
      temperature: 0.5,
      max_tokens: isArray ? 12000 : 5000,
    });

    let text = completion.choices[0].message.content;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let result;
    if (isArray) {
      const startIdx = text.indexOf("[");
      const endIdx = text.lastIndexOf("]");
      if (startIdx !== -1 && endIdx !== -1) text = text.slice(startIdx, endIdx + 1);
      result = JSON.parse(text);
    } else {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) text = match[0];
      result = [JSON.parse(text)]; // always return array for consistency
    }

    // Normalize and backfill a roadmap if the model skipped it
    result = await Promise.all(
      result.map(async (p) => {
        let roadmap = normalizeRoadmap(p.roadmap);
        if (!roadmap || !Array.isArray(roadmap.nodes) || roadmap.nodes.length === 0) {
          try {
            roadmap = await generateProblemRoadmap(p);
          } catch (err) {
            console.error("Roadmap backfill failed:", err.message);
            roadmap = null;
          }
        }
        return { ...p, roadmap };
      })
    );

    res.json(result); // NOT saved to DB
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generating problem draft" });
  }
});

// ─── Check Duplicate ──────────────────────────────────────────────────────────
router.get("/ai/problems/check-duplicate", async (req, res) => {
  try {
    const { title } = req.query;
    if (!title || !title.trim()) return res.json({ isDuplicate: false, matches: [] });

    const slug = slugify(title.trim());
    const exact = await Problem.findByPk(slug);

    const firstWord = title.trim().split(" ")[0];
    const similar = await Problem.findAll({
      where: { title: { [Op.iLike]: `%${firstWord}%` } },
      limit: 4,
      attributes: ["id", "title", "difficulty", "status"],
    });

    res.json({ isDuplicate: !!exact, matches: similar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error checking duplicate" });
  }
});

// ─── Fork Problem ─────────────────────────────────────────────────────────────
router.post("/ai/problems/:id/fork", async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleId, createdBy } = req.body;

    const original = await Problem.findByPk(id);
    if (!original) return res.status(404).json({ error: "Problem not found" });

    const forkId = slugify(`${original.title}-copy-${Date.now()}`);
    const forked = await Problem.create({
      id: forkId,
      title: `${original.title} (copy)`,
      difficulty: original.difficulty,
      category: original.category,
      description: original.description,
      examples: original.examples,
      constraints: original.constraints,
      hints: original.hints,
      starterCode: original.starterCode,
      expectedOutput: original.expectedOutput,
      roadmap: original.roadmap,
      status: "draft",
      scope: moduleId ? "module" : "global",
      forkedFrom: id,
      tags: original.tags || [],
      version: 1,
      testCasesValidated: false,
      createdBy: createdBy || null,
      moduleId: moduleId || null,
    });
    res.json({ forkedProblem: forked, original });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error forking problem" });
  }
});

// ─── Update Problem (partial) ────────────────────────────────────────────────
router.patch("/ai/problems/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findByPk(id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // Never let the caller change identity/lineage fields
    const { id: _ignoreId, forkedFrom: _ignoreFork, createdAt: _cA, updatedAt: _uA, ...updatable } = req.body;

    // Version bump on edit of an already-published problem
    if (problem.status === "published") {
      updatable.version = (problem.version || 1) + 1;
    }

    const wasPublished = problem.status === "published";
    await problem.update(updatable);
    if (problem.status === "published" && !wasPublished) {
      notifyAllOnProblemPublished(req, problem);
    }
    res.json(problem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating problem" });
  }
});

// ─── Save AI Draft ────────────────────────────────────────────────────────────
router.post("/ai/problems/save-draft", optionalAuth, async (req, res) => {
  try {
    const { problem, createdBy, scope, institutionId } = req.body;
    if (!problem?.title) return res.status(400).json({ error: "problem with title is required" });

    const finalScope = scope || 'global';
    const finalInstitutionId = finalScope === 'institution'
      ? (institutionId || req.user?.institutionId || null)
      : null;

    const id = slugify(problem.title);
    const created = await Problem.create({
      id,
      title: problem.title,
      difficulty: problem.difficulty || 'Easy',
      category: problem.category || 'General',
      description: problem.description || { text: '', notes: [] },
      examples: problem.examples || [],
      constraints: problem.constraints || [],
      hints: Array.isArray(problem.hints) ? problem.hints : [],
      starterCode: problem.starterCode || { javascript: '', python: '', java: '' },
      expectedOutput: problem.expectedOutput || { javascript: '', python: '', java: '' },
      roadmap: normalizeRoadmap(problem.roadmap),
      status: 'draft',
      scope: finalScope,
      institutionId: finalInstitutionId,
      tags: Array.isArray(problem.tags) ? problem.tags : [],
      version: 1,
      testCasesValidated: false,
      createdBy: createdBy || null,
      forkedFrom: null,
    });
    res.json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error saving draft" });
  }
});

// ─── Update Problem Status ────────────────────────────────────────────────────
router.patch("/ai/problems/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['draft', 'review', 'published', 'archived'];
    if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const problem = await Problem.findByPk(id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const wasPublished = problem.status === "published";
    await problem.update({ status });
    if (status === "published" && !wasPublished) {
      notifyAllOnProblemPublished(req, problem);
    }
    res.json(problem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating status" });
  }
});
router.post("/ai/getproblembyid", async (req, res) => {
  try {
    const { id } = req.body;
    const problem = await Problem.findByPk(id);
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    res.json(problem);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: "Error fetching problem" });
  }
});

router.delete("/ai/deletepromblem/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findByPk(id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    await problem.destroy();
    res.json({ message: "Problem deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting problem" });
  }
});

// ─── AI Code Correction ────────────────────────────────────────────────────

async function correctCodeWithAI(code, language, problemContext, actualOutput) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are an expert code reviewer and debugger. Analyze the provided code and fix any bugs, errors, or issues.

IMPORTANT RULES:
1. Return ONLY valid JSON - no markdown, no extra text
2. Fix bugs, syntax errors, logic errors, and improve the code
3. Keep the same overall structure and approach
4. For each change, provide the line number and what was changed
5. ALWAYS preserve ALL test case invocations, print/console.log statements, and any code that produces output at the bottom of the file - never remove them
6. PREFER to keep the arguments/inputs passed to function calls in test invocations EXACTLY as written. EXCEPTION: if those inputs are inconsistent with the problem's examples and cannot produce the expected output even with a correct algorithm, replace them with the inputs taken from the "Examples" section of the problem context so the resulting output matches the expected output. Do not invent random new inputs — only use inputs that come from the problem's own examples.
7. Fix the function/algorithm logic. Do NOT invent extra test cases beyond what the problem's examples define.
8. CRITICAL: If the problem context contains an "expected output" block, the corrected code, when executed, MUST produce stdout that — after trimming each line and ignoring blank lines and case — exactly matches that expected output. This is the success criterion. Adjust print/console.log formatting (separators, casing, spaces, decimals, ordering) to match the expected output exactly. Do not add extra prints, banners, or labels that are not in the expected output.
9. If the user provides the "actual output" the code currently produces, treat the diff between actual and expected as the primary bug to fix — it tells you exactly what is wrong (algorithm logic, formatting, OR mismatched test inputs).

Required JSON schema:
{
  "correctedCode": "the full corrected code as a string",
  "changes": [
    {
      "lineNumber": number,
      "type": "fix" | "improvement" | "addition" | "removal",
      "description": "brief description of what was changed",
      "oldCode": "the original line (if applicable)",
      "newCode": "the new/corrected line"
    }
  ],
  "summary": "brief summary of all corrections made"
}

If no changes are needed, return:
{
  "correctedCode": "original code unchanged",
  "changes": [],
  "summary": "No issues found - code looks good!"
}`
      },
      {
        role: "user",
        content: `Fix and correct this ${language} code:

Problem Context:
${problemContext}

Code to fix:
\`\`\`${language}
${code}
\`\`\`
${actualOutput ? `\nActual output the code currently produces (this does NOT match the expected output — fix the code so it matches):\n${actualOutput}\n` : ""}
Return the corrected code with detailed changes in JSON format.`
      }
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  let text = completion.choices[0].message.content;
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];

  try {
    return JSON.parse(text);
  } catch {
    const codeMatch = text.match(/```[a-z]*\n([\s\S]*?)```/i);
    const correctedCode = codeMatch ? codeMatch[1].trim() : code;
    return {
      correctedCode,
      changes: [],
      summary: "Code reviewed (auto-recovered from parse error)",
    };
  }
}

// ─── PLAN GATE ───────────────────────────────────────────────────────────────
// "Corriger avec IA" est réservé aux plans Pro et Institution.
// Étape 1 : authenticate vérifie le token et charge req.user.
// Étape 2 : requirePro vérifie req.user.plan, sinon renvoie 402 "Upgrade required".
router.post("/ai/correct-code", authenticate, requirePro, async (req, res) => {
  try {
    const { code, language, problemContext, actualOutput } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "Code and language are required" });
    }

    const correction = await correctCodeWithAI(
      code,
      language,
      problemContext || "General coding problem",
      actualOutput
    );

    res.json(correction);
  } catch (error) {
    console.error("Code correction error:", error);
    res.status(500).json({ error: "Error correcting code" });
  }
});

module.exports = router;