// Realtime collaboration client — Socket.IO + CodeMirror 6.
//
// Backed by Server/src/realtime/sessionHub.js + the /api/rooms HTTP routes.
// Two collaboration modes:
//   - "classroom" : host edits, others read-only
//   - "pair"      : everyone can edit
//
// Public surface:
//   getSocket()         shared Socket.IO singleton
//   fetchSessionList()  GET /api/rooms (shaped for the legacy LiveSessions UI)
//   useRoomCollab()     React hook that wires a CodeMirror EditorView to a room
//   createLiveSocket()  legacy compat shim used by ProblemPage.jsx — emulates
//                       the previous socket-like object so the page didn't
//                       need internal rewiring. Removed-feature events
//                       (chat, hands, kick, exam, …) are no-ops with success
//                       callbacks so the UI doesn't error.

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { EditorView } from "@codemirror/view";
import { Compartment, StateEffect } from "@codemirror/state";

const SERVER_URL = "http://localhost:5000";
const ROOMS_API = `${SERVER_URL}/api/rooms`;

// ---------- shared singleton ----------
//
// Used by useRoomCollab. forceNew keeps this manager isolated from other
// callers of io() on the same URL (e.g. Messaging/api.js), so disconnects in
// one feature don't tear down the realtime transport for another.

let _socket = null;
export function getSocket() {
  if (!_socket) {
    _socket = io(SERVER_URL, {
      autoConnect: true,
      forceNew: true,
      transports: ["websocket", "polling"],
    });
    _socket.on("connect_error", (err) => {
      console.warn("[roomClient] singleton connect_error:", err?.message || err);
    });
  }
  return _socket;
}

// ---------- HTTP ----------

async function createRoom({ mode, language, code, hostName }) {
  const res = await fetch(`${ROOMS_API}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, language, code, hostName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Create failed");
  return data; // { roomId, mode, language, hostName }
}

export async function fetchSessionList() {
  try {
    const r = await fetch(ROOMS_API);
    if (!r.ok) return [];
    const data = await r.json();
    return (data.rooms || []).map((room) => ({
      id: room.id,
      name: room.id,
      hostId: room.hostId,
      hostName: room.hostName || "Host",
      createdAt: room.createdAt,
      problemId: null,
      maxParticipants: 200,
      participantCount: room.users?.length || 0,
      visibility: "public",
      requiresPassword: false,
      mode: room.mode,
    }));
  } catch {
    return [];
  }
}

// ---------- "my sessions" — local persistence so users can find what they
// created/joined without a server-side identity system. -------------------

const MY_SESSIONS_KEY = "myRoomIds";

function readMySet() {
  try {
    const raw = localStorage.getItem(MY_SESSIONS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function writeMySet(set) {
  try { localStorage.setItem(MY_SESSIONS_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}
export function getMySessionIds() {
  return [...readMySet()];
}
export function rememberSession(roomId) {
  if (!roomId) return;
  const set = readMySet();
  set.add(roomId);
  writeMySet(set);
}
export function forgetSession(roomId) {
  if (!roomId) return;
  const set = readMySet();
  set.delete(roomId);
  writeMySet(set);
}

// ---------- CodeMirror 6 helpers ----------

// Replace editor content as a single transaction. CodeMirror automatically
// preserves the cursor/selection by mapping it through the change set, and the
// undo history is kept intact (we tag the transaction so we can recognize our
// own remote-applied edits in the update listener).

const REMOTE_USER_EVENT = "remote.update";

function getDoc(view) {
  return view.state.doc.toString();
}

function applyRemoteCode(view, code) {
  const current = getDoc(view);
  if (current === code) return;
  view.dispatch({
    changes: { from: 0, to: current.length, insert: code },
    userEvent: REMOTE_USER_EVENT,
  });
}

// ---------- React hook for new integrations ----------

export function useRoomCollab({ editor, roomId, name, mode = "pair" }) {
  const [connected, setConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editor || !roomId) return;
    const view = editor; // EditorView
    const socket = getSocket();
    let disposed = false;
    let currentMode = mode;
    let host = false;

    // Compartment so we can flip read-only without recreating the editor.
    const editableCompartment = new Compartment();
    const updateListener = EditorView.updateListener.of((u) => {
      if (disposed || !u.docChanged) return;
      // Skip our own remote-applied edits to avoid echo loops.
      const fromRemote = u.transactions.some((t) => t.isUserEvent(REMOTE_USER_EVENT));
      if (fromRemote) return;
      if (currentMode === "classroom" && !host) return;
      socket.emit("code-change", { roomId, code: u.state.doc.toString() });
    });

    // Append our extensions to the live editor configuration.
    view.dispatch({
      effects: StateEffect.appendConfig.of([
        editableCompartment.of(EditorView.editable.of(true)),
        updateListener,
      ]),
    });

    const updateReadonly = () => {
      const readOnly = currentMode === "classroom" && !host;
      view.dispatch({
        effects: editableCompartment.reconfigure(EditorView.editable.of(!readOnly)),
      });
    };

    const join = () => {
      socket.emit("join-room", { roomId, name: name || "Guest" }, (res) => {
        if (disposed) return;
        if (!res?.ok) { setError(res?.error || "Join failed"); return; }
        currentMode = res.room?.mode || currentMode;
        host = !!res.isHost;
        setIsHost(host);
        setUsers(res.room?.users || []);
        setError(null);
        setConnected(true);
        rememberSession(roomId);

        if (typeof res.code === "string") {
          applyRemoteCode(view, res.code);
        }
        updateReadonly();
      });
    };

    join();

    const onReceive = ({ code }) => {
      if (disposed || getDoc(view) === code) return;
      applyRemoteCode(view, code);
    };
    const onUsers = (list) => { if (!disposed) setUsers(list); };
    const onHostChanged = ({ hostId }) => {
      if (disposed) return;
      host = hostId === socket.id;
      setIsHost(host);
      updateReadonly();
    };
    const onConnect = () => { if (!disposed) join(); }; // rejoin after reconnect
    const onDisconnect = () => { if (!disposed) setConnected(false); };

    socket.on("receive-code", onReceive);
    socket.on("room-users", onUsers);
    socket.on("host-changed", onHostChanged);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      disposed = true;
      socket.off("receive-code", onReceive);
      socket.off("room-users", onUsers);
      socket.off("host-changed", onHostChanged);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [editor, roomId, name, mode]);

  return { connected, isHost, users, error };
}

// ---------- legacy compat shim ----------
//
// Mimics the socket-like object that ProblemPage.jsx still uses:
//   { id, on, off, emit, disconnect }
// Every page that calls createLiveSocket() gets its own underlying Socket.IO
// connection (same lifecycle the old shim had).

const NOOP_EVENTS = new Set([
  "session:list:subscribe", "session:global:list:subscribe",
  "session:hand:raise", "session:hand:lower",
  "session:role:change", "session:kick", "session:settings:update",
  "session:mode:update", "session:language:lock", "session:problem:advance",
  "session:waiting:approve", "session:waiting:reject",
  "session:tldraw:change", "student:code", "student:tldraw:change",
  "teacher:focus", "exam:start", "exam:end",
]);

export function createLiveSocket() {
  // forceNew gives this shim its own manager so React strict-mode's
  // mount→cleanup→remount cycle (which calls disconnect on the first socket)
  // doesn't poison a shared manager that the second socket would inherit.
  const socket = io(SERVER_URL, {
    autoConnect: true,
    forceNew: true,
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  socket.on("connect_error", (err) => {
    console.warn("[roomClient] connect_error:", err?.message || err);
  });
  const listeners = new Map();
  let activeRoomId = null;
  let activeName = null;
  let myRole = "editor";  // "host" | "editor" | "viewer"
  let mode = "pair";      // "pair" | "classroom"
  let lastLanguage = "javascript";

  const dispatch = (event, payload) => {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (e) { console.error("[roomClient]", event, e); }
    }
  };
  const on = (event, fn) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
  };
  const off = (event, fn) => listeners.get(event)?.delete(fn);

  const permissionFor = (role) => (role === "viewer" ? "read-only" : "editable");
  const roleAfterHost = (hostId) => {
    if (hostId && socket.id === hostId) return "host";
    return mode === "classroom" ? "viewer" : "editor";
  };

  socket.on("room-users", (users) => {
    dispatch("session:participants", {
      participants: users.map((u) => u.name),
      participantDetails: users.map((u) => ({
        socketId: u.id,
        name: u.name,
        role: "editor",
      })),
    });
  });

  socket.on("receive-code", ({ code }) => {
    dispatch("session:code:updated", { language: lastLanguage, code });
  });

  socket.on("host-changed", ({ hostId }) => {
    const next = roleAfterHost(hostId);
    if (next !== myRole) {
      myRole = next;
      dispatch("session:role:changed", { newRole: myRole, userPermission: permissionFor(myRole) });
    }
  });

  socket.on("chat-message", (msg) => {
    dispatch("session:chat:message", msg);
  });

  // Auto-rejoin after a transport reconnect so collaboration survives flaky
  // networks without a manual page refresh.
  socket.on("connect", () => {
    if (activeRoomId) socket.emit("join-room", { roomId: activeRoomId, name: activeName });
  });

  const synthSession = ({ id, payload, codeByLanguage }) => ({
    id,
    name: payload?.sessionName || id,
    teacherMode: !!payload?.teacherMode,
    locked: false,
    requireJoinApproval: false,
    maxParticipants: payload?.maxParticipants || 200,
    visibility: payload?.visibility || "public",
    problemIds: payload?.problemIds || (payload?.problemId ? [payload.problemId] : []),
    currentProblemIndex: 0,
    identityMode: "real",
    codeByLanguage: codeByLanguage || {},
    tldrawStore: {},
    languageLock: null,
    exam: null,
  });

  const waitForConnect = (timeoutMs = 10000) =>
    new Promise((resolve, reject) => {
      if (socket.connected) return resolve();
      // If the socket has gone fully inactive (manual disconnect, or transport
      // died and reconnection is disabled), explicitly kick it back on.
      if (!socket.active) {
        try { socket.connect(); } catch { /* ignore */ }
      }
      const cleanup = () => {
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
        clearTimeout(t);
      };
      const onConnect = () => { cleanup(); resolve(); };
      const onError = (err) => { cleanup(); reject(new Error(err?.message || "Connection failed")); };
      const t = setTimeout(() => { cleanup(); reject(new Error("Could not reach realtime server")); }, timeoutMs);
      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
    });

  const joinRoom = async (roomId, name) => {
    await waitForConnect();
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("Server did not acknowledge join"));
      }, 8000);
      socket.emit("join-room", { roomId, name }, (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!res?.ok) return reject(new Error(res?.error || "Join failed"));
        activeRoomId = roomId;
        activeName = name;
        mode = res.room?.mode || "pair";
        myRole = res.isHost ? "host" : (mode === "classroom" ? "viewer" : "editor");
        rememberSession(roomId);
        resolve(res);
      });
    });
  };

  const leaveRoom = () => {
    activeRoomId = null;
    activeName = null;
    try { socket.disconnect(); } catch { /* ignore */ }
  };

  const emit = async (event, payload, cb) => {
    try {
      if (NOOP_EVENTS.has(event)) { cb?.({ ok: true }); return; }

      switch (event) {
        case "session:create": {
          // ProblemPage sends mode: "practice" | "classroom"; the backend hub
          // expects "pair" | "classroom". Map explicitly, then fall back to
          // teacherMode for older callers.
          const desiredMode = payload?.mode === "classroom" || payload?.teacherMode
            ? "classroom"
            : "pair";
          lastLanguage = payload?.language || lastLanguage;
          const { roomId } = await createRoom({
            mode: desiredMode,
            language: lastLanguage,
            code: payload?.starterCode || "",
            hostName: payload?.hostName || "Host",
          });
          await joinRoom(roomId, payload?.hostName || "Host");
          cb?.({
            ok: true,
            sessionId: roomId,
            userRole: "host",
            userPermission: "editable",
            session: synthSession({
              id: roomId,
              payload,
              codeByLanguage: { [lastLanguage]: payload?.starterCode || "" },
            }),
          });
          return;
        }
        case "session:join": {
          try {
            const res = await joinRoom(payload?.sessionId, payload?.userName || "Guest");
            cb?.({
              ok: true,
              userRole: myRole,
              userPermission: permissionFor(myRole),
              session: synthSession({
                id: payload.sessionId,
                payload,
                codeByLanguage: { [lastLanguage]: res.code || "" },
              }),
            });
          } catch (e) {
            cb?.({ ok: false, message: e.message });
          }
          return;
        }
        case "session:chat:send": {
          if (!activeRoomId) return;
          socket.emit("chat-message", { roomId: activeRoomId, text: payload?.text || "" });
          return;
        }
        case "session:leave":
          leaveRoom();
          return;
        case "session:code:update": {
          if (!activeRoomId) return;
          if (payload?.language) lastLanguage = payload.language;
          if (mode === "classroom" && myRole !== "host") return;
          socket.emit("code-change", { roomId: activeRoomId, code: payload?.code ?? "" });
          return;
        }
        default:
          console.warn("[roomClient] unhandled event:", event);
          cb?.({ ok: false, message: "Unsupported event" });
      }
    } catch (err) {
      console.error("[roomClient] emit error:", event, err);
      cb?.({ ok: false, message: err.message });
    }
  };

  return {
    get id() { return socket.id; },
    on, off, emit,
    disconnect: leaveRoom,
  };
}
