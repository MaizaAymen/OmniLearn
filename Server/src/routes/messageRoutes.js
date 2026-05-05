const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const sequelize = require("../config/database");
const { Conversation, Message, Notification } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");
const { emitMessage, emitNotification } = require("../realtime/messageHub");

router.use(authenticate);

const io = (req) => req.app.get("io");

// ── Attachment upload (multer → /uploads, served as /uploads/<name>) ────────
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = (file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `msg-${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// kind = "image" for images/gifs (rendered inline), "file" for everything else.
const kindOf = (mime = "") => (mime.startsWith("image/") ? "image" : "file");

// POST /api/messages/upload — multipart "file" → returns attachment metadata.
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    mime: req.file.mimetype,
    size: req.file.size,
    kind: kindOf(req.file.mimetype),
  });
});

const FREE_PRIVATE_CONTACT_LIMIT = 3;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);

// Sequelize's Op.contains on an ARRAY(UUID) column has been observed to emit
// SQL where the bound UUID is fed to PostgreSQL without proper array literal
// framing, producing "tableau littéral mal formé" (malformed array literal).
// Using parameterized raw queries with an explicit ::uuid[] cast avoids it.
const conversationsTable = (() => {
  const tbl = Conversation.getTableName();
  if (typeof tbl === "string") return `"${tbl}"`;
  return tbl.schema ? `"${tbl.schema}"."${tbl.tableName}"` : `"${tbl.tableName}"`;
})();

async function findPrivateConversationId(userId, otherId) {
  const [rows] = await sequelize.query(
    `SELECT id FROM ${conversationsTable}
      WHERE type = 'private'
        AND cardinality(members) = 2
        AND members @> ARRAY[$1, $2]::uuid[]
      LIMIT 1`,
    { bind: [userId, otherId] }
  );
  return rows[0]?.id || null;
}

// Distinct other-users this user has private conversations with.
async function getPrivateContactIds(userId) {
  try {
    const [rows] = await sequelize.query(
      `SELECT members FROM ${conversationsTable}
        WHERE type = 'private' AND members @> ARRAY[$1]::uuid[]`,
      { bind: [userId] }
    );
    const others = new Set();
    for (const r of rows) {
      for (const m of r.members || []) if (m !== userId) others.add(m);
    }
    return others;
  } catch (err) {
    console.error("getPrivateContactIds failed (allowing send):", err);
    return new Set();
  }
}

// POST /api/messages/send
// body: { conversationId, content }
router.post("/send", async (req, res) => {
  try {
    const { conversationId, content, attachment } = req.body || {};
    if (!conversationId || (!content && !attachment)) {
      return res.status(400).json({ error: "conversationId and content or attachment are required" });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (!conversation.members.includes(req.user.id)) {
      return res.status(403).json({ error: "Not a member of this conversation" });
    }

    const message = await Message.create({
      conversationId: conversation.id,
      senderId: req.user.id,
      content: String(content || "").slice(0, 5000),
      attachment: attachment || null,
    });

    // Bump conversation updatedAt for sorting in lists.
    conversation.changed("updatedAt", true);
    await conversation.save();

    emitMessage(io(req), conversation.id, message);

    res.status(201).json(message);
  } catch (err) {
    console.error("send:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/messages/private
// body: { recipientId, content }
// Auto-creates the 1-to-1 conversation if it does not exist.
router.post("/private", async (req, res) => {
  try {
    const { recipientId, content, attachment } = req.body || {};
    if (!recipientId || (!content && !attachment)) {
      return res.status(400).json({ error: "recipientId and content or attachment are required" });
    }
    const myId = String(req.user.id);
    const otherId = String(recipientId);
    if (!isUuid(myId) || !isUuid(otherId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (otherId === myId) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    // Free tier: only allow private chats with up to FREE_PRIVATE_CONTACT_LIMIT
    // distinct people. Messaging an existing contact is always allowed; opening
    // a new one is blocked once the cap is reached.
    try {
      if (req.user.plan === "free" && req.user.role !== "admin") {
        const privateContacts = await getPrivateContactIds(myId);
        if (
          !privateContacts.has(otherId) &&
          privateContacts.size >= FREE_PRIVATE_CONTACT_LIMIT
        ) {
          return res.status(402).json({
            error: `Free tier limit reached: you can only message ${FREE_PRIVATE_CONTACT_LIMIT} different people. Upgrade to Pro to add more contacts.`,
            limitReached: true,
            scope: "privateContacts",
            contacts: privateContacts.size,
            limit: FREE_PRIVATE_CONTACT_LIMIT,
          });
        }
      }
    } catch (limitErr) {
      console.error("private contact limit check failed (allowing send):", limitErr);
    }

    // Find existing private conversation between these two users (raw query
    // sidesteps the malformed-array-literal bug from Sequelize's Op.contains).
    const existingId = await findPrivateConversationId(myId, otherId);
    let conversation = existingId ? await Conversation.findByPk(existingId) : null;

    if (!conversation) {
      conversation = await Conversation.create({
        type: "private",
        members: [myId, otherId],
      });
    }

    const message = await Message.create({
      conversationId: conversation.id,
      senderId: myId,
      content: String(content || "").slice(0, 5000),
      attachment: attachment || null,
    });

    conversation.changed("updatedAt", true);
    await conversation.save();

    emitMessage(io(req), conversation.id, message);

    // Notify recipient.
    const notif = await Notification.create({
      userId: otherId,
      type: "message",
      message: `${req.user.firstname || "Someone"} sent you a message`,
      link: `/conversations/${conversation.id}`,
    });
    emitNotification(io(req), otherId, notif);

    res.status(201).json({ conversation, message });
  } catch (err) {
    console.error("POST /api/messages/private failed:", {
      name: err?.name,
      message: err?.message,
      sql: err?.sql,
      original: err?.original?.message,
      stack: err?.stack,
    });
    res.status(500).json({
      error: err?.message || "Failed to send private message",
      detail: err?.original?.message || undefined,
    });
  }
});

module.exports = router;
