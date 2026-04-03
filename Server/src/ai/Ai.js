const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const Problem = require("../models/Problem");
const {slugify} = require("../utils/slugify");


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

router.get("/ai/getallproblems", async (req, res) => {
  try {
    const problems = await Problem.findAll();
    res.json(problems);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: "Error fetching problems" });
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
    const deletedCount = await Problem.destroy({ where: { id } });
    res.json({ message: "Problem deleted", deletedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting problem" });
  }
});

// ─── AI Code Correction ────────────────────────────────────────────────────

async function correctCodeWithAI(code, language, problemContext) {
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

Return the corrected code with detailed changes in JSON format.`
      }
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  let text = completion.choices[0].message.content;
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];

  return JSON.parse(text);
}

router.post("/ai/correct-code", async (req, res) => {
  try {
    const { code, language, problemContext } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "Code and language are required" });
    }

    const correction = await correctCodeWithAI(
      code,
      language,
      problemContext || "General coding problem"
    );

    res.json(correction);
  } catch (error) {
    console.error("Code correction error:", error);
    res.status(500).json({ error: "Error correcting code" });
  }
});

module.exports = router;