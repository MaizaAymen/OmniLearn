const { Liveblocks } = require("@liveblocks/node");
const bcrypt = require("bcryptjs");
const { ExamSubmission } = require("../models");

// ---------- configuration ----------
const ROLE_PERMISSIONS = {
  host:       { canEdit: true, canComment: true, canKick: true, canMute: true, canChangePermissions: true },
  "co-host":  { canEdit: true, canComment: true, canKick: true, canMute: true, canChangePermissions: true },
  editor:     { canEdit: true, canComment: true, canKick: false, canMute: false, canChangePermissions: false },
  viewer:     { canEdit: false, canComment: true, canKick: false, canMute: false, canChangePermissions: false },
};
const VALID_ROLES = new Set(["host","co-host","editor","viewer"]);
const VALID_COLLAB_MODES = new Set(["free","controlled","turn-based"]);
const VALID_VISIBILITIES = new Set(["public","private","unlisted"]);
const VALID_IDENTITY = new Set(["real","anonymous","pseudonymous"]);
const MODE_PRESETS = {
  practice:   { collabMode: "free",       teacherMode: false },
  classroom:  { collabMode: "controlled", teacherMode: true  },
  interview:  { collabMode: "turn-based", teacherMode: false },
};
const LIMITS = { minParticipants:1, maxParticipants:200, minTurnSeconds:5 };
const DEFAULTS = { sessionName:"Untitled Session", hostName:"host", maxParticipants:10, visibility:"public", defaultRole:"editor", collabMode:"free", turnDuration:30 };

// ---------- liveblocks client ----------
const liveblocks = new Liveblocks({
  secret: "sk_dev_zSZuJRBG8GVDCAmy-a8c88DDRnFapDpUEjQi6f6jc3Pat0_pKPouuql8TxRflb3H",
});
// ---------- in‑memory session metadata (light) ----------
const sessions = new Map(); // sessionId -> metadata (id, name, hostName, visibility, passwordHash, whitelist, blacklist, requireJoinApproval, identityMode, maxParticipants, autoLock, allowOverflow, locked, defaultRole, permissionOverrides, collab, teacherMode, exam, postSession, languageLock, createdAt, problemIds, playlistMode, currentProblemIndex)
// also store exam timers: Map<sessionId, NodeJS.Timeout>
const examTimers = new Map();

// helper to generate short session IDs
function generateId() { return `S-${Math.random().toString(36).slice(2,8).toUpperCase()}`; }

// ---------- utility ----------
function clamp(n,min,max,fallback) { const v=Number(n); return Number.isFinite(v) ? Math.max(min,Math.min(max,v)) : fallback; }
function normalizeName(s) { return (s||"").trim().toLowerCase(); }
function parseNameList(v) {
  const arr = Array.isArray(v) ? v : String(v||"").split(",").map(s=>s.trim()).filter(Boolean);
  return [...new Set(arr.map(normalizeName))];
}
function defaultExam(raw={}) {
  return { enabled:!!raw.enabled, durationMinutes:clamp(raw.durationMinutes,1,300,30), lockLanguage:raw.lockLanguage!==false, autoSubmitOnTimeout:raw.autoSubmitOnTimeout!==false, phase:"waiting", startedAt:null, endsAt:null };
}
function defaultCollab(raw={}) {
  return { mode:VALID_COLLAB_MODES.has(raw.mode)?raw.mode:DEFAULTS.collabMode, turnDuration:clamp(raw.turnDuration,LIMITS.minTurnSeconds,3600,DEFAULTS.turnDuration), showLiveCursors:raw.showLiveCursors!==false, showSelections:raw.showSelections!==false, typingIndicators:raw.typingIndicators!==false, currentTurnSocketId:null, turnStartedAt:null };
}

// ---------- liveblocks helper: create the room (storage is initialized client-side on first connect) ----------
async function initSessionStorage(sessionId /* , config */) {
  const roomId = `session:${sessionId}`;
  await liveblocks.createRoom(roomId, { defaultAccesses: [] }).catch(e => {
    if (!String(e?.message || "").includes("already exists")) throw e;
  });
}

// ---------- API endpoints (Express / Next.js) ----------
const express = require("express");
const app = express();
app.use(express.json());

// 1) Create session → returns sessionId + roomId
app.post("/api/session/create", async (req, res) => {
  const raw = req.body;
  if (!raw.problemId || !raw.language) return res.status(400).json({ error:"Missing problemId or language" });

  const problemIds = (Array.isArray(raw.problemIds) && raw.problemIds.length) ? raw.problemIds : (raw.problemId ? [raw.problemId] : []);
  const sessionId = generateId();
  const meta = {
    id: sessionId, problemId: problemIds[0], problemIds, playlistMode: ["free","sequential"].includes(raw.playlistMode) ? raw.playlistMode : "free", currentProblemIndex:0,
    name: (raw.sessionName||DEFAULTS.sessionName).slice(0,100),
    hostName: normalizeName(raw.hostName||DEFAULTS.hostName),
    visibility: VALID_VISIBILITIES.has(raw.visibility)?raw.visibility:DEFAULTS.visibility,
    passwordHash: raw.password ? bcrypt.hashSync(String(raw.password),8) : "",
    allowAnonymous: raw.allowAnonymous!==false,
    whitelist: parseNameList(raw.whitelist),
    blacklist: parseNameList(raw.blacklist),
    requireJoinApproval: !!raw.requireJoinApproval,
    identityMode: VALID_IDENTITY.has(raw.identityMode)?raw.identityMode:"real",
    maxParticipants: clamp(raw.maxParticipants, LIMITS.minParticipants, LIMITS.maxParticipants, DEFAULTS.maxParticipants),
    autoLock: !!raw.autoLock,
    allowOverflow: !!raw.allowOverflow,
    locked: false,
    defaultRole: ["editor","viewer"].includes(raw.defaultRole)?raw.defaultRole:DEFAULTS.defaultRole,
    permissionOverrides: (()=>{ const out={}; for(const role of["editor","viewer"]) if(raw.permissionOverrides?.[role]) out[role]={...raw.permissionOverrides[role]}; return out; })(),
    collab: defaultCollab(raw.collab),
    teacherMode: !!raw.teacherMode,
    exam: defaultExam(raw.exam),
    postSession: { saveSnapshots:!!raw.postSession?.saveSnapshots, publishSolution:!!raw.postSession?.publishSolution, autoCloseOnEmpty:raw.postSession?.autoCloseOnEmpty!==false },
    languageLock: null,
    createdAt: Date.now(),
  };
  sessions.set(sessionId, meta);
  try {
    await initSessionStorage(sessionId, { language:raw.language, starterCode:raw.starterCode, collab:meta.collab, exam:meta.exam, problemIds:meta.problemIds, playlistMode:meta.playlistMode });
  } catch (err) {
    sessions.delete(sessionId);
    console.error("[session/create] Liveblocks init failed:", err);
    return res.status(500).json({ error: err?.message || "Liveblocks init failed" });
  }
  res.json({ sessionId, roomId:`session:${sessionId}` });
});

// 2) Join session – validate and generate a Liveblocks token (v3 API).
app.post("/api/session/join", async (req, res) => {
  try {
    const { sessionId, userName, password } = req.body;
    const meta = sessions.get(sessionId);
    if (!meta) return res.status(404).json({ error: "Session not found" });

    const safeUser = (userName || "Guest").trim() || "Guest";
    const normalizedUser = normalizeName(safeUser);
    if (meta.blacklist.includes(normalizedUser)) return res.status(403).json({ error: "Banned" });
    if (!meta.allowAnonymous && normalizedUser.startsWith("guest")) return res.status(403).json({ error: "Anonymous not allowed" });
    if (meta.whitelist.length && normalizedUser !== meta.hostName && !meta.whitelist.includes(normalizedUser)) return res.status(403).json({ error: "Not whitelisted" });
    if (meta.passwordHash && !bcrypt.compareSync(String(password || ""), meta.passwordHash)) return res.status(401).json({ error: "Wrong password" });

    const role = normalizedUser === meta.hostName ? "host" : meta.defaultRole;
    const canEdit = ROLE_PERMISSIONS[role]?.canEdit;

    // v3: prepareSession(userId, opts).allow(roomName, perms[]).authorize()
    const userId = `${normalizedUser}:${Math.random().toString(36).slice(2, 8)}`;
    const session = liveblocks.prepareSession(userId, { userInfo: { name: safeUser, role } });
    const perms = canEdit ? session.FULL_ACCESS : session.READ_ACCESS;
    session.allow(`session:${sessionId}`, perms);
    const { body, status } = await session.authorize();
    res.status(status).type("application/json").send(body);
  } catch (err) {
    console.error("[session/join]", err);
    res.status(500).json({ error: err?.message || "Auth failed" });
  }
});

// 3) List public sessions (global + per‑problem)
app.get("/api/sessions", (req, res) => {
  const list = [...sessions.values()].filter(s=>s.visibility!=="unlisted").map(s=>({ id:s.id, name:s.name, hostName:s.hostName, problemId:s.problemId, maxParticipants:s.maxParticipants, participantCount:0, visibility:s.visibility, requiresPassword:!!s.passwordHash })); // participantCount tracked client-side via Liveblocks
  res.json({ sessions:list });
});

// 4) Exam: start timer (server‑side)
app.post("/api/exam/start", async (req, res) => {
  const { sessionId, teacherSocketId } = req.body; // teacher validation done client‑side via permissions
  const meta = sessions.get(sessionId);
  if (!meta || !meta.exam?.enabled || meta.exam.phase !== "waiting") return res.status(400).json({ error:"Exam not ready" });
  const now = Date.now();
  meta.exam.phase = "active";
  meta.exam.startedAt = now;
  meta.exam.endsAt = now + meta.exam.durationMinutes * 60 * 1000;
  if (examTimers.has(sessionId)) clearTimeout(examTimers.get(sessionId));
  const timer = setTimeout(async () => {
    try { await snapshotExam(sessionId, meta, "timed-out"); } catch (e) { console.error("[exam timeout]", e); }
    examTimers.delete(sessionId);
  }, meta.exam.durationMinutes * 60 * 1000);
  examTimers.set(sessionId, timer);
  res.json({ ok:true, exam:meta.exam });
});

// 5) Exam: teacher ends early
app.post("/api/exam/end", async (req, res) => {
  const { sessionId } = req.body;
  const meta = sessions.get(sessionId);
  if (!meta) return res.status(404).json({ error:"No session" });
  if (examTimers.has(sessionId)) { clearTimeout(examTimers.get(sessionId)); examTimers.delete(sessionId); }
  try { await snapshotExam(sessionId, meta, "submitted"); } catch (e) { console.error("[exam end]", e); }
  res.json({ ok:true });
});

// Pull a JSON snapshot of room storage, persist student rows, flip exam phase.
// Uses @liveblocks/node v3 API: getStorageDocument(roomId, "json") → flat JSON; mutateStorage for writes.
async function snapshotExam(sessionId, meta, finalStatus) {
  const roomId = `session:${sessionId}`;
  let storage = {};
  try { storage = await liveblocks.getStorageDocument(roomId, "json"); } catch (e) { console.warn("[snapshotExam] no storage:", e.message); }
  const participants = storage.participants || {};
  const studentWork  = storage.studentWork  || {};
  const language = Object.keys(storage.codeByLanguage || {})[0] || null;
  const rows = Object.entries(participants)
    .filter(([, p]) => p.role !== "host" && p.role !== "co-host")
    .map(([sid, p]) => ({
      sessionId, problemId: meta.problemId, studentSocketId: sid, studentName: p.name,
      code: studentWork[sid]?.code || "", language, finalStatus,
      durationSeconds: Math.floor((Date.now() - (meta.exam.startedAt || Date.now())) / 1000),
    }));
  if (rows.length) await ExamSubmission.bulkCreate(rows);
  meta.exam.phase = "ended";
  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => { root.set("exam", { ...meta.exam }); });
  } catch (e) { console.warn("[snapshotExam] mutate failed:", e.message); }
}

// optional: clean up empty sessions (post‑session snapshots)
// omitted for brevity – can be done via a separate cron job

module.exports = app;