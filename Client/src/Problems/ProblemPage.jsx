import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";

import { PROBLEMS } from "./problems";
import ProblemDescription from "./ProblemDescription";
import OutputPanel from "../Codeeditor/OutputPanel";
import CodeEditorPanel from "../Codeeditor/Codeeditor";
import { executeCode } from "../Codeeditor/Api";
import { StreamVideoProvider } from "../ScreenShare/StreamVideoProvider";
import { ScreenRecorder } from "../ScreenShare/ScreenRecorder";

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
  UsersIcon,
  PlusIcon,
  LogOutIcon,
  LockIcon,
  XIcon,
  Link2Icon,
} from "lucide-react";

import "./ProblemPage.css";

function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultProblemId = Object.keys(PROBLEMS)[0] || "";
  const [currentProblemId, setCurrentProblemId] = useState(id || defaultProblemId);
  const [apiProblem, setApiProblem] = useState(null);
  const [isProblemLoading, setIsProblemLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false); //correcting state
  const [activeRightTab, setActiveRightTab] = useState("testcase"); // testcase | result
  const [showDiff, setShowDiff] = useState(false);
  const [originalCode, setOriginalCode] = useState("");
  const socketRef = useRef(null);
  const attemptedJoinFromLinkRef = useRef(null);

  // Realtime sessions (per-problem)
  const [displayName, setDisplayName] = useState("Guest");
  // Create modal – basic
  const [sessionName, setSessionName] = useState("");
  // Create modal – B. Access & Security
  const [sessionVisibility, setSessionVisibility] = useState("public");
  const [sessionPassword, setSessionPassword] = useState("");
  const [sessionAllowAnonymous, setSessionAllowAnonymous] = useState(true);
  const [sessionWhitelist, setSessionWhitelist] = useState("");
  const [sessionBlacklist, setSessionBlacklist] = useState("");
  const [sessionRequireJoinApproval, setSessionRequireJoinApproval] = useState(false);
  // Create modal – C. Limits
  const [sessionMaxParticipants, setSessionMaxParticipants] = useState(10);
  const [sessionAutoLock, setSessionAutoLock] = useState(false);
  const [sessionAllowOverflow, setSessionAllowOverflow] = useState(false);
  // Create modal – D. Roles
  const [sessionDefaultRole, setSessionDefaultRole] = useState("editor");
  // Create modal – E. Collaboration
  const [sessionCollabMode, setSessionCollabMode] = useState("free");
  const [sessionTurnDuration, setSessionTurnDuration] = useState(30);
  const [sessionShowCursors, setSessionShowCursors] = useState(true);
  const [sessionShowSelections, setSessionShowSelections] = useState(true);
  const [sessionTypingIndicators, setSessionTypingIndicators] = useState(true);
  // Create modal tab
  const [createModalTab, setCreateModalTab] = useState("basic");

  const [sessionJoinId, setSessionJoinId] = useState("");
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
  const selectedLanguageRef = useRef("javascript");
  const prevParticipantsRef = useRef([]);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Resizable state
  const [leftWidth, setLeftWidth] = useState(40);
  const [editorHeight, setEditorHeight] = useState(60);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  const containerRef = useRef(null);
  const rightPanelRef = useRef(null);

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

  // Timer effect
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    const savedName = localStorage.getItem("collabDisplayName");
    if (savedName) {
      setDisplayName(savedName);
      return;
    }

    const randomSuffix = Math.floor(Math.random() * 1000);
    setDisplayName(`Guest-${randomSuffix}`);
  }, []);

  useEffect(() => {
    localStorage.setItem("collabDisplayName", displayName);
  }, [displayName]);

  useEffect(() => {
    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });

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

    socket.on("session:code:updated", ({ language, code }) => {
      if (!language) return;
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
      setActiveSession({ id: joined.id, name: joined.name });
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

    return () => {
      socket.emit("session:leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !currentProblemId) return;

    socketRef.current.emit("session:leave");

    // Keep lobby list synced to current problem only.
    socketRef.current.emit("session:list:subscribe", {
      problemId: currentProblemId,
    });

    setActiveSession(null);
    setCurrentUserPermission("editable");
    setSessionParticipants([]);
    setSessionCodeByLanguage({});
    setTldrawInitialStore({});
    setParticipantHistory([]);
    prevParticipantsRef.current = [];
  }, [currentProblemId]);

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
    if (!socketRef.current || !currentProblemId) return;

    socketRef.current.emit(
      "session:create",
      {
        problemId:   currentProblemId,
        sessionName: sessionName || `${currentProblem?.title || "Problem"} Session`,
        hostName:    displayName || "Host",
        language:    selectedLanguage,
        starterCode: code,
        // B. Access & Security
        visibility:          sessionVisibility,
        password:            sessionPassword,
        allowAnonymous:      sessionAllowAnonymous,
        whitelist:           sessionWhitelist,
        blacklist:           sessionBlacklist,
        requireJoinApproval: sessionRequireJoinApproval,
        // C. Limits
        maxParticipants: Number(sessionMaxParticipants) || 10,
        autoLock:        sessionAutoLock,
        allowOverflow:   sessionAllowOverflow,
        // D. Roles
        defaultRole: sessionDefaultRole,
        // E. Collaboration
        collab: {
          mode:             sessionCollabMode,
          turnDuration:     Number(sessionTurnDuration) || 30,
          showLiveCursors:  sessionShowCursors,
          showSelections:   sessionShowSelections,
          typingIndicators: sessionTypingIndicators,
        },
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Could not create session");
          return;
        }

        // Server auto-joins creator as host — hydrate session state
        const joined = response.session;
        setActiveSession({ id: joined.id, name: joined.name });
        setCurrentUserRole(response.userRole || "host");
        setCurrentUserPermission(response.userPermission || "editable");
        setSessionCodeByLanguage(joined.codeByLanguage || {});
        setTldrawInitialStore(joined.tldrawStore || {});

        // Reset form
        setSessionName("");
        setSessionPassword("");
        setSessionWhitelist("");
        setSessionBlacklist("");
        setCreateModalOpen(false);
        setCreateModalTab("basic");

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

        // Placed in waiting room
        if (response.waiting) {
          setSessionJoinId("");
          setSessionJoinPassword("");
          return;
        }

        const joined = response.session;
        setActiveSession({ id: joined.id, name: joined.name });
        setCurrentUserRole(response.userRole || "editor");
        setCurrentUserPermission(response.userPermission || "editable");
        setSessionCodeByLanguage(joined.codeByLanguage || {});
        setTldrawInitialStore(joined.tldrawStore || {});
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

    const sessionExists = availableSessions.some((s) => s.id === requestedSessionId);
    if (!sessionExists) return;

    attemptedJoinFromLinkRef.current = requestedSessionId;
    handleJoinSession(requestedSessionId, requestedJoinPassword);
  }, [requestedSessionId, requestedJoinPassword, availableSessions]);

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
        const normalize = (s) => s?.trim().replace(/\r\n/g, "\n").replace(/ +\n/g, "\n") ?? "";
        const actual = normalize(result.output);
        if (!expected || actual === normalize(expected)) {
          isCorrect = true;
          toast.success("All test cases passed! 🎉");
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } else {
          toast.error("Output doesn't match expected result");
        }
      } else {
        toast.error("Submission failed");
      }

      const storedUser = (() => { try { return JSON.parse(Cookies.get("user") || "{}"); } catch { return {}; } })();
      if (storedUser?.id) {
        fetch("http://localhost:5000/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      const problemContext = currentProblem
        ? `${currentProblem.title}: ${currentProblem.description?.text || ""}`
        : "General coding problem";

      const response = await fetch("http://localhost:5000/api/ai/ai/correct-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          problemContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to correct code: ${response.status}`);
      }

      const correction = await response.json();

      if (correction.changes && correction.changes.length > 0) {
        setOriginalCode(code);
        setCode(correction.correctedCode);
        setShowDiff(true);
        toast.success(correction.summary || "Code corrected successfully!");
      } else {
        toast.success(correction.summary || "No issues found - code looks good!");
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
    <StreamVideoProvider
      userId={currentProblemId}
      userName={`User-${currentProblemId}`}
    >
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

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevProblem}
              disabled={currentIndex <= 0}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <ChevronLeftIcon className="size-4" />
            </button>

            <select
              className="select select-xs select-bordered font-medium max-w-[180px]"
              value={currentProblemId}
              onChange={(e) => handleProblemChange(e.target.value)}
            >
              {problemIds.map((pid) => (
                <option key={pid} value={pid}>
                  {allProblemsById[pid]?.title || pid}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextProblem}
              disabled={currentIndex >= problemIds.length - 1}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
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

          <div className="divider divider-horizontal mx-1 h-6" />

          {/* Screen Recorder */}
          <ScreenRecorder
            problemId={currentProblemId}
            problemTitle={currentProblem?.title}
          />
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
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary select-none">
              {displayName[0]?.toUpperCase()}
            </div>
            <input
              className="input input-xs input-bordered w-24"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

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
                className="btn btn-xs btn-ghost gap-1 text-base-content/70 hover:text-primary"
                onClick={() => setParticipantsSidebarOpen((o) => !o)}
                title="View participants"
              >
                <UsersIcon className="size-3.5" />
                <span>{sessionParticipants.length}</span>
              </button>

              <button
                className="btn btn-xs btn-ghost gap-1 text-base-content/50"
                onClick={() => handleCopySessionLink(activeSession.id)}
                title="Copy invite link"
              >
                <Link2Icon className="size-3.5" />
                Invite
              </button>

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
              <button
                className="btn btn-xs btn-primary gap-1 shrink-0"
                onClick={() => setCreateModalOpen(true)}
              >
                <PlusIcon className="size-3" />
                New Session
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <input
                  className="input input-xs input-bordered w-36"
                  value={sessionJoinId}
                  onChange={(e) => setSessionJoinId(e.target.value)}
                  placeholder="Session ID"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleJoinSession(sessionJoinId, sessionJoinPassword)
                  }
                />
                <input
                  className="input input-xs input-bordered w-24"
                  value={sessionJoinPassword}
                  onChange={(e) => setSessionJoinPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleJoinSession(sessionJoinId, sessionJoinPassword)
                  }
                />
                <button
                  className="btn btn-xs btn-secondary shrink-0"
                  onClick={() => handleJoinSession(sessionJoinId, sessionJoinPassword)}
                >
                  Join
                </button>
              </div>

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
              onClick={() => { setCreateModalOpen(false); setCreateModalTab("basic"); }}
            >
              <XIcon className="size-4" />
            </button>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <UsersIcon className="size-5 text-primary" />
              Create Live Session
            </h3>

            {/* Tabs */}
            <div className="tabs tabs-boxed tabs-sm mb-4 flex-wrap gap-1">
              {[
                { key: "basic",  label: "Basic" },
                { key: "access", label: "Access" },
                { key: "limits", label: "Limits" },
                { key: "roles",  label: "Roles" },
                { key: "collab", label: "Collab" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`tab tab-sm ${createModalTab === key ? "tab-active" : ""}`}
                  onClick={() => setCreateModalTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── BASIC ── */}
            {createModalTab === "basic" && (
              <div className="space-y-3">
                <div>
                  <label className="label pb-1">
                    <span className="label-text text-xs font-medium">Session Name</span>
                  </label>
                  <input
                    className="input input-sm input-bordered w-full"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder={`${currentProblem?.title || "Problem"} Session`}
                  />
                </div>
                <div>
                  <label className="label pb-1">
                    <span className="label-text text-xs font-medium">Your Display Name</span>
                  </label>
                  <input
                    className="input input-sm input-bordered w-full"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Host"
                  />
                </div>
              </div>
            )}

            {/* ── ACCESS & SECURITY ── */}
            {createModalTab === "access" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label pb-1">
                      <span className="label-text text-xs font-medium">Visibility</span>
                    </label>
                    <select
                      className="select select-sm select-bordered w-full"
                      value={sessionVisibility}
                      onChange={(e) => setSessionVisibility(e.target.value)}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="unlisted">Unlisted</option>
                    </select>
                  </div>
                  <div>
                    <label className="label pb-1">
                      <span className="label-text text-xs font-medium">
                        Password <span className="text-base-content/40 font-normal">(optional)</span>
                      </span>
                    </label>
                    <input
                      type="password"
                      className="input input-sm input-bordered w-full"
                      value={sessionPassword}
                      onChange={(e) => setSessionPassword(e.target.value)}
                      placeholder="Leave empty for none"
                    />
                  </div>
                </div>

                <div>
                  <label className="label pb-1">
                    <span className="label-text text-xs font-medium">
                      Whitelist <span className="text-base-content/40 font-normal">(comma-separated, empty = anyone)</span>
                    </span>
                  </label>
                  <input
                    className="input input-sm input-bordered w-full"
                    value={sessionWhitelist}
                    onChange={(e) => setSessionWhitelist(e.target.value)}
                    placeholder="alice, bob"
                  />
                </div>

                <div>
                  <label className="label pb-1">
                    <span className="label-text text-xs font-medium">
                      Blacklist <span className="text-base-content/40 font-normal">(comma-separated)</span>
                    </span>
                  </label>
                  <input
                    className="input input-sm input-bordered w-full"
                    value={sessionBlacklist}
                    onChange={(e) => setSessionBlacklist(e.target.value)}
                    placeholder="baduser"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={sessionAllowAnonymous}
                      onChange={(e) => setSessionAllowAnonymous(e.target.checked)}
                    />
                    <span className="text-xs">Allow anonymous users (Guest-…)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={sessionRequireJoinApproval}
                      onChange={(e) => setSessionRequireJoinApproval(e.target.checked)}
                    />
                    <span className="text-xs">Waiting room — require host approval to join</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── LIMITS ── */}
            {createModalTab === "limits" && (
              <div className="space-y-3">
                <div>
                  <label className="label pb-1">
                    <span className="label-text text-xs font-medium">Max Participants</span>
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
                <div className="flex flex-col gap-2 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={sessionAutoLock}
                      onChange={(e) => setSessionAutoLock(e.target.checked)}
                    />
                    <span className="text-xs">Auto-lock session when full</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={sessionAllowOverflow}
                      onChange={(e) => setSessionAllowOverflow(e.target.checked)}
                    />
                    <span className="text-xs">Allow overflow (ignore limit after lock)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── ROLES ── */}
            {createModalTab === "roles" && (
              <div className="space-y-3">
                <div>
                  <label className="label pb-1">
                    <span className="label-text text-xs font-medium">Default role for new joiners</span>
                  </label>
                  <select
                    className="select select-sm select-bordered w-full"
                    value={sessionDefaultRole}
                    onChange={(e) => setSessionDefaultRole(e.target.value)}
                  >
                    <option value="editor">Editor — can edit &amp; comment</option>
                    <option value="viewer">Viewer — read-only</option>
                  </select>
                </div>
                <div className="bg-base-200 rounded-lg p-3 text-xs space-y-1.5 text-base-content/70">
                  <p className="font-semibold text-base-content mb-1">Role permissions summary</p>
                  <p><span className="badge badge-xs badge-primary mr-1">host</span>Full control — edit, kick, mute, change permissions</p>
                  <p><span className="badge badge-xs badge-secondary mr-1">co-host</span>Same as host except cannot be demoted</p>
                  <p><span className="badge badge-xs badge-accent mr-1">editor</span>Edit &amp; comment only</p>
                  <p><span className="badge badge-xs badge-ghost mr-1">viewer</span>Read &amp; comment only</p>
                </div>
              </div>
            )}

            {/* ── COLLABORATION ── */}
            {createModalTab === "collab" && (
              <div className="space-y-3">
                <div>
                  <label className="label pb-1">
                    <span className="label-text text-xs font-medium">Collaboration Mode</span>
                  </label>
                  <select
                    className="select select-sm select-bordered w-full"
                    value={sessionCollabMode}
                    onChange={(e) => setSessionCollabMode(e.target.value)}
                  >
                    <option value="free">Free — anyone with edit role can type</option>
                    <option value="controlled">Controlled — only host/co-host can edit</option>
                    <option value="turn-based">Turn-based — one person edits at a time</option>
                  </select>
                </div>

                {sessionCollabMode === "turn-based" && (
                  <div>
                    <label className="label pb-1">
                      <span className="label-text text-xs font-medium">Turn Duration (seconds)</span>
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      className="input input-sm input-bordered w-full"
                      value={sessionTurnDuration}
                      onChange={(e) => setSessionTurnDuration(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={sessionShowCursors}
                      onChange={(e) => setSessionShowCursors(e.target.checked)}
                    />
                    <span className="text-xs">Show live cursors</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={sessionShowSelections}
                      onChange={(e) => setSessionShowSelections(e.target.checked)}
                    />
                    <span className="text-xs">Show selections</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={sessionTypingIndicators}
                      onChange={(e) => setSessionTypingIndicators(e.target.checked)}
                    />
                    <span className="text-xs">Typing indicators</span>
                  </label>
                </div>
              </div>
            )}

            <div className="modal-action mt-5">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setCreateModalOpen(false); setCreateModalTab("basic"); }}
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
          </div>
          <div className="modal-backdrop" onClick={() => { setCreateModalOpen(false); setCreateModalTab("basic"); }} />
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
            <span className="ml-auto text-base-content/40 capitalize shrink-0">
              {currentUserRole}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">

          {/* ── Waiting room (visible to host/co-host) ── */}
          {waitingRoomUsers.length > 0 && (currentUserRole === "host" || currentUserRole === "co-host") && (
            <div className="px-4 py-3 border-b border-warning/30 bg-warning/5">
              <p className="text-[10px] font-semibold text-warning uppercase tracking-wider mb-2">
                Waiting Room · {waitingRoomUsers.length}
              </p>
              <div className="space-y-2">
                {waitingRoomUsers.map((w) => (
                  <div key={w.socketId} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center text-xs font-bold text-warning shrink-0">
                      {w.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs truncate flex-1">{w.name}</span>
                    <button
                      className="btn btn-success btn-xs px-2"
                      onClick={() => socketRef.current?.emit("session:waiting:approve", { socketId: w.socketId })}
                    >
                      ✓
                    </button>
                    <button
                      className="btn btn-error btn-xs px-2"
                      onClick={() => socketRef.current?.emit("session:waiting:reject", { socketId: w.socketId })}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Waiting room notice (for the waiting user) ── */}
          {isInWaitingRoom && (
            <div className="px-4 py-3 bg-warning/10 border-b border-warning/20 text-xs text-warning flex items-center gap-2">
              <span className="animate-spin text-base">⏳</span>
              Waiting for host approval…
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
    </StreamVideoProvider>
  );
}

export default ProblemPage;