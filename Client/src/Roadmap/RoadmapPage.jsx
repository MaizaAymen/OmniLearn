import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ReloadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import RoadmapNode from "./RoadmapNode";
import InheritanceEdge from "./InheritanceEdge";
import NodeDetailPanel from "./NodeDetailPanel";
import OnboardingForm from "./OnboardingForm";
import { roadmapApi } from "./api";
import { NODE_META } from "./nodeTypes";
import "./roadmap.css";

const nodeTypes = { roadmap: RoadmapNode };
const edgeTypes = { inheritance: InheritanceEdge };

// ── Pyramid layout ──────────────────────────────────────────────────────
// Row 0: 1 node, row 1: 2, row 2: 3, ... edges connect each node to the
// two nodes "below" it in the next row (left + right neighbour) so it
// reads as a top-down pyramid expanding outward.
const NODE_W = 240;
const NODE_H = 180;
const COL_GAP = 60;
const ROW_GAP = 110;

function pyramidLayout(rawNodes) {
  const rows = [];
  let placed = 0;
  let rowSize = 1;
  while (placed < rawNodes.length) {
    const take = Math.min(rowSize, rawNodes.length - placed);
    rows.push(rawNodes.slice(placed, placed + take));
    placed += take;
    rowSize += 1;
  }

  const widestRow = rows[rows.length - 1].length;
  const totalWidth = widestRow * NODE_W + (widestRow - 1) * COL_GAP;
  const positioned = [];
  rows.forEach((row, rIdx) => {
    const rowWidth = row.length * NODE_W + (row.length - 1) * COL_GAP;
    const offsetX = (totalWidth - rowWidth) / 2;
    row.forEach((node, cIdx) => {
      positioned.push({
        ...node,
        position: {
          x: offsetX + cIdx * (NODE_W + COL_GAP),
          y: rIdx * (NODE_H + ROW_GAP),
        },
        _row: rIdx,
        _col: cIdx,
      });
    });
  });

  // Pyramid inheritance edges: each child in row r+1 "extends" its parents in row r.
  // Source = child (bottom row), target = parent (above) → triangle points UP to parent.
  const edges = [];
  for (let r = 0; r < rows.length - 1; r++) {
    rows[r].forEach((parent, c) => {
      const childRow = rows[r + 1];
      const left = childRow[c];
      const right = childRow[c + 1];
      if (left) edges.push({ id: `e_${left.id}_${parent.id}`, source: left.id, target: parent.id });
      if (right) edges.push({ id: `e_${right.id}_${parent.id}`, source: right.id, target: parent.id });
    });
  }
  return { nodes: positioned, edges };
}

function toFlow(graph) {
  if (!graph?.nodes) return { nodes: [], edges: [] };
  const { nodes: positioned, edges } = pyramidLayout(graph.nodes);
  return {
    nodes: positioned.map((n) => ({
      id: n.id,
      type: "roadmap",
      position: n.position,
      data: { ...n },
    })),
    edges: edges.map((e) => ({
      ...e,
      type: "inheritance",
      sourceHandle: "s-top",
      targetHandle: "t-bottom",
      data: {},
    })),
  };
}

export default function RoadmapPage() {
  const [profile, setProfile] = useState(null);
  const [graph, setGraph] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const flow = useMemo(() => toFlow(graph), [graph]);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setRfNodes(flow.nodes);
    setRfEdges(flow.edges);
  }, [flow.nodes, flow.edges, setRfNodes, setRfEdges]);

  useEffect(() => {
    roadmapApi.me()
      .then((d) => {
        setProfile({
          careerGoal: d.careerGoal,
          interests: d.interests,
          programmingLanguages: d.programmingLanguages,
          problems: d.problems,
        });
        setGraph(d.roadmap || null);
        setProgress(d.roadmapProgress || 0);
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
      if (payload) setProfile(payload);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setGenerating(false);
    }
  }, []);

  const onNodeClick = useCallback((_, n) => setSelected(n.data), []);

  const handleStatusChange = (nodeId, status) => {
    setGraph((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n)),
      };
      const done = updated.nodes.filter((n) => n.status === "completed").length;
      setProgress(Math.round((done / updated.nodes.length) * 100));
      return updated;
    });
    setSelected((cur) => (cur && cur.id === nodeId ? { ...cur, status } : cur));
  };

  if (loading) {
    return <div className="rm-shell" style={{ display: "grid", placeItems: "center" }}>Loading…</div>;
  }

  const needsOnboarding = !graph || !graph.nodes?.length;
  if (needsOnboarding) {
    return (
      <div className="rm-shell" style={{ overflowY: "auto" }}>
        <Hero onRegenerate={null} />
        <OnboardingForm initial={profile} onSubmit={generate} submitting={generating} />
        {error && (
          <div className="max-w-6xl mx-auto px-6 pb-6">
            <div style={{
              border: "2px solid #E91C11", background: "#FEE2E2",
              color: "#E91C11", padding: "10px 14px", borderRadius: 8, fontWeight: 600,
            }}>{error}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rm-shell">
      <Hero
        careerGoal={profile?.careerGoal}
        nodeCount={graph.nodes.length}
        progress={progress}
        onRegenerate={() => generate()}
        regenerating={generating}
      />

      {/* Pyramid canvas */}
      <div style={{ height: "calc(100vh - 64px - 240px)", borderTop: "2px solid #10162F", background: "#F8FAFC" }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#10162F22" gap={28} size={1.5} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => NODE_META[n.data?.type]?.color || "#3A10E5"}
            maskColor="rgba(255,240,229,0.7)"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>

      {selected && (
        <NodeDetailPanel
          node={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {error && (
        <div style={{
          position: "fixed", bottom: 16, left: 16, zIndex: 100,
          border: "2px solid #E91C11", background: "#FEE2E2",
          color: "#E91C11", padding: "8px 14px", borderRadius: 8, fontWeight: 600,
        }}>{error}</div>
      )}
    </div>
  );
}

// ── Hero / banner that mimics the UML page ─────────────────────────────
function Hero({ careerGoal, nodeCount, progress, onRegenerate, regenerating }) {
  return (
    <div className="border-b-2" style={{ borderColor: "#10162F", background: "#FFF0E5" }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1 className="font-bold leading-tight mb-3"
              style={{ fontSize: "3rem", color: "#10162F", letterSpacing: "-0.02em" }}>
              AI Problem-Solving Roadmap
            </h1>
            <p className="text-lg max-w-xl" style={{ color: "#3D4168", lineHeight: 1.6 }}>
              A personalized pyramid of debugging challenges, projects, and real-world Stack
              Overflow & YouTube resources tuned to your weaknesses and career goal.
            </p>
            {careerGoal && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "#3A10E5",
                  background: "#3A10E512", border: "1.5px solid #3A10E540",
                  padding: "3px 10px", borderRadius: 4,
                }}>🎯 {careerGoal}</span>
                {nodeCount != null && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "#10162F",
                    background: "#FFFFFF", border: "1.5px solid #10162F",
                    padding: "3px 10px", borderRadius: 4,
                  }}>{nodeCount} STEPS</span>
                )}
              </div>
            )}
          </div>

          {onRegenerate && (
            <div style={{ minWidth: 280 }}>
              <div style={{
                background: "#FFFFFF", border: "2px solid #10162F",
                borderRadius: 10, padding: 16,
              }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#10162F", textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Your progress
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#3A10E5" }}>{progress}%</span>
                </div>
                <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden", border: "1.5px solid #10162F" }}>
                  <div style={{
                    width: `${progress}%`, height: "100%",
                    background: "#3A10E5", transition: "width .4s",
                  }} />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={onRegenerate} disabled={regenerating} className="rm-btn ghost" style={{ flex: 1, justifyContent: "center" }}>
                    <ReloadOutlined className={regenerating ? "animate-spin" : ""} />
                    {regenerating ? "Regenerating…" : "Regenerate"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#3D4168", marginTop: 10, lineHeight: 1.4 }}>
                  <ThunderboltOutlined style={{ color: "#3A10E5" }} /> The roadmap evolves as you complete steps.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Type legend */}
        <div className="mt-8 flex flex-wrap gap-2">
          {Object.entries(NODE_META).map(([k, m]) => (
            <span key={k} style={{
              fontSize: 11, fontWeight: 700, color: "#10162F",
              background: "#FFFFFF", border: `2px solid ${m.color}`,
              padding: "4px 10px", borderRadius: 999,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ color: m.color }}>●</span> {m.icon} {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
