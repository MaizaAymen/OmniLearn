// Simple per-user workspace: PDFs and code saved to Cloudinary.
const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { authenticate } = require("../middleware/Authmiddleware");

const router = express.Router();

// 1. Cloudinary config
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

// 2. Everyone here must be logged in.
router.use(authenticate);

// 3. We keep a small JSON file as our "database" for the workspace.
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

// 4. Upload helper: send a buffer to Cloudinary.
function uploadToCloudinary(buffer, folder) {
  return new Promise(function (resolve, reject) {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: "raw" },
      function (err, result) {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// 5. List ONLY the current user's files.
router.get("/list", function (req, res) {
  const all = readAll();
  const mine = all.filter(function (item) {
    return item.userId === req.user.id;
  });
  res.json({ items: mine });
});

// 6. Upload a PDF file (multipart form).
const upload = multer({ storage: multer.memoryStorage() });

router.post("/pdf", upload.single("pdf"), async function (req, res) {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const cloud = await uploadToCloudinary(
    req.file.buffer,
    "workspace/" + req.user.id + "/pdf"
  );

  const item = {
    id: "pdf_" + Date.now(),
    userId: req.user.id,
    type: "pdf",
    name: req.file.originalname,
    fileUrl: cloud.secure_url,
    createdAt: new Date().toISOString(),
  };

  const all = readAll();
  all.unshift(item);
  saveAll(all);

  res.json(item);
});

// 7. Save code typed in the modal (JSON body).
router.post("/code", express.json({ limit: "5mb" }), async function (req, res) {
  const name = req.body.name;
  const content = req.body.content;
  if (!name || !content) return res.status(400).json({ error: "Name and content required" });

  const cloud = await uploadToCloudinary(
    Buffer.from(content, "utf8"),
    "workspace/" + req.user.id + "/code"
  );

  const item = {
    id: "code_" + Date.now(),
    userId: req.user.id,
    type: "code",
    name: name,
    content: content,
    fileUrl: cloud.secure_url,
    createdAt: new Date().toISOString(),
  };

  const all = readAll();
  all.unshift(item);
  saveAll(all);

  res.json(item);
});

module.exports = router;
