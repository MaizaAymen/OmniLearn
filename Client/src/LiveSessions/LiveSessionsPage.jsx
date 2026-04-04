import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import {
  UsersIcon,
  LockIcon,
  UnlockIcon,
  ZapIcon,
  SearchIcon,
  Link2Icon,
  XIcon,
  RadioIcon,
  TrendingUpIcon,
} from "lucide-react";

function LiveSessionsPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("Guest");
  const [sessions, setSessions] = useState([]);
  const [joinSessionId, setJoinSessionId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [passwordModal, setPasswordModal] = useState(null); // session object
  const [passwordInput, setPasswordInput] = useState("");

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

    socket.emit("session:global:list:subscribe");

    socket.on("session:global:list", ({ sessions: nextSessions }) => {
      setSessions(nextSessions || []);
    });

    return () => socket.disconnect();
  }, []);

  const sessionById = useMemo(() => {
    const map = new Map();
    sessions.forEach((session) => map.set(session.id, session));
    return map;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q) ||
        s.hostName?.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  const totalParticipants = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.participantCount || 0), 0),
    [sessions]
  );

  const goToProblemSession = (session, password = "") => {
    if (!session?.problemId || !session?.id) {
      toast.error("Invalid session data");
      return;
    }
    const params = new URLSearchParams();
    params.set("session", session.id);
    if (password) params.set("joinPassword", password);
    navigate(`/problems/${session.problemId}?${params.toString()}`);
  };

  const handleJoinById = () => {
    const target = sessionById.get(joinSessionId.trim());
    if (!target) {
      toast.error("Session ID not found in active sessions");
      return;
    }
    if (target.visibility === "private" && !joinPassword) {
      toast.error("Password required for private session");
      return;
    }
    goToProblemSession(target, joinPassword);
  };

  const handleJoinCard = (session) => {
    if (session.requiresPassword) {
      setPasswordModal(session);
      setPasswordInput("");
    } else {
      goToProblemSession(session);
    }
  };

  const handlePasswordModalJoin = () => {
    if (!passwordModal) return;
    goToProblemSession(passwordModal, passwordInput);
    setPasswordModal(null);
    setPasswordInput("");
  };

  return (
    <div className="min-h-screen bg-base-200 p-6 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RadioIcon className="size-6 text-primary animate-pulse" />
            Live Sessions
          </h1>
          <p className="text-sm text-base-content/60 mt-0.5">
            Join a real-time coding session or find one to collaborate on.
          </p>
        </div>

        {/* display name */}
        <div className="flex items-center gap-2">
          <div className="avatar placeholder">
            <div className="bg-primary/20 text-primary rounded-full w-8 h-8 text-xs font-bold flex items-center justify-center">
              {displayName[0]?.toUpperCase()}
            </div>
          </div>
          <input
            className="input input-sm input-bordered w-36"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
          />
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-300 py-3 px-4">
          <div className="stat-title text-xs">Active Sessions</div>
          <div className="stat-value text-2xl text-primary">{sessions.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-300 py-3 px-4">
          <div className="stat-title text-xs">Total Participants</div>
          <div className="stat-value text-2xl text-secondary">{totalParticipants}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-300 py-3 px-4 col-span-2 sm:col-span-1">
          <div className="stat-title text-xs">Public Sessions</div>
          <div className="stat-value text-2xl text-success">
            {sessions.filter((s) => s.visibility === "public").length}
          </div>
        </div>
      </div>

      {/* ── JOIN BY ID ── */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body py-4 gap-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Link2Icon className="size-4 text-primary" />
            Join by Session ID
          </h2>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="input input-sm input-bordered flex-1 min-w-[160px]"
              value={joinSessionId}
              onChange={(e) => setJoinSessionId(e.target.value)}
              placeholder="Session ID (e.g. S-AB12CD)"
              onKeyDown={(e) => e.key === "Enter" && handleJoinById()}
            />
            <input
              className="input input-sm input-bordered w-40"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="Password (if required)"
              type="password"
              onKeyDown={(e) => e.key === "Enter" && handleJoinById()}
            />
            <button
              className="btn btn-sm btn-primary gap-1.5"
              onClick={handleJoinById}
            >
              <ZapIcon className="size-3.5" />
              Join
            </button>
          </div>
        </div>
      </div>

      {/* ── SESSION CARDS ── */}
      <div>
        {/* search bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              className="input input-sm input-bordered w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
            />
          </div>
          <span className="text-xs text-base-content/50">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="card bg-base-100 border border-base-300 border-dashed">
            <div className="card-body items-center text-center py-12 gap-3">
              <RadioIcon className="size-10 text-base-content/20" />
              <p className="font-semibold text-base-content/50">No active sessions</p>
              <p className="text-xs text-base-content/40">
                {searchQuery
                  ? "Try a different search"
                  : "Open a problem to create a session and invite others."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => {
              const isFull = session.participantCount >= session.maxParticipants;
              const isPrivate = session.visibility === "private";
              const fillPct = Math.min(
                100,
                Math.round((session.participantCount / session.maxParticipants) * 100)
              );

              return (
                <div
                  key={session.id}
                  className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="card-body gap-3 p-4">
                    {/* top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{session.name}</h3>
                        <p className="text-xs text-base-content/50 truncate">
                          Host: {session.hostName}
                        </p>
                      </div>
                      <span
                        className={`badge badge-sm shrink-0 ${
                          isPrivate ? "badge-warning" : "badge-success"
                        }`}
                      >
                        {isPrivate ? (
                          <LockIcon className="size-3 mr-0.5" />
                        ) : (
                          <UnlockIcon className="size-3 mr-0.5" />
                        )}
                        {session.visibility}
                      </span>
                    </div>

                    {/* session id */}
                    <div className="font-mono text-[10px] bg-base-200 rounded px-2 py-1 text-base-content/60 truncate">
                      {session.id}
                    </div>

                    {/* participants bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-base-content/60">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="size-3" />
                          {session.participantCount} / {session.maxParticipants}
                        </span>
                        <span>{fillPct}% full</span>
                      </div>
                      <div className="w-full bg-base-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            fillPct >= 90
                              ? "bg-error"
                              : fillPct >= 60
                              ? "bg-warning"
                              : "bg-success"
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>

                    {/* action */}
                    <div className="card-actions justify-end mt-1">
                      {isPrivate ? (
                        <button
                          className="btn btn-xs btn-outline gap-1"
                          onClick={() => {
                            setJoinSessionId(session.id);
                            document
                              .getElementById("join-by-id-section")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          <LockIcon className="size-3" />
                          Use Session ID
                        </button>
                      ) : (
                        <button
                          className={`btn btn-xs ${isFull ? "btn-disabled" : "btn-primary"} gap-1`}
                          disabled={isFull}
                          onClick={() => handleJoinCard(session)}
                        >
                          <ZapIcon className="size-3" />
                          {isFull ? "Full" : "Join"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PASSWORD MODAL ── */}
      {passwordModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setPasswordModal(null)}
            >
              <XIcon className="size-4" />
            </button>
            <h3 className="font-bold text-base mb-1 flex items-center gap-2">
              <LockIcon className="size-4 text-warning" />
              Password Required
            </h3>
            <p className="text-xs text-base-content/60 mb-4">
              <span className="font-semibold text-base-content">{passwordModal.name}</span> is
              password-protected.
            </p>
            <input
              className="input input-sm input-bordered w-full"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter session password"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handlePasswordModalJoin()}
            />
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setPasswordModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handlePasswordModalJoin}>
                Join
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setPasswordModal(null)} />
        </dialog>
      )}
    </div>
  );
}

export default LiveSessionsPage;
