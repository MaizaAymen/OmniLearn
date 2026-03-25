const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");

// ─── LangChain + Chroma Imports for Semantic Search (RAG) ─────────────
// HuggingFaceInferenceEmbeddings: Creates vector embeddings using HuggingFace API
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
// Chroma: Vector database for storing and searching embeddings
const { Chroma } = require("@langchain/community/vectorstores/chroma");
// Document: LangChain document wrapper for storing text with metadata
const { Document } = require("@langchain/core/documents");

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

// Configure multer for file upload (store in memory)
const upload = multer({ storage: multer.memoryStorage() });

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

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const fullText = pdfData.text;

    // Split text into chunks (500-1000 words each)
    const chunks = chunkText(fullText, 800);

    // Create unique ID for this PDF
    const pdfId = Date.now() + "-" + req.file.originalname;

    // ─── Create Vector Store with Embeddings ───────────────────────
    // Convert text chunks to LangChain Document objects with metadata
    const documents = chunks.map((chunk, index) => new Document({
      pageContent: chunk,
      metadata: {
        chunkIndex: index,
        pdfId: pdfId,
        filename: req.file.originalname
      }
    }));

    // Create Chroma vector store from documents
    // This embeds each chunk using OllamaEmbeddings and stores vectors in Chroma
    const vectorStore = await Chroma.fromDocuments(documents, embeddings, {
      collectionName: `pdf_${pdfId.replace(/[^a-zA-Z0-9]/g, "_")}`, // Sanitize collection name
    });

    // Store in cache (now includes vectorStore for semantic search)
    pdfCache.set(pdfId, {
      filename: req.file.originalname,
      fullText: fullText,
      chunks: chunks,
      vectorStore: vectorStore, // NEW: Store vector store for similarity search
      uploadedAt: new Date(),
    });

    res.json({
      success: true,
      pdfId: pdfId,
      filename: req.file.originalname,
      totalPages: pdfData.numpages,
      chunksCount: chunks.length,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
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
    const pdfData = pdfCache.get(pdfId);
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

    const pdfData = pdfCache.get(pdfId);
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

// ─── 5. Save Highlight with Note ──────────────────────────────────────
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

// ─── 6. Bookmarks ─────────────────────────────────────────────────────
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

// ─── 7. Smart Search (Semantic Concept Search) ─────────────────────────
router.post("/smart-search", async (req, res) => {
  try {
    const { pdfId, query } = req.body;

    if (!pdfId || !query) {
      return res.status(400).json({ error: "PDF ID and query required" });
    }

    const pdfData = pdfCache.get(pdfId);
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
