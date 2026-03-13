const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const Problem = require("../models/Problem");
const {slugify} = require("../utils/slugify");


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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

async function generateProblemRoadmap(problem) {
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
  "problem": "problem name string",
  "concepts_detected": ["concept1", "concept2"],
  "roadmap": [
    {
      "step": 1,
      "title": "concept name",
      "description": "short one-line explanation",
      "explanation": "clear beginner-friendly explanation (2-4 sentences)",
      "example": "small illustrative code snippet or text example",
      "hints": ["hint 1", "hint 2", "hint 3"],
      "practice": ["LeetCode or practice problem name 1", "problem 2"],
      "resources": ["resource description or link"]
    }
  ]
}

Rules:
- Generate 5 to 8 steps.
- Order concepts from easiest/most fundamental to hardest/optimized.
- Each step must build on the previous one.
- The last step should describe the optimal solution strategy (do NOT write code).
- Keep explanations concise and beginner-friendly.`
      },
      {
        role: "user",
        content: `Generate a step-by-step learning roadmap for this coding problem:\n\n${problem}`
      }
    ],
    temperature: 0.6,
    max_tokens: 4096
  });

  let text = completion.choices[0].message.content;
  // Strip markdown fences if present
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  // Extract first JSON object in case of leading text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  return JSON.parse(text);
}

router.post("/generate/problem-roadmap", async (req, res) => {
  try {
    const { problem } = req.body;
    if (!problem || !problem.trim()) {
      return res.status(400).json({ error: "Problem description is required" });
    }
    const roadmap = await generateProblemRoadmap(problem.trim());
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
          content: `You are an expert coding problem designer. Generate problems that exactly match the schema used in the frontend. Output **only** a valid JSON array – no markdown, no extra text.`
        },
        {
          role: "user",
          content: `Generate 5 distinct coding problems about "${topic}". The problems should cover different difficulty levels (Easy, Medium, Hard). Each problem must follow this schema:

[
  {
    "title": "string",
    "difficulty": "Easy" | "Medium" | "Hard",
    "category": "string",               // include "${topic}" and optionally subcategories separated by " • " (e.g., "Array • Hash Table")
    "description": {
      "text": "string",                //make 5 line  description 
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
    "starterCode": {
      "javascript": "string",
      "python": "string",
      "java": "string"
    },
    "expectedOutput": {
      "javascript": "string",
      "python": "string",
      "java": "string"
    }
  }
]

**Requirements:**
- Generate exactly 5 problems.
- Include at least 2 examples per problem.
- starterCode must contain a function skeleton and the same test cases as the examples.
- expectedOutput must contain the exact output (including newlines) that the test cases would produce.
- All strings must be properly escaped for valid JSON.
- Do not include any text outside the JSON array.`
        }
      ]
    });

    let text = completion.choices[0].message.content;

    // 2. Clean markdown code fences (just in case)
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // 3. Parse JSON
    const problemsData = JSON.parse(text);

    // 4. Add a slug as the primary key id for each problem
    const problemsToInsert = problemsData.map(problem => ({
      id: slugify(problem.title),
      ...problem,
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



module.exports = router;