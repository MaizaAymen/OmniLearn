import React, { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import {
  Typography,
  Card,
  Tabs,
  Tag,
  Button,
  Input,
  Alert,
  Space,
  List,
  Divider,
} from "antd";
import {
  BookOutlined,
  BulbOutlined,
  CodeOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  RocketOutlined,
  FireOutlined,
  AimOutlined,
} from "@ant-design/icons";
import Navbar from "../components/Navbar";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ─── Constants ──────────────────────────────────────────────────────────────

const STEP_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
];

const TIER_LABELS = [
  "Fundamentals",
  "Core Concept",
  "Intermediate",
  "Advanced",
  "Optimization",
];

// ─── Dagre Layout ────────────────────────────────────────────────────────────

function getLayoutedElements(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: 240, height: 68 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return { ...n, position: { x: pos.x - 120, y: pos.y - 34 } };
    }),
    edges,
  };
}

// ─── Custom Node ─────────────────────────────────────────────────────────────

function StepNode({ data }) {
  const color = STEP_COLORS[(data.step - 1) % STEP_COLORS.length];
  const tierLabel = TIER_LABELS[Math.min(data.step - 1, TIER_LABELS.length - 1)];

  return (
    <div
      style={{
        background: data.completed
          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
          : `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        color: "#fff",
        borderRadius: 14,
        padding: "10px 16px",
        width: 240,
        border: data.selected
          ? "3px solid rgba(255,255,255,0.9)"
          : "2px solid rgba(255,255,255,0.15)",
        boxShadow: data.selected
          ? `0 0 0 4px ${color}45, 0 8px 24px rgba(0,0,0,0.2)`
          : "0 4px 14px rgba(0,0,0,0.13)",
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        transform: data.selected ? "scale(1.04)" : "scale(1)",
        userSelect: "none",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            background: "rgba(255,255,255,0.25)",
            borderRadius: "50%",
            width: 30,
            height: 30,
            minWidth: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {data.completed ? "✓" : data.step}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.label}
          </div>
          <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2, fontWeight: 500 }}>
            {tierLabel}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { stepNode: StepNode };

// ─── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel({ stepData, completed, onToggleComplete }) {
  if (!stepData) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          textAlign: "center",
        }}
      >
        <AimOutlined style={{ fontSize: 52, color: "#cbd5e1", marginBottom: 16 }} />
        <Title level={4} style={{ color: "#64748b", marginBottom: 8 }}>
          Click a node to explore
        </Title>
        <Text type="secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
          Select any concept in the roadmap to see detailed explanations, hints,
          practice problems, and resources.
        </Text>
      </div>
    );
  }

  const color = STEP_COLORS[(stepData.step - 1) % STEP_COLORS.length];

  const tabItems = [
    {
      key: "learn",
      label: (
        <span>
          <BookOutlined /> Learn
        </span>
      ),
      children: (
        <div style={{ padding: "4px 0" }}>
          <Paragraph style={{ fontSize: 14, lineHeight: 1.75, color: "#374151", margin: 0 }}>
            {stepData.explanation}
          </Paragraph>
          {stepData.example && (
            <>
              <Divider
                plain
                style={{ fontSize: 12, color: "#9ca3af", margin: "16px 0 12px" }}
              >
                Example
              </Divider>
              <pre
                style={{
                  background: "#1e293b",
                  color: "#e2e8f0",
                  borderRadius: 10,
                  padding: "14px 16px",
                  fontSize: 13,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: '"JetBrains Mono","Fira Code","Courier New",monospace',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {stepData.example}
              </pre>
            </>
          )}
        </div>
      ),
    },
    {
      key: "hints",
      label: (
        <span>
          <BulbOutlined /> Hints
        </span>
      ),
      children: (
        <List
          dataSource={stepData.hints || []}
          renderItem={(hint, i) => (
            <List.Item
              style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}
            >
              <Space align="start">
                <div
                  style={{
                    background: color + "20",
                    color: color,
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    minWidth: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <Text style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                  {hint}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      ),
    },
    {
      key: "practice",
      label: (
        <span>
          <FireOutlined /> Practice
        </span>
      ),
      children: (
        <List
          dataSource={stepData.practice || []}
          renderItem={(problem) => (
            <List.Item
              style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}
            >
              <Space align="start">
                <CodeOutlined style={{ color, marginTop: 3, flexShrink: 0 }} />
                <Text style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                  {problem}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      ),
    },
    {
      key: "resources",
      label: (
        <span>
          <LinkOutlined /> Resources
        </span>
      ),
      children: (
        <List
          dataSource={stepData.resources || []}
          renderItem={(resource) => (
            <List.Item
              style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}
            >
              <Space align="start">
                <RocketOutlined style={{ color, marginTop: 3, flexShrink: 0 }} />
                <Text style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                  {resource}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "0 2px" }}>
      {/* Step header card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 16,
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                opacity: 0.8,
                marginBottom: 5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Step {stepData.step}
            </div>
            <Title level={4} style={{ color: "#fff", margin: "0 0 6px", lineHeight: 1.3 }}>
              {stepData.title}
            </Title>
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 13,
                display: "block",
                lineHeight: 1.5,
              }}
            >
              {stepData.description}
            </Text>
          </div>
          <Button
            size="small"
            onClick={onToggleComplete}
            style={{
              flexShrink: 0,
              background: completed ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)",
              border: "none",
              color: completed ? color : "#fff",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              height: 32,
            }}
            icon={completed ? <CheckCircleOutlined /> : null}
          >
            {completed ? "Done ✓" : "Mark Done"}
          </Button>
        </div>
      </div>

      <Tabs items={tabItems} size="small" style={{ marginTop: -4 }} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProblemRoadmap() {
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roadmapData, setRoadmapData] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // ── Layout: compute only when roadmapData changes ──
  const baseLayout = useMemo(() => {
    if (!roadmapData?.roadmap) return null;

    const rawNodes = roadmapData.roadmap.map((step) => ({
      id: String(step.step),
      type: "stepNode",
      data: { label: step.title, step: step.step, selected: false, completed: false },
      position: { x: 0, y: 0 },
    }));

    const rawEdges = roadmapData.roadmap.slice(1).map((step, i) => ({
      id: `e${i + 1}-${step.step}`,
      source: String(i + 1),
      target: String(step.step),
      style: { stroke: "#94a3b8", strokeWidth: 2 },
      animated: true,
    }));

    return getLayoutedElements(rawNodes, rawEdges);
  }, [roadmapData]);

  // ── Inject selection / completion state into nodes ──
  const nodes = useMemo(() => {
    if (!baseLayout) return [];
    return baseLayout.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        selected: selectedStep === parseInt(node.id),
        completed: completedSteps.has(parseInt(node.id)),
      },
    }));
  }, [baseLayout, selectedStep, completedSteps]);

  const edges = baseLayout?.edges ?? [];

  // ── Handlers ──
  const handleGenerate = async () => {
    if (!problem.trim()) return;
    setLoading(true);
    setError(null);
    setSelectedStep(null);
    setCompletedSteps(new Set());
    try {
      const res = await fetch("http://localhost:5000/api/ai/generate/problem-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: problem.trim() }),
      });
      if (!res.ok) throw new Error("Failed to generate roadmap");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRoadmapData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = useCallback((_event, node) => {
    setSelectedStep(parseInt(node.id));
  }, []);

  const toggleComplete = useCallback(() => {
    if (selectedStep === null) return;
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(selectedStep)) next.delete(selectedStep);
      else next.add(selectedStep);
      return next;
    });
  }, [selectedStep]);

  const selectedStepData = roadmapData?.roadmap?.find((s) => s.step === selectedStep) ?? null;
  const totalSteps = roadmapData?.roadmap?.length ?? 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps.size / totalSteps) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <Navbar />

      {/* ── Hero header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%)",
          padding: "48px 32px 44px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 8, lineHeight: 1 }}>🗺️</div>
        <Title
          level={1}
          style={{
            color: "#fff",
            margin: "0 0 10px",
            fontSize: "clamp(22px, 4vw, 34px)",
            letterSpacing: "-0.5px",
          }}
        >
          Problem Learning Roadmap
        </Title>
        <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 16 }}>
          Paste any LeetCode problem and get a personalized, step-by-step concept roadmap
        </Text>
      </div>

      {/* ── Content area ── */}
      <div
        style={{
          flex: 1,
          padding: "28px 24px",
          maxWidth: 1440,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Input card */}
        <Card
          bordered={false}
          style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}
        >
          <TextArea
            rows={5}
            placeholder={`Paste a LeetCode problem here…\n\nExample:\nTwo Sum — Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.`}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            disabled={loading}
            style={{ fontSize: 14, borderRadius: 10, resize: "vertical", marginBottom: 14 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="primary"
              size="large"
              onClick={handleGenerate}
              loading={loading}
              disabled={!problem.trim()}
              style={{
                background: "linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)",
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                padding: "0 32px",
                height: 44,
              }}
              icon={loading ? <LoadingOutlined /> : <RocketOutlined />}
            >
              {loading ? "Generating roadmap…" : "Generate Roadmap"}
            </Button>
          </div>
          {error && (
            <Alert
              message="Generation failed"
              description={error}
              type="error"
              showIcon
              style={{ marginTop: 14, borderRadius: 10 }}
            />
          )}
        </Card>

        {/* ── Concepts + progress bar ── */}
        {roadmapData && (
          <>
            <Card
              bordered={false}
              style={{
                borderRadius: 16,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Text strong style={{ marginRight: 10, color: "#374151", fontSize: 13 }}>
                    Concepts detected:
                  </Text>
                  {(roadmapData.concepts_detected ?? []).map((c, i) => (
                    <Tag
                      key={i}
                      style={{
                        background: STEP_COLORS[i % STEP_COLORS.length] + "18",
                        color: STEP_COLORS[i % STEP_COLORS.length],
                        border: `1px solid ${STEP_COLORS[i % STEP_COLORS.length]}38`,
                        borderRadius: 20,
                        padding: "2px 12px",
                        fontWeight: 600,
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      {c}
                    </Tag>
                  ))}
                </div>

                {/* Progress */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Progress:
                  </Text>
                  <div
                    style={{
                      width: 130,
                      height: 8,
                      background: "#e2e8f0",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #22c55e, #10b981)",
                        borderRadius: 6,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <Text
                    strong
                    style={{
                      fontSize: 13,
                      color: progress === 100 ? "#10b981" : "#374151",
                      minWidth: 44,
                    }}
                  >
                    {completedSteps.size}/{totalSteps}
                  </Text>
                  {progress === 100 && (
                    <CheckCircleOutlined style={{ color: "#10b981", fontSize: 18 }} />
                  )}
                </div>
              </div>
            </Card>

            {/* ── Flow + detail panel ── */}
            <div
              style={{
                display: "flex",
                gap: 20,
                height: 600,
                minHeight: 480,
              }}
            >
              {/* ReactFlow graph */}
              <Card
                bordered={false}
                style={{
                  flex: "1 1 0",
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                  padding: 0,
                }}
                styles={{ body: { padding: 0, height: "100%" } }}
              >
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodeClick={onNodeClick}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    panOnDrag
                    zoomOnScroll
                    minZoom={0.3}
                    maxZoom={2.5}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background color="#e2e8f0" gap={22} size={1} />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </ReactFlowProvider>
              </Card>

              {/* Step detail panel */}
              <Card
                bordered={false}
                style={{
                  width: 390,
                  minWidth: 310,
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
                styles={{ body: { height: "100%", overflow: "auto", padding: 20 } }}
              >
                <DetailPanel
                  stepData={selectedStepData}
                  completed={completedSteps.has(selectedStep)}
                  onToggleComplete={toggleComplete}
                />
              </Card>
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {!roadmapData && !loading && (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: 68, marginBottom: 16, opacity: 0.25 }}>🎯</div>
            <Title level={3} style={{ color: "#64748b", marginBottom: 8 }}>
              Ready to learn?
            </Title>
            <Text type="secondary" style={{ fontSize: 15 }}>
              Paste a LeetCode problem above and click "Generate Roadmap" to receive a
              personalized learning path.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
