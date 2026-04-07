const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");

// ─── LangChain + Chroma Imports for Semantic Search (RAG) ─────────────
// HuggingFaceInferenceEmbeddings: Creates vector embeddings using HuggingFace API
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
// Chroma: Vector database for storing and searching embeddings
const { Chroma } = require("@langchain/community/vectorstores/chroma");
// Document: LangChain document wrapper for storing text with metadata
const { Document } = require("@langchain/core/documents");

const CHROMA_URL = process.env.CHROMA_URL || "http://127.0.0.1:8000";
const CHROMA_PERSIST_DIR = process.env.CHROMA_PERSIST_DIR || "./chroma_db";

// Initialize embeddings model using HuggingFace Inference API
// Uses sentence-transformers model for high-quality semantic embeddings
const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HF_API_KEY || "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",
  model: "sentence-transformers/all-MiniLM-L6-v2", // Fast, good quality embeddings
});

// Initialize Groq AI
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "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",
});

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const INDEX_PATH = path.join(UPLOAD_DIR, "index.json");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const readIndex = () => {
  if (!fs.existsSync(INDEX_PATH)) return [];
  try {
    const raw = fs.readFileSync(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeIndex = (items) => {
  fs.writeFileSync(INDEX_PATH, JSON.stringify(items, null, 2));
};

const loadPdfData = async (pdfId) => {
  const cached = pdfCache.get(pdfId);
  if (cached) return cached;

  const indexItems = readIndex();
  const item = indexItems.find((entry) => entry.pdfId === pdfId);
  if (!item) return null;

  const storedName = item.storedName || pdfId;
  const filePath = path.join(UPLOAD_DIR, storedName);
  if (!fs.existsSync(filePath)) return null;

  const pdfBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(pdfBuffer);
  const fullText = pdfData.text;
  const chunks = chunkText(fullText, 800);

  const collectionName = item.collectionName || `pdf_${pdfId.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: collectionName,
    persistDirectory: CHROMA_PERSIST_DIR,
    url: CHROMA_URL,
  });

  const loaded = {
    filename: item.filename || storedName,
    fullText: fullText,
    chunks: chunks,
    vectorStore: vectorStore,
    collectionName: collectionName,
    filePath: filePath,
    fileUrl: item.fileUrl || "",
    uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : new Date(),
  };

  pdfCache.set(pdfId, loaded);
  return loaded;
};

// Load only text/chunks without vector store (used by quiz to avoid Chroma dependency)
const loadPdfTextOnly = async (pdfId) => {
  const cached = pdfCache.get(pdfId);
  if (cached?.chunks?.length) return cached;

  const indexItems = readIndex();
  const item = indexItems.find((entry) => entry.pdfId === pdfId);
  if (!item) return null;

  const storedName = item.storedName || pdfId;
  const filePath = path.join(UPLOAD_DIR, storedName);
  if (!fs.existsSync(filePath)) return null;

  const pdfBuffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(pdfBuffer);
  const fullText = parsed.text || "";
  const chunks = chunkText(fullText, 800);

  const loaded = {
    filename: item.filename || storedName,
    fullText,
    chunks,
    totalPages: parsed.numpages || 0,
    filePath,
    fileUrl: item.fileUrl || "",
    uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : new Date(),
  };

  pdfCache.set(pdfId, { ...cached, ...loaded });
  return loaded;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pdfId = `${Date.now()}-${safeName}`;
    req.pdfId = pdfId;
    cb(null, pdfId);
  },
});

const upload = multer({ storage });

// Store PDF data in memory (simple cache)
const pdfCache = new Map();

// Store highlights, notes, and bookmarks per PDF
const highlightsStore = new Map(); // pdfId -> [{ id, text, note, page, color, createdAt }]
const bookmarksStore = new Map();  // pdfId -> [{ id, page, title, createdAt }]

// ─── 1. Upload PDF & Extract Text ────────────────────────────────────
router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const pdfId = req.pdfId || req.file.filename;
    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;

    // Extract text from PDF
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);
    const fullText = pdfData.text;

    // Split text into chunks (500-1000 words each)
    const chunks = chunkText(fullText, 800);

    // ─── Create Vector Store with Embeddings ───────────────────────
    // Convert text chunks to LangChain Document objects with metadata
    const documents = chunks.map((chunk, index) => new Document({
      pageContent: chunk,
      metadata: {
        chunkIndex: index,
        pdfId: pdfId,
        filename: req.file.originalname,
        text: chunk
      }
    }));

    // Create Chroma vector store from documents
    // This embeds each chunk using OllamaEmbeddings and stores vectors in Chroma
    const collectionName = `pdf_${pdfId.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const vectorStore = await Chroma.fromDocuments(documents, embeddings, {
      collectionName: collectionName,
      persistDirectory: CHROMA_PERSIST_DIR,
      url: CHROMA_URL,
    });

    // Store in cache (now includes vectorStore for semantic search)
    pdfCache.set(pdfId, {
      filename: req.file.originalname,
      fullText: fullText,
      chunks: chunks,
      totalPages: pdfData.numpages || 0,
      vectorStore: vectorStore, // NEW: Store vector store for similarity search
      collectionName: collectionName,
      filePath: filePath,
      fileUrl: fileUrl,
      uploadedAt: new Date(),
    });

    const indexItems = readIndex();
    indexItems.unshift({
      pdfId: pdfId,
      filename: req.file.originalname,
      storedName: req.file.filename,
      fileUrl: fileUrl,
      uploadedAt: new Date().toISOString(),
      collectionName: collectionName,
    });
    writeIndex(indexItems);

    res.json({
      success: true,
      pdfId: pdfId,
      filename: req.file.originalname,
      totalPages: pdfData.numpages,
      chunksCount: chunks.length,
      fileUrl: fileUrl,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

// ─── List Uploaded PDFs ────────────────────────────────────────────
router.get("/list", (req, res) => {
  const items = readIndex();
  res.json({ items });
});

// ─── 2. Explain Selected Text ────────────────────────────────────────
router.post("/explain", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Call AI to explain the text
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a helpful teacher. Explain selected text in simple, clear language. Make it easy to understand for beginners.",
        },
        {
          role: "user",
          content: `Explain this text in simple words:\n\n${text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const explanation = completion.choices[0].message.content;

    res.json({ explanation });
  } catch (error) {
    console.error("Explain error:", error);
    res.status(500).json({ error: "Failed to explain text" });
  }
});

// ─── 3. Chat Q&A about PDF (RAG with Semantic Search) ────────────────
router.post("/chat", async (req, res) => {
  try {
    const { pdfId, question } = req.body;

    if (!pdfId || !question) {
      return res.status(400).json({ error: "PDF ID and question required" });
    }

    // Get PDF data from cache
    const pdfData = await loadPdfData(pdfId);
    if (!pdfData) {
      return res.status(404).json({ error: "PDF not found. Please upload again." });
    }

    // ─── Semantic Similarity Search ────────────────────────────────
    // Use vector store to find semantically relevant chunks
    // This compares the question's embedding with stored chunk embeddings
    // Returns top 3 most similar chunks based on cosine similarity
    const results = await pdfData.vectorStore.similaritySearch(question, 3);

    // Build context from search results
    // Each result has pageContent (the chunk text) and metadata
    const context = results.map(r => r.pageContent).join("\n\n");

    // Ask AI with context (Groq completion unchanged)
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant. Answer questions based on the provided PDF context. If the answer is not in the context, say so politely.",
        },
        {
          role: "user",
          content: `Context from PDF:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = completion.choices[0].message.content;

    res.json({ answer, sources: results.length });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

// ─── 4. Summarize PDF ────────────────────────────────────────────────
router.post("/summarize", async (req, res) => {
  try {
    const { pdfId } = req.body;

    const pdfData = await loadPdfData(pdfId);
    if (!pdfData) {
      return res.status(404).json({ error: "PDF not found" });
    }

    // Use first few chunks for summary (to avoid token limits)
    const textToSummarize = pdfData.chunks.slice(0, 5).join("\n\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Summarize the following text in 3-5 bullet points. Be clear and concise.",
        },
        {
          role: "user",
          content: textToSummarize,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const summary = completion.choices[0].message.content;

    res.json({ summary });
  } catch (error) {
    console.error("Summarize error:", error);
    res.status(500).json({ error: "Failed to summarize PDF" });
  }
});

// ─── 5. Generate Quiz (10 or 20 questions) ─────────────────────────
router.post("/quiz", async (req, res) => {
  try {
    const { pdfId, count, pages, pageFrom, pageTo } = req.body;
    const questionCount = Number(count) === 20 ? 20 : 10;

    if (!pdfId) {
      return res.status(400).json({ error: "PDF ID required" });
    }

    const pdfData = await loadPdfTextOnly(pdfId);
    if (!pdfData) {
      return res.status(404).json({ error: "PDF not found" });
    }

    const chunks = pdfData.chunks || [];
    const totalPages = Number(pdfData.totalPages) || 0;

    let fromPage = Math.max(1, Number(pageFrom) || 1);
    let toPage = Math.max(fromPage, Number(pageTo) || fromPage);

    // Backward compatibility with old pages option.
    if (pageFrom == null && pageTo == null && pages != null) {
      if (String(pages).toLowerCase() === "all") {
        fromPage = 1;
        toPage = totalPages > 0 ? totalPages : 999;
      } else {
        const pagesToUse = Math.max(1, Number(pages) || 3);
        fromPage = 1;
        toPage = pagesToUse;
      }
    }

    if (totalPages > 0) {
      fromPage = Math.min(fromPage, totalPages);
      toPage = Math.min(toPage, totalPages);
    }

    let selectedChunks = chunks;
    if (chunks.length > 0 && totalPages > 0) {
      const startIndex = Math.floor(((fromPage - 1) / totalPages) * chunks.length);
      const endIndex = Math.ceil((toPage / totalPages) * chunks.length);
      selectedChunks = chunks.slice(startIndex, Math.max(startIndex + 1, endIndex));
    }

    if (!selectedChunks.length) {
      selectedChunks = chunks.slice(0, 6);
    }

    // Keep context compact to reduce model failures on large PDFs.
    const quizContext = selectedChunks.join("\n\n").slice(0, 12000);
    if (!quizContext.trim()) {
      return res.status(400).json({ error: "No readable text found in this PDF" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a quiz generator. Return only a JSON array. Each item must be: {\"question\": string, \"options\": [string, string, string, string], \"answer\": string}.",
        },
        {
          role: "user",
          content: `Create exactly ${questionCount} multiple-choice quiz questions from this PDF content:\n\n${quizContext}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const content = completion.choices?.[0]?.message?.content || "[]";
    let questions = [];

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseError) {
      questions = [];
    }

    if (!Array.isArray(questions)) {
      questions = [];
    }

    questions = questions.slice(0, questionCount).map((q, index) => ({
      question: q?.question || `Question ${index + 1}`,
      options: Array.isArray(q?.options) ? q.options.slice(0, 4) : [],
      answer: q?.answer || "",
    }));

    res.json({
      questions,
      count: questionCount,
      pageFrom: fromPage,
      pageTo: toPage,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({
      error: "Failed to generate quiz",
      details: error?.message || "Unknown server error",
    });
  }
});

// ─── 6. Save Highlight with Note ──────────────────────────────────────
router.post("/highlights", async (req, res) => {
  try {
    const { pdfId, text, note, page, color } = req.body;

    if (!pdfId || !text) {
      return res.status(400).json({ error: "PDF ID and text required" });
    }

    const highlight = {
      id: Date.now().toString(),
      text,
      note: note || "",
      page: page || 1,
      color: color || "#ffff00",
      createdAt: new Date(),
    };

    if (!highlightsStore.has(pdfId)) {
      highlightsStore.set(pdfId, []);
    }
    highlightsStore.get(pdfId).push(highlight);

    res.json({ success: true, highlight });
  } catch (error) {
    console.error("Save highlight error:", error);
    res.status(500).json({ error: "Failed to save highlight" });
  }
});

// Get all highlights for a PDF
router.get("/highlights/:pdfId", (req, res) => {
  const highlights = highlightsStore.get(req.params.pdfId) || [];
  res.json({ highlights });
});

// Delete a highlight
router.delete("/highlights/:pdfId/:highlightId", (req, res) => {
  const { pdfId, highlightId } = req.params;
  const highlights = highlightsStore.get(pdfId) || [];
  const filtered = highlights.filter((h) => h.id !== highlightId);
  highlightsStore.set(pdfId, filtered);
  res.json({ success: true });
});

// ─── 7. Bookmarks ─────────────────────────────────────────────────────
router.post("/bookmarks", async (req, res) => {
  try {
    const { pdfId, page, title } = req.body;

    if (!pdfId || !page) {
      return res.status(400).json({ error: "PDF ID and page required" });
    }

    const bookmark = {
      id: Date.now().toString(),
      page,
      title: title || `Page ${page}`,
      createdAt: new Date(),
    };

    if (!bookmarksStore.has(pdfId)) {
      bookmarksStore.set(pdfId, []);
    }
    bookmarksStore.get(pdfId).push(bookmark);

    res.json({ success: true, bookmark });
  } catch (error) {
    console.error("Save bookmark error:", error);
    res.status(500).json({ error: "Failed to save bookmark" });
  }
});

// Get all bookmarks for a PDF
router.get("/bookmarks/:pdfId", (req, res) => {
  const bookmarks = bookmarksStore.get(req.params.pdfId) || [];
  res.json({ bookmarks });
});

// Delete a bookmark
router.delete("/bookmarks/:pdfId/:bookmarkId", (req, res) => {
  const { pdfId, bookmarkId } = req.params;
  const bookmarks = bookmarksStore.get(pdfId) || [];
  const filtered = bookmarks.filter((b) => b.id !== bookmarkId);
  bookmarksStore.set(pdfId, filtered);
  res.json({ success: true });
});

// ─── 8. Smart Search (Semantic Concept Search) ─────────────────────────
router.post("/smart-search", async (req, res) => {
  try {
    const { pdfId, query } = req.body;

    if (!pdfId || !query) {
      return res.status(400).json({ error: "PDF ID and query required" });
    }

    const pdfData = await loadPdfData(pdfId);
    if (!pdfData) {
      return res.status(404).json({ error: "PDF not found" });
    }

    // ─── Use Vector Store for Semantic Search ─────────────────────
    // First, find semantically relevant sections using embeddings
    const semanticResults = await pdfData.vectorStore.similaritySearch(query, 5);
    const relevantText = semanticResults.map(r => r.pageContent).join("\n\n");

    // Use AI to analyze and format the semantically relevant sections
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You analyze document sections to find information related to a concept.
Return a JSON array of relevant excerpts. Format: [{"excerpt": "text...", "relevance": "why relevant"}]
Only return the JSON array, no other text.`,
        },
        {
          role: "user",
          content: `Relevant document sections:\n${relevantText}\n\nFind information about: "${query}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    let results = [];
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      results = [{ excerpt: completion.choices[0].message.content, relevance: "AI response" }];
    }

    res.json({ results, query });
  } catch (error) {
    console.error("Smart search error:", error);
    res.status(500).json({ error: "Failed to search" });
  }
});

// ─── Helper Functions ────────────────────────────────────────────────

// Split text into chunks of approximately maxWords
function chunkText(text, maxWords = 800) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += maxWords) {
    const chunk = words.slice(i, i + maxWords).join(" ");
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// NOTE: findRelevantChunks has been REMOVED
// Replaced by vectorStore.similaritySearch() for semantic search

module.exports = router;
