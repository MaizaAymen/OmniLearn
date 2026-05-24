import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import RoadmapNode from "./RoadmapNode";
import InheritanceEdge from "./InheritanceEdge";
import NodeDetailPanel from "./NodeDetailPanel";
import OnboardingForm from "./OnboardingForm";
import { roadmapApi } from "./api";
import { STATUS_META } from "./nodeTypes";
import CertificateButton from "./CertificateButton";
import "./roadmap.css";

const nodeTypes = { roadmap: RoadmapNode };
const edgeTypes = { inheritance: InheritanceEdge };

/* ── Layout constants ─────────────────────────────────────────────── */
const NODE_W = 240;
const NODE_H = 170;
const COL_GAP = 56;
const ROW_GAP = 130;
const STAGE_GAP = 80;

const STAGES = [
  { id: "fundamentals", n: 1, title: "Fundamentals" },
  { id: "core",         n: 2, title: "Core Concepts" },
  { id: "patterns",     n: 3, title: "Problem Solving Patterns" },
  { id: "advanced",     n: 4, title: "Advanced Topics" },
  { id: "projects",     n: 2, title: "Real World Projects" },
];

function distributeIntoStages(nodes) {
  const totalRatio = STAGES.reduce((s, st) => s + st.n, 0);
  const total = nodes.length;
  const stages = STAGES.map((st) => ({ ...st, nodes: [] }));
  if (!total) return stages;
  const allocation = STAGES.map((st) => (st.n * total) / totalRatio);
  const counts = allocation.map((a) => Math.floor(a));
  let placed = counts.reduce((a, b) => a + b, 0);
  const residuals = allocation
    .map((a, i) => ({ i, r: a - Math.floor(a) }))
    .sort((a, b) => b.r - a.r);
  let ri = 0;
  while (placed < total) { counts[residuals[ri++ % residuals.length].i]++; placed++; }
  let cursor = 0;
  counts.forEach((c, i) => { stages[i].nodes = nodes.slice(cursor, cursor + c); cursor += c; });
  return stages;
}

function layoutPyramid(stages) {
  const widestCount = Math.max(...stages.map((s) => Math.max(s.n, s.nodes.length || 1)));
  const canvasWidth = widestCount * NODE_W + (widestCount - 1) * COL_GAP;
  const positioned = [];
  let y = 0;
  const stageRanges = [];
  stages.forEach((stage, sIdx) => {
    const perRow = Math.max(1, stage.n);
    const rows = [];
    for (let i = 0; i < stage.nodes.length; i += perRow) rows.push(stage.nodes.slice(i, i + perRow));
    if (!rows.length) rows.push([]);
    const stageStart = positioned.length;
    rows.forEach((row, rIdx) => {
      const rowWidth = row.length * NODE_W + Math.max(0, row.length - 1) * COL_GAP;
      const offsetX = (canvasWidth - rowWidth) / 2;
      row.forEach((node, cIdx) => {
        positioned.push({ ...node, stageIndex: sIdx, position: { x: offsetX + cIdx * (NODE_W + COL_GAP), y } });
      });
      if (rIdx < rows.length - 1) y += NODE_H + ROW_GAP * 0.55;
    });
    y += NODE_H + STAGE_GAP;
    stageRanges.push([stageStart, positioned.length]);
  });
  const edges = [];
  for (let s = 0; s < stageRanges.length - 1; s++) {
    const [aStart, aEnd] = stageRanges[s];
    const [bStart, bEnd] = stageRanges[s + 1];
    for (let i = aStart; i < aEnd; i++)
      for (let j = bStart; j < bEnd; j++)
        edges.push({
          id: `e_${positioned[i].id}_${positioned[j].id}`,
          source: positioned[i].id, target: positioned[j].id,
          type: "inheritance",
          sourceHandle: "s-bottom", targetHandle: "t-top",
          data: { showLabel: false, color: "#CBD5E1" },
        });
  }
  return { nodes: positioned, edges };
}

function toFlow(graph) {
  if (!graph?.nodes?.length) return { nodes: [], edges: [], stages: [] };
  const stages = distributeIntoStages(graph.nodes);
  const { nodes, edges } = layoutPyramid(stages);
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: "roadmap", position: n.position, data: { ...n } })),
    edges,
    stages,
  };
}

const ROADMAP_LIMITS = { free: 2, pro: 20, institution: Infinity };

/* ── Roadmap Switcher dropdown ─────────────────────────────────────── */
function RoadmapSwitcher({ activeId, onSwitch, onDelete, onNew, generating, roadmapCount, roadmapLimit }) {
  const [open, setOpen]       = useState(false);
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // id being renamed
  const [editVal, setEditVal] = useState("");
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load list whenever dropdown opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    roadmapApi.list()
      .then(setList)
      .finally(() => setLoading(false));
  }, [open]);

  const handleSwitch = async (id) => {
    if (id === activeId) { setOpen(false); return; }
    await onSwitch(id);
    setOpen(false);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this roadmap?")) return;
    await onDelete(id);
    setList((l) => l.filter((r) => r.id !== id));
  };

  const startRename = (e, rm) => {
    e.stopPropagation();
    setEditing(rm.id);
    setEditVal(rm.title);
  };

  const submitRename = async (id) => {
    if (!editVal.trim()) return;
    await roadmapApi.rename(id, editVal.trim());
    setList((l) => l.map((r) => r.id === id ? { ...r, title: editVal.trim() } : r));
    setEditing(null);
  };

  const active = list.find((r) => r.id === activeId);
  const count = list.length || roadmapCount;
  const atLimit = isFinite(roadmapLimit) && count >= roadmapLimit;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="rm-switcher-btn"
        onClick={() => setOpen((v) => !v)}
        title="Your roadmaps"
      >
        <span className="rm-switcher-icon">⬡</span>
        <span className="rm-switcher-label">{active?.title || "My Roadmaps"}</span>
        <span className="rm-switcher-caret">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="rm-switcher-menu">
          <div className="rm-switcher-head">
            <span>
              Your roadmaps
              <span style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 7px",
                borderRadius: 99,
                background: atLimit ? "#FEE2E2" : "#EEF2FF",
                color: atLimit ? "#DC2626" : "#4F46E5",
              }}>
                {count}/{isFinite(roadmapLimit) ? roadmapLimit : "∞"}
              </span>
            </span>
            <button
              className="rm-switcher-new"
              onClick={() => { setOpen(false); onNew(); }}
              disabled={generating || atLimit}
              title={atLimit ? "Upgrade to Pro to create more roadmaps" : undefined}
              style={atLimit ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
            >
              + New
            </button>
          </div>
          {atLimit && (
            <div style={{
              margin: "6px 10px",
              padding: "7px 10px",
              borderRadius: 8,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              fontSize: 12,
              color: "#DC2626",
            }}>
              Free plan limit reached. Upgrade to Pro for unlimited roadmaps.
            </div>
          )}

          {loading ? (
            <div className="rm-switcher-empty">Loading…</div>
          ) : list.length === 0 ? (
            <div className="rm-switcher-empty">No roadmaps yet.</div>
          ) : (
            <ul className="rm-switcher-list">
              {list.map((rm) => (
                <li
                  key={rm.id}
                  className={`rm-switcher-item ${rm.id === activeId ? "is-active" : ""}`}
                  onClick={() => handleSwitch(rm.id)}
                >
                  <div className="rm-switcher-item-body">
                    {editing === rm.id ? (
                      <input
                        className="rm-switcher-input"
                        value={editVal}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRename(rm.id);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        onBlur={() => submitRename(rm.id)}
                      />
                    ) : (
                      <span className="rm-switcher-item-title">{rm.title}</span>
                    )}
                    <div className="rm-switcher-item-meta">
                      <span className="rm-switcher-progress-wrap">
                        <i className="rm-switcher-progress-bar" style={{ width: `${rm.progress}%` }} />
                      </span>
                      <span className="rm-switcher-pct">{rm.progress}%</span>
                      <span className="rm-switcher-date">
                        {new Date(rm.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="rm-switcher-item-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="rm-switcher-action"
                      title="Rename"
                      onClick={(e) => startRename(e, rm)}
                    >✎</button>
                    <button
                      className="rm-switcher-action danger"
                      title="Delete"
                      onClick={(e) => handleDelete(e, rm.id)}
                    >✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────── */
function RoadmapInner() {
  const storedUser = (() => { try { return JSON.parse(Cookies.get("user") || "{}"); } catch { return {}; } })();
  const storedPlan = storedUser.plan || "free";
  const roadmapLimit = ROADMAP_LIMITS[storedPlan] ?? ROADMAP_LIMITS.free;
  const userFullName = [storedUser.firstname, storedUser.lastname]
    .filter(Boolean)
    .join(" ")
    .trim() || storedUser.name || storedUser.email || "Student";

  const [profile, setProfile]         = useState(null);
  const [graph, setGraph]             = useState(null);
  const [activeId, setActiveId]       = useState(null);
  const [progress, setProgress]       = useState(0);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [selected, setSelected]       = useState(null);
  const [error, setError]             = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeStage, setActiveStage]         = useState(0);
  const [certIssuedAt, setCertIssuedAt]       = useState(null);
  const [roadmapCount, setRoadmapCount]       = useState(0);

  const flow = useMemo(() => toFlow(graph), [graph]);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!flow.stages.length) return;
    const idx = flow.stages.findIndex((s) => s.nodes.some((n) => (n.status || "pending") !== "completed"));
    setActiveStage(idx === -1 ? flow.stages.length - 1 : idx);
  }, [flow.stages]);

  useEffect(() => {
    setRfNodes(flow.nodes.map((n) => ({
      ...n,
      data: { ...n.data, isActiveStage: n.data.stageIndex === activeStage },
    })));
    setRfEdges(flow.edges);
  }, [flow.nodes, flow.edges, activeStage, setRfNodes, setRfEdges]);

  useEffect(() => {
    Promise.all([roadmapApi.me(), roadmapApi.list()])
      .then(([d, list]) => {
        setProfile({ careerGoal: d.careerGoal, interests: d.interests, programmingLanguages: d.programmingLanguages, problems: d.problems });
        setGraph(d.roadmap || null);
        setProgress(d.roadmapProgress || 0);
        setActiveId(d.activeRoadmapId || null);
        setCertIssuedAt(d.certificateIssuedAt || null);
        setRoadmapCount(list.length);
        if (!d.roadmap || !d.roadmap.nodes?.length) setShowOnboarding(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const generate = useCallback(async (payload) => {
    setGenerating(true);
    setError(null);
    try {
      if (payload) await roadmapApi.saveProfile(payload);
      const g = await roadmapApi.generate();
      setGraph(g);
      setProgress(0);
      setActiveId(g.roadmapId || null);
      if (payload) setProfile(payload);
      setShowOnboarding(false);
      setRoadmapCount((c) => c + 1);
    } catch (e) {
      const data = e.response?.data;
      setError(data?.limitReached
        ? `${storedPlan === "free" ? "Free" : "Pro"} plan limit: you can only create ${data?.limit ?? roadmapLimit} roadmaps.${storedPlan === "free" ? " Upgrade to Pro to create more." : ""}`
        : data?.error || e.message
      );
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleSwitch = useCallback(async (id) => {
    const data = await roadmapApi.switchTo(id);
    setGraph(data.roadmap);
    setProgress(data.progress);
    setActiveId(id);
    setSelected(null);
    setCertIssuedAt(null); // will reload on next /me
  }, []);

  const handleDelete = useCallback(async (id) => {
    await roadmapApi.deleteRoadmap(id);
    setRoadmapCount((c) => Math.max(0, c - 1));
    if (id === activeId) {
      const me = await roadmapApi.me();
      setGraph(me.roadmap || null);
      setProgress(me.roadmapProgress || 0);
      setActiveId(me.activeRoadmapId || null);
      setSelected(null);
    }
  }, [activeId]);

  const onNodeClick = useCallback((_, n) => setSelected(n.data), []);

  const handleStatusChange = (nodeId, status) => {
    setGraph((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, nodes: prev.nodes.map((n) => n.id === nodeId ? { ...n, status } : n) };
      const done = updated.nodes.filter((n) => n.status === "completed").length;
      setProgress(Math.round((done / updated.nodes.length) * 100));
      return updated;
    });
    setSelected((cur) => cur?.id === nodeId ? { ...cur, status } : cur);
  };

  if (loading) return <div className="rm-loading">Loading roadmap…</div>;

  return (
    <div className="rm-shell-plain">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="rm-navbar">
        <div className="rm-navbar-left">
          {/* Roadmap switcher dropdown */}
          <RoadmapSwitcher
            activeId={activeId}
            onSwitch={handleSwitch}
            onDelete={handleDelete}
            onNew={() => (!isFinite(roadmapLimit) || roadmapCount < roadmapLimit) && setShowOnboarding(true)}
            generating={generating}
            roadmapCount={roadmapCount}
            roadmapLimit={roadmapLimit}
          />
          {profile?.careerGoal && (
            <span className="rm-navbar-goal">🎯 {profile.careerGoal}</span>
          )}
        </div>

        {/* Stage path pills */}
        <nav className="rm-stage-nav">
          {flow.stages.map((stage, idx) => {
            const total = stage.nodes.length;
            const done  = stage.nodes.filter((n) => (n.status || "pending") === "completed").length;
            const isActive   = activeStage === idx;
            const isComplete = total > 0 && done === total;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(idx)}
                className={["rm-stage-pill", isActive ? "is-active" : "", isComplete ? "is-complete" : ""].filter(Boolean).join(" ")}
                title={`${stage.title} — ${done}/${total} completed`}
              >
                <span className="rm-stage-num">{isComplete ? "✓" : idx + 1}</span>
                <span className="rm-stage-label">
                  <span className="rm-stage-name">{stage.title}</span>
                  <span className="rm-stage-count">{done}/{total}</span>
                </span>
                {idx < flow.stages.length - 1 && <span className="rm-stage-sep" aria-hidden>→</span>}
              </button>
            );
          })}
        </nav>

        <div className="rm-navbar-right">
          {/* Steps progress */}
          <span className="rm-navbar-progress" title="Steps completed">
            <i style={{ width: `${progress}%` }} />
            <em>{progress}%</em>
          </span>

          {/* Quiz progress bar */}
          {(() => {
            const { attempted, passed, total, avg } = quizStats(graph);
            return (
              <div className="rm-quiz-progress" title={`${passed} passed · avg ${avg}%`}>
                <span className="rm-quiz-icon">🧠</span>
                <div className="rm-quiz-bar-wrap">
                  {/* grey track */}
                  <div className="rm-quiz-track">
                    {/* orange = attempted but not passed */}
                    <div className="rm-quiz-fill attempted" style={{ width: `${total ? (attempted / total) * 100 : 0}%` }} />
                    {/* green = passed */}
                    <div className="rm-quiz-fill passed"   style={{ width: `${total ? (passed   / total) * 100 : 0}%` }} />
                  </div>
                  <span className="rm-quiz-label">{attempted}/{total}</span>
                </div>
              </div>
            );
          })()}

          {Object.entries(STATUS_META).map(([id, t]) => (
            <span key={id} className="rm-navbar-stat" title={t.label}>
              <i style={{ background: t.color }} />
              {countByStatus(graph, id)}
            </span>
          ))}
          <CertificateButton
            graph={graph}
            userName={userFullName}
            roadmapTitle={profile?.careerGoal || "AI Learning Roadmap"}
            certificateIssuedAt={certIssuedAt}
            onIssued={(date) => setCertIssuedAt(date)}
          />
          <button
            className="rm-navbar-btn primary"
            onClick={() => generate()}
            disabled={generating || (isFinite(roadmapLimit) && roadmapCount >= roadmapLimit)}
            title={isFinite(roadmapLimit) && roadmapCount >= roadmapLimit ? `${storedPlan === "free" ? "Upgrade to Pro" : "Plan limit reached"} (${roadmapLimit} roadmaps max)` : undefined}
          >
            {generating ? "Generating…" : "New roadmap"}
          </button>
        </div>
      </header>

      {/* ── Canvas ─────────────────────────────────────────────── */}
      <main className="rm-canvas-wrap-plain">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          panOnScroll
        >
          <Background gap={20} size={1} color="#E5E7EB" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>

        {selected && (
          <div className="rm-panel-plain">
            <div className="rm-panel-head-plain">
              <span>Step Details</span>
              <button onClick={() => setSelected(null)}>✕</button>
            </div>
            <NodeDetailPanel node={selected} onStatusChange={handleStatusChange} embedded />
          </div>
        )}
      </main>

      {showOnboarding && (
        <OnboardingOverlay
          initial={profile}
          onClose={() => setShowOnboarding(false)}
          onSubmit={generate}
          submitting={generating}
        />
      )}

      {error && <div className="rm-error-toast">{error}</div>}
    </div>
  );
}

function countByStatus(graph, status) {
  if (!graph?.nodes) return 0;
  return graph.nodes.filter((n) => (n.status || "pending") === status).length;
}

// Returns { attempted, passed, total, avg }
function quizStats(graph) {
  const nodes    = graph?.nodes || [];
  const total    = nodes.length;
  const attempted = nodes.filter((n) => (n.quizAttempts || []).length > 0).length;
  const passed   = nodes.filter((n) => (n.bestScore || 0) >= 80).length;
  const avg      = total
    ? Math.round(nodes.reduce((s, n) => s + (n.bestScore || 0), 0) / total)
    : 0;
  return { attempted, passed, total, avg };
}

function OnboardingOverlay({ initial, onClose, onSubmit, submitting }) {
  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="rm-overlay-head">
          <span>⬡&nbsp; Tune your roadmap</span>
          <button onClick={onClose}>✕</button>
        </div>
        <OnboardingForm initial={initial} onSubmit={onSubmit} submitting={submitting} />
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <ReactFlowProvider>
      <RoadmapInner />
    </ReactFlowProvider>
  );
}
