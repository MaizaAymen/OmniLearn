const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const UmlDiagram = require("../models/UmlDiagram");

const apiKey = process.env.GROQ_API_KEY || process.env.groqApiKey || "";
if (!apiKey) console.warn("⚠ GROQ API key not found — UML generation will use fallback only.");
const groq = apiKey ? new Groq({ apiKey }) : null;

function text(v, max = 255) {
  return String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseJsonObject(raw) {
  let s = String(raw || "").replace(/```json/g, "").replace(/```/g, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Invalid AI JSON");
  s = s.slice(start, end + 1);
  return JSON.parse(s);
}

function safeSolution(solution) {
  return {
    nodes: Array.isArray(solution?.nodes) ? solution.nodes : [],
    edges: Array.isArray(solution?.edges) ? solution.edges : [],
  };
}

function isGenericSolution(solution) {
  const badNames = new Set(["book", "member", "loan"]);
  return (Array.isArray(solution?.nodes) ? solution.nodes : []).some((n) => {
    const name = String(n?.data?.name || "").trim().toLowerCase();
    return badNames.has(name);
  });
}

function fallback(topic) {
  const topicLower = String(topic || "").toLowerCase();

  let classes = {
    title: `${topic || "General"} UML Exercise`,
    problem: `Design a class diagram for ${topic || "the given domain"}. Include at least 5 classes and meaningful relationships.`,
    names: ["DomainController", "DomainService", "DomainEntity", "DomainRepository", "DomainEvent"],
  };

  if (topicLower.includes("hotel")) {
    classes = {
      title: "Hotel Booking UML Exercise",
      problem: "Design a UML class diagram for a hotel booking platform with room inventory, reservations, billing, and guest management.",
      names: ["Hotel", "Room", "Booking", "Guest", "Payment"],
    };
  } else if (
    topicLower.includes("ecommerce") ||
    topicLower.includes("e-commerce") ||
    topicLower.includes("shop")
  ) {
    classes = {
      title: "E-commerce Order UML Exercise",
      problem: "Design a UML class diagram for an e-commerce system covering catalog, cart, order lifecycle, and payments.",
      names: ["Product", "Cart", "Order", "Customer", "Payment"],
    };
  } else if (topicLower.includes("school") || topicLower.includes("education")) {
    classes = {
      title: "School Management UML Exercise",
      problem: "Design a UML class diagram for a school management domain including teaching, assessments, and enrollment.",
      names: ["Student", "Teacher", "Course", "Enrollment", "Exam"],
    };
  }

  return {
    title: text(classes.title),
    problem: classes.problem,
    solution: {
      nodes: [
        {
          id: "1",
          type: "uml",
          position: { x: 100, y: 100 },
          data: {
            umlType: "class",
            name: classes.names[0],
            stereotype: "",
            attributes: ["+ id : UUID", "+ name : String", "+ createdAt : DateTime"],
            operations: ["+ create() : void", "+ update() : void"],
          },
        },
        {
          id: "2",
          type: "uml",
          position: { x: 380, y: 100 },
          data: {
            umlType: "class",
            name: classes.names[1],
            stereotype: "",
            attributes: ["+ id : UUID", "+ code : String", "+ status : String"],
            operations: ["+ assign() : void", "+ release() : void"],
          },
        },
        {
          id: "3",
          type: "uml",
          position: { x: 700, y: 100 },
          data: {
            umlType: "class",
            name: classes.names[2],
            stereotype: "",
            attributes: ["+ id : UUID", "+ state : String", "+ createdAt : DateTime"],
            operations: ["+ start() : void", "+ complete() : void"],
          },
        },
        {
          id: "4",
          type: "uml",
          position: { x: 250, y: 350 },
          data: {
            umlType: "class",
            name: classes.names[3],
            stereotype: "",
            attributes: ["+ id : UUID", "+ reference : String", "+ amount : Decimal"],
            operations: ["+ validate() : boolean", "+ cancel() : void"],
          },
        },
        {
          id: "5",
          type: "uml",
          position: { x: 550, y: 350 },
          data: {
            umlType: "class",
            name: classes.names[4],
            stereotype: "",
            attributes: ["+ id : UUID", "+ total : Decimal", "+ status : String"],
            operations: ["+ calculate() : Decimal", "+ finalize() : void"],
          },
        },
      ],
      edges: [
        { id: "e1", source: "1", target: "3", type: "uml", data: { relationType: "association" } },
        { id: "e2", source: "3", target: "2", type: "uml", data: { relationType: "aggregation" } },
        { id: "e3", source: "1", target: "4", type: "uml", data: { relationType: "composition" } },
        { id: "e4", source: "4", target: "5", type: "uml", data: { relationType: "dependency" } },
      ],
    },
  };
}

async function aiGenerateProblemAndSolution(topic) {
  if (!groq) return fallback(topic);

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are an expert UML generator.

Your task is to generate a UML exercise AND its correct solution.

⚠️ VERY IMPORTANT RULES:
- You MUST strictly follow the topic domain.
- You MUST NOT use generic examples like "Book", "Member", "Loan" unless the topic is about a library.
- If the topic is about "hotel", use entities like Room, Booking, Customer, Payment, etc.
- If the topic is about "ecommerce", use Product, Order, Cart, User, etc.
- If you ignore the topic, the answer is WRONG.

Return ONLY valid JSON, no text before or after.`,
      },
      {
        role: "user",
        content: `STEP 1: Understand the topic and extract the real-world domain.
STEP 2: Create relevant classes ONLY from that domain.
STEP 3: Generate a UML CLASS DIAGRAM (not state, not sequence).

OUTPUT FORMAT (RETURN ONLY JSON, NO TEXT):

{
  "title": "short title based on topic",
  "problem": "clear student exercise (2-3 lines max)",
  "solution": {
    "nodes": [
      {
        "id": "1",
        "type": "uml",
        "position": { "x": 100, "y": 100 },
        "data": {
          "umlType": "class",
          "name": "ClassName",
          "stereotype": "",
          "attributes": ["+ field : type"],
          "operations": ["+ method() : returnType"]
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "1",
        "target": "2",
        "type": "uml",
        "data": { "relationType": "association" }
      }
    ]
  }
}

CONSTRAINTS:
- At least 5 classes, up to 10 for complex topics.
- Each class MUST have 3-5 attributes and 2-4 operations with proper UML visibility (+, -, #), types, and parameters.
- Use meaningful class names FROM THE TOPIC domain only.
- Use valid UML relationships: "association", "inheritance", "aggregation", "composition", "dependency", "realization" — pick what fits.
- Include abstract classes or interfaces (stereotype "<<abstract>>" or "<<interface>>") where appropriate.
- All classes must be connected — no orphan nodes.
- Spread node positions in a grid (increment x by ~300, y by ~250).
- Keep JSON valid (no comments, no extra text).

TOPIC: "${topic}"`,
      },
    ],
    temperature: 0.3,
    max_tokens: 8000,
  });

  const data = parseJsonObject(completion.choices?.[0]?.message?.content || "");
  const generated = {
    title: text(data.title || `${topic} UML Exercise`),
    problem: String(data.problem || "Design the UML diagram."),
    solution: safeSolution(data.solution),
  };

  return isGenericSolution(generated.solution) ? fallback(topic) : generated;
}

async function aiGenerateSolution(topic, problemDescription) {
  if (!groq) return fallback(topic).solution;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a STRICT UML class diagram generator.

You MUST follow the topic domain EXACTLY.

❌ FORBIDDEN:
- Generic examples like: Book, Member, Loan, User (unless explicitly required by topic)
- Reusing the same default examples
- Ignoring the topic

✅ REQUIRED:
- Extract the REAL-WORLD domain from the topic
- Use ONLY domain-specific class names
- If topic = hotel → use Room, Booking, Customer, Payment, Hotel, etc.
- If topic = e-commerce → use Product, Order, Cart, Payment, Customer
- If topic = school → use Student, Teacher, Course, Exam

🚨 If you generate generic classes, the answer is INVALID.

Return ONLY valid JSON.
No explanation.
No markdown.
No text outside JSON.`,
      },
      {
        role: "user",
        content: `TASK:

Generate ONE UML CLASS DIAGRAM exercise + solution.

TOPIC: "${topic}"

STEP 1: Understand the domain of the topic
STEP 2: Create domain-specific classes ONLY
STEP 3: Build a correct UML class diagram

OUTPUT FORMAT (STRICT JSON ONLY):

{
  "title": "short title based on topic",
  "problem": "clear exercise (2-3 lines max)",
  "solution": {
    "nodes": [
      {
        "id": "1",
        "type": "uml",
        "position": { "x": 100, "y": 100 },
        "data": {
          "umlType": "class",
          "name": "ClassName",
          "stereotype": "",
          "attributes": ["+ field : type"],
          "operations": ["+ method() : returnType"]
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "1",
        "target": "2",
        "type": "uml",
        "data": { "relationType": "association" }
      }
    ]
  }
}

STRICT RULES:

1. MINIMUM 5 classes
2. MAXIMUM 10 classes
3. EACH CLASS MUST HAVE:
   - 3–5 attributes
   - 2–4 methods

4. USE ONLY DOMAIN ENTITIES:
   Example for "${topic}":
   → Extract real entities and use them

5. RELATIONSHIPS:
   Use meaningful relations:
   - association
   - inheritance
   - aggregation
   - composition
   - dependency

6. NO GENERIC CLASSES:
   If you generate:
   - Book
   - Member
   - Loan
   → ANSWER IS WRONG

7. ALL CLASSES MUST BE CONNECTED

8. POSITIONING:
   - x increases by ~300
   - y increases by ~250

9. JSON MUST BE VALID:
   - No comments
   - No trailing commas
   - No extra text

FINAL RULE:
If you do not respect the topic domain, your answer is INVALID.`,
      },
    ],
    temperature: 0.25,
    max_tokens: 8000,
  });

  const data = parseJsonObject(completion.choices?.[0]?.message?.content || "");
  const solution = safeSolution(data);
  return isGenericSolution(solution) ? fallback(topic).solution : solution;
}

router.post("/generate-uml", async (req, res) => {
  try {
    const topic = text(req.body?.topic || "software design", 255);
    let generated = await aiGenerateProblemAndSolution(topic);

    if (isGenericSolution(generated.solution)) {
      console.log("⚠ Bad AI output -> retrying...");
      generated = await aiGenerateProblemAndSolution(topic);
    }

    const row = await UmlDiagram.create({
      title: text(generated.title, 255),
      topic,
      problemDescription: generated.problem,
      solution: safeSolution(generated.solution),
    });

    res.status(201).json({
      message: "UML problem generated and saved",
      problem: {
        id: row.id,
        title: row.title,
        topic: row.topic,
        problemDescription: row.problemDescription,
        solution: row.solution,
        createdAt: row.createdAt,
      },
    });
  } catch (error) {
    console.error("UML generation failed:", error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

router.get("/problems", async (_req, res) => {
  try {
    const problems = await UmlDiagram.findAll({
      attributes: ["id", "title", "topic", "problemDescription", "createdAt"],
      order: [["createdAt", "DESC"]],
    });
    res.json(problems);
  } catch (error) {
    console.error("Failed to list UML problems:", error);
    res.status(500).json({ error: "Failed to fetch UML problems" });
  }
});

router.get("/problems/:id", async (req, res) => {
  try {
    const problem = await UmlDiagram.findByPk(req.params.id, {
      attributes: ["id", "title", "topic", "problemDescription", "createdAt"],
    });

    if (!problem) return res.status(404).json({ error: "UML problem not found" });
    res.json(problem);
  } catch (error) {
    console.error("Failed to get UML problem:", error);
    res.status(500).json({ error: "Failed to fetch UML problem" });
  }
});

router.post("/problems/:id/solution", async (req, res) => {
  try {
    const problem = await UmlDiagram.findByPk(req.params.id, {
      attributes: ["id", "topic", "problemDescription", "solution"],
    });

    if (!problem) return res.status(404).json({ error: "UML problem not found" });

    const regenerate = req.query.regenerate === "1";
    let solution = safeSolution(problem.solution);

    if (regenerate || solution.nodes.length === 0) {
      solution = await aiGenerateSolution(problem.topic, problem.problemDescription);
      if (isGenericSolution(solution)) {
        console.log("⚠ Bad AI solution output -> retrying...");
        solution = await aiGenerateSolution(problem.topic, problem.problemDescription);
      }
      problem.solution = solution;
      await problem.save();
    }

    res.json({ id: problem.id, solution });
  } catch (error) {
    console.error("Failed to get UML solution:", error);
    res.status(500).json({ error: "Failed to fetch UML solution" });
  }
});

module.exports = router;
