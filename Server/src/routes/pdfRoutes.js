const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");

// Initialize Groq AI
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "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",
});

// Configure multer for file upload (store in memory)
const upload = multer({ storage: multer.memoryStorage() });

// Store PDF data in memory (simple cache)
const pdfCache = new Map();

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

    // Store in cache
    pdfCache.set(pdfId, {
      filename: req.file.originalname,
      fullText: fullText,
      chunks: chunks,
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

// ─── 3. Chat Q&A about PDF (RAG) ────────────────────────────────────
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

    // Simple keyword search (find most relevant chunks)
    const relevantChunks = findRelevantChunks(pdfData.chunks, question, 3);

    // Combine chunks into context
    const context = relevantChunks.join("\n\n");

    // Ask AI with context
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

    res.json({ answer, sources: relevantChunks.length });
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

// Find chunks that contain keywords from the question
function findRelevantChunks(chunks, question, topN = 3) {
  const questionWords = question.toLowerCase().split(/\s+/);

  // Score each chunk based on keyword matches
  const scored = chunks.map((chunk) => {
    const chunkLower = chunk.toLowerCase();
    const score = questionWords.reduce((acc, word) => {
      // Count occurrences of each question word in chunk
      const regex = new RegExp(word, "gi");
      const matches = (chunkLower.match(regex) || []).length;
      return acc + matches;
    }, 0);

    return { chunk, score };
  });

  // Sort by score and take top N
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((item) => item.chunk);
}

module.exports = router;
