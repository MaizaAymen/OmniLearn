import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { createLiveSocket, fetchSessionList } from "../lib/roomClient";
import { Tldraw, createTLStore } from "tldraw";
import "tldraw/tldraw.css";

import { PROBLEMS } from "./problems";
import ProblemDescription from "./ProblemDescription";
import OutputPanel from "../Codeeditor/OutputPanel";
import CodeEditorPanel from "../Codeeditor/Codeeditor";
import { executeCode } from "../Codeeditor/Api";

import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import Cookies from "js-cookie";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  SendIcon,
  Loader2Icon,
  TimerIcon,
  RotateCcwIcon,
  ListIcon,
  WandSparklesIcon, //correcting state
  SparklesIcon,
  UsersIcon,
  PlusIcon,
  LogOutIcon,
  LockIcon,
  XIcon,
  Link2Icon,
  MessageSquareIcon,
} from "lucide-react";

import AIMentor from "../components/AIMentor";
import "./ProblemPage.css";

const normalizeOutput = (s, { strict = false } = {}) => {
  let result = (s ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .toLowerCase();
  if (!strict) {
    result = result.replace(/\s+/g, "").replace(/['"`]/g, "");
  }
  return result;
};

const outputsMatch = (actual, expected) => {
  if (normalizeOutput(actual, { strict: true }) === normalizeOutput(expected, { strict: true })) return true;
  return normalizeOutput(actual) === normalizeOutput(expected);
};

const SESSION_TYPES = [
  {
    key: "practice",
    icon: "📚",
    label: "Practice Mode",
    desc: "Open collaboration",
    bullets: ["Everyone can edit", "No restrictions", "No exam", "Public by default"],
  },
  {
    key: "classroom",
    icon: "🎓",
    label: "Classroom Mode",
    desc: "Teacher-controlled",
    bullets: ["Waiting room ON", "Host / student roles", "Optional exam timer", "Can lock editing"],
  },
];

function TagAutocomplete({ label, note, tags, setTags, users, badgeClass = "" }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = input.trim()
    ? users
        .filter((u) => {
          const full = `${u.firstname || ""} ${u.lastname || ""}`.trim().toLowerCase();
          const q = input.toLowerCase();
          return full.includes(q) || (u.email || "").toLowerCase().includes(q);
        })
        .slice(0, 6)
    : [];

  const addTag = (name) => {
    const val = name.trim();
    if (val) setTags((p) => (p.includes(val) ? p : [...p, val]));
    setInput("");
    setOpen(false);
  };

  return (
    <div>
      <label className="label pb-1">
        <span className="label-text text-xs font-medium">
          {label}{note && <span className="text-base-content/40 font-normal"> {note}</span>}
        </span>
      </label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {tags.map((t) => (
            <span key={t} className={`badge badge-sm gap-1 ${badgeClass}`}>
              {t}
              <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))}>
                <XIcon className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          className="input input-sm input-bordered w-full"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          placeholder="Type a name…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) { e.preventDefault(); addTag(input); }
            if (e.key === "Escape") setOpen(false);
          }}
          onFocus={() => input.trim() && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && suggestions.length > 0 && (
          <div className="absolute z-50 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg mt-1 overflow-hidden">
            {suggestions.map((u) => {
              const name = `${u.firstname || ""} ${u.lastname || ""}`.trim();
              return (
                <button
                  key={u.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs hover:bg-base-200 flex items-center gap-2"
                  onMouseDown={(e) => { e.preventDefault(); addTag(name); }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {name[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-base-content/50 truncate">{u.email}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const assignmentLanguageLock = location.state?.lockedLanguage || null;

  // Free tier: no AI correction, JavaScript only.
  const isFreeTier = (() => {
    try { return (JSON.parse(Cookies.get("user") || "{}").plan || "free") === "free"; }
    catch { return true; }
  })();

  const defaultProblemId = Object.keys(PROBLEMS)[0] || "";
  const [currentProblemId, setCurrentProblemId] = useState(id || defaultProblemId);
  const [apiProblem, setApiProblem] = useState(null);
  const [isProblemLoading, setIsProblemLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(location.state?.lockedLanguage || "javascript");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false); //correcting state
  const [activeRightTab, setActiveRightTab] = useState("testcase"); // testcase | result
  const [showDiff, setShowDiff] = useState(false);
  const [originalCode, setOriginalCode] = useState("");
  const [verifiedCorrectCode, setVerifiedCorrectCode] = useState(null);
  const socketRef = useRef(null);
  const attemptedJoinFromLinkRef = useRef(null);

  // Read the authenticated user's name synchronously so it's available on the
  // very first render — before any effects run. This prevents the auto-join
  // sending "Guest" as the username due to a state-update race condition.
  const [displayName, setDisplayName] = useState(() => {
    try {
      const u = JSON.parse(Cookies.get("user") || "{}");
      const authName = [u.firstname, u.lastname].filter(Boolean).join(" ").trim() || u.email || "";
      if (authName) return authName;
    } catch { /* ignore */ }
    const saved = localStorage.getItem("collabDisplayName");
    if (saved) return saved;
    return `Guest-${Math.floor(Math.random() * 1000)}`;
  });

  // ── Create-session form: only fields the user actually edits ──────────
  const [sessionType, setSessionType] = useState("");   // "" = nothing picked yet
  const [sessionName, setSessionName] = useState("");
  const [sessionVisibility, setSessionVisibility] = useState("public");  // derived by changeAccessModel
  const [sessionPassword, setSessionPassword] = useState("");
  const [sessionWhitelist, setSessionWhitelist] = useState([]);
  const [sessionMaxParticipants, setSessionMaxParticipants] = useState(10);
  const [sessionExamDuration, setSessionExamDuration] = useState(30);
  const [sessionExamEnabled, setSessionExamEnabled] = useState(false);
  const [sessionPlaylistIds, setSessionPlaylistIds] = useState([]);
  const [accessModel, setAccessModel] = useState("anyone"); // "anyone" | "link" | "invited" | "classroom" | "password"

  // ── Reference data for autocomplete + classroom roster ────────────────
  const [allUsers, setAllUsers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");

  // ── Post-creation edit-settings modal ─────────────────────────────────
  const [configOpen, setConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: "",
    locked: false,
    maxParticipants: 10,
    accessModel: "anyone",
  });

  // Live exam state while a session is active
  const [exam, setExam] = useState(null);           // { enabled, phase, durationMinutes, startedAt, endsAt, lockLanguage }
  const [examRemaining, setExamRemaining] = useState(0);
  const [examResults, setExamResults] = useState(null); // array of ExamSubmission rows (teacher-only)

  const [sessionJoinPassword, setSessionJoinPassword] = useState("");
  const [currentUserPermission, setCurrentUserPermission] = useState("editable");
  const [currentUserRole, setCurrentUserRole] = useState("editor");
  const [availableSessions, setAvailableSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionParticipants, setSessionParticipants] = useState([]);
  const [sessionParticipantDetails, setSessionParticipantDetails] = useState([]);
  const [sessionCodeByLanguage, setSessionCodeByLanguage] = useState({});
  const [tldrawInitialStore, setTldrawInitialStore] = useState({});
  const [waitingRoomUsers, setWaitingRoomUsers] = useState([]);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [participantsSidebarOpen, setParticipantsSidebarOpen] = useState(false);
  const [participantHistory, setParticipantHistory] = useState([]);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [aiMentorOpen, setAiMentorOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatUnread, setChatUnread] = useState(0);
  const chatSidebarOpenRef = useRef(false);
  const chatScrollRef = useRef(null);
  const selectedLanguageRef = useRef("javascript");
  const prevParticipantsRef = useRef([]);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Resizable state
  const [leftWidth, setLeftWidth] = useState(40);
  const [editorHeight, setEditorHeight] = useState(60);
  const isLeftCollapsed = false;

  const containerRef = useRef(null);
  const rightPanelRef = useRef(null);

  // Language lock, hand raises
  const [sessionLanguageLock, setSessionLanguageLock] = useState(null);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState([]); // [{ socketId, name }] — host only

  // Teacher-supervision state (teacher watches one student's private editor)
  const [watchingStudent, setWatchingStudent] = useState(null); // { socketId, name }
  const [watchingCode, setWatchingCode] = useState("");
  const [watchTldrawStore, setWatchTldrawStore] = useState(null);
  const watchingRef = useRef(null);
  const watchTldrawStoreRef = useRef(null);

  // Refs used by socket listeners to read latest values (they're registered once).
  const teacherModeRef = useRef(false);
  const currentUserRoleRef = useRef("editor");

  const isInSession = Boolean(activeSession?.id);
  const requestedSessionId = searchParams.get("session") || "";
  const requestedJoinPassword = searchParams.get("joinPassword") || "";

  const allProblemsById = useMemo(() => {
    const mergedProblems = { ...PROBLEMS };
    if (apiProblem?.id) {
      mergedProblems[apiProblem.id] = apiProblem;
    }
    return mergedProblems;
  }, [apiProblem]);

  const problemIds = Object.keys(allProblemsById).filter(
    (problemId) => Boolean(allProblemsById[problemId])
  );
  const currentProblem = allProblemsById[currentProblemId] || null;
  const currentIndex = problemIds.indexOf(currentProblemId);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    if (isFreeTier && selectedLanguage !== "javascript") setSelectedLanguage("javascript");
  }, [isFreeTier, selectedLanguage]);

  useEffect(() => {
    chatSidebarOpenRef.current = chatSidebarOpen;
    if (chatSidebarOpen) setChatUnread(0);
  }, [chatSidebarOpen]);

  useEffect(() => {
    if (!chatSidebarOpen) return;
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatSidebarOpen]);

  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text || !socketRef.current || !isInSession) return;
    socketRef.current.emit("session:chat:send", { text });
    setChatInput("");
  };

  // Timer effect
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    localStorage.setItem("collabDisplayName", displayName);
  }, [displayName]);

  useEffect(() => {
    fetch("http://localhost:5000/api/getAllUsers")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/classrooms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setClassrooms(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const socket = createLiveSocket();
    socketRef.current = socket;

    socket.on("session:list", ({ sessions }) => {
      setAvailableSessions(sessions || []);
    });

    socket.on("session:participants", ({ participants, participantDetails }) => {
      const curr = participants || [];
      const prev = prevParticipantsRef.current;
      const joined = curr.filter((n) => !prev.includes(n));
      const left = prev.filter((n) => !curr.includes(n));
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newEntries = [
        ...joined.map((name) => ({ name, status: "joined", time: now })),
        ...left.map((name) => ({ name, status: "left", time: now })),
      ];
      if (newEntries.length > 0) {
        setParticipantHistory((h) => [...newEntries, ...h].slice(0, 50));
      }
      prevParticipantsRef.current = curr;
      setSessionParticipants(curr);
      setSessionParticipantDetails(participantDetails || []);
    });

    socket.on("session:permission:error", ({ message }) => {
      toast.error(message || "You do not have permission to perform this action");
    });

    socket.on("session:chat:message", (msg) => {
      setChatMessages((prev) => [...prev, msg].slice(-200));
      if (!chatSidebarOpenRef.current) setChatUnread((n) => n + 1);
    });

    socket.on("session:code:updated", ({ language, code }) => {
      if (!language) return;
      // Teacher-mode students have a private editor — ignore shared broadcasts.
      const role = currentUserRoleRef.current;
      const isTeacher = role === "host" || role === "co-host";
      if (teacherModeRef.current && !isTeacher) return;
      setSessionCodeByLanguage((prev) => ({ ...prev, [language]: code || "" }));
      if (language === selectedLanguageRef.current) setCode(code || "");
    });

    // Waiting room events
    socket.on("session:waiting:placed", ({ sessionName: sName }) => {
      setIsInWaitingRoom(true);
      toast(`Waiting for approval to join "${sName}"`, { icon: "⏳" });
    });

    socket.on("session:waiting:approved", ({ userRole, userPermission, session: joined }) => {
      setIsInWaitingRoom(false);
      setActiveSession({
          id: joined.id,
          name: joined.name,
          teacherMode: Boolean(joined.teacherMode),
          locked: Boolean(joined.locked),
          requireJoinApproval: Boolean(joined.requireJoinApproval),
          maxParticipants: joined.maxParticipants,
          visibility: joined.visibility,
          problemIds:          joined.problemIds || [],          // #2
          currentProblemIndex: joined.currentProblemIndex ?? 0,  // #2
          identityMode:        joined.identityMode || "real",    // #8
        });
      setExam(joined.exam || null);
      setCurrentUserRole(userRole || "editor");
      setCurrentUserPermission(userPermission || "editable");
      setSessionCodeByLanguage(joined.codeByLanguage || {});
      setTldrawInitialStore(joined.tldrawStore || {});
      const codeForLang = joined.codeByLanguage?.[selectedLanguageRef.current];
      if (codeForLang !== undefined) setCode(codeForLang || "");
      toast.success("Approved! You have joined the session.");
    });

    socket.on("session:waiting:rejected", ({ reason }) => {
      setIsInWaitingRoom(false);
      toast.error(`Join request rejected: ${reason || "Request denied"}`);
    });

    socket.on("session:waiting:update", ({ waiting }) => {
      setWaitingRoomUsers(waiting || []);
    });

    // Role change
    socket.on("session:role:changed", ({ newRole, userPermission }) => {
      setCurrentUserRole(newRole);
      setCurrentUserPermission(userPermission || "read-only");
      toast(`Your role changed to ${newRole}`, { icon: "🔄" });
    });

    // Collab settings updated by host
    socket.on("session:collab:updated", ({ collab }) => {
      setActiveSession((prev) => prev ? { ...prev, collab } : prev);
    });

    // Session-level settings updated by host (from the Configuration modal)
    socket.on("session:settings:updated", (patch) => {
      setActiveSession((prev) => prev ? { ...prev, ...patch } : prev);
      toast("Session settings updated", { icon: "⚙" });
    });

    // Language lock
    socket.on("session:language:locked", ({ language }) => {
      setSessionLanguageLock(language || null);
      toast(language ? `Language locked to ${language}` : "Language unlocked", { icon: "🔒" });
    });

    // Kicked from session
    socket.on("session:kicked", ({ reason }) => {
      toast.error(reason || "You were removed from the session");
      setActiveSession(null);
      setSessionParticipants([]);
      setSessionParticipantDetails([]);
      setRaisedHands([]);
      setHandRaised(false);
      setSessionLanguageLock(null);
    });

    // Hand-raise list is full-resynced on every change.
    socket.on("session:hands:resync", (hands) => {
      setRaisedHands(hands || []);
      setHandRaised((hands || []).some((h) => h.socketId === socketRef.current?.id));
    });

    // #2 Playlist: host advanced to the next problem.
    socket.on("session:problem:changed", ({ index, problemId }) => {
      setActiveSession((prev) => prev ? { ...prev, currentProblemIndex: index, problemId } : prev);
      if (problemId) navigate(`/problems/${problemId}`);
      toast(`Now on problem ${index + 1}`, { icon: "📘" });
    });

    // Mid-session mode update: server broadcasts new collab/exam state.
    socket.on("session:mode:updated", ({ type, collab, teacherMode, exam: e }) => {
      setActiveSession((prev) => prev ? { ...prev, collab, teacherMode, type } : prev);
      setExam(e || null);
      toast(`Mode changed → ${type}`, { icon: "🔁" });
    });

    // Exam state (start/tick) and end.
    socket.on("exam:state", ({ exam: e }) => {
      setExam(e || null);
    });
    socket.on("exam:ended", ({ reason }) => {
      setExam((prev) => (prev ? { ...prev, phase: "ended" } : prev));
      toast(reason === "timed-out" ? "Exam time is up" : "Exam ended", { icon: "🛑" });
    });

    // Teacher receives the watched student's live code.
    socket.on("student:code", ({ socketId, code }) => {
      if (socketId === watchingRef.current) setWatchingCode(code || "");
    });

    // Teacher receives the watched student's live tldraw (paint) changes.
    socket.on("student:tldraw:change", ({ socketId, changes }) => {
      if (socketId !== watchingRef.current) return;
      const store = watchTldrawStoreRef.current;
      if (!store || !changes) return;
      store.mergeRemoteChanges(() => {
        const { added, updated, removed } = changes;
        if (added)   store.put(Object.values(added));
        if (updated) store.put(Object.values(updated).map(([, next]) => next));
        if (removed) store.remove(Object.values(removed).map((r) => r.id));
      });
    });

    return () => {
      socket.emit("session:leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Keep watchingRef in sync so the socket listeners above see the latest focus.
  useEffect(() => {
    watchingRef.current = watchingStudent?.socketId || null;
  }, [watchingStudent]);

  // Mirror teacherMode + current role into refs (socket listeners capture these once).
  useEffect(() => { teacherModeRef.current = Boolean(activeSession?.teacherMode); }, [activeSession]);
  useEffect(() => { currentUserRoleRef.current = currentUserRole; }, [currentUserRole]);
  useEffect(() => { watchTldrawStoreRef.current = watchTldrawStore; }, [watchTldrawStore]);

  const handleWatchStudent = (socketId, name) => {
    const store = createTLStore();
    setWatchingStudent({ socketId, name });
    setWatchingCode("");
    setWatchTldrawStore(store);
    socketRef.current?.emit("teacher:focus", { socketId }, (res) => {
      if (!res?.ok) return;
      setWatchingCode(res.code || "");
      const snap = res.tldrawStore || {};
      const rows = Object.values(snap);
      if (rows.length) store.mergeRemoteChanges(() => { store.put(rows); });
    });
  };

  const closeWatch = () => {
    setWatchingStudent(null);
    setWatchingCode("");
    setWatchTldrawStore(null);
  };

  // Defaults for each session type — one place to change them.
  // Exam is no longer a type; in classroom mode the host opts in via `sessionExamEnabled`.
  const TYPE_DEFAULTS = {
    practice:  { visibility:"public",  allowAnonymous:true,  requireJoinApproval:false, teacherMode:false, maxParticipants:10, defaultRole:"editor", collabMode:"free",       autoLock:false },
    classroom: { visibility:"private", allowAnonymous:false, requireJoinApproval:true,  teacherMode:true,  maxParticipants:30, defaultRole:"viewer", collabMode:"controlled", autoLock:false },
  };

  // Map the chosen session type to a sensible default access model.
  const ACCESS_BY_TYPE = { practice: "anyone", classroom: "classroom" };

  // Changing the access-model dropdown derives the underlying visibility/whitelist/password fields.
  const changeAccessModel = (model) => {
    setAccessModel(model);
    if (model === "anyone")    { setSessionVisibility("public");   setSessionWhitelist([]); setSessionPassword(""); }
    if (model === "link")      { setSessionVisibility("unlisted"); setSessionWhitelist([]); setSessionPassword(""); }
    if (model === "invited")   { setSessionVisibility("private");                           setSessionPassword(""); }
    if (model === "classroom") { setSessionVisibility("private");                           setSessionPassword(""); }
    if (model === "password")  { setSessionVisibility("private"); setSessionWhitelist([]);                          }
  };

  // Picking a classroom auto-fills the whitelist with its roster.
  const pickClassroom = async (id) => {
    setSelectedClassroomId(id);
    if (!id) { setSessionWhitelist([]); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/admin/classrooms/${id}/students`);
      const students = res.ok ? await res.json() : [];
      const names = (students || [])
        .map((s) => `${s.firstname || ""} ${s.lastname || ""}`.trim())
        .filter(Boolean);
      setSessionWhitelist(names);
    } catch { setSessionWhitelist([]); }
  };

  const applySessionType = (type) => {
    const d = TYPE_DEFAULTS[type];
    setSessionType(type);
    setSessionMaxParticipants(d.maxParticipants);
    changeAccessModel(ACCESS_BY_TYPE[type] || "anyone");
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setSessionType("");
    setSelectedClassroomId("");
    setAccessModel("anyone");
    setSessionExamEnabled(false);
  };

  // Derive "accessModel" from the live session's visibility + waiting-room flag.
  const visibilityToAccess = (vis, needsApproval) => {
    if (vis === "public") return "anyone";
    if (vis === "unlisted") return "link";
    return needsApproval ? "invited" : "link";
  };

  const openConfig = () => {
    if (!activeSession) return;
    setConfigForm({
      name: activeSession.name || "",
      locked: Boolean(activeSession.locked),
      maxParticipants: activeSession.maxParticipants ?? 10,
      accessModel: visibilityToAccess(activeSession.visibility, activeSession.requireJoinApproval),
    });
    setConfigOpen(true);
  };

  const saveConfig = () => {
    // Map the simple accessModel back to the fields the server expects.
    const { accessModel: model } = configForm;
    const visibility = model === "anyone" ? "public" : model === "link" ? "unlisted" : "private";
    const requireJoinApproval = model === "invited";

    socketRef.current?.emit(
      "session:settings:update",
      {
        name: configForm.name,
        locked: configForm.locked,
        maxParticipants: configForm.maxParticipants,
        visibility,
        requireJoinApproval,
      },
      (res) => {
        if (!res?.ok) return toast.error(res?.message || "Could not save settings");
        toast.success("Settings saved");
        setConfigOpen(false);
      }
    );
  };

  useEffect(() => {
    if (!socketRef.current || !currentProblemId) return;

    socketRef.current.emit("session:leave");

    // No socket-pushed list; poll REST instead.
    let cancelled = false;
    const refreshList = async () => {
      const list = await fetchSessionList();
      if (cancelled) return;
      setAvailableSessions(list.filter((s) => s.problemId === currentProblemId));
    };
    refreshList();
    const listInterval = setInterval(refreshList, 5000);

    setActiveSession(null);
    setExam(null);
    setExamResults(null);
    setCurrentUserPermission("editable");
    setSessionParticipants([]);
    setSessionCodeByLanguage({});
    setTldrawInitialStore({});
    setParticipantHistory([]);
    prevParticipantsRef.current = [];

    return () => { cancelled = true; clearInterval(listInterval); };
  }, [currentProblemId]);

  // Countdown ticker — derives remaining ms from server-provided endsAt.
  useEffect(() => {
    if (!exam?.endsAt || exam.phase !== "active") {
      setExamRemaining(0);
      return;
    }
    const tick = () => setExamRemaining(Math.max(0, exam.endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [exam?.endsAt, exam?.phase]);

  const formatMs = (ms) => {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // Host flips the waiting room on or off during a live session.
  const toggleWaitingRoom = () => {
    const next = !activeSession?.requireJoinApproval;
    socketRef.current?.emit("session:settings:update", { requireJoinApproval: next }, (res) => {
      if (!res?.ok) toast.error("Could not update waiting room");
      else toast(next ? "Waiting room ON — new joiners need approval" : "Waiting room OFF — anyone can join", { icon: next ? "🔒" : "🔓" });
    });
  };

  // Host accepts every user currently in the waiting room at once.
  const acceptAll = () => {
    waitingRoomUsers.forEach((w) =>
      socketRef.current?.emit("session:waiting:approve", { socketId: w.socketId })
    );
  };

  // Teacher clicks "Start Exam"
  const handleStartExam = () => {
    socketRef.current?.emit("exam:start", {}, (res) => {
      if (!res?.ok) return toast.error(res?.message || "Could not start exam");
      toast.success("Exam started");
    });
  };

  // Teacher clicks "End Exam"
  const handleEndExam = () => {
    if (!confirm("End the exam now? All student code will be submitted.")) return;
    socketRef.current?.emit("exam:end", {}, (res) => {
      if (!res?.ok) return toast.error(res?.message || "Could not end exam");
    });
  };

  // Host switches session type live (practice ↔ classroom).
  // For classroom, optionally arm the exam timer in the same call.
  const handleModeUpdate = (type, opts = {}) => {
    if (!type || !socketRef.current) return;
    const payload = { type };
    if (type === "classroom" && opts.examEnabled) {
      payload.exam = { enabled: true, durationMinutes: Number(opts.durationMinutes) || 30 };
    }
    socketRef.current.emit("session:mode:update", payload, (res) => {
      if (!res?.ok) return toast.error(res?.message || "Could not switch mode");
      toast.success(`Switched to ${type} mode`);
    });
  };

  // #2 Host advances to the next problem in the playlist.
  const handleAdvanceProblem = () => {
    socketRef.current?.emit("session:problem:advance", {}, (res) => {
      if (!res?.ok) return toast.error(res?.message || "Could not advance");
    });
  };

  // Teacher opens the results panel after the exam ends.
  const handleLoadExamResults = async () => {
    if (!activeSession?.id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/exams/session/${activeSession.id}/submissions`);
      const data = await res.json();
      setExamResults(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load results");
    }
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const targetProblemId = id || defaultProblemId;
    if (!targetProblemId) return;

    setCurrentProblemId(targetProblemId);
    setOutput(null);
    setSeconds(0);
    setActiveRightTab("testcase");

    if (PROBLEMS[targetProblemId]) {
      setApiProblem(null);
      return;
    }

    let active = true;

    const fetchProblemById = async () => {
      setIsProblemLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/ai/ai/getproblembyid", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: targetProblemId }),
        });

        if (!response.ok) {
          throw new Error(`Problem not found: ${response.status}`);
        }

        const data = await response.json();
        if (active) {
          setApiProblem(data);
        }
      } catch {
        if (active) {
          setApiProblem(null);
        }
      } finally {
        if (active) {
          setIsProblemLoading(false);
        }
      }
    };

    fetchProblemById();

    return () => {
      active = false;
    };
  }, [id, defaultProblemId]);

  useEffect(() => {
    if (!currentProblem) return;
    if (isInSession && sessionCodeByLanguage[selectedLanguage] !== undefined) {
      setCode(sessionCodeByLanguage[selectedLanguage] || "");
      return;
    }

    setCode(currentProblem.starterCode?.[selectedLanguage] || "");
  }, [currentProblem, selectedLanguage, isInSession, sessionCodeByLanguage]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    if (assignmentLanguageLock && newLang !== assignmentLanguageLock) {
      toast.error(`Language is locked to ${assignmentLanguageLock} for this assignment`);
      return;
    }
    if (exam?.phase === "active" && exam.lockLanguage) {
      toast.error("Language is locked during the exam");
      return;
    }
    const isHost = currentUserRole === "host" || currentUserRole === "co-host";
    if (!isHost && sessionLanguageLock && newLang !== sessionLanguageLock) {
      toast.error(`Language is locked to ${sessionLanguageLock}`);
      return;
    }
    setSelectedLanguage(newLang);

    if (isInSession && sessionCodeByLanguage[newLang] !== undefined) {
      setCode(sessionCodeByLanguage[newLang] || "");
    }

    setOutput(null);
    setShowDiff(false);
  };

  const handleCodeChange = (nextCode) => {
    if (currentUserPermission !== "editable") return;

    const safeCode = nextCode ?? "";
    setCode(safeCode);

    if (!isInSession || !socketRef.current) return;

    const isTeacher = currentUserRole === "host" || currentUserRole === "co-host";

    // Teacher-mode + student → private desk only (no shared broadcast).
    if (activeSession.teacherMode && !isTeacher) {
      socketRef.current.emit("student:code", { code: safeCode });
      return;
    }

    // Otherwise: shared collaborative editing (existing behavior).
    setSessionCodeByLanguage((prev) => ({
      ...prev,
      [selectedLanguage]: safeCode,
    }));

    socketRef.current.emit("session:code:update", {
      problemId: currentProblemId,
      sessionId: activeSession.id,
      language: selectedLanguage,
      code: safeCode,
    });
  };

  const handleProblemChange = (newProblemId) =>
    navigate(`/problems/${newProblemId}`);

  const handlePrevProblem = () => {
    if (currentIndex > 0) navigate(`/problems/${problemIds[currentIndex - 1]}`);
  };

  const handleNextProblem = () => {
    if (currentIndex < problemIds.length - 1)
      navigate(`/problems/${problemIds[currentIndex + 1]}`);
  };

  const handleResetCode = () => {
    if (!currentProblem) return;
    const resetCode = currentProblem.starterCode[selectedLanguage] || "";
    setCode(resetCode);

    if (isInSession && socketRef.current) {
      setSessionCodeByLanguage((prev) => ({
        ...prev,
        [selectedLanguage]: resetCode,
      }));

      socketRef.current.emit("session:code:update", {
        problemId: currentProblemId,
        sessionId: activeSession.id,
        language: selectedLanguage,
        code: resetCode,
      });
    }

    setOutput(null);
    setShowDiff(false);
    toast.success("Code reset to starter template");
  };

  const handleCreateSession = () => {
    if (isFreeTier) {
      toast.error("Sessions are a Pro feature. Upgrade to create one.");
      return;
    }
    if (!socketRef.current || !currentProblemId) return;

    // All the "hidden" knobs are derived from the session type at emit time.
    const d = TYPE_DEFAULTS[sessionType] || TYPE_DEFAULTS.practice;
    const examOn = sessionType === "classroom" && sessionExamEnabled;

    socketRef.current.emit(
      "session:create",
      {
        problemId:   currentProblemId,
        sessionName: sessionName || `${currentProblem?.title || "Problem"} Session`,
        hostName:    displayName || "Host",
        language:    selectedLanguage,
        starterCode: code,
        mode:        sessionType,   // "practice" | "classroom"
        // Access (user-facing)
        visibility:          sessionVisibility,
        password:            sessionPassword,
        whitelist:           sessionWhitelist,
        // Access (type-driven defaults)
        allowAnonymous:      d.allowAnonymous,
        requireJoinApproval: d.requireJoinApproval,
        teacherMode:         d.teacherMode,
        // Limits
        maxParticipants: Number(sessionMaxParticipants) || 10,
        autoLock:        d.autoLock,
        // Roles + collab (type-driven)
        defaultRole: d.defaultRole,
        collab: { mode: d.collabMode, turnDuration: 30, showLiveCursors: true, showSelections: true, typingIndicators: true },
        // Exam
        exam: { enabled: examOn, durationMinutes: Number(sessionExamDuration) || 30, lockLanguage: true },
        // Playlist (empty → server falls back to [problemId])
        problemIds: sessionPlaylistIds,
        playlistMode: "free",
        // Identity + post-session: sane constants
        identityMode: "real",
        postSession: { saveSnapshots: false, publishSolution: false, autoCloseOnEmpty: true },
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Could not create session");
          return;
        }

        // Server auto-joins creator as host — hydrate session state
        const joined = response.session;
        setActiveSession({
          id: joined.id,
          name: joined.name,
          teacherMode: Boolean(joined.teacherMode),
          locked: Boolean(joined.locked),
          requireJoinApproval: Boolean(joined.requireJoinApproval),
          maxParticipants: joined.maxParticipants,
          visibility: joined.visibility,
          problemIds:          joined.problemIds || [],
          currentProblemIndex: joined.currentProblemIndex ?? 0,
          identityMode:        joined.identityMode || "real",
        });
        setExam(joined.exam || null);
        setCurrentUserRole(response.userRole || "host");
        setCurrentUserPermission(response.userPermission || "editable");
        setSessionCodeByLanguage(joined.codeByLanguage || {});
        setTldrawInitialStore(joined.tldrawStore || {});
        setSessionLanguageLock(joined.languageLock || null);
        setRaisedHands([]);
        setHandRaised(false);

        // Reset form
        setSessionName("");
        setSessionPassword("");
        setSessionWhitelist([]);
        setSessionPlaylistIds([]);
        closeCreateModal();

        toast.success(`Session created & joined (ID: ${response.sessionId})`);
      }
    );
  };

  const handleJoinSession = (sessionId, passwordValue = "") => {
    if (!socketRef.current || !sessionId) return;

    socketRef.current.emit(
      "session:join",
      {
        problemId: currentProblemId,
        sessionId,
        userName: displayName || "Guest",
        password: passwordValue,
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Could not join session");
          return;
        }

        // Placed in waiting room — nothing to reset, just wait for host approval
        if (response.waiting) return;

        const joined = response.session;
        setActiveSession({
          id: joined.id,
          name: joined.name,
          teacherMode: Boolean(joined.teacherMode),
          locked: Boolean(joined.locked),
          requireJoinApproval: Boolean(joined.requireJoinApproval),
          maxParticipants: joined.maxParticipants,
          visibility: joined.visibility,
          problemIds:          joined.problemIds || [],          // #2
          currentProblemIndex: joined.currentProblemIndex ?? 0,  // #2
          identityMode:        joined.identityMode || "real",    // #8
        });
        setExam(joined.exam || null);
        setCurrentUserRole(response.userRole || "editor");
        setCurrentUserPermission(response.userPermission || "editable");
        setSessionCodeByLanguage(joined.codeByLanguage || {});
        setTldrawInitialStore(joined.tldrawStore || {});
        setSessionLanguageLock(joined.languageLock || null);
        setRaisedHands([]);
        setHandRaised(false);
        setSessionJoinId("");
        setSessionJoinPassword("");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("session", joined.id);
          next.delete("joinPassword");
          return next;
        });

        const codeForLanguage = joined.codeByLanguage?.[selectedLanguage];
        if (codeForLanguage !== undefined) setCode(codeForLanguage || "");

        toast.success(`Joined: ${joined.name}`);
      }
    );
  };

  const handleLeaveSession = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("session:leave");
    setActiveSession(null);
    setCurrentUserRole("editor");
    setCurrentUserPermission("editable");
    setSessionParticipants([]);
    setSessionParticipantDetails([]);
    setSessionCodeByLanguage({});
    setTldrawInitialStore({});
    setParticipantHistory([]);
    setWaitingRoomUsers([]);
    setIsInWaitingRoom(false);
    setParticipantsSidebarOpen(false);
    setChatSidebarOpen(false);
    setSessionLanguageLock(null);
    setRaisedHands([]);
    setHandRaised(false);
    setChatMessages([]);
    setChatInput("");
    setChatUnread(0);
    prevParticipantsRef.current = [];
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("session");
      return next;
    });
    toast.success("Left session");
  };

  const getSessionShareLink = (sessionId) => {
    if (!sessionId) return "";
    return `${window.location.origin}/problems/${currentProblemId}?session=${sessionId}`;
  };

  const handleCopySessionLink = async (sessionId) => {
    const link = getSessionShareLink(sessionId);
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Session link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  useEffect(() => {
    if (!requestedSessionId || !socketRef.current) return;
    if (attemptedJoinFromLinkRef.current === requestedSessionId) return;
    attemptedJoinFromLinkRef.current = requestedSessionId;
    handleJoinSession(requestedSessionId, requestedJoinPassword);
  }, [requestedSessionId, requestedJoinPassword]);

  useEffect(() => {
    attemptedJoinFromLinkRef.current = null;
  }, [currentProblemId]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveRightTab("result");
    try {
      const result = await executeCode(selectedLanguage, code);
      setOutput(result);
      if (result.success) {
        toast.success("Code executed successfully!");
      } else {
        toast.error("Code execution failed");
      }
    } catch (err) {
      setOutput({ success: false, output: "", error: err.message });
      toast.error("Execution error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentProblem) {
      toast.error("Problem data is not loaded yet");
      return;
    }

    setIsSubmitting(true);
    setActiveRightTab("result");
    try {
      const result = await executeCode(selectedLanguage, code);
      setOutput(result);

      let isCorrect = false;
      if (result.success) {
        const expected = currentProblem.expectedOutput?.[selectedLanguage];
        if (expected && outputsMatch(result.output, expected)) {
          isCorrect = true;
          toast.success("All test cases passed! 🎉");
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } else if (!expected) {
          isCorrect = true;
          toast.success("Code ran successfully!");
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } else {
          toast.error("Output doesn't match expected result");
        }
      } else {
        toast.error("Submission failed");
      }

      const storedUser = (() => { try { return JSON.parse(Cookies.get("user") || "{}"); } catch { return {}; } })();
      const authToken = Cookies.get("token");
      if (storedUser?.id && authToken) {
        fetch("http://localhost:5000/api/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            userId: storedUser.id,
            problemId: currentProblemId,
            userCode: code,
            language: selectedLanguage,
            status: result.success ? (isCorrect ? "passed" : "failed") : "error",
            score: isCorrect ? 100 : 0,
            isCorrect,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      setOutput({ success: false, output: "", error: err.message });
      toast.error("Submission error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorrectCode = async () => {
    if (!code.trim()) {
      toast.error("No code to correct");
      return;
    }

    setIsCorrecting(true);
    try {
      const expected = currentProblem?.expectedOutput?.[selectedLanguage];
      const examplesText = Array.isArray(currentProblem?.examples) && currentProblem.examples.length
        ? currentProblem.examples
            .map((ex, idx) => `Example ${idx + 1}:\n  Input: ${ex.input}\n  Output: ${ex.output}${ex.explanation ? `\n  Explanation: ${ex.explanation}` : ""}`)
            .join("\n\n")
        : "";
      const problemContext = currentProblem
        ? `${currentProblem.title}: ${currentProblem.description?.text || ""}${examplesText ? `\n\nExamples:\n${examplesText}` : ""}${expected ? `\n\nExpected output (the corrected code MUST produce exactly this when executed):\n${expected}` : ""}`
        : "General coding problem";

      const requestCorrection = async (currentCode, actualOutput) => {
        const response = await fetch("http://localhost:5000/api/ai/ai/correct-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: currentCode,
            language: selectedLanguage,
            problemContext,
            actualOutput,
          }),
        });
        if (!response.ok) throw new Error(`Failed to correct code: ${response.status}`);
        return response.json();
      };

      let correction = await requestCorrection(code, undefined);
      let working = correction.correctedCode || code;
      let lastSummary = correction.summary;
      let matched = false;

      if (expected) {
        const maxRetries = 2;
        for (let i = 0; i <= maxRetries; i++) {
          const run = await executeCode(selectedLanguage, working);
          if (run.success && outputsMatch(run.output, expected)) {
            matched = true;
            break;
          }
          if (i === maxRetries) break;
          const actual = run.success ? run.output : (run.error || "execution failed");
          correction = await requestCorrection(working, actual);
          if (!correction.correctedCode || correction.correctedCode === working) break;
          working = correction.correctedCode;
          lastSummary = correction.summary || lastSummary;
        }
      } else {
        matched = true;
      }

      if (working !== code) {
        setOriginalCode(code);
        setCode(working);
        setShowDiff(true);
        if (matched) {
          toast.success(lastSummary || "Code corrected successfully!");
        } else {
          toast(lastSummary || "Code updated, but output still doesn't match expected. You may need to refine further.", { icon: "⚠️" });
        }
      } else if (matched) {
        toast.success(lastSummary || "No issues found - code looks good!");
      } else {
        toast.error(lastSummary || "Couldn't auto-correct to match expected output.");
      }
    } catch (err) {
      toast.error(err.message || "Error correcting code");
    } finally {
      setIsCorrecting(false);
    }
  };

  // =========================
  // Horizontal Resize
  // =========================
  const startHorizontalResize = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = leftWidth;

      const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.offsetWidth;
        const delta = e.clientX - startX;
        const newWidth =
          ((startWidth / 100) * containerWidth + delta) /
          containerWidth *
          100;
        if (newWidth > 20 && newWidth < 75) setLeftWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [leftWidth]
  );

  // =========================
  // Vertical Resize
  // =========================
  const startVerticalResize = useCallback(
    (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = editorHeight;

      const handleMouseMove = (e) => {
        if (!rightPanelRef.current) return;
        const panelHeight = rightPanelRef.current.offsetHeight;
        const delta = e.clientY - startY;
        const newHeight =
          ((startHeight / 100) * panelHeight + delta) / panelHeight * 100;
        if (newHeight > 25 && newHeight < 85) setEditorHeight(newHeight);
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [editorHeight]
  );

  if (isProblemLoading && !currentProblem) {
    return (
      <div className="h-screen flex items-center justify-center bg-base-300">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body text-base-content/70">Loading problem...</div>
        </div>
      </div>
    );
  }

  if (!currentProblem) {
    return (
      <div className="h-screen flex items-center justify-center bg-base-300 px-4">
        <div className="card bg-base-100 shadow-md max-w-md w-full">
          <div className="card-body gap-4">
            <h2 className="card-title">Problem not found</h2>
            <p className="text-base-content/70">
              This problem could not be loaded. It may have been deleted or the id is invalid.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/problems")}>Back to Problems</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="problem-page h-screen flex flex-col overflow-hidden bg-base-300">
        {/* TOP BAR */}
        <div className="problem-topbar flex items-center justify-between px-3 py-1.5 bg-base-100 border-b border-base-300 gap-2">
        {/* Left: Logo + Problem nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/problems")}
            className="btn btn-ghost btn-sm gap-1 text-primary font-bold"
          >
            <ListIcon className="size-4" />
            <span className="hidden sm:inline">Problems</span>
          </button>

          <div className="divider divider-horizontal mx-0 h-6" />

          
        </div>

        {/* Center: Run + Submit */}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-outline gap-1.5"
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting || isCorrecting}
          >
            {isRunning ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PlayIcon className="size-3.5" />
            )}
            Run
          </button>
          {!isFreeTier && (
            <button
              className="btn btn-sm btn-primary gap-1.5"
              onClick={handleCorrectCode}
              disabled={isRunning || isSubmitting || isCorrecting}
            >
              {isCorrecting ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <WandSparklesIcon className="size-3.5" />
              )}
              Correct
            </button>
          )}
          <button
            className="btn btn-sm btn-success text-success-content gap-1.5"
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting || isCorrecting}
          >
            {isSubmitting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SendIcon className="size-3.5" />
            )}
            Submit
          </button>

        </div>

        {/* Right: Timer + Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCode}
            className="btn btn-ghost btn-xs btn-circle tooltip tooltip-bottom"
            data-tip="Reset code"
          >
            <RotateCcwIcon className="size-3.5" />
          </button>

          <button
            className={`btn btn-xs gap-1 tooltip tooltip-bottom ${aiMentorOpen ? "btn-secondary" : "btn-ghost"}`}
            data-tip="AI Mentor"
            onClick={() => setAiMentorOpen((o) => !o)}
          >
            <SparklesIcon className="size-3.5" />
            <span className="hidden sm:inline">Mentor</span>
          </button>

          <div
            className="flex items-center gap-1.5 text-xs font-mono text-base-content/60 cursor-pointer select-none"
            onClick={() => setTimerRunning((r) => !r)}
            title={timerRunning ? "Click to pause" : "Click to resume"}
          >
            <TimerIcon className="size-3.5" />
            <span>{formatTime(seconds)}</span>
          </div>
        </div>
      </div>

        {/* COLLAB BAR */}
        <div className="px-3 py-1.5 border-b border-base-300 bg-base-100/80 flex items-center gap-2 flex-wrap min-h-[40px]">
          {/* Display name */}
          

          <div className="divider divider-horizontal mx-0 h-5 shrink-0" />

          {isInSession ? (
            /* ── IN SESSION ── */
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                <span className="text-success font-semibold truncate max-w-[140px]">{activeSession.name}</span>
                <span className="text-base-content/40">·</span>
                <span className="text-base-content/50 capitalize">{currentUserPermission}</span>
              </span>

              <button
                className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-primary relative"
                onClick={() => {
                  setParticipantsSidebarOpen((o) => !o);
                  setChatSidebarOpen(false);
                }}
                title="View participants"
              >
                <UsersIcon className="size-3.5" />
                <span>{sessionParticipants.length}</span>
                {waitingRoomUsers.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-warning text-warning-content text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {waitingRoomUsers.length}
                  </span>
                )}
              </button>

              {/* ── Waiting room toggle (host/co-host only) ── */}
              {(currentUserRole === "host" || currentUserRole === "co-host") && (
                <button
                  className={`btn btn-xs gap-1 ${activeSession.requireJoinApproval ? "btn-warning" : "btn-ghost text-base-content/40"}`}
                  onClick={toggleWaitingRoom}
                  title={activeSession.requireJoinApproval ? "Waiting room ON — click to turn off" : "Waiting room OFF — click to turn on"}
                >
                  <LockIcon className="size-3" />
                  {activeSession.requireJoinApproval ? "Waiting room ON" : "Waiting room OFF"}
                </button>
              )}

              <button
                className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-primary relative"
                onClick={() => {
                  setChatSidebarOpen((o) => !o);
                  setParticipantsSidebarOpen(false);
                }}
                title="Open chat"
              >
                <MessageSquareIcon className="size-3.5" />
                <span>Chat</span>
                {chatUnread > 0 && !chatSidebarOpen && (
                  <span className="absolute -top-1 -right-1 bg-error text-error-content text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {chatUnread > 9 ? "9+" : chatUnread}
                  </span>
                )}
              </button>

              <button
                className="btn btn-xs btn-ghost gap-1 text-base-content/50"
                onClick={() => handleCopySessionLink(activeSession.id)}
                title="Copy invite link"
              >
                <Link2Icon className="size-3.5" />
                Invite
              </button>

              {/* Host-only live mode switcher */}
              {(currentUserRole === "host" || currentUserRole === "co-host") && (
                <select
                  className="select select-xs select-bordered"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = "";
                    if (!v) return;
                    if (v === "classroom-exam") handleModeUpdate("classroom", { examEnabled: true, durationMinutes: 30 });
                    else handleModeUpdate(v);
                  }}
                  title="Switch session mode live"
                >
                  <option value="">Switch mode…</option>
                  <option value="practice">Practice</option>
                  <option value="classroom">Classroom</option>
                  <option value="classroom-exam">Classroom + Exam timer</option>
                </select>
              )}

              {/* #2 Playlist — advance to next problem (host only) */}
              {(currentUserRole === "host" || currentUserRole === "co-host") &&
                (activeSession?.problemIds?.length || 0) > 1 && (
                <button
                  className="btn btn-xs btn-ghost gap-1"
                  onClick={handleAdvanceProblem}
                  title="Next problem in playlist"
                >
                  <ChevronRightIcon className="size-3.5" />
                  Next ({(activeSession.currentProblemIndex ?? 0) + 1}/{activeSession.problemIds.length})
                </button>
              )}

              {/* ── EXAM CONTROLS ── */}
              {exam?.enabled && (
                <>
                  {exam.phase === "waiting" && (
                    (currentUserRole === "host" || currentUserRole === "co-host") ? (
                      <button
                        className="btn btn-xs btn-warning gap-1"
                        onClick={handleStartExam}
                        title={`Start ${exam.durationMinutes}-minute exam`}
                      >
                        <TimerIcon className="size-3" />
                        Start Exam ({exam.durationMinutes}m)
                      </button>
                    ) : (
                      <span className="badge badge-sm badge-warning gap-1">
                        <TimerIcon className="size-3" />
                        Exam pending
                      </span>
                    )
                  )}

                  {exam.phase === "active" && (
                    <>
                      <span className="badge badge-sm badge-error gap-1 font-mono">
                        <TimerIcon className="size-3" />
                        {formatMs(examRemaining)}
                      </span>
                      {(currentUserRole === "host" || currentUserRole === "co-host") && (
                        <button
                          className="btn btn-xs btn-outline btn-error gap-1"
                          onClick={handleEndExam}
                        >
                          End Exam
                        </button>
                      )}
                    </>
                  )}

                  {exam.phase === "ended" && (
                    <>
                      <span className="badge badge-sm badge-ghost">Exam ended</span>
                      {(currentUserRole === "host" || currentUserRole === "co-host") && (
                        <button
                          className="btn btn-xs btn-primary gap-1"
                          onClick={handleLoadExamResults}
                        >
                          View Results
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── Language lock (host sets, everyone sees) ── */}
              {(currentUserRole === "host" || currentUserRole === "co-host") ? (
                <select
                  className="select select-xs select-bordered"
                  value={sessionLanguageLock || ""}
                  onChange={(e) => {
                    const lang = e.target.value || null;
                    socketRef.current?.emit("session:language:lock", { language: lang }, (res) => {
                      if (!res?.ok) toast.error(res?.message || "Could not set language lock");
                    });
                  }}
                  title="Lock session language"
                >
                  <option value="">Lang: free</option>
                  <option value="javascript">Lock: JS</option>
                  <option value="python">Lock: Python</option>
                  <option value="java">Lock: Java</option>
                </select>
              ) : sessionLanguageLock ? (
                <span className="badge badge-sm badge-warning gap-1" title="Language locked by host">
                  🔒 {sessionLanguageLock}
                </span>
              ) : null}

              {/* ── Raise hand (students only) ── */}
              {currentUserRole !== "host" && currentUserRole !== "co-host" && (
                <button
                  className={`btn btn-xs gap-1 ${handRaised ? "btn-warning" : "btn-ghost"}`}
                  title={handRaised ? "Lower hand" : "Raise hand to request edit access"}
                  onClick={() => {
                    if (handRaised) {
                      socketRef.current?.emit("session:hand:lower", {});
                      setHandRaised(false);
                    } else {
                      socketRef.current?.emit("session:hand:raise", {}, (res) => {
                        if (res?.ok) setHandRaised(true);
                        else toast.error(res?.message || "Could not raise hand");
                      });
                    }
                  }}
                >
                  ✋ {handRaised ? "Lower hand" : "Raise hand"}
                </button>
              )}

              {/* ── Raised hands panel (host only) ── */}
              {(currentUserRole === "host" || currentUserRole === "co-host") && raisedHands.length > 0 && (
                <div className="dropdown dropdown-end">
                  <button tabIndex={0} className="btn btn-xs btn-warning gap-1">
                    ✋ {raisedHands.length}
                  </button>
                  <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-300 mt-1 space-y-1">
                    {raisedHands.map((h) => (
                      <li key={h.socketId} className="flex items-center gap-2">
                        <span className="text-xs flex-1 truncate">{h.name}</span>
                        <button
                          className="btn btn-xs btn-success"
                          onClick={() => {
                            socketRef.current?.emit("session:role:change", { socketId: h.socketId, newRole: "editor" });
                            socketRef.current?.emit("session:hand:lower", { socketId: h.socketId });
                          }}
                        >
                          Allow
                        </button>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => socketRef.current?.emit("session:hand:lower", { socketId: h.socketId })}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                className="btn btn-xs btn-outline btn-error gap-1"
                onClick={handleLeaveSession}
              >
                <LogOutIcon className="size-3" />
                Leave
              </button>
            </div>
          ) : (
            /* ── NOT IN SESSION ── */
            <div className="flex items-center gap-2 flex-wrap">
              {!isFreeTier && (
                <button
                  className="btn btn-xs btn-primary gap-1 shrink-0"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <PlusIcon className="size-3" />
                  New Session
                </button>
              )}

              {/* active sessions chips */}
              {availableSessions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-base-content/40 shrink-0">Active:</span>
                  {availableSessions.map((session) => {
                    const isFull = session.participantCount >= session.maxParticipants;
                    return (
                      <div key={session.id} className="flex items-center gap-0.5">
                        <button
                          className={`btn btn-xs gap-1 ${isFull ? "btn-disabled opacity-50" : "btn-outline"}`}
                          disabled={isFull}
                          onClick={() =>
                            handleJoinSession(
                              session.id,
                              session.requiresPassword ? sessionJoinPassword : ""
                            )
                          }
                          title={`${session.participantCount}/${session.maxParticipants} participants`}
                        >
                          {session.requiresPassword && <LockIcon className="size-2.5" />}
                          <span className="truncate max-w-[80px]">{session.name}</span>
                          <span className="opacity-50 text-[10px]">
                            {session.participantCount}/{session.maxParticipants}
                          </span>
                        </button>
                        <button
                          className="btn btn-xs btn-ghost px-1 opacity-40 hover:opacity-80"
                          title="Copy invite link"
                          onClick={() => handleCopySessionLink(session.id)}
                        >
                          <Link2Icon className="size-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {availableSessions.length === 0 && (
                <span className="text-[10px] text-base-content/40 italic">
                  No sessions for this problem yet
                </span>
              )}
            </div>
          )}
        </div>

      {/* MAIN CONTENT */}
      <div ref={containerRef} className="flex flex-1 min-h-0 gap-1 p-1">
        {/* LEFT PANEL — Problem Description */}
        <div
          style={{ width: isLeftCollapsed ? "0%" : `${leftWidth}%` }}
          className={`problem-panel h-full rounded-xl overflow-hidden transition-[width] duration-200 ${
            isLeftCollapsed ? "hidden" : ""
          }`}
        >
          <ProblemDescription
            problem={currentProblem}
            currentProblemId={currentProblemId}
            onProblemChange={handleProblemChange}
            allProblems={Object.values(allProblemsById)}
            socket={socketRef.current}
            sessionId={activeSession?.id}
            problemId={currentProblemId}
            tldrawInitialStore={tldrawInitialStore}
            tldrawPrivate={
              Boolean(activeSession?.teacherMode) &&
              currentUserRole !== "host" &&
              currentUserRole !== "co-host"
            }
          />
        </div>

        {/* HORIZONTAL GUTTER */}
        {!isLeftCollapsed && (
          <div
            onMouseDown={startHorizontalResize}
            className="gutter-h group flex items-center justify-center w-2 cursor-col-resize rounded-full hover:bg-primary/20 transition-colors"
          >
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
            </div>
          </div>
        )}

        {/* RIGHT PANEL — Editor + Output */}
        <div
          ref={rightPanelRef}
          style={{
            width: isLeftCollapsed ? "100%" : `${100 - leftWidth - 1}%`,
          }}
          className="flex flex-col h-full gap-1"
        >
          {/* EDITOR PANEL */}
          <div
            style={{ height: `${editorHeight}%` }}
            className="problem-panel rounded-xl overflow-hidden"
          >
            <CodeEditorPanel
              selectedLanguage={selectedLanguage}
              code={code}
              isRunning={isRunning}
              readOnly={isInSession && currentUserPermission !== "editable"}
              languageLocked={
                !!assignmentLanguageLock ||
                isFreeTier ||
                (isInSession &&
                  currentUserRole !== "host" &&
                  currentUserRole !== "co-host" &&
                  !!sessionLanguageLock)
              }
              onLanguageChange={handleLanguageChange}
              onCodeChange={handleCodeChange}
              onRunCode={handleRunCode}
              showDiff={showDiff}
              originalCode={originalCode}
              onCloseDiff={() => setShowDiff(false)}
            />
          </div>

          {/* VERTICAL GUTTER */}
          <div
            onMouseDown={startVerticalResize}
            className="gutter-v group flex items-center justify-center h-2 cursor-row-resize rounded-full hover:bg-primary/20 transition-colors"
          >
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
            </div>
          </div>

          {/* OUTPUT / TEST PANEL */}
          <div
            style={{ height: `${100 - editorHeight - 1}%` }}
            className="problem-panel rounded-xl overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex items-center gap-0 bg-base-100 border-b border-base-300 px-2">
              <button
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "testcase"
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/50 hover:text-base-content/80"
                }`}
                onClick={() => setActiveRightTab("testcase")}
              >
                Testcase
              </button>
              <button
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "result"
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/50 hover:text-base-content/80"
                }`}
                onClick={() => setActiveRightTab("result")}
              >
                Result
                {output && (
                  <span
                    className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                      output.success ? "bg-success" : "bg-error"
                    }`}
                  />
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto h-[calc(100%-37px)]">
              {activeRightTab === "testcase" ? (
                <div className="p-4 space-y-3">
                  {currentProblem.examples.map((example, idx) => (
                    <div
                      key={idx}
                      className="bg-base-200 rounded-lg p-3 font-mono text-xs space-y-1"
                    >
                      <div className="text-base-content/50 text-[10px] font-sans font-semibold uppercase tracking-wider mb-1">
                        Case {idx + 1}
                      </div>
                      <div>
                        <span className="text-base-content/50">Input: </span>
                        <span className="text-base-content">
                          {example.input}
                        </span>
                      </div>
                      <div>
                        <span className="text-base-content/50">
                          Expected:{" "}
                        </span>
                        <span className="text-success">{example.output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <OutputPanel output={output} />
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ── CREATE SESSION MODAL ── */}
      {createModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box w-full max-w-xl">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => { closeCreateModal(); }}
            >
              <XIcon className="size-4" />
            </button>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <UsersIcon className="size-5 text-primary" />
              Create Live Session
            </h3>

            {/* ── STEP 1: type picker ── */}
            {!sessionType && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                {SESSION_TYPES.map(({ key, icon, label, desc, bullets }) => (
                  <button
                    key={key}
                    className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-base-300 hover:border-primary hover:bg-base-200/40 text-left transition-colors"
                    onClick={() => applySessionType(key)}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="font-semibold text-sm">{label}</span>
                    <span className="text-xs text-base-content/60">{desc}</span>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-base-content/60 list-disc list-inside">
                      {bullets.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                  </button>
                ))}
              </div>
            )}

            {/* ── STEP 2: badge + tabs + panels + action (all hidden until type is picked) ── */}
            {sessionType && <>

            {/* selected type badge + change link */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{SESSION_TYPES.find(t => t.key === sessionType)?.icon}</span>
              <span className="text-sm font-semibold">{SESSION_TYPES.find(t => t.key === sessionType)?.label}</span>
              <button
                className="btn btn-xs btn-ghost text-base-content/50 ml-auto"
                onClick={() => setSessionType("")}
              >
                change
              </button>
            </div>

            {/* ── Simple linear form: one question at a time, smart defaults from the session type ── */}
            <div className="space-y-4">
              {/* 1. Session name */}
              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Session name</span>
                </label>
                <input
                  className="input input-sm input-bordered w-full"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder={`${currentProblem?.title || "Problem"} Session`}
                />
              </div>

              {/* 2. Access — one dropdown, drives visibility/whitelist/password */}
              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Who can join?</span>
                </label>
                <select
                  className="select select-sm select-bordered w-full"
                  value={accessModel}
                  onChange={(e) => changeAccessModel(e.target.value)}
                >
                  {sessionType === "practice" ? (
                    <>
                      <option value="anyone">Anyone (public)</option>
                      <option value="link">Anyone with the link</option>
                    </>
                  ) : (
                    <>
                      <option value="classroom">My classroom</option>
                      <option value="invited">People I invite</option>
                      <option value="password">Password-protected</option>
                    </>
                  )}
                </select>

                {accessModel === "invited" && (
                  <div className="mt-3">
                    <TagAutocomplete
                      label="Invite people"
                      tags={sessionWhitelist}
                      setTags={setSessionWhitelist}
                      users={allUsers}
                    />
                  </div>
                )}

                {accessModel === "classroom" && (
                  <div className="mt-3">
                    <label className="label pb-1">
                      <span className="label-text text-xs font-medium">Pick a classroom</span>
                    </label>
                    <select
                      className="select select-sm select-bordered w-full"
                      value={selectedClassroomId}
                      onChange={(e) => pickClassroom(e.target.value)}
                    >
                      <option value="">— Select classroom —</option>
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {selectedClassroomId && (
                      <p className="text-[11px] text-base-content/60 mt-1">
                        {sessionWhitelist.length} student{sessionWhitelist.length === 1 ? "" : "s"} auto-invited
                      </p>
                    )}
                  </div>
                )}

                {accessModel === "password" && (
                  <div className="mt-3">
                    <label className="label pb-1">
                      <span className="label-text text-xs font-medium">Password</span>
                    </label>
                    <input
                      type="password"
                      className="input input-sm input-bordered w-full"
                      value={sessionPassword}
                      onChange={(e) => setSessionPassword(e.target.value)}
                      placeholder="Enter a password"
                    />
                  </div>
                )}
              </div>

              {/* 3. Problems */}
              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">
                    Problems <span className="text-base-content/40 font-normal">(empty = current only)</span>
                  </span>
                </label>
                <div className="border border-base-300 rounded-lg max-h-36 overflow-y-auto bg-base-100">
                  {problemIds.map((pid) => {
                    const p = allProblemsById[pid];
                    const checked = sessionPlaylistIds.includes(pid);
                    return (
                      <label key={pid} className="flex items-center gap-2 px-3 py-1.5 hover:bg-base-200 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs checkbox-primary"
                          checked={checked}
                          onChange={() =>
                            setSessionPlaylistIds((prev) =>
                              prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
                            )
                          }
                        />
                        <span className="flex-1 truncate">{p?.title || pid}</span>
                        {p?.difficulty && (
                          <span className={`text-[10px] font-semibold ${p.difficulty === "Easy" ? "text-success" : p.difficulty === "Medium" ? "text-warning" : "text-error"}`}>
                            {p.difficulty}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. Max participants */}
              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Max participants</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  className="input input-sm input-bordered w-full"
                  value={sessionMaxParticipants}
                  onChange={(e) => setSessionMaxParticipants(e.target.value)}
                />
              </div>

              {/* 5. Exam timer — only meaningful in Classroom mode */}
              {sessionType === "classroom" && (
                <div className="rounded-lg border border-base-300 p-3 bg-base-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={sessionExamEnabled}
                      onChange={(e) => setSessionExamEnabled(e.target.checked)}
                    />
                    <span className="label-text text-xs font-medium">Include exam timer</span>
                  </label>
                  {sessionExamEnabled && (
                    <div className="mt-3">
                      <label className="label pb-1">
                        <span className="label-text text-xs font-medium">Exam duration (minutes)</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={300}
                        className="input input-sm input-bordered w-full"
                        value={sessionExamDuration}
                        onChange={(e) => setSessionExamDuration(e.target.value)}
                      />
                      <p className="text-[11px] text-base-content/60 mt-1">
                        Students join first — click “Start Exam” when ready. Timer auto-saves submissions.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-action mt-5">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { closeCreateModal(); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm gap-1.5"
                onClick={handleCreateSession}
              >
                <PlusIcon className="size-3.5" />
                Create &amp; Join
              </button>
            </div>

            </>}
          </div>
          <div className="modal-backdrop" onClick={() => { closeCreateModal(); }} />
        </dialog>
      )}

      {/* ── EXAM RESULTS MODAL ── */}
      {examResults && (
        <dialog className="modal modal-open">
          <div className="modal-box w-full max-w-3xl">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setExamResults(null)}
            >
              <XIcon className="size-4" />
            </button>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <TimerIcon className="size-5 text-primary" />
              Exam Results — {activeSession?.name}
            </h3>

            {examResults.length === 0 ? (
              <p className="text-sm text-base-content/60 py-4">No student submissions found for this session.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {examResults.map((row) => (
                  <details key={row.id} className="collapse collapse-arrow bg-base-200">
                    <summary className="collapse-title text-sm font-medium flex items-center gap-3">
                      <span className="flex-1">{row.studentName}</span>
                      <span className="badge badge-sm">{row.language || "—"}</span>
                      <span className="badge badge-sm badge-ghost">
                        {Math.floor((row.durationSeconds || 0) / 60)}m {(row.durationSeconds || 0) % 60}s
                      </span>
                      <span className={`badge badge-sm ${row.finalStatus === "submitted" ? "badge-success" : "badge-warning"}`}>
                        {row.finalStatus}
                      </span>
                    </summary>
                    <div className="collapse-content">
                      <pre className="bg-base-300 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                        {row.code || "(empty)"}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            )}

            <div className="modal-action mt-4">
              <button className="btn btn-sm" onClick={() => setExamResults(null)}>Close</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setExamResults(null)} />
        </dialog>
      )}

      {/* ── PARTICIPANTS SIDEBAR ── */}
      {/* backdrop */}
      {participantsSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setParticipantsSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-base-100 border-l border-base-300 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          participantsSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 shrink-0">
          <span className="font-semibold text-sm flex items-center gap-2">
            <UsersIcon className="size-4 text-primary" />
            Participants
          </span>
          <button
            className="btn btn-ghost btn-xs btn-circle"
            onClick={() => setParticipantsSidebarOpen(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* session info pill */}
        {isInSession && (
          <div className="px-4 py-2 bg-base-200 shrink-0 flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <span className="font-medium truncate">{activeSession.name}</span>
            {activeSession.teacherMode && (
              <span className="badge badge-xs badge-primary shrink-0">teacher mode</span>
            )}
            {(currentUserRole === "host" || currentUserRole === "co-host") && (
              <button
                className="btn btn-ghost btn-xs ml-auto"
                title="Session configuration"
                onClick={openConfig}
              >
                ⚙ Configure
              </button>
            )}
            <span className="text-base-content/40 capitalize shrink-0">
              {currentUserRole}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">

          {/* ── Waiting room — host view ── */}
          {(currentUserRole === "host" || currentUserRole === "co-host") && activeSession?.requireJoinApproval && (
            <div className="border-b border-warning/30 bg-warning/5">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-warning uppercase tracking-wider">
                  Waiting room
                  {waitingRoomUsers.length > 0 && (
                    <span className="ml-1.5 bg-warning text-warning-content text-[9px] font-bold rounded-full px-1.5 py-0.5">
                      {waitingRoomUsers.length}
                    </span>
                  )}
                </span>
                {waitingRoomUsers.length > 1 && (
                  <button className="btn btn-xs btn-success gap-1" onClick={acceptAll}>
                    Accept all
                  </button>
                )}
              </div>

              {waitingRoomUsers.length === 0 ? (
                <p className="px-4 pb-3 text-xs text-base-content/40 italic">No one waiting</p>
              ) : (
                <div className="px-4 pb-3 space-y-2">
                  {waitingRoomUsers.map((w) => (
                    <div key={w.socketId} className="flex items-center gap-2 bg-base-100 rounded-lg px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-warning/20 flex items-center justify-center text-xs font-bold text-warning shrink-0">
                        {w.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs font-medium truncate flex-1">{w.name}</span>
                      <button
                        className="btn btn-success btn-xs"
                        onClick={() => socketRef.current?.emit("session:waiting:approve", { socketId: w.socketId })}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => socketRef.current?.emit("session:waiting:reject", { socketId: w.socketId, reason: "The host declined your request." })}
                      >
                        Decline
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Waiting room notice (for the waiting user) ── */}
          {isInWaitingRoom && (
            <div className="mx-4 my-3 rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 flex items-start gap-3">
              <LockIcon className="size-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-warning">Waiting for approval</p>
                <p className="text-[11px] text-base-content/60 mt-0.5">
                  The host will let you in shortly. Hang tight.
                </p>
              </div>
            </div>
          )}

          {/* ── Current participants ── */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-2">
              In session now · {sessionParticipants.length}
            </p>
            {sessionParticipants.length === 0 ? (
              <p className="text-xs text-base-content/40 italic">No one here yet</p>
            ) : (
              <div className="space-y-2">
                {sessionParticipantDetails.length > 0
                  ? sessionParticipantDetails.map((p) => {
                      const roleBadge = {
                        host:      "badge-primary",
                        "co-host": "badge-secondary",
                        editor:    "badge-accent",
                        viewer:    "badge-ghost",
                      }[p.role] || "badge-ghost";
                      const canChangeRole =
                        (currentUserRole === "host" || currentUserRole === "co-host") &&
                        p.role !== "host";

                      return (
                        <div key={p.socketId} className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {p.name[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm truncate flex-1">{p.name}</span>
                          {canChangeRole ? (
                            <select
                              className="select select-xs select-bordered py-0 h-6 min-h-0 text-[10px]"
                              value={p.role}
                              onChange={(e) =>
                                socketRef.current?.emit("session:role:change", {
                                  socketId: p.socketId,
                                  newRole:  e.target.value,
                                })
                              }
                            >
                              <option value="co-host">co-host</option>
                              <option value="editor">editor</option>
                              <option value="viewer">viewer</option>
                            </select>
                          ) : (
                            <span className={`badge badge-xs ${roleBadge}`}>{p.role}</span>
                          )}
                          {(currentUserRole === "host" || currentUserRole === "co-host") && p.role !== "host" && p.role !== "co-host" && (
                            <>
                              <button
                                className="btn btn-ghost btn-xs px-1"
                                title={`Watch ${p.name}'s desk`}
                                onClick={() => handleWatchStudent(p.socketId, p.name)}
                              >
                                👁
                              </button>
                              <button
                                className="btn btn-ghost btn-xs px-1 text-error"
                                title={`Kick ${p.name}`}
                                onClick={() => {
                                  if (!confirm(`Kick ${p.name} from the session?`)) return;
                                  socketRef.current?.emit("session:kick", { socketId: p.socketId }, (res) => {
                                    if (!res?.ok) toast.error(res?.message || "Could not kick user");
                                  });
                                }}
                              >
                                ✕
                              </button>
                            </>
                          )}
                          <span className="w-2 h-2 rounded-full bg-success shrink-0" title="Online" />
                        </div>
                      );
                    })
                  : sessionParticipants.map((name, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm truncate flex-1">{name}</span>
                        <span className="w-2 h-2 rounded-full bg-success shrink-0" title="Online" />
                      </div>
                    ))}
              </div>
            )}
          </div>

          {/* ── Activity history ── */}
          {participantHistory.length > 0 && (
            <div className="px-4 py-3 border-t border-base-300">
              <p className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-2">
                Activity
              </p>
              <div className="space-y-1.5">
                {participantHistory.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        entry.status === "joined" ? "bg-success" : "bg-base-content/25"
                      }`}
                    />
                    <span className="font-medium truncate flex-1">{entry.name}</span>
                    <span className="text-base-content/40 shrink-0">{entry.status}</span>
                    <span className="text-base-content/30 shrink-0 tabular-nums">{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT SIDEBAR ── */}
      {chatSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setChatSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-base-100 border-l border-base-300 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          chatSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 shrink-0">
          <span className="font-semibold text-sm flex items-center gap-2">
            <MessageSquareIcon className="size-4 text-primary" />
            Session Chat
          </span>
          <button
            className="btn btn-ghost btn-xs btn-circle"
            onClick={() => setChatSidebarOpen(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {isInSession && (
          <div className="px-4 py-2 bg-base-200 shrink-0 flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <span className="font-medium truncate">{activeSession.name}</span>
            <span className="text-base-content/40 ml-auto shrink-0">
              {sessionParticipants.length} online
            </span>
          </div>
        )}

        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {!isInSession ? (
            <p className="text-xs text-base-content/40 italic text-center mt-4">
              Join a session to start chatting.
            </p>
          ) : chatMessages.length === 0 ? (
            <p className="text-xs text-base-content/40 italic text-center mt-4">
              No messages yet. Say hi 👋
            </p>
          ) : (
            chatMessages.map((m) => {
              const mine = m.socketId === socketRef.current?.id;
              const time = new Date(m.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-base-content/50 mb-0.5 px-1">
                    <span className="font-semibold">{mine ? "You" : m.name}</span>
                    <span>·</span>
                    <span>{time}</span>
                  </div>
                  <div
                    className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs break-words ${
                      mine
                        ? "bg-primary text-primary-content rounded-br-sm"
                        : "bg-base-200 text-base-content rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-base-300 p-2 shrink-0 flex items-center gap-2">
          <input
            className="input input-sm input-bordered flex-1"
            placeholder={isInSession ? "Type a message…" : "Join a session first"}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
            disabled={!isInSession}
            maxLength={500}
          />
          <button
            className="btn btn-primary btn-sm btn-square"
            onClick={handleSendChat}
            disabled={!isInSession || !chatInput.trim()}
            title="Send"
          >
            <SendIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* ── AI MENTOR SIDE PANEL ── */}
      <AIMentor
        isOpen={aiMentorOpen}
        onClose={() => setAiMentorOpen(false)}
        code={code}
        language={selectedLanguage}
        problemTitle={currentProblem?.title}
      />

      {/* Host: configure the live session after creation */}
      {configOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfigOpen(false)}>
          <div
            className="bg-base-100 rounded-lg shadow-2xl w-full max-w-md p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center">
              <h3 className="font-bold text-base">Session settings</h3>
              <button className="btn btn-ghost btn-xs ml-auto" onClick={() => setConfigOpen(false)}>✕</button>
            </div>

            <label className="block">
              <span className="text-xs font-medium">Session name</span>
              <input
                type="text"
                className="input input-sm input-bordered w-full mt-1"
                value={configForm.name}
                onChange={(e) => setConfigForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium">Who can join?</span>
              <select
                className="select select-sm select-bordered w-full mt-1"
                value={configForm.accessModel}
                onChange={(e) => setConfigForm((f) => ({ ...f, accessModel: e.target.value }))}
              >
                <option value="anyone">Anyone (public)</option>
                <option value="link">Anyone with the link</option>
                <option value="invited">Invite only (waiting room)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium">Max participants</span>
              <input
                type="number"
                min={1}
                max={200}
                className="input input-sm input-bordered w-full mt-1"
                value={configForm.maxParticipants}
                onChange={(e) => setConfigForm((f) => ({ ...f, maxParticipants: Number(e.target.value) }))}
              />
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={configForm.locked}
                onChange={(e) => setConfigForm((f) => ({ ...f, locked: e.target.checked }))}
              />
              <span className="text-xs">Lock session — no new joiners</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn btn-sm btn-ghost" onClick={() => setConfigOpen(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={saveConfig}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher: watch one student's private editor + paint (live) */}
      {watchingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={closeWatch}>
          <div
            className="bg-base-100 rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300">
              <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm">
                Watching <strong>{watchingStudent.name}</strong> (live)
              </span>
              <button className="btn btn-ghost btn-xs ml-auto" onClick={closeWatch}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 flex-1 overflow-hidden">
              <div className="flex flex-col border border-base-300 rounded overflow-hidden">
                <div className="px-3 py-1.5 text-xs bg-base-200">Code</div>
                <pre className="m-0 p-3 flex-1 overflow-auto text-xs bg-[#0b1021] text-slate-200 font-mono whitespace-pre-wrap">
                  {watchingCode || "(empty)"}
                </pre>
              </div>
              <div className="flex flex-col border border-base-300 rounded overflow-hidden">
                <div className="px-3 py-1.5 text-xs bg-base-200">Paint (tldraw)</div>
                <div className="flex-1 relative">
                  {watchTldrawStore && <Tldraw store={watchTldrawStore} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProblemPage;