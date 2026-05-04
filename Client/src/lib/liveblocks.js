// Thin Liveblocks-backed shim that mimics the socket.io API the rest of the
// app uses (`.id`, `.emit(event, payload, cb)`, `.on(event, fn)`, `.off`,
// `.disconnect()`). Storage holds participants / code / exam / handRaises;
// chat + role/settings broadcasts ride on Liveblocks broadcastEvent. Role
// checks (kick / role-change / settings) are enforced client-side from the
// signed `userInfo.role` Liveblocks gave us at auth time.

import { createClient, LiveObject } from "@liveblocks/client";

const SERVER = "http://localhost:5000/liveblocks/api";

export function createLiveSocket() {
  const listeners = new Map();
  let client = null;
  let room = null;
  let leave = null;
  let storageRoot = null;
  let connId = null;
  let myName = "Guest";
  let myRole = "editor";
  let activeSessionId = null;
  let activeSessionMeta = null;
  let unsubs = [];

  const dispatch = (event, payload) => {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error(e); } }
  };

  const on = (event, fn) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
  };
  const off = (event, fn) => listeners.get(event)?.delete(fn);

  const isHost = () => myRole === "host" || myRole === "co-host";

  const readImmutable = (key) => {
    const v = storageRoot?.get(key);
    return v?.toImmutable ? v.toImmutable() : (v || {});
  };

  const emitParticipants = () => {
    const ps = readImmutable("participants");
    dispatch("session:participants", {
      participants: Object.values(ps).map((x) => x.name),
      participantDetails: Object.entries(ps).map(([sid, x]) => ({ socketId: sid, name: x.name, role: x.role })),
    });
  };

  const emitCodeAll = () => {
    const obj = readImmutable("codeByLanguage");
    for (const [language, code] of Object.entries(obj)) dispatch("session:code:updated", { language, code });
  };

  const emitExam = () => {
    const e = storageRoot?.get("exam");
    const exam = e?.toImmutable ? e.toImmutable() : e;
    dispatch("exam:state", { exam });
    if (exam?.phase === "ended") dispatch("exam:ended", { reason: "ended" });
  };

  const emitHands = () => {
    const obj = readImmutable("handRaises");
    dispatch("session:hands:resync", Object.values(obj));
  };

  const ensureLiveKey = (key, initial) => {
    // Liveblocks does not auto-wrap plain objects passed to .set(); we need
    // a LiveObject so subsequent .set(subKey, value) / .delete(subKey) work.
    if (storageRoot.get(key) == null) storageRoot.set(key, new LiveObject(initial));
    return storageRoot.get(key);
  };

  const enterRoom = async (sessionId, name, password) => {
    activeSessionId = sessionId;
    myName = name;

    client = createClient({
      authEndpoint: async () => {
        const res = await fetch(`${SERVER}/session/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, userName: name, password: password || "" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "auth failed");
        return data;
      },
    });

    const entry = client.enterRoom(`session:${sessionId}`, { initialPresence: { name } });
    room = entry.room;
    leave = entry.leave;

    const { root } = await room.getStorage();
    storageRoot = root;

    const self = room.getSelf();
    connId = String(self?.connectionId ?? Math.random().toString(36).slice(2, 10));
    myRole = self?.info?.role || "editor";

    ensureLiveKey("participants", {});
    ensureLiveKey("studentWork", {});
    ensureLiveKey("handRaises", {});
    ensureLiveKey("codeByLanguage", {});

    storageRoot.get("participants").set(connId, { name, role: myRole });

    unsubs.push(room.subscribe(storageRoot.get("participants"), emitParticipants, { isDeep: true }));
    unsubs.push(room.subscribe(storageRoot.get("codeByLanguage"), emitCodeAll, { isDeep: true }));
    unsubs.push(room.subscribe(storageRoot.get("handRaises"), emitHands, { isDeep: true }));
    const exam = storageRoot.get("exam");
    if (exam) unsubs.push(room.subscribe(exam, emitExam, { isDeep: true }));

    unsubs.push(room.subscribe("event", ({ event }) => {
      if (!event) return;
      switch (event.type) {
        case "chat": dispatch("session:chat:message", event.msg); break;
        case "kicked": if (event.socketId === connId) dispatch("session:kicked", { reason: event.reason }); break;
        case "settings": dispatch("session:settings:updated", event.patch); break;
        case "mode": dispatch("session:mode:updated", event.payload); break;
        case "languageLock": dispatch("session:language:locked", { language: event.language }); break;
        case "studentCode": dispatch("student:code", { socketId: event.socketId, code: event.code }); break;
        case "studentTldraw": dispatch("student:tldraw:change", { socketId: event.socketId, changes: event.changes }); break;
        case "tldraw": dispatch("session:tldraw:change", event); break;
        case "roleChanged":
          if (event.socketId === connId) {
            myRole = event.newRole;
            dispatch("session:role:changed", { newRole: event.newRole, userPermission: event.newRole === "viewer" ? "read-only" : "editable" });
          }
          break;
        default: break;
      }
    }));

    emitParticipants();
    emitCodeAll();
    emitExam();
    emitHands();

    return self;
  };

  const leaveRoom = () => {
    try {
      if (storageRoot && connId) {
        storageRoot.get("participants")?.delete(connId);
        storageRoot.get("handRaises")?.delete(connId);
      }
    } catch { /* ignore */ }
    unsubs.forEach((u) => { try { u(); } catch { /* ignore */ } });
    unsubs = [];
    try { leave?.(); } catch { /* ignore */ }
    room = null; client = null; storageRoot = null; activeSessionId = null; activeSessionMeta = null;
  };

  const emit = async (event, payload, cb) => {
    try {
      switch (event) {
        case "session:create": {
          const res = await fetch(`${SERVER}/session/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) return cb?.({ ok: false, message: data.error || "Create failed" });
          await enterRoom(data.sessionId, payload.hostName || "Host", payload.password || "");
          if (payload.starterCode != null) storageRoot.get("codeByLanguage").set(payload.language, payload.starterCode);
          activeSessionMeta = {
            id: data.sessionId, name: payload.sessionName,
            maxParticipants: payload.maxParticipants, visibility: payload.visibility,
            teacherMode: !!payload.teacherMode, locked: false,
            requireJoinApproval: !!payload.requireJoinApproval,
            problemIds: payload.problemIds || [payload.problemId],
            currentProblemIndex: 0, identityMode: payload.identityMode || "real",
            codeByLanguage: { [payload.language]: payload.starterCode || "" },
            tldrawStore: {}, languageLock: null,
            exam: payload.exam?.enabled ? { ...payload.exam, phase: "waiting" } : null,
          };
          cb?.({ ok: true, sessionId: data.sessionId, userRole: "host", userPermission: "editable", session: activeSessionMeta });
          return;
        }
        case "session:join": {
          try {
            await enterRoom(payload.sessionId, payload.userName || "Guest", payload.password || "");
          } catch (e) {
            return cb?.({ ok: false, message: e.message || "Could not join" });
          }
          activeSessionMeta = {
            id: payload.sessionId, name: payload.sessionId,
            maxParticipants: 200, visibility: "public",
            teacherMode: false, locked: false, requireJoinApproval: false,
            problemIds: [], currentProblemIndex: 0, identityMode: "real",
            codeByLanguage: readImmutable("codeByLanguage"),
            tldrawStore: {}, languageLock: null,
            exam: storageRoot.get("exam")?.toImmutable?.() ?? storageRoot.get("exam") ?? null,
          };
          cb?.({ ok: true, userRole: myRole, userPermission: myRole === "viewer" ? "read-only" : "editable", session: activeSessionMeta });
          return;
        }
        case "session:leave": leaveRoom(); return;
        case "session:list:subscribe":
        case "session:global:list:subscribe": return;
        case "session:code:update":
          storageRoot?.get("codeByLanguage")?.set(payload.language, payload.code);
          return;
        case "student:code":
          if (!storageRoot) return;
          storageRoot.get("studentWork").set(connId, { code: payload.code });
          room.broadcastEvent({ type: "studentCode", socketId: connId, code: payload.code });
          return;
        case "session:chat:send": {
          const msg = { id: Math.random().toString(36).slice(2, 10), socketId: connId, name: myName, text: payload.text, time: Date.now() };
          room?.broadcastEvent({ type: "chat", msg });
          dispatch("session:chat:message", msg);
          return;
        }
        case "session:hand:raise":
          storageRoot?.get("handRaises")?.set(connId, { socketId: connId, name: myName });
          cb?.({ ok: true });
          return;
        case "session:hand:lower":
          storageRoot?.get("handRaises")?.delete(payload?.socketId || connId);
          return;
        case "session:role:change": {
          if (!isHost()) return dispatch("session:permission:error", { message: "Only host can change roles" });
          const ps = storageRoot.get("participants");
          const cur = ps.get(payload.socketId);
          if (cur) ps.set(payload.socketId, { ...(cur.toImmutable ? cur.toImmutable() : cur), role: payload.newRole });
          room.broadcastEvent({ type: "roleChanged", socketId: payload.socketId, newRole: payload.newRole });
          return;
        }
        case "session:kick":
          if (!isHost()) return cb?.({ ok: false, message: "Forbidden" });
          storageRoot.get("participants").delete(payload.socketId);
          room.broadcastEvent({ type: "kicked", socketId: payload.socketId, reason: "Removed by host" });
          cb?.({ ok: true });
          return;
        case "session:settings:update":
          if (!isHost()) return cb?.({ ok: false, message: "Forbidden" });
          activeSessionMeta = { ...(activeSessionMeta || {}), ...payload };
          room.broadcastEvent({ type: "settings", patch: payload });
          dispatch("session:settings:updated", payload);
          cb?.({ ok: true });
          return;
        case "session:mode:update":
          if (!isHost()) return cb?.({ ok: false, message: "Forbidden" });
          {
            const p = { type: payload.type, collab: payload.collab, teacherMode: payload.teacherMode, exam: payload.exam };
            room.broadcastEvent({ type: "mode", payload: p });
            dispatch("session:mode:updated", p);
          }
          cb?.({ ok: true });
          return;
        case "session:language:lock":
          if (!isHost()) return cb?.({ ok: false, message: "Forbidden" });
          room.broadcastEvent({ type: "languageLock", language: payload.language });
          dispatch("session:language:locked", { language: payload.language });
          cb?.({ ok: true });
          return;
        case "session:problem:advance":
          if (!isHost()) return cb?.({ ok: false, message: "Forbidden" });
          cb?.({ ok: true });
          return;
        case "session:waiting:approve":
        case "session:waiting:reject":
          return; // dropped in this migration; password-gated joins instead
        case "session:tldraw:change":
          room?.broadcastEvent({ type: "tldraw", socketId: connId, changes: payload.changes });
          return;
        case "student:tldraw:change":
          room?.broadcastEvent({ type: "studentTldraw", socketId: connId, changes: payload.changes });
          return;
        case "teacher:focus":
          cb?.({ ok: true });
          return;
        case "exam:start": {
          const r = await fetch(`${SERVER}/exam/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: activeSessionId }),
          });
          const data = await r.json();
          cb?.({ ok: r.ok, message: data.error });
          return;
        }
        case "exam:end": {
          const r = await fetch(`${SERVER}/exam/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: activeSessionId }),
          });
          const data = await r.json();
          cb?.({ ok: r.ok, message: data.error });
          return;
        }
        default:
          console.warn("[liveblocks shim] unhandled event:", event);
      }
    } catch (err) {
      console.error("[liveblocks shim] emit error:", event, err);
      cb?.({ ok: false, message: err.message });
    }
  };

  return {
    get id() { return connId; },
    on, off, emit,
    disconnect: leaveRoom,
  };
}

// REST helpers (used by LiveSessionsPage so it doesn't need a room).
export async function fetchSessionList() {
  const r = await fetch(`${SERVER}/sessions`);
  if (!r.ok) return [];
  const data = await r.json();
  return data.sessions || [];
}
