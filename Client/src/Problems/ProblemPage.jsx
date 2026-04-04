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
import SessionWhiteboard from "./SessionWhiteboard";

import toast from "react-hot-toast";
import confetti from "canvas-confetti";
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
  const [activeRightTab, setActiveRightTab] = useState("testcase"); // testcase | result | board
  const [showDiff, setShowDiff] = useState(false);
  const [originalCode, setOriginalCode] = useState("");
  const socketRef = useRef(null);
  const attemptedJoinFromLinkRef = useRef(null);

  // Realtime sessions (per-problem)
  const [displayName, setDisplayName] = useState("Guest");
  const [sessionName, setSessionName] = useState("");
  const [sessionMaxParticipants, setSessionMaxParticipants] = useState(10);
  const [sessionVisibility, setSessionVisibility] = useState("public");
  const [sessionPassword, setSessionPassword] = useState("");
  const [sessionReadOnlyUsers, setSessionReadOnlyUsers] = useState("");
  const [sessionEditableUsers, setSessionEditableUsers] = useState("");
  const [sessionJoinId, setSessionJoinId] = useState("");
  const [sessionJoinPassword, setSessionJoinPassword] = useState("");
  const [currentUserPermission, setCurrentUserPermission] = useState("editable");
  const [currentUserRole, setCurrentUserRole] = useState("viewer");
  const [availableSessions, setAvailableSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionParticipants, setSessionParticipants] = useState([]);
  const [sessionParticipantDetails, setSessionParticipantDetails] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [sessionSettings, setSessionSettings] = useState(null);
  const [countdownInfo, setCountdownInfo] = useState(null);
  const [sessionCodeByLanguage, setSessionCodeByLanguage] = useState({});
  const [sharedStrokes, setSharedStrokes] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [participantsSidebarOpen, setParticipantsSidebarOpen] = useState(false);
  const [participantHistory, setParticipantHistory] = useState([]);

  const [sessionAllowAnonymous, setSessionAllowAnonymous] = useState(true);
  const [sessionWhitelistUsers, setSessionWhitelistUsers] = useState("");
  const [sessionBlacklistUsers, setSessionBlacklistUsers] = useState("");
  const [sessionWaitingRoom, setSessionWaitingRoom] = useState(false);

  const [sessionAutoLockWhenFull, setSessionAutoLockWhenFull] = useState(true);
  const [sessionAllowOverflow, setSessionAllowOverflow] = useState(false);

  const [sessionDefaultRole, setSessionDefaultRole] = useState("viewer");

  const [sessionCollabMode, setSessionCollabMode] = useState("free");
  const [sessionTurnDurationSeconds, setSessionTurnDurationSeconds] = useState(60);
  const [sessionShowLiveCursors, setSessionShowLiveCursors] = useState(true);
  const [sessionShowSelections, setSessionShowSelections] = useState(true);
  const [sessionTypingIndicators, setSessionTypingIndicators] = useState(true);

  const [sessionEnableChat, setSessionEnableChat] = useState(true);
  const [sessionEnableReactions, setSessionEnableReactions] = useState(true);
  const [sessionEnableVoice, setSessionEnableVoice] = useState(false);
  const [sessionMessageModeration, setSessionMessageModeration] = useState(false);

  const [sessionStartTime, setSessionStartTime] = useState("");
  const [sessionEndTime, setSessionEndTime] = useState("");
  const [sessionMaxDurationMinutes, setSessionMaxDurationMinutes] = useState("");
  const [sessionAutoClose, setSessionAutoClose] = useState(false);
  const [sessionCountdownWarnings, setSessionCountdownWarnings] = useState("10,5,1");
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
  const canManageRoles = currentUserRole === "host" || currentUserRole === "co-host";
  const isTurnBased = sessionSettings?.collaboration?.mode === "turn-based";
  const currentTurnName = sessionSettings?.collaboration?.currentTurnName || "";
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

    socket.on("session:join:pending", ({ pendingApprovals: pending }) => {
      setPendingApprovals(pending || []);
    });

    socket.on("session:join:approved", ({ joined }) => {
      if (!joined) return;
      applyJoinedSession(joined);
      toast.success(`Joined: ${joined.name}`);
    });

    socket.on("session:join:denied", ({ message }) => {
      toast.error(message || "Join request was denied");
    });

    socket.on("session:participant:role:updated", ({ role, permission }) => {
      setCurrentUserRole(role || "viewer");
      setCurrentUserPermission(permission || "read-only");
    });

    socket.on("session:participant:muted", ({ muted }) => {
      toast(muted ? "You were muted" : "You were unmuted");
    });

    socket.on("session:kicked", ({ message }) => {
      toast.error(message || "You were removed from this session");
      clearActiveSessionState();
    });

    socket.on("session:countdown", ({ warningMinutes, remainingSeconds }) => {
      setCountdownInfo({ warningMinutes, remainingSeconds });
      toast(`Session ends in ${warningMinutes} min`);
    });

    socket.on("session:turn:changed", ({ currentTurnName: turnName }) => {
      setSessionSettings((prev) => ({
        ...(prev || {}),
        collaboration: {
          ...(prev?.collaboration || {}),
          currentTurnName: turnName,
        },
      }));
    });

    socket.on("session:closed", ({ reason }) => {
      toast.error(reason || "Session closed");
      clearActiveSessionState();
    });

    socket.on("session:permission:error", ({ message }) => {
      toast.error(message || "You do not have permission to edit this session");
    });

    socket.on("session:code:updated", ({ language, code }) => {
      if (!language) return;

      setSessionCodeByLanguage((prev) => ({
        ...prev,
        [language]: code || "",
      }));

      if (language === selectedLanguageRef.current) {
        setCode(code || "");
      }
    });

    socket.on("session:draw:added", ({ stroke }) => {
      if (!stroke) return;
      setSharedStrokes((prev) => [...prev, stroke]);
    });

    socket.on("session:draw:cleared", () => {
      setSharedStrokes([]);
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
    setCurrentUserRole("viewer");
    setSessionParticipants([]);
    setSessionParticipantDetails([]);
    setPendingApprovals([]);
    setSessionSettings(null);
    setCountdownInfo(null);
    setSessionCodeByLanguage({});
    setSharedStrokes([]);
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

  const parseUsers = (csvValue) =>
    String(csvValue || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  const clearActiveSessionState = () => {
    setActiveSession(null);
    setCurrentUserPermission("editable");
    setCurrentUserRole("viewer");
    setSessionParticipants([]);
    setSessionParticipantDetails([]);
    setPendingApprovals([]);
    setSessionSettings(null);
    setCountdownInfo(null);
    setSessionCodeByLanguage({});
    setSharedStrokes([]);
    setParticipantHistory([]);
    setParticipantsSidebarOpen(false);
    prevParticipantsRef.current = [];
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("session");
      return next;
    });
  };

  const applyJoinedSession = (joined) => {
    if (!joined) return;

    setActiveSession({ id: joined.id, name: joined.name });
    setCurrentUserPermission(joined.userPermission || "editable");
    setCurrentUserRole(joined.userRole || "viewer");
    setSessionCodeByLanguage(joined.codeByLanguage || {});
    setSharedStrokes(joined.drawStrokes || []);
    setSessionSettings(joined.settings || null);
    setPendingApprovals(joined.pendingApprovals || []);
    setSessionJoinId("");
    setSessionJoinPassword("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("session", joined.id);
      next.delete("joinPassword");
      return next;
    });

    const codeForLanguage = joined.codeByLanguage?.[selectedLanguage];
    if (codeForLanguage !== undefined) {
      setCode(codeForLanguage || "");
    }
  };

  const handleCreateSession = () => {
    if (!socketRef.current || !currentProblemId) return;

    const warningValues = parseUsers(sessionCountdownWarnings)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    socketRef.current.emit(
      "session:create",
      {
        problemId: currentProblemId,
        sessionName: sessionName || `${currentProblem?.title || "Problem"} Session`,
        hostName: displayName || "Host",
        language: selectedLanguage,
        starterCode: code,
        maxParticipants: Number(sessionMaxParticipants) || 10,
        visibility: sessionVisibility,
        password: sessionPassword,
        allowAnonymous: sessionAllowAnonymous,
        whitelist: parseUsers(sessionWhitelistUsers),
        blacklist: parseUsers(sessionBlacklistUsers),
        waitingRoom: sessionWaitingRoom,
        autoLockWhenFull: sessionAutoLockWhenFull,
        allowOverflow: sessionAllowOverflow,
        roles: {
          defaultRole: sessionDefaultRole,
          assignments: {
            ...parseUsers(sessionReadOnlyUsers).reduce((acc, name) => {
              acc[name.toLowerCase()] = "viewer";
              return acc;
            }, {}),
            ...parseUsers(sessionEditableUsers).reduce((acc, name) => {
              acc[name.toLowerCase()] = "editor";
              return acc;
            }, {}),
          },
        },
        collaboration: {
          mode: sessionCollabMode,
          turnDurationSeconds: Number(sessionTurnDurationSeconds) || 60,
          showLiveCursors: sessionShowLiveCursors,
          showSelections: sessionShowSelections,
          typingIndicators: sessionTypingIndicators,
        },
        communication: {
          enableChat: sessionEnableChat,
          enableReactions: sessionEnableReactions,
          enableVoice: sessionEnableVoice,
          messageModeration: sessionMessageModeration,
        },
        timing: {
          startTime: sessionStartTime || null,
          endTime: sessionEndTime || null,
          maxDurationMinutes: Number(sessionMaxDurationMinutes) || null,
          autoClose: sessionAutoClose,
          countdownWarnings: warningValues.length > 0 ? warningValues : [10, 5, 1],
        },
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Could not create session");
          return;
        }

        setSessionName("");
        setSessionPassword("");
        setSessionWhitelistUsers("");
        setSessionBlacklistUsers("");
        setSessionJoinId(response.sessionId || "");
        setCreateModalOpen(false);
        toast.success(`Session created (ID: ${response.sessionId})`);
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
          if (response?.waitingApproval) {
            toast(response.message || "Waiting for host approval");
            return;
          }
          toast.error(response?.message || "Could not join session");
          return;
        }

        const joined = response.session;
        applyJoinedSession({
          ...joined,
          userPermission: response.userPermission,
          userRole: response.userRole,
          pendingApprovals: response.pendingApprovals || [],
        });

        toast.success(`Joined: ${joined.name}`);
      }
    );
  };

  const handleLeaveSession = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("session:leave");
    clearActiveSessionState();
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

  const handleAddStroke = (stroke) => {
    setSharedStrokes((prev) => [...prev, stroke]);

    if (!isInSession || !socketRef.current) return;
    socketRef.current.emit("session:draw:add", {
      problemId: currentProblemId,
      sessionId: activeSession.id,
      stroke,
    });
  };

  const handleClearBoard = () => {
    setSharedStrokes([]);

    if (!isInSession || !socketRef.current) return;
    socketRef.current.emit("session:draw:clear", {
      problemId: currentProblemId,
      sessionId: activeSession.id,
    });
  };

  const handleApprovalAction = (requestId, action) => {
    if (!socketRef.current || !activeSession?.id || !canManageRoles) return;

    socketRef.current.emit(
      "session:join:approval",
      {
        problemId: currentProblemId,
        sessionId: activeSession.id,
        requestId,
        action,
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Could not process join request");
        }
      }
    );
  };

  const handleRoleChange = (name, role) => {
    if (!socketRef.current || !activeSession?.id || !canManageRoles || !name) return;

    socketRef.current.emit(
      "session:participant:role",
      {
        problemId: currentProblemId,
        sessionId: activeSession.id,
        targetName: name,
        role,
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Could not update role");
          return;
        }
        toast.success(`Updated ${name} to ${role}`);
      }
    );
  };

  const handleKickParticipant = (name) => {
    if (!socketRef.current || !activeSession?.id || !canManageRoles || !name) return;

    socketRef.current.emit(
      "session:participant:kick",
      {
        problemId: currentProblemId,
        sessionId: activeSession.id,
        targetName: name,
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Could not remove participant");
          return;
        }
        toast.success(`${name} removed from session`);
      }
    );
  };

  const handleToggleMuteParticipant = (participant) => {
    if (!socketRef.current || !activeSession?.id || !canManageRoles || !participant?.name) return;

    socketRef.current.emit(
      "session:participant:mute",
      {
        problemId: currentProblemId,
        sessionId: activeSession.id,
        targetName: participant.name,
        muted: !participant.muted,
      },
      (response) => {
        if (!response?.ok) {
          toast.error(response?.message || "Could not update mute state");
        }
      }
    );
  };

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

      if (result.success) {
        const expected = currentProblem.expectedOutput?.[selectedLanguage];
        const actual = result.output?.trim();
        if (expected && actual === expected.trim()) {
          toast.success("All test cases passed! 🎉");
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
          });
        } else {
          toast.error("Output doesn't match expected result");
        }
      } else {
        toast.error("Submission failed");
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
                <span className="text-base-content/60 capitalize">{currentUserRole}</span>
                <span className="text-base-content/40">·</span>
                <span className="text-base-content/50 capitalize">{currentUserPermission}</span>
                {isTurnBased && currentTurnName && (
                  <>
                    <span className="text-base-content/40">·</span>
                    <span className="text-warning">Turn: {currentTurnName}</span>
                  </>
                )}
                {countdownInfo?.remainingSeconds > 0 && (
                  <>
                    <span className="text-base-content/40">·</span>
                    <span className="text-error">
                      {Math.ceil(countdownInfo.remainingSeconds / 60)}m left
                    </span>
                  </>
                )}
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
              <button
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "board"
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/50 hover:text-base-content/80"
                }`}
                onClick={() => setActiveRightTab("board")}
              >
                Board
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
              ) : activeRightTab === "result" ? (
                <OutputPanel output={output} />
              ) : (
                <SessionWhiteboard
                  enabled={isInSession}
                  strokes={sharedStrokes}
                  onAddStroke={handleAddStroke}
                  onClear={handleClearBoard}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ── CREATE SESSION MODAL ── */}
      {createModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box w-full max-w-lg">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setCreateModalOpen(false)}
            >
              <XIcon className="size-4" />
            </button>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <UsersIcon className="size-5 text-primary" />
              Create Live Session
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
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
                  <span className="label-text text-xs font-medium">Max Participants</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input input-sm input-bordered w-full"
                  value={sessionMaxParticipants}
                  onChange={(e) => setSessionMaxParticipants(e.target.value)}
                />
              </div>

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

              <div className="col-span-2">
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">
                    Password
                    <span className="text-base-content/40 font-normal ml-1">(optional)</span>
                  </span>
                </label>
                <input
                  className="input input-sm input-bordered w-full"
                  value={sessionPassword}
                  onChange={(e) => setSessionPassword(e.target.value)}
                  placeholder="Leave empty for no password"
                  type="password"
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">
                    Read-only users
                    <span className="text-base-content/40 font-normal ml-1">(comma-separated)</span>
                  </span>
                </label>
                <input
                  className="input input-sm input-bordered w-full"
                  value={sessionReadOnlyUsers}
                  onChange={(e) => setSessionReadOnlyUsers(e.target.value)}
                  placeholder="ali, sara"
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">
                    Editable users
                    <span className="text-base-content/40 font-normal ml-1">(comma-separated)</span>
                  </span>
                </label>
                <input
                  className="input input-sm input-bordered w-full"
                  value={sessionEditableUsers}
                  onChange={(e) => setSessionEditableUsers(e.target.value)}
                  placeholder="ali, sara"
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Allow Anonymous</span>
                </label>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={sessionAllowAnonymous}
                  onChange={(e) => setSessionAllowAnonymous(e.target.checked)}
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Waiting Room</span>
                </label>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={sessionWaitingRoom}
                  onChange={(e) => setSessionWaitingRoom(e.target.checked)}
                />
              </div>

              <div className="col-span-2">
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Whitelist users</span>
                </label>
                <input
                  className="input input-sm input-bordered w-full"
                  value={sessionWhitelistUsers}
                  onChange={(e) => setSessionWhitelistUsers(e.target.value)}
                  placeholder="Only these users can join (optional)"
                />
              </div>

              <div className="col-span-2">
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Blacklist users</span>
                </label>
                <input
                  className="input input-sm input-bordered w-full"
                  value={sessionBlacklistUsers}
                  onChange={(e) => setSessionBlacklistUsers(e.target.value)}
                  placeholder="Banned users (optional)"
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Auto-lock when full</span>
                </label>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={sessionAutoLockWhenFull}
                  onChange={(e) => setSessionAutoLockWhenFull(e.target.checked)}
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Allow Overflow</span>
                </label>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={sessionAllowOverflow}
                  onChange={(e) => setSessionAllowOverflow(e.target.checked)}
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Default Role</span>
                </label>
                <select
                  className="select select-sm select-bordered w-full"
                  value={sessionDefaultRole}
                  onChange={(e) => setSessionDefaultRole(e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="co-host">Co-host</option>
                </select>
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Collaboration Mode</span>
                </label>
                <select
                  className="select select-sm select-bordered w-full"
                  value={sessionCollabMode}
                  onChange={(e) => setSessionCollabMode(e.target.value)}
                >
                  <option value="free">Free</option>
                  <option value="controlled">Controlled</option>
                  <option value="turn-based">Turn-based</option>
                </select>
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Turn Duration (sec)</span>
                </label>
                <input
                  type="number"
                  min={10}
                  className="input input-sm input-bordered w-full"
                  value={sessionTurnDurationSeconds}
                  onChange={(e) => setSessionTurnDurationSeconds(e.target.value)}
                  disabled={sessionCollabMode !== "turn-based"}
                />
              </div>

              <div className="col-span-2 grid grid-cols-3 gap-2">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={sessionShowLiveCursors}
                    onChange={(e) => setSessionShowLiveCursors(e.target.checked)}
                  />
                  <span className="label-text text-xs">Live cursors</span>
                </label>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={sessionShowSelections}
                    onChange={(e) => setSessionShowSelections(e.target.checked)}
                  />
                  <span className="label-text text-xs">Selections</span>
                </label>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={sessionTypingIndicators}
                    onChange={(e) => setSessionTypingIndicators(e.target.checked)}
                  />
                  <span className="label-text text-xs">Typing indicators</span>
                </label>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-2">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={sessionEnableChat}
                    onChange={(e) => setSessionEnableChat(e.target.checked)}
                  />
                  <span className="label-text text-xs">Enable chat</span>
                </label>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={sessionEnableReactions}
                    onChange={(e) => setSessionEnableReactions(e.target.checked)}
                  />
                  <span className="label-text text-xs">Enable reactions</span>
                </label>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={sessionEnableVoice}
                    onChange={(e) => setSessionEnableVoice(e.target.checked)}
                  />
                  <span className="label-text text-xs">Enable voice</span>
                </label>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={sessionMessageModeration}
                    onChange={(e) => setSessionMessageModeration(e.target.checked)}
                  />
                  <span className="label-text text-xs">Message moderation</span>
                </label>
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Start Time</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-sm input-bordered w-full"
                  value={sessionStartTime}
                  onChange={(e) => setSessionStartTime(e.target.value)}
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">End Time</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-sm input-bordered w-full"
                  value={sessionEndTime}
                  onChange={(e) => setSessionEndTime(e.target.value)}
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Max Duration (min)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  className="input input-sm input-bordered w-full"
                  value={sessionMaxDurationMinutes}
                  onChange={(e) => setSessionMaxDurationMinutes(e.target.value)}
                  placeholder="e.g. 90"
                />
              </div>

              <div>
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Auto-close</span>
                </label>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={sessionAutoClose}
                  onChange={(e) => setSessionAutoClose(e.target.checked)}
                />
              </div>

              <div className="col-span-2">
                <label className="label pb-1">
                  <span className="label-text text-xs font-medium">Countdown Warnings (minutes)</span>
                </label>
                <input
                  className="input input-sm input-bordered w-full"
                  value={sessionCountdownWarnings}
                  onChange={(e) => setSessionCountdownWarnings(e.target.value)}
                  placeholder="10,5,1"
                />
              </div>
            </div>

            <div className="modal-action mt-5">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm gap-1.5"
                onClick={handleCreateSession}
              >
                <PlusIcon className="size-3.5" />
                Create Session
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)} />
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
              {currentUserPermission}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* current participants */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-2">
              In session now · {sessionParticipants.length}
            </p>
            {sessionParticipants.length === 0 ? (
              <p className="text-xs text-base-content/40 italic">No one here yet</p>
            ) : (
              <div className="space-y-2">
                {(sessionParticipantDetails.length > 0
                  ? sessionParticipantDetails
                  : sessionParticipants.map((name) => ({ name, role: "viewer", muted: false }))
                ).map((participant, i) => (
                  <div key={`${participant.name}-${i}`} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {participant.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{participant.name}</span>
                      <span className="text-[10px] text-base-content/50 capitalize">
                        {participant.role || "viewer"}
                        {participant.muted ? " · muted" : ""}
                      </span>
                    </div>
                    {canManageRoles && participant.name !== displayName && (
                      <select
                        className="select select-xs select-bordered w-20"
                        value={selectedRoles[participant.name] || participant.role || "viewer"}
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          setSelectedRoles((prev) => ({
                            ...prev,
                            [participant.name]: nextRole,
                          }));
                          handleRoleChange(participant.name, nextRole);
                        }}
                      >
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                        <option value="co-host">co-host</option>
                      </select>
                    )}
                    {canManageRoles && participant.name !== displayName && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleToggleMuteParticipant(participant)}
                        title={participant.muted ? "Unmute" : "Mute"}
                      >
                        {participant.muted ? "Unmute" : "Mute"}
                      </button>
                    )}
                    {canManageRoles && participant.name !== displayName && (
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleKickParticipant(participant.name)}
                        title="Kick participant"
                      >
                        Kick
                      </button>
                    )}
                    <span
                      className="w-2 h-2 rounded-full bg-success shrink-0"
                      title="Online"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManageRoles && pendingApprovals.length > 0 && (
            <div className="px-4 py-3 border-t border-base-300">
              <p className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-2">
                Waiting Room · {pendingApprovals.length}
              </p>
              <div className="space-y-2">
                {pendingApprovals.map((request) => (
                  <div key={request.requestId} className="flex items-center gap-2">
                    <span className="text-xs truncate flex-1">{request.userName}</span>
                    <button
                      className="btn btn-xs btn-success"
                      onClick={() => handleApprovalAction(request.requestId, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-xs btn-error"
                      onClick={() => handleApprovalAction(request.requestId, "deny")}
                    >
                      Deny
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* activity history */}
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