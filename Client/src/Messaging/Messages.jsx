import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message as antdMessage,
} from "antd";
import {
  BookOutlined,
  CameraOutlined,
  CloseOutlined,
  CrownOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileOutlined,
  FormOutlined,
  LogoutOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api, getCurrentUser, getSocket } from "./api";

const { Title, Text } = Typography;

const PALETTE = {
  bg:        "#FAFAF7",
  surface:   "#FFFFFF",
  border:    "#ECECE8",
  borderSoft:"#F4F4F0",
  text:      "#1F2937",
  textSoft:  "#6B7280",
  accent:    "#4F46E5",
  accentSoft:"#EEF2FF",
  bubbleMine:"#4F46E5",
  bubbleTheirs: "#F3F4F6",
};

const initialsOf = (u) =>
  `${(u?.firstname || "")[0] || ""}${(u?.lastname || "")[0] || ""}`.toUpperCase() ||
  (u?.email?.[0] || "?").toUpperCase();

const fullName = (u) =>
  `${u?.firstname || ""} ${u?.lastname || ""}`.trim() || u?.email || "Unknown";

const formatTime = (d) => {
  const day = dayjs(d);
  if (day.isSame(dayjs(), "day")) return day.format("HH:mm");
  if (day.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return day.format("MMM D");
};

// ── /stackoverflow slash-command helper ───────────────────────────────────
// Calls the public Stack Exchange API and returns the top 3-5 questions
// sorted by votes. Returns an ARRAY of {title, score, link} objects so the
// UI can render real clickable cards (no AI summaries, no rewriting).
const decodeHtml = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const searchStackOverflow = async (query) => {
  // Build the API URL: search Stack Overflow, ordered by votes desc.
  const url =
    "https://api.stackexchange.com/2.3/search/advanced" +
    "?order=desc&sort=votes" +
    "&q=" + encodeURIComponent(query) +
    "&site=stackoverflow";

  // Fetch the JSON response from Stack Exchange.
  const res = await fetch(url);
  const data = await res.json();
  const items = (data.items || []).slice(0, 5); // keep top 5 max

  // Normalize into a small, predictable shape for the UI.
  return items.map((it) => ({
    title: decodeHtml(it.title),
    score: it.score,
    link: it.link,
  }));
};

// ── Persisting Stack Overflow answers in the existing message model ──────
// We don't create a new DB collection. We just encode the results inside the
// regular message `content` string with a marker prefix. On render we detect
// the marker and show the Stack Overflow logo + name instead of the sender.
const SO_MARKER = "__SO__";

// Build the string we save in DB.
const encodeStackMessage = (results) => SO_MARKER + JSON.stringify(results);

// If a message was a Stack Overflow answer, return the parsed results array.
// Otherwise return null (= regular message).
const parseStackMessage = (content) => {
  if (typeof content !== "string" || !content.startsWith(SO_MARKER)) return null;
  try {
    return JSON.parse(content.slice(SO_MARKER.length));
  } catch {
    return null;
  }
};

// Tiny inline Stack Overflow logo (SVG) — no extra dependency, no network call.
const StackOverflowLogo = ({ size = 28 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 6,
      background: "#F48024", // official SO orange
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {/* The "stacked bars" mark, simplified */}
    <svg viewBox="0 0 32 32" width={size * 0.7} height={size * 0.7} fill="#fff">
      <path d="M22 28v-7h2v9H4v-9h2v7h16z" />
      <path d="M8 19l13 2 .3-2-13-2L8 19zm1-5l12 5 .8-1.8-12-5L9 14zm2-4l11 7 1.1-1.6-11-7L11 10zm3-3l9 9 1.4-1.4-9-9L14 7zm5-3l-1.6 1.2 7 9 1.6-1.2-7-9z" />
    </svg>
  </div>
);

// ── /video slash-command helper ──────────────────────────────────────────
// Calls the YouTube Data API and returns the top 5 most-viewed videos
// matching the user's query. Each item has the basic info we need to
// build a small video card (title, channel, thumbnail, link).
const YT_API_KEY = "AIzaSyCS3VuEA4XdzJYaNTZxKl0l9MTk_b06ks8";

const searchYouTube = async (query) => {
  // Build the YouTube search URL.
  // - part=snippet      → we want title, channel, thumbnail
  // - type=video        → only videos (no playlists/channels)
  // - order=viewCount   → most-viewed first
  // - maxResults=5      → keep it short
  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    "?part=snippet&type=video&order=viewCount&maxResults=5" +
    "&q=" + encodeURIComponent(query) +
    "&key=" + YT_API_KEY;

  // Ask YouTube and read the JSON answer.
  const res = await fetch(url);
  const data = await res.json();
  const items = data.items || [];

  // Turn each YouTube item into a small simple object.
  return items.map((it) => ({
    title: decodeHtml(it.snippet.title),
    channel: it.snippet.channelTitle,
    thumb: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url,
    link: "https://www.youtube.com/watch?v=" + it.id.videoId,
  }));
};

// Same persistence trick as Stack Overflow: a marker + JSON inside `content`.
const YT_MARKER = "__YT__";
const encodeYouTubeMessage = (videos) => YT_MARKER + JSON.stringify(videos);
const parseYouTubeMessage = (content) => {
  if (typeof content !== "string" || !content.startsWith(YT_MARKER)) return null;
  try { return JSON.parse(content.slice(YT_MARKER.length)); } catch { return null; }
};

// Tiny inline YouTube logo — red rounded square with a white play triangle.
const YouTubeLogo = ({ size = 28 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 6,
      background: "#FF0000", // YouTube red
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="#fff">
      <path d="M8 5v14l11-7z" />
    </svg>
  </div>
);

// Renders one card per video. Clicking a card opens it on YouTube.
const YouTubeResults = ({ videos }) => {
  if (!videos || videos.length === 0) {
    return <span>No videos found.</span>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {videos.map((v, i) => (
        <a
          key={i}
          href={v.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            gap: 10,
            padding: 8,
            borderRadius: 10,
            background: "#FEF2F2",          // soft red tint
            border: "1px solid #FECACA",
            color: "#1F2937",
            textDecoration: "none",
          }}
        >
          {/* Thumbnail */}
          {v.thumb && (
            <img
              src={v.thumb}
              alt=""
              style={{ width: 96, height: 54, borderRadius: 6, objectFit: "cover" }}
            />
          )}
          {/* Title + channel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
              {v.title}
            </div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{v.channel}</div>
          </div>
        </a>
      ))}
    </div>
  );
};

// ── /ai slash-command helper ─────────────────────────────────────────────
// Sends the user's prompt to our backend (which calls the Groq LLM) and
// returns one plain-text answer. Same persistence trick as the others.
const askAI = async (prompt) => {
  const data = await api.aiChat(prompt);
  return data.answer || "";
};

const AI_MARKER = "__AI__";
const encodeAIMessage = (answer) => AI_MARKER + answer;
const parseAIMessage = (content) => {
  if (typeof content !== "string" || !content.startsWith(AI_MARKER)) return null;
  return content.slice(AI_MARKER.length);
};

// Tiny inline AI logo — purple square with a small sparkle icon.
const AILogo = ({ size = 28 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 6,
      background: "#7C3AED", // friendly purple
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="#fff">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zM19 14l.9 2.6L22 17l-2.1.4L19 20l-.9-2.6L16 17l2.1-.4L19 14z" />
    </svg>
  </div>
);

// Renders the AI answer text. Keeps line breaks readable.
const AIResult = ({ answer }) => (
  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{answer}</div>
);

// ── List of slash commands available in the composer ─────────────────────
// Add new commands here and they'll show up in the autocomplete dropdown.
const SLASH_COMMANDS = [
  { name: "/ai",            hint: "Ask the AI assistant" },
  { name: "/stackoverflow", hint: "Search Stack Overflow questions" },
  { name: "/video",         hint: "Search YouTube videos" },
];

// ── Renders a tidy card for each Stack Overflow result ────────────────────
// Used inside the bot message bubble. Titles are clickable links that open
// the question on Stack Overflow in a new tab.
const StackOverflowResults = ({ results }) => {
  // No matches → show the exact required fallback string.
  if (!results || results.length === 0) {
    return <span>No relevant Stack Overflow questions found.</span>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Header tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
        <span>🔎</span>
        <span>Stack Overflow Results</span>
      </div>
      {/* One card per question */}
      {results.map((r, i) => (
        <a
          key={i}
          href={r.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            padding: "10px 12px",
            borderRadius: 10,
            background: "#FFF7ED", // soft Stack Overflow orange tint
            border: "1px solid #FED7AA",
            color: "#1F2937",
            textDecoration: "none",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            {i + 1}. {r.title}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            ⭐ {r.score} votes · {r.link}
          </div>
        </a>
      ))}
    </div>
  );
};

const formatBytes = (n = 0) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const AttachmentPreview = ({ attachment, mine }) => {
  if (!attachment) return null;
  const url = api.fileUrl(attachment.url);
  if (attachment.kind === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={attachment.name}
          style={{
            display: "block",
            maxWidth: 280,
            maxHeight: 280,
            borderRadius: 12,
            marginBottom: 4,
          }}
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.name}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 12,
        background: mine ? "rgba(255,255,255,0.18)" : "#F3F4F6",
        color: mine ? "#fff" : "#1F2937",
        textDecoration: "none",
        marginBottom: 4,
        maxWidth: 280,
      }}
    >
      <FileOutlined style={{ fontSize: 22 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {attachment.name}
        </div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>{formatBytes(attachment.size)}</div>
      </div>
      <DownloadOutlined />
    </a>
  );
};

const Messages = () => {
  const me = getCurrentUser();
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const [usersById, setUsersById] = useState({});
  const [groupOpen, setGroupOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  const listEndRef = useRef(null);
  const activeIdRef = useRef(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Bootstrap: load conversations + cache users for display.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [convs, users] = await Promise.all([
          api.listConversations(),
          api.searchUsers(""),
        ]);
        if (cancelled) return;
        setConversations(convs);
        const map = {};
        for (const u of users) map[u.id] = u;
        if (me) map[me.id] = me;
        setUsersById(map);
      } catch (e) {
        antdMessage.error("Failed to load conversations");
      } finally {
        if (!cancelled) setLoadingConvs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Wire socket: join rooms and listen for new messages.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg) => {
      if (msg.conversationId === activeIdRef.current) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      // Bump conversation to top of list.
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) return prev;
        const next = [...prev];
        const [conv] = next.splice(idx, 1);
        return [{ ...conv, updatedAt: new Date().toISOString() }, ...next];
      });
    };

    socket.on("message:new", onMessage);
    return () => { socket.off("message:new", onMessage); };
  }, []);

  // When the active conversation changes, load its history + join its room.
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    const socket = getSocket();
    socket?.emit("conversation:join", { conversationId: activeId });
    setLoadingMsgs(true);
    api.listMessages(activeId)
      .then(setMessages)
      .catch(() => antdMessage.error("Failed to load messages"))
      .finally(() => setLoadingMsgs(false));
    return () => {
      socket?.emit("conversation:leave", { conversationId: activeId });
    };
  }, [activeId]);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const conversationLabel = (conv) => {
    if (conv.type === "group") return conv.name || "Group";
    const otherId = (conv.members || []).find((id) => id !== me?.id);
    const other = usersById[otherId];
    return other ? fullName(other) : "Direct message";
  };

  const conversationAvatar = (conv) => {
    const photoSrc = conv.photo ? api.fileUrl(conv.photo) : undefined;
    if (conv.type === "group") {
      return (
        <Avatar
          src={photoSrc}
          style={{ background: PALETTE.accentSoft, color: PALETTE.accent, fontWeight: 600 }}
        >
          <TeamOutlined />
        </Avatar>
      );
    }
    const otherId = (conv.members || []).find((id) => id !== me?.id);
    const other = usersById[otherId];
    const fallbackSrc = other?.avatar ? api.fileUrl(other.avatar) : undefined;
    return (
      <Avatar
        src={photoSrc || fallbackSrc}
        style={{ background: PALETTE.accent, color: "#fff", fontWeight: 600 }}
      >
        {other ? initialsOf(other) : <UserOutlined />}
      </Avatar>
    );
  };

  const filteredConvs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => conversationLabel(c).toLowerCase().includes(q));
  }, [conversations, filter, usersById]);

  const handleSend = async () => {
    const text = draft.trim();
    if ((!text && !pendingAttachment) || !activeId || sending) return;
    setSending(true);
    try {
      // ── /ai command ───────────────────────────────────────────────────
      // Send the prompt to our /ai/chat endpoint and save the answer.
      if (text.toLowerCase().startsWith("/ai")) {
        const prompt = text.slice("/ai".length).trim();
        if (!prompt) {
          antdMessage.warning("Usage: /ai <your question>");
          setSending(false);
          return;
        }
        // Save the user's prompt so it stays in the chat.
        const qMsg = await api.sendMessage(activeId, text, null);
        setMessages((prev) => (prev.some((m) => m.id === qMsg.id) ? prev : [...prev, qMsg]));

        // Save the AI answer.
        const answer = await askAI(prompt);
        const aMsg = await api.sendMessage(activeId, encodeAIMessage(answer), null);
        setMessages((prev) => (prev.some((m) => m.id === aMsg.id) ? prev : [...prev, aMsg]));

        setDraft("");
        setSending(false);
        return;
      }

      // ── /video command ────────────────────────────────────────────────
      // Search YouTube and save the videos as a normal message.
      if (text.toLowerCase().startsWith("/video")) {
        const query = text.slice("/video".length).trim();
        if (!query) {
          antdMessage.warning("Usage: /video <search words>");
          setSending(false);
          return;
        }
        // Save what the user asked for (so it stays in the chat).
        const qMsg = await api.sendMessage(activeId, text, null);
        setMessages((prev) => (prev.some((m) => m.id === qMsg.id) ? prev : [...prev, qMsg]));

        // Save the YouTube answer.
        const videos = await searchYouTube(query);
        const aMsg = await api.sendMessage(activeId, encodeYouTubeMessage(videos), null);
        setMessages((prev) => (prev.some((m) => m.id === aMsg.id) ? prev : [...prev, aMsg]));

        setDraft("");
        setSending(false);
        return;
      }

      // ── /stackoverflow command ────────────────────────────────────────
      // Fetch results, then save them as a normal message (we encode the
      // results inside `content` so the existing DB model is reused).
      if (text.toLowerCase().startsWith("/stackoverflow")) {
        const query = text.slice("/stackoverflow".length).trim();
        if (!query) {
          antdMessage.warning("Usage: /stackoverflow <your question>");
          setSending(false);
          return;
        }
        // Save the user's question so it stays visible.
        const qMsg = await api.sendMessage(activeId, text, null);
        setMessages((prev) => (prev.some((m) => m.id === qMsg.id) ? prev : [...prev, qMsg]));

        // Save the Stack Overflow answer.
        const results = await searchStackOverflow(query);
        const aMsg = await api.sendMessage(activeId, encodeStackMessage(results), null);
        setMessages((prev) => (prev.some((m) => m.id === aMsg.id) ? prev : [...prev, aMsg]));

        setDraft("");
        setSending(false);
        return;
      }

      const msg = await api.sendMessage(activeId, text, pendingAttachment);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setDraft("");
      setPendingAttachment(null);
    } catch (err) {
      if (err?.response?.status === 402) {
        antdMessage.warning(err.response.data?.error || "Free tier message limit reached. Upgrade to Pro to send more.");
      } else {
        antdMessage.error("Failed to send");
      }
    } finally {
      setSending(false);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      antdMessage.warning("File too large (25 MB max)");
      return;
    }
    setUploading(true);
    try {
      const meta = await api.uploadAttachment(file);
      setPendingAttachment(meta);
    } catch {
      antdMessage.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onCreateGroup = async ({ name, memberIds }) => {
    const conv = await api.createGroup(name, memberIds);
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  };

  const onStartPrivate = async ({ recipientId, content }) => {
    try {
      const { conversation, message: msg } = await api.sendPrivate(recipientId, content);
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversation.id);
        return exists ? prev : [conversation, ...prev];
      });
      setActiveId(conversation.id);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch (err) {
      if (err?.response?.status === 402) {
        antdMessage.warning(err.response.data?.error || "Free tier message limit reached. Upgrade to Pro to send more.");
      } else {
        antdMessage.error(err?.response?.data?.error || "Failed to send private message");
      }
      throw err;
    }
  };

  const onInvite = async (userIds) => {
    if (!activeConv) return;
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    let updated;
    for (const userId of ids) {
      updated = await api.invite(activeConv.id, userId);
    }
    if (updated) {
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
  };

  const onRename = async (newName) => {
    if (!activeConv) return;
    const updated = await api.renameGroup(activeConv.id, newName);
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    antdMessage.success("Group renamed");
  };

  const onDelete = async () => {
    if (!activeConv) return;
    try {
      await api.deleteGroup(activeConv.id);
      setConversations((prev) => prev.filter((c) => c.id !== activeConv.id));
      setActiveId(null);
      antdMessage.success("Group deleted");
    } catch (err) {
      antdMessage.error(err?.response?.data?.error || "Failed to delete group");
    }
  };

  const isOwner = activeConv?.type === "group" && activeConv?.ownerId === me?.id;

  const onLeave = async () => {
    if (!activeConv) return;
    try {
      await api.leaveGroup(activeConv.id);
      setConversations((prev) => prev.filter((c) => c.id !== activeConv.id));
      setActiveId(null);
      antdMessage.success("You left the group");
    } catch (err) {
      antdMessage.error(err?.response?.data?.error || "Failed to leave");
    }
  };

  const onBan = async (userId) => {
    if (!activeConv) return;
    try {
      const updated = await api.banUser(activeConv.id, userId);
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      antdMessage.success("User banned");
    } catch (err) {
      antdMessage.error(err?.response?.data?.error || "Failed to ban");
    }
  };

  const showList = !isMobile || !activeId;
  const showChat = !isMobile || !!activeId;

  return (
    <div
      style={{
        background: PALETTE.bg,
        minHeight: "calc(100vh - 112px)",
        margin: isMobile ? -12 : -24,
        padding: isMobile ? 12 : 24,
      }}
    >
      {/* ── Quick docs banner ──────────────────────────────────────────
          Tells the user what the messenger can do and lists the available
          slash commands. Kept compact so it doesn't push the chat down. */}
      {!isMobile && (
        <div
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 12,
            padding: "10px 16px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Text strong style={{ color: PALETTE.text, fontSize: 13 }}>
            💬 Messenger
          </Text>
          <Text style={{ color: PALETTE.textSoft, fontSize: 12 }}>
            Send messages, share files, create groups.
          </Text>
          <Tag style={{ background: "#FFF7ED", color: "#C2410C", border: "1px solid #FED7AA", fontSize: 11 }}>
            /stackoverflow &lt;query&gt;
          </Tag>
          <Text style={{ color: PALETTE.textSoft, fontSize: 12 }}>
            → search Stack Overflow inside the chat.
          </Text>
          <Tag style={{ background: "#EEF2FF", color: "#4338CA", border: "1px solid #C7D2FE", fontSize: 11 }}>
            /ai &lt;question&gt;
          </Tag>
          <Text style={{ color: PALETTE.textSoft, fontSize: 12 }}>
            → ask the AI assistant inside the chat.
          </Text>
          <Tag style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", fontSize: 11 }}>
            /video &lt;query&gt;
          </Tag>
          <Text style={{ color: PALETTE.textSoft, fontSize: 12 }}>
            → search YouTube videos inside the chat.
          </Text>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "340px 1fr",
          gap: isMobile ? 0 : 16,
          height: isMobile ? "calc(100vh - 80px)" : "calc(100vh - 200px)",
          minHeight: isMobile ? 0 : 560,
        }}
      >
        {/* ── Sidebar: conversation list ─────────────────────── */}
        <div
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 16,
            display: showList ? "flex" : "none",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "20px 20px 12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <Title level={4} style={{ margin: 0, color: PALETTE.text, fontWeight: 700 }}>
                Messages
              </Title>
              <Tooltip title="New direct message">
                <Button
                  shape="circle"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => setPrivateOpen(true)}
                />
              </Tooltip>
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: PALETTE.textSoft }} />}
              placeholder="Search conversations"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: PALETTE.bg,
                border: `1px solid ${PALETTE.borderSoft}`,
                borderRadius: 10,
              }}
            />
            <Button
              block
              icon={<PlusOutlined />}
              onClick={() => setGroupOpen(true)}
              style={{
                marginTop: 12,
                height: 40,
                borderRadius: 10,
                background: PALETTE.accentSoft,
                color: PALETTE.accent,
                border: "none",
                fontWeight: 600,
              }}
            >
              New group
            </Button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
            {loadingConvs ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <Spin />
              </div>
            ) : filteredConvs.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No conversations yet"
                style={{ marginTop: 32 }}
              />
            ) : (
              filteredConvs.map((conv) => {
                const isActive = conv.id === activeId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveId(conv.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                      background: isActive ? PALETTE.accentSoft : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = PALETTE.borderSoft;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {conversationAvatar(conv)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <Text
                          strong
                          ellipsis
                          style={{ color: PALETTE.text, fontSize: 14 }}
                        >
                          {conversationLabel(conv)}
                        </Text>
                        <Text style={{ color: PALETTE.textSoft, fontSize: 11 }}>
                          {formatTime(conv.updatedAt || conv.createdAt)}
                        </Text>
                      </div>
                      <Text
                        ellipsis
                        style={{ color: PALETTE.textSoft, fontSize: 12 }}
                      >
                        {conv.type === "group"
                          ? `${(conv.members || []).length} members`
                          : "Direct message"}
                      </Text>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Main: active conversation ──────────────────────── */}
        <div
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 16,
            display: showChat ? "flex" : "none",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {!activeConv ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ textAlign: "center", color: PALETTE.textSoft }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: PALETTE.accentSoft,
                    color: PALETTE.accent,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    marginBottom: 16,
                  }}
                >
                  <SendOutlined />
                </div>
                <Title level={4} style={{ color: PALETTE.text, margin: 0 }}>
                  Pick a conversation
                </Title>
                <Text style={{ color: PALETTE.textSoft }}>
                  Or start a new one from the panel on the left.
                </Text>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div
                style={{
                  padding: isMobile ? "10px 12px" : "16px 24px",
                  borderBottom: `1px solid ${PALETTE.borderSoft}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: PALETTE.surface,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0, flex: 1 }}>
                  {isMobile && (
                    <Button
                      type="text"
                      shape="circle"
                      onClick={() => setActiveId(null)}
                      style={{ marginRight: 4, fontSize: 18, lineHeight: 1 }}
                      aria-label="Back"
                    >
                      ‹
                    </Button>
                  )}
                  {conversationAvatar(activeConv)}
                  <div>
                    <Space size={6} align="center">
                      <Text strong style={{ color: PALETTE.text, fontSize: 15 }}>
                        {conversationLabel(activeConv)}
                      </Text>
                      {isOwner && (
                        <Tooltip title="You own this group">
                          <CrownOutlined style={{ color: "#D97706" }} />
                        </Tooltip>
                      )}
                    </Space>
                    <div>
                      <Tag
                        style={{
                          background: PALETTE.bg,
                          color: PALETTE.textSoft,
                          fontSize: 11,
                          marginTop: 2,
                          border: "none",
                        }}
                      >
                        {activeConv.type === "group" ? "Group" : "Private"}
                      </Tag>
                      <Text style={{ color: PALETTE.textSoft, fontSize: 12 }}>
                        {(activeConv.members || []).length} member
                        {(activeConv.members || []).length !== 1 ? "s" : ""}
                        {isOwner && (activeConv.pendingInvites || []).length > 0 && (
                          <> · {(activeConv.pendingInvites || []).length} pending</>
                        )}
                      </Text>
                    </div>
                  </div>
                </div>
                <Space size={isMobile ? 4 : 8} wrap={!isMobile} style={{ flexShrink: 0 }}>
                  {activeConv.type === "group" && (
                    <Button
                      icon={<TeamOutlined />}
                      onClick={() => setMembersOpen(true)}
                      style={{ borderRadius: 10 }}
                      size={isMobile ? "small" : "middle"}
                    >
                      {!isMobile && "Members"}
                    </Button>
                  )}
                  {(isOwner || activeConv.type === "private") && (
                    <>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            antdMessage.warning("Photo too large (5 MB max)");
                            return;
                          }
                          try {
                            const updated = await api.uploadConversationPhoto(activeConv.id, file);
                            setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                            antdMessage.success("Photo updated");
                          } catch (err) {
                            antdMessage.error(err?.response?.data?.error || "Failed to upload photo");
                          }
                        }}
                      />
                      <Button
                        icon={<CameraOutlined />}
                        onClick={() => photoInputRef.current?.click()}
                        style={{ borderRadius: 10 }}
                        size={isMobile ? "small" : "middle"}
                      >
                        {!isMobile && "Photo"}
                      </Button>
                    </>
                  )}
                  {isOwner && (
                    <>
                      <Button
                        icon={<UserAddOutlined />}
                        onClick={() => setInviteOpen(true)}
                        style={{ borderRadius: 10 }}
                        size={isMobile ? "small" : "middle"}
                      >
                        {!isMobile && "Invite"}
                      </Button>
                      <Button
                        icon={<FormOutlined />}
                        onClick={() => setRenameOpen(true)}
                        style={{ borderRadius: 10 }}
                        size={isMobile ? "small" : "middle"}
                      >
                        {!isMobile && "Rename"}
                      </Button>
                      <Popconfirm
                        title="Delete this group?"
                        description="All messages will be removed and members notified."
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                        onConfirm={onDelete}
                      >
                        <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 10 }} size={isMobile ? "small" : "middle"}>
                          {!isMobile && "Delete"}
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                  {activeConv.type === "group" && !isOwner && (
                    <Popconfirm
                      title="Leave this group?"
                      okText="Leave"
                      cancelText="Cancel"
                      onConfirm={onLeave}
                    >
                      <Button danger icon={<LogoutOutlined />} style={{ borderRadius: 10 }} size={isMobile ? "small" : "middle"}>
                        {!isMobile && "Leave"}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px 24px",
                  background: PALETTE.bg,
                }}
              >
                {loadingMsgs ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <Spin />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", marginTop: 40, color: PALETTE.textSoft }}>
                    <Text style={{ color: PALETTE.textSoft }}>
                      No messages yet — say hello.
                    </Text>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    // ── AI answer? render special bubble ──
                    // Same idea: detect the marker and show the AI logo
                    // + name "AI" with the answer inside the bubble.
                    const aiAnswer = parseAIMessage(msg.content);
                    if (aiAnswer !== null) {
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "flex-end",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <AILogo size={32} />
                          <div style={{ maxWidth: "70%" }}>
                            <Text
                              style={{
                                color: "#7C3AED",
                                fontSize: 12,
                                fontWeight: 600,
                                marginLeft: 4,
                                marginBottom: 2,
                                display: "block",
                              }}
                            >
                              AI Assistant
                            </Text>
                            <div
                              style={{
                                padding: "10px 14px",
                                borderRadius: 16,
                                background: "#F5F3FF",
                                border: "1px solid #DDD6FE",
                                borderBottomLeftRadius: 4,
                                fontSize: 14,
                                color: PALETTE.text,
                              }}
                            >
                              <AIResult answer={aiAnswer} />
                            </div>
                            <Text
                              style={{
                                color: PALETTE.textSoft,
                                fontSize: 10,
                                marginTop: 4,
                                display: "block",
                                padding: "0 4px",
                              }}
                            >
                              {dayjs(msg.createdAt).format("HH:mm")}
                            </Text>
                          </div>
                        </div>
                      );
                    }

                    // ── YouTube answer? render special bubble ──
                    // Same idea as Stack Overflow: detect the marker and
                    // show the YouTube logo + name with the video cards.
                    const ytVideos = parseYouTubeMessage(msg.content);
                    if (ytVideos) {
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "flex-end",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <YouTubeLogo size={32} />
                          <div style={{ maxWidth: "70%" }}>
                            <Text
                              style={{
                                color: "#FF0000",
                                fontSize: 12,
                                fontWeight: 600,
                                marginLeft: 4,
                                marginBottom: 2,
                                display: "block",
                              }}
                            >
                              YouTube
                            </Text>
                            <div
                              style={{
                                padding: "10px 14px",
                                borderRadius: 16,
                                background: PALETTE.surface,
                                border: `1px solid ${PALETTE.border}`,
                                borderBottomLeftRadius: 4,
                                fontSize: 14,
                              }}
                            >
                              <YouTubeResults videos={ytVideos} />
                            </div>
                            <Text
                              style={{
                                color: PALETTE.textSoft,
                                fontSize: 10,
                                marginTop: 4,
                                display: "block",
                                padding: "0 4px",
                              }}
                            >
                              {dayjs(msg.createdAt).format("HH:mm")}
                            </Text>
                          </div>
                        </div>
                      );
                    }

                    // ── Stack Overflow answer? render special bubble ──
                    // We detect the marker stored in `content` and show
                    // the SO logo + name "Stack Overflow" instead of
                    // the original sender's avatar/name.
                    const stackResults = parseStackMessage(msg.content);
                    if (stackResults) {
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "flex-end",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <StackOverflowLogo size={32} />
                          <div style={{ maxWidth: "70%" }}>
                            <Text
                              style={{
                                color: "#F48024",
                                fontSize: 12,
                                fontWeight: 600,
                                marginLeft: 4,
                                marginBottom: 2,
                                display: "block",
                              }}
                            >
                              Stack Overflow
                            </Text>
                            <div
                              style={{
                                padding: "10px 14px",
                                borderRadius: 16,
                                background: PALETTE.surface,
                                border: `1px solid ${PALETTE.border}`,
                                borderBottomLeftRadius: 4,
                                fontSize: 14,
                              }}
                            >
                              <StackOverflowResults results={stackResults} />
                            </div>
                            <Text
                              style={{
                                color: PALETTE.textSoft,
                                fontSize: 10,
                                marginTop: 4,
                                display: "block",
                                padding: "0 4px",
                              }}
                            >
                              {dayjs(msg.createdAt).format("HH:mm")}
                            </Text>
                          </div>
                        </div>
                      );
                    }

                    const mine = msg.senderId === me?.id;
                    const sender = usersById[msg.senderId];
                    const prev = messages[i - 1];
                    const showAvatar = !mine && (!prev || prev.senderId !== msg.senderId);
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: mine ? "flex-end" : "flex-start",
                          alignItems: "flex-end",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        {!mine && (
                          <div style={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && (
                              <Avatar
                                size={32}
                                src={sender?.avatar ? api.fileUrl(sender.avatar) : undefined}
                                onClick={() => sender && setProfileUser(sender)}
                                style={{
                                  background: PALETTE.accent,
                                  color: "#fff",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: sender ? "pointer" : "default",
                                }}
                              >
                                {sender ? initialsOf(sender) : <UserOutlined />}
                              </Avatar>
                            )}
                          </div>
                        )}
                        <div style={{ maxWidth: "70%" }}>
                          {showAvatar && !mine && activeConv.type === "group" && (
                            <Text
                              style={{
                                color: PALETTE.textSoft,
                                fontSize: 11,
                                marginLeft: 4,
                                marginBottom: 2,
                                display: "block",
                              }}
                            >
                              {sender ? fullName(sender) : "Unknown"}
                            </Text>
                          )}
                          <div
                            style={{
                              padding: msg.attachment && !msg.content ? 4 : "10px 14px",
                              borderRadius: 16,
                              background:
                                msg.attachment?.kind === "image" && !msg.content
                                  ? "transparent"
                                  : mine
                                    ? PALETTE.bubbleMine
                                    : PALETTE.surface,
                              color: mine ? "#fff" : PALETTE.text,
                              border:
                                msg.attachment?.kind === "image" && !msg.content
                                  ? "none"
                                  : mine
                                    ? "none"
                                    : `1px solid ${PALETTE.border}`,
                              borderBottomRightRadius: mine ? 4 : 16,
                              borderBottomLeftRadius: mine ? 16 : 4,
                              fontSize: 14,
                              lineHeight: 1.45,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            <AttachmentPreview attachment={msg.attachment} mine={mine} />
                            {msg.content}
                          </div>
                          <Text
                            style={{
                              color: PALETTE.textSoft,
                              fontSize: 10,
                              marginTop: 4,
                              display: "block",
                              textAlign: mine ? "right" : "left",
                              padding: "0 4px",
                            }}
                          >
                            {dayjs(msg.createdAt).format("HH:mm")}
                          </Text>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={listEndRef} />
              </div>

              {/* Composer */}
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: `1px solid ${PALETTE.borderSoft}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: PALETTE.surface,
                }}
              >
                {pendingAttachment && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 10px",
                      background: PALETTE.bg,
                      border: `1px solid ${PALETTE.borderSoft}`,
                      borderRadius: 10,
                      maxWidth: 360,
                    }}
                  >
                    {pendingAttachment.kind === "image" ? (
                      <img
                        src={api.fileUrl(pendingAttachment.url)}
                        alt=""
                        style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }}
                      />
                    ) : (
                      <FileOutlined style={{ fontSize: 22, color: PALETTE.accent }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong ellipsis style={{ display: "block", fontSize: 13 }}>
                        {pendingAttachment.name}
                      </Text>
                      <Text style={{ color: PALETTE.textSoft, fontSize: 11 }}>
                        {formatBytes(pendingAttachment.size)}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => setPendingAttachment(null)}
                    />
                  </div>
                )}
                {/* ── Slash-command autocomplete ──────────────────────────
                    If the draft starts with "/", we filter SLASH_COMMANDS by
                    what the user has typed and show matching options.
                    Click a row (or press Tab) to complete the command. */}
                {draft.startsWith("/") &&
                  (() => {
                    // Take only the first word so "/stack hello" stops matching once a space is typed.
                    const typed = draft.split(" ")[0].toLowerCase();
                    // Hide the dropdown once a full command is fully typed.
                    const matches = SLASH_COMMANDS.filter(
                      (c) => c.name.startsWith(typed) && c.name !== typed
                    );
                    if (matches.length === 0) return null;
                    return (
                      <div
                        style={{
                          background: PALETTE.surface,
                          border: `1px solid ${PALETTE.border}`,
                          borderRadius: 10,
                          padding: 4,
                          maxWidth: 320,
                        }}
                      >
                        {matches.map((c) => (
                          <div
                            key={c.name}
                            // Click → replace the typed prefix with the full command + space.
                            onClick={() => setDraft(c.name + " ")}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              fontSize: 13,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = PALETTE.accentSoft)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <span style={{ fontWeight: 600, color: PALETTE.accent }}>
                              {c.name}
                            </span>
                            <span style={{ color: PALETTE.textSoft }}>{c.hint}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <Tooltip title="Attach file, image, gif or code">
                    <Button
                      icon={<PaperClipOutlined />}
                      onClick={handlePickFile}
                      loading={uploading}
                      style={{ height: 40, width: 40, borderRadius: 12 }}
                    />
                  </Tooltip>
                  <Input.TextArea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    // Tab key → autocomplete the first matching slash command.
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && draft.startsWith("/")) {
                        const typed = draft.split(" ")[0].toLowerCase();
                        const match = SLASH_COMMANDS.find((c) =>
                          c.name.startsWith(typed)
                        );
                        if (match && match.name !== typed) {
                          e.preventDefault();
                          setDraft(match.name + " ");
                        }
                      }
                    }}
                    placeholder="Write a message…  (type / for commands)"
                    autoSize={{ minRows: 1, maxRows: 5 }}
                    style={{
                      flex: 1,
                      background: PALETTE.bg,
                      border: `1px solid ${PALETTE.borderSoft}`,
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontSize: 14,
                      resize: "none",
                    }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSend}
                    loading={sending}
                    disabled={!draft.trim() && !pendingAttachment}
                    style={{
                      background: PALETTE.accent,
                      border: "none",
                      height: 40,
                      width: 40,
                      borderRadius: 12,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <NewGroupModal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        onCreate={onCreateGroup}
      />
      <NewPrivateModal
        open={privateOpen}
        onClose={() => setPrivateOpen(false)}
        onSend={onStartPrivate}
      />
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={onInvite}
        excludeIds={[
          ...(activeConv?.members || []),
          ...(activeConv?.pendingInvites || []),
        ]}
      />
      <RenameGroupModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        currentName={activeConv?.name || ""}
        onRename={onRename}
      />
      <MembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        conversation={activeConv}
        usersById={usersById}
        meId={me?.id}
        onBan={onBan}
      />
      <UserProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
    </div>
  );
};

const UserProfileModal = ({ user, onClose }) => (
  <Modal open={!!user} onCancel={onClose} footer={null} centered width={340}>
    {user && (
      <div style={{ textAlign: "center", padding: "8px 4px" }}>
        <Avatar
          size={72}
          src={user.avatar ? api.fileUrl(user.avatar) : undefined}
          style={{ background: PALETTE.accent, color: "#fff", fontSize: 24, fontWeight: 700 }}
        >
          {initialsOf(user)}
        </Avatar>
        <Title level={5} style={{ marginTop: 12, marginBottom: 0 }}>{fullName(user)}</Title>
        <Text style={{ color: PALETTE.textSoft, fontSize: 12 }}>{user.email}</Text>
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: PALETTE.accentSoft,
            color: PALETTE.accent,
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          {user.problemsSolved ?? 0} problems solved
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {user.githubUrl && (
            <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: PALETTE.text }}>
              GitHub: {user.githubUrl}
            </a>
          )}
          {user.linkedinUrl && (
            <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: PALETTE.text }}>
              LinkedIn: {user.linkedinUrl}
            </a>
          )}
          {!user.githubUrl && !user.linkedinUrl && (
            <Text style={{ color: PALETTE.textSoft, fontSize: 12 }}>No social links</Text>
          )}
        </div>
      </div>
    )}
  </Modal>
);

const MembersModal = ({ open, onClose, conversation, usersById, meId, onBan }) => {
  if (!conversation) return null;
  return (
    <Modal open={open} onCancel={onClose} title="Members" footer={null} centered>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
        {(conversation.members || []).map((id) => {
          const u = usersById[id];
          const isOwner = id === conversation.ownerId;
          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: "1px solid #ECECE8",
                borderRadius: 10,
                background: "#FAFAF7",
              }}
            >
              <Avatar style={{ background: "#4F46E5", color: "#fff", fontWeight: 600 }}>
                {u ? initialsOf(u) : <UserOutlined />}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong>{u ? fullName(u) : "Unknown"}</Typography.Text>
                {isOwner && (
                  <Tag color="gold" style={{ marginLeft: 8 }}>
                    Owner
                  </Tag>
                )}
              </div>
              {!isOwner && id !== meId && (
                <Popconfirm
                  title="Ban this user?"
                  description="They will be removed and cannot be invited back."
                  okText="Ban"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onBan(id)}
                >
                  <Button danger size="small" icon={<StopOutlined />}>
                    Ban
                  </Button>
                </Popconfirm>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

const RenameGroupModal = ({ open, onClose, currentName, onRename }) => {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setName(currentName); setBusy(false); }
  }, [open, currentName]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return antdMessage.warning("Name cannot be empty");
    if (trimmed === currentName) return onClose();
    setBusy(true);
    try {
      await onRename(trimmed);
      onClose();
    } catch (err) {
      antdMessage.error(err?.response?.data?.error || "Could not rename");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Rename group"
      okText="Save"
      onOk={submit}
      confirmLoading={busy}
      centered
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="large"
        autoFocus
        placeholder="Group name"
        style={{ marginTop: 8 }}
      />
    </Modal>
  );
};

// ── User picker shared by modals ───────────────────────────────────────────
const UserPicker = ({ value, onChange, mode = "multiple", excludeIds = [], placeholder, extraUsers = [] }) => {
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  const onSearch = async (q) => {
    setQuery(q);
    if (!q.trim()) { setOptions([]); return; }
    setSearching(true);
    try {
      const users = await api.searchUsers(q);
      setOptions(users.filter((u) => !exclude.has(u.id)));
    } finally {
      setSearching(false);
    }
  };

  const seen = new Set();
  const allOptions = [...extraUsers, ...options].filter((u) => {
    if (!u?.id || seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });

  return (
    <Select
      mode={mode}
      value={value}
      onChange={onChange}
      onSearch={onSearch}
      filterOption={false}
      showSearch
      loading={searching}
      placeholder={placeholder}
      notFoundContent={
        !query.trim()
          ? <span style={{ color: PALETTE.textSoft }}>Type a name to search</span>
          : searching
            ? <Spin size="small" />
            : <span style={{ color: PALETTE.textSoft }}>No users match "{query}"</span>
      }
      style={{ width: "100%" }}
      size="large"
      optionLabelProp="label"
    >
      {allOptions.map((u) => (
        <Select.Option key={u.id} value={u.id} label={fullName(u)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <Avatar
              size={28}
              style={{
                background: PALETTE.accent,
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {initialsOf(u)}
            </Avatar>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <Text strong style={{ fontSize: 13 }}>{fullName(u)}</Text>
              <Text style={{ color: PALETTE.textSoft, fontSize: 11 }}>{u.email}</Text>
            </div>
          </div>
        </Select.Option>
      ))}
    </Select>
  );
};

// ── Quick-invite section (role-aware) ─────────────────────────────────────
// institution_admin → one click to add every institution member.
// teacher          → pick a classroom, add all enrolled students.
const QuickInviteSection = ({ selectedIds, onAdd, excludeIds = [] }) => {
  const me = getCurrentUser();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (me?.role === "teacher" && me?.id) {
      api.getMyClassrooms(me.id).then(setClassrooms).catch(() => {});
    }
  }, [me?.id, me?.role]);

  if (!me || !["institution_admin", "teacher"].includes(me.role)) return null;

  const excluded = new Set([...selectedIds, ...excludeIds, me.id]);

  const handleAddInstitution = async () => {
    setLoading(true);
    try {
      const members = await api.getInstitutionMembers();
      const newUsers = members.filter((u) => !excluded.has(u.id));
      if (newUsers.length === 0) return antdMessage.info("All institution members are already added");
      onAdd(newUsers);
      antdMessage.success(`Added ${newUsers.length} member${newUsers.length !== 1 ? "s" : ""}`);
    } catch {
      antdMessage.error("Could not load institution members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClassroom = async () => {
    if (!selectedClassroom) return;
    setLoading(true);
    try {
      const students = await api.getClassroomStudents(selectedClassroom);
      const newUsers = students.filter((u) => !excluded.has(u.id));
      if (newUsers.length === 0) return antdMessage.info("All students from this classroom are already added");
      onAdd(newUsers);
      antdMessage.success(`Added ${newUsers.length} student${newUsers.length !== 1 ? "s" : ""}`);
    } catch {
      antdMessage.error("Could not load classroom students");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 4 }}>
      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
        <div style={{ flex: 1, height: 1, background: PALETTE.borderSoft }} />
        <Text style={{ color: PALETTE.textSoft, fontSize: 11, whiteSpace: "nowrap" }}>
          Quick invite
        </Text>
        <div style={{ flex: 1, height: 1, background: PALETTE.borderSoft }} />
      </div>

      {/* Institution admin: add everyone at once */}
      {me.role === "institution_admin" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: PALETTE.bg,
            border: `1px solid ${PALETTE.borderSoft}`,
            borderRadius: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: PALETTE.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <TeamOutlined style={{ color: PALETTE.accent, fontSize: 18 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, display: "block" }}>
              Add all institution members
            </Text>
            <Text style={{ color: PALETTE.textSoft, fontSize: 11 }}>
              Every member of your institution will be invited
            </Text>
          </div>
          <Button
            type="primary"
            ghost
            size="small"
            loading={loading}
            onClick={handleAddInstitution}
            style={{ borderRadius: 8, flexShrink: 0 }}
          >
            Add all
          </Button>
        </div>
      )}

      {/* Teacher: pick a classroom then add its students */}
      {me.role === "teacher" && (
        <div
          style={{
            padding: "12px 14px",
            background: PALETTE.bg,
            border: `1px solid ${PALETTE.borderSoft}`,
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: PALETTE.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BookOutlined style={{ color: PALETTE.accent, fontSize: 18 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 13, display: "block" }}>
                Invite students from a classroom
              </Text>
              <Text style={{ color: PALETTE.textSoft, fontSize: 11 }}>
                Select one of your classrooms to add its enrolled students
              </Text>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Select
              placeholder={classrooms.length === 0 ? "No classrooms found" : "Select a classroom"}
              style={{ flex: 1 }}
              value={selectedClassroom}
              onChange={setSelectedClassroom}
              disabled={classrooms.length === 0}
              options={classrooms.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Button
              type="primary"
              ghost
              loading={loading}
              disabled={!selectedClassroom}
              onClick={handleAddClassroom}
              style={{ borderRadius: 8 }}
            >
              Add students
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const NewGroupModal = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [addedUsers, setAddedUsers] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setName(""); setMemberIds([]); setAddedUsers([]); setBusy(false); }
  }, [open]);

  const submit = async () => {
    if (!name.trim() || memberIds.length === 0) {
      antdMessage.warning("Pick a name and at least one member");
      return;
    }
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), memberIds });
      onClose();
    } catch {
      antdMessage.error("Could not create group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="New group"
      okText="Create group"
      onOk={submit}
      confirmLoading={busy}
      centered
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
        <Input
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="large"
        />
        <UserPicker
          value={memberIds}
          onChange={setMemberIds}
          placeholder="Search and add members"
          extraUsers={addedUsers}
        />
        <QuickInviteSection
          selectedIds={memberIds}
          onAdd={(users) => {
            setMemberIds((prev) => [...new Set([...prev, ...users.map((u) => u.id)])]);
            setAddedUsers((prev) => [...prev, ...users]);
          }}
        />
      </div>
    </Modal>
  );
};

const NewPrivateModal = ({ open, onClose, onSend }) => {
  const [recipientId, setRecipientId] = useState(undefined);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setRecipientId(undefined); setContent(""); setBusy(false); }
  }, [open]);

  const submit = async () => {
    if (!recipientId || !content.trim()) {
      antdMessage.warning("Pick a recipient and write a message");
      return;
    }
    setBusy(true);
    try {
      await onSend({ recipientId, content: content.trim() });
      onClose();
    } catch {
      antdMessage.error("Could not send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="New message"
      okText="Send"
      onOk={submit}
      confirmLoading={busy}
      centered
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
        <UserPicker
          mode={undefined}
          value={recipientId}
          onChange={setRecipientId}
          placeholder="To: pick a user"
        />
        <Input.TextArea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your message…"
        />
      </div>
    </Modal>
  );
};

const InviteModal = ({ open, onClose, onInvite, excludeIds }) => {
  const [userIds, setUserIds] = useState([]);
  const [addedUsers, setAddedUsers] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setUserIds([]); setAddedUsers([]); setBusy(false); }
  }, [open]);

  const submit = async () => {
    if (userIds.length === 0) return antdMessage.warning("Select at least one person to invite");
    setBusy(true);
    try {
      await onInvite(userIds);
      antdMessage.success(`Invited ${userIds.length} person${userIds.length !== 1 ? "s" : ""}`);
      onClose();
    } catch {
      antdMessage.error("Could not invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Invite to group"
      okText="Invite"
      onOk={submit}
      confirmLoading={busy}
      centered
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 8 }}>
        <UserPicker
          value={userIds}
          onChange={setUserIds}
          excludeIds={excludeIds}
          placeholder="Search and pick people to invite"
          extraUsers={addedUsers}
        />
        <QuickInviteSection
          selectedIds={userIds}
          excludeIds={excludeIds}
          onAdd={(users) => {
            setUserIds((prev) => [...new Set([...prev, ...users.map((u) => u.id)])]);
            setAddedUsers((prev) => [...prev, ...users]);
          }}
        />
      </div>
    </Modal>
  );
};

export default Messages;
