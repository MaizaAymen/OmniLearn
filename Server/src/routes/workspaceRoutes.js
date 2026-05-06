// Simple per-user workspace: PDFs and code saved to local disk.
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const { authenticate } = require("../middleware/Authmiddleware");

const router = express.Router();

// Same Groq key used by pdfRoutes — reused here for code analysis.
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "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",
});

// Everyone here must be logged in.
router.use(authenticate);

// JSON index acting as a lightweight DB for workspace items.
const INDEX_FILE = path.join(__dirname, "..", "uploads", "workspace.json");
const HISTORY_FILE = path.join(__dirname, "..", "uploads", "history.json");
if (!fs.existsSync(path.dirname(INDEX_FILE))) {
  fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
}

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function saveAll(items) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(items, null, 2));
}

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function saveHistoryAll(items) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(items, null, 2));
}

// Multer disk storage — files land in uploads/workspace/<userId>/pdf/
const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = String(req.user?.id || "anon");
    const dir = path.join(__dirname, "..", "uploads", "workspace", userId, "pdf");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, unique + ext);
  },
});

// Accept files that are either marked as application/pdf OR end in .pdf —
// some browsers/OSes send application/octet-stream for PDFs.
const upload = multer({
  storage: pdfStorage,
  fileFilter: function (req, file, cb) {
    const isPdf =
      file.mimetype === "application/pdf" ||
      (file.originalname || "").toLowerCase().endsWith(".pdf");
    cb(null, isPdf);
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

const FREE_LIMIT = 3;
const PRO_LIMIT = 200;

// List ONLY the current user's files.
router.get("/list", function (req, res) {
  const userId = String(req.user.id);
  const all = readAll();
  const mine = all.filter(function (item) {
    return String(item.userId) === userId;
  });
  res.json({ items: mine });
});

// Multer error handler — surfaces file-too-large, bad mimetype, etc.
function handleUpload(req, res, next) {
  upload.single("pdf")(req, res, function (err) {
    if (err) {
      console.error("Workspace PDF upload (multer) error:", err);
      return res.status(400).json({ error: err.message || "Upload rejected" });
    }
    next();
  });
}

// Upload a PDF file (multipart form).
router.post("/pdf", handleUpload, function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received. Make sure you're uploading a .pdf file." });
    }

    const userId = String(req.user.id);

    if (req.user.plan === "free" && req.user.role !== "admin") {
      const all = readAll();
      const count = all.filter(function (i) { return i.userId === userId && i.type === "pdf"; }).length;
      if (count >= FREE_LIMIT) {
        fs.unlinkSync(req.file.path);
        return res.status(402).json({ error: "Free plan limit reached (3 PDFs). Upgrade to Pro for unlimited.", limitReached: true });
      }
    }

    if (req.user.plan === "pro" && req.user.role !== "admin") {
      const all = readAll();
      const count = all.filter(function (i) { return i.userId === userId && i.type === "pdf"; }).length;
      if (count >= PRO_LIMIT) {
        fs.unlinkSync(req.file.path);
        return res.status(402).json({ error: "Pro plan limit reached (200 PDFs).", limitReached: true });
      }
    }

    const fileUrl = "/uploads/workspace/" + userId + "/pdf/" + req.file.filename;

    const item = {
      id: "pdf_" + Date.now(),
      userId: userId,
      type: "pdf",
      name: req.file.originalname,
      fileUrl: fileUrl,
      filePath: req.file.path,
      createdAt: new Date().toISOString(),
    };

    const all = readAll();
    all.unshift(item);
    saveAll(all);

    res.json(item);
  } catch (err) {
    console.error("Workspace PDF upload error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ error: err?.message || "Failed to save PDF" });
  }
});

// Save code typed in the modal (JSON body).
router.post("/code", express.json({ limit: "5mb" }), function (req, res) {
  const name = req.body.name;
  const content = req.body.content;
  if (!name || !content) return res.status(400).json({ error: "Name and content required" });

  const userId = String(req.user.id);

  if (req.user.plan === "free" && req.user.role !== "admin") {
    const all = readAll();
    const count = all.filter(function (i) { return String(i.userId) === userId && i.type === "code"; }).length;
    if (count >= FREE_LIMIT) {
      return res.status(402).json({ error: "Free plan limit reached (3 code files). Upgrade to Pro for unlimited.", limitReached: true });
    }
  }

  const item = {
    id: "code_" + Date.now(),
    userId: userId,
    type: "code",
    name: name,
    content: content,
    createdAt: new Date().toISOString(),
  };

  const all = readAll();
  all.unshift(item);
  saveAll(all);

  res.json(item);
});

// AI analysis for a code snippet. Accepts either an inline { content } payload
// (so newly-uploaded code can be analyzed before it's saved) or { itemId } to
// load a previously-saved code item by id. An optional `question` lets the user
// ask follow-ups; without one we return a structured overview.
router.post("/code/analyze", express.json({ limit: "5mb" }), async function (req, res) {
  try {
    const userId = String(req.user.id);
    let { content, name, language, question, itemId, history } = req.body || {};

    if (itemId && !content) {
      const all = readAll();
      const item = all.find(function (i) { return i.id === itemId; });
      if (!item) return res.status(404).json({ error: "Item not found" });
      if (String(item.userId) !== userId) return res.status(403).json({ error: "Forbidden" });
      if (item.type !== "code") return res.status(400).json({ error: "Item is not code" });
      content = item.content;
      name = name || item.name;
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "No code provided" });
    }

    // Cap the snippet so we don't blow the model's context window.
    const MAX_CHARS = 12000;
    const truncated = content.length > MAX_CHARS;
    const snippet = truncated ? content.slice(0, MAX_CHARS) : content;

    const langHint = language || (name ? path.extname(name).replace(".", "") : "") || "";

    // System prompt embeds the file once so the model has it for the whole chat.
    const systemPrompt =
      "You are a senior software engineer acting as a code reviewer and tutor. " +
      "Be concise, precise, and friendly. Use Markdown with short sections and bullet points. " +
      "When you reference code, use fenced code blocks.\n\n" +
      `The user is working on this file: ${name || "snippet"}${langHint ? ` (${langHint})` : ""}` +
      `${truncated ? " — truncated to fit the context window" : ""}\n\n` +
      "```" + langHint + "\n" + snippet + "\n```";

    // Default first turn: structured overview. Otherwise replay the chat.
    const messages = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(history) && history.length > 0) {
      for (const m of history) {
        if (!m || !m.role || !m.content) continue;
        if (m.role !== "user" && m.role !== "assistant") continue;
        messages.push({ role: m.role, content: String(m.content) });
      }
    }

    if (question && question.trim()) {
      messages.push({ role: "user", content: question.trim() });
    } else if (messages.length === 1) {
      messages.push({
        role: "user",
        content:
          "Give me an overview of this code. Cover:\n" +
          "1. **What it does** (one short paragraph)\n" +
          "2. **Key parts** (functions, classes, important logic)\n" +
          "3. **Possible issues / bugs**\n" +
          "4. **Suggestions to improve** (clarity, performance, safety)",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.3,
      max_tokens: 1200,
    });

    const answer = completion.choices?.[0]?.message?.content || "";
    res.json({ answer, truncated });
  } catch (err) {
    console.error("Workspace code analyze error:", err);
    res.status(500).json({ error: err?.message || "Failed to analyze code" });
  }
});

// Shared helper: load a code item from disk and return its content/name/lang,
// validating ownership. Used by /code/summarize and /code/quiz.
function loadCodeForUser(req) {
  const userId = String(req.user.id);
  let { content, name, language, itemId } = req.body || {};
  if (itemId && !content) {
    const all = readAll();
    const item = all.find(function (i) { return i.id === itemId; });
    if (!item) return { error: { status: 404, msg: "Item not found" } };
    if (String(item.userId) !== userId) return { error: { status: 403, msg: "Forbidden" } };
    if (item.type !== "code") return { error: { status: 400, msg: "Item is not code" } };
    content = item.content;
    name = name || item.name;
  }
  if (!content || !content.trim()) return { error: { status: 400, msg: "No code provided" } };
  const langHint = language || (name ? path.extname(name).replace(".", "") : "") || "";
  const MAX = 12000;
  const truncated = content.length > MAX;
  return {
    content: truncated ? content.slice(0, MAX) : content,
    name: name || "snippet",
    langHint,
    truncated,
  };
}

// Summarize a code snippet.
router.post("/code/summarize", express.json({ limit: "5mb" }), async function (req, res) {
  try {
    const loaded = loadCodeForUser(req);
    if (loaded.error) return res.status(loaded.error.status).json({ error: loaded.error.msg });
    const { content, name, langHint, truncated } = loaded;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a senior software engineer. Produce a concise, well-structured summary " +
            "of the given code. Use Markdown with these sections: **Purpose**, **Main pieces**, " +
            "**How it works** (short bullets), **Notable details**. Keep it under 250 words.",
        },
        {
          role: "user",
          content:
            `File: ${name}${langHint ? ` (${langHint})` : ""}` +
            `${truncated ? " — truncated\n" : "\n"}` +
            "```" + langHint + "\n" + content + "\n```",
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const summary = completion.choices?.[0]?.message?.content || "";
    res.json({ summary, truncated });
  } catch (err) {
    console.error("Workspace code summarize error:", err);
    res.status(500).json({ error: err?.message || "Failed to summarize code" });
  }
});

// Generate a multiple-choice quiz from a code snippet.
router.post("/code/quiz", express.json({ limit: "5mb" }), async function (req, res) {
  try {
    const loaded = loadCodeForUser(req);
    if (loaded.error) return res.status(loaded.error.status).json({ error: loaded.error.msg });
    const { content, name, langHint, truncated } = loaded;

    const count = Math.min(Math.max(Number(req.body?.count) || 10, 1), 20);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a coding instructor. Generate multiple-choice questions about the given code " +
            "to test understanding (purpose, behavior, edge cases, syntax, language features). " +
            "Return ONLY a valid JSON array — no prose, no code fences. Each item must look like: " +
            `{"question":"...","options":["A...","B...","C...","D..."],"answer":"A"}. ` +
            "The answer field must be the letter A/B/C/D matching the correct option.",
        },
        {
          role: "user",
          content:
            `Generate exactly ${count} questions about this code.\n` +
            `File: ${name}${langHint ? ` (${langHint})` : ""}` +
            `${truncated ? " — truncated\n" : "\n"}` +
            "```" + langHint + "\n" + content + "\n```",
        },
      ],
      temperature: 0.4,
      max_tokens: 2500,
    });

    let raw = completion.choices?.[0]?.message?.content || "[]";
    // Strip accidental ``` fences if the model added them despite instructions.
    raw = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let questions;
    try {
      questions = JSON.parse(raw);
    } catch (e) {
      // Fallback: try to find a JSON array substring.
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start !== -1 && end > start) {
        questions = JSON.parse(raw.slice(start, end + 1));
      } else {
        throw new Error("Could not parse quiz JSON from model");
      }
    }

    if (!Array.isArray(questions)) throw new Error("Quiz response was not an array");

    res.json({ questions, truncated });
  } catch (err) {
    console.error("Workspace code quiz error:", err);
    res.status(500).json({ error: err?.message || "Failed to generate quiz" });
  }
});

// ─── Study History ────────────────────────────────────────────────
// Tracks quiz attempts and AI explanations per user.

// List the current user's history (newest first).
router.get("/history", function (req, res) {
  const userId = String(req.user.id);
  const all = readHistory();
  const mine = all.filter(function (h) { return String(h.userId) === userId; });
  res.json({ history: mine });
});

// Save a new history entry (quiz result OR explanation).
router.post("/history", express.json({ limit: "2mb" }), function (req, res) {
  const userId = String(req.user.id);
  const { type, documentName, score, total, questions, selectedText, explanation } = req.body || {};

  if (type !== "quiz" && type !== "explanation") {
    return res.status(400).json({ error: "type must be 'quiz' or 'explanation'" });
  }

  const entry = {
    id: "hist_" + Date.now() + "_" + Math.round(Math.random() * 1e6),
    userId: userId,
    type: type,
    documentName: documentName || "Untitled",
    date: new Date().toISOString(),
  };

  if (type === "quiz") {
    entry.score = Number(score) || 0;
    entry.total = Number(total) || 0;
    entry.questions = Array.isArray(questions) ? questions : [];
  } else {
    entry.selectedText = String(selectedText || "").slice(0, 200);
    entry.explanation = String(explanation || "");
  }

  const all = readHistory();
  all.unshift(entry);
  // Cap per-user history at 50 entries to keep the file small.
  const mine = all.filter(function (h) { return String(h.userId) === userId; });
  const others = all.filter(function (h) { return String(h.userId) !== userId; });
  const trimmed = others.concat(mine.slice(0, 50));
  saveHistoryAll(trimmed);

  res.json(entry);
});

// Delete one history entry.
router.delete("/history/:id", function (req, res) {
  const userId = String(req.user.id);
  const all = readHistory();
  const idx = all.findIndex(function (h) { return h.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  if (String(all[idx].userId) !== userId) return res.status(403).json({ error: "Forbidden" });
  all.splice(idx, 1);
  saveHistoryAll(all);
  res.json({ ok: true });
});

// Clear ALL history for the current user.
router.delete("/history", function (req, res) {
  const userId = String(req.user.id);
  const remaining = readHistory().filter(function (h) { return String(h.userId) !== userId; });
  saveHistoryAll(remaining);
  res.json({ ok: true });
});

// Delete a workspace item (PDF or code).
router.delete("/item/:itemId", function (req, res) {
  const all = readAll();
  const itemId = req.params.itemId;

  const itemIndex = all.findIndex(function (item) {
    return item.id === itemId;
  });

  if (itemIndex === -1) {
    return res.status(404).json({ error: "Item not found" });
  }

  const item = all[itemIndex];
  if (String(item.userId) !== String(req.user.id)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Delete the physical file for PDFs.
  if (item.type === "pdf" && item.filePath && fs.existsSync(item.filePath)) {
    fs.unlinkSync(item.filePath);
  }

  all.splice(itemIndex, 1);
  saveAll(all);

  res.status(200).json({ message: "Item deleted successfully" });
});

module.exports = router;
