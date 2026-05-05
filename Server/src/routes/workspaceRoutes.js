// Simple per-user workspace: PDFs and code saved to local disk.
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("../middleware/Authmiddleware");

const router = express.Router();

// Everyone here must be logged in.
router.use(authenticate);

// JSON index acting as a lightweight DB for workspace items.
const INDEX_FILE = path.join(__dirname, "..", "uploads", "workspace.json");
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
