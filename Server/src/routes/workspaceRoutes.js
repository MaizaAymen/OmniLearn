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
const FREE_LIMIT = 3;

router.post("/pdf", upload.single("pdf"), async function (req, res) {
  if (!req.file) return res.status(400).json({ error: "No file" });

  if (req.user.plan === "free" && req.user.role !== "admin") {
    const all = readAll();
    const count = all.filter(function (i) { return i.userId === req.user.id && i.type === "pdf"; }).length;
    if (count >= FREE_LIMIT) {
      return res.status(402).json({ error: "Free plan limit reached (3 PDFs). Upgrade to Pro for unlimited.", limitReached: true });
    }
  }

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

  if (req.user.plan === "free" && req.user.role !== "admin") {
    const all = readAll();
    const count = all.filter(function (i) { return i.userId === req.user.id && i.type === "code"; }).length;
    if (count >= FREE_LIMIT) {
      return res.status(402).json({ error: "Free plan limit reached (3 code files). Upgrade to Pro for unlimited.", limitReached: true });
    }
  }

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

// 8. Delete a workspace item (PDF or code).
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
  if (item.userId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  all.splice(itemIndex, 1);
  saveAll(all);

  res.status(200).json({ message: "Item deleted successfully" });
});

module.exports = router;
