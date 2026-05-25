import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeploymentUnitOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import RoadmapNode from "../Roadmap/RoadmapNode";
import InheritanceEdge from "../Roadmap/InheritanceEdge";
import NodeDetailPanel from "../Roadmap/NodeDetailPanel";
import { STATUS_META } from "../Roadmap/nodeTypes";
import { roadmapApi } from "../Roadmap/api";
import "../Roadmap/roadmap.css";

const { Text } = Typography;

const nodeTypes = { roadmap: RoadmapNode };
const edgeTypes = { inheritance: InheritanceEdge };

/* ── Layout constants (mirrors RoadmapPage) ────────────────────────── */
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

function countByStatus(graph, status) {
  if (!graph?.nodes) return 0;
  return graph.nodes.filter((n) => (n.status || "pending") === status).length;
}

/* ════════════════════════════════════════════════════════════════════ */

export default function ClassroomRoadmapTab({ classId, canManage }) {
  return (
    <ReactFlowProvider>
      <Inner classId={classId} canManage={canManage} />
    </ReactFlowProvider>
  );
}

function Inner({ classId, canManage }) {
  const [loading, setLoading]     = useState(true);
  const [roadmap, setRoadmap]     = useState(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await roadmapApi.classroom.get(classId);
      setRoadmap(data.roadmap || null);
      setIsTeacher(!!data.isTeacher);
      if (data.isTeacher && data.roadmap) {
        const d = await roadmapApi.classroom.dashboard(classId);
        setDashboard(d);
      } else {
        setDashboard(null);
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.error || "Failed to load classroom roadmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await roadmapApi.classroom.generate(classId, {
        title: values.title,
        careerGoal: values.careerGoal,
        interests: (values.interests || "").split(",").map((s) => s.trim()).filter(Boolean),
        programmingLanguages: (values.languages || "").split(",").map((s) => s.trim()).filter(Boolean),
      });
      message.success("Roadmap created and shared with students!");
      setShowCreate(false);
      form.resetFields();
      await load();
    } catch (err) {
      if (err.errorFields) return;
      console.error(err);
      message.error(err.response?.data?.error || "Failed to generate roadmap");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await roadmapApi.classroom.remove(classId);
      message.success("Roadmap removed");
      await load();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to delete");
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48 }}><Spin size="large" /></div>;
  }

  // ── No roadmap yet ────────────────────────────────────────────────
  if (!roadmap) {
    return (
      <>
        <Empty
          image={<DeploymentUnitOutlined style={{ fontSize: 48, color: "#4f46e5" }} />}
          description={
            canManage
              ? "No roadmap yet. Create one and it will be shared with every student in this class."
              : "Your teacher hasn't shared a roadmap yet."
          }
        >
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
              Create Roadmap
            </Button>
          )}
        </Empty>

        <CreateRoadmapModal
          open={showCreate}
          onCancel={() => setShowCreate(false)}
          onOk={handleCreate}
          confirmLoading={creating}
          form={form}
        />
      </>
    );
  }

  // ── Teacher view: two sub-tabs (roadmap viz + student progress) ──
  if (isTeacher) {
    return (
      <div>
        <Card
          style={{ marginBottom: 12, borderRadius: 12 }}
          bodyStyle={{ padding: "12px 16px" }}
          title={
            <span>
              <DeploymentUnitOutlined style={{ color: "#4f46e5", marginRight: 8 }} />
              {roadmap.title}
            </span>
          }
          extra={
            <Popconfirm
              title="Delete this roadmap and all student copies?"
              onConfirm={handleDelete}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          }
        >
          <Text type="secondary">
            Shared with {dashboard?.students?.length || 0} students · class average{" "}
            <strong>{dashboard?.classAverage || 0}%</strong>
          </Text>
        </Card>

        <Tabs
          defaultActiveKey="viz"
          items={[
            {
              key: "viz",
              label: "Roadmap",
              children: <RoadmapCanvas graph={roadmap.graph} readOnly classId={classId} />,
            },
            {
              key: "progress",
              label: `Student progress (${dashboard?.students?.length || 0})`,
              children: <StudentTable dashboard={dashboard} />,
            },
          ]}
        />
      </div>
    );
  }

  // ── Student view: full interactive roadmap on their own copy ─────
  return (
    <RoadmapCanvas
      graph={roadmap.graph}
      classId={classId}
      onGraphChange={(g) => setRoadmap((r) => ({ ...r, graph: g }))}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════
 * The actual roadmap visualization — ReactFlow canvas + stage nav +
 * NodeDetailPanel. Mirrors RoadmapPage but talks to the classroom api
 * (or stays read-only for the teacher).
 * ════════════════════════════════════════════════════════════════════ */
function RoadmapCanvas({ graph: graphProp, readOnly = false, classId, onGraphChange }) {
  const [graph, setGraph] = useState(graphProp);
  useEffect(() => { setGraph(graphProp); }, [graphProp]);

  const [activeStage, setActiveStage] = useState(0);
  const [selected, setSelected]       = useState(null);

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

  const onNodeClick = useCallback((_, n) => setSelected(n.data), []);

  // Local graph mutation — keep panel + canvas in sync after a status / quiz update.
  const applyStatus = useCallback((nodeId, status) => {
    setGraph((prev) => {
      if (!prev) return prev;
      const next = { ...prev, nodes: prev.nodes.map((n) => n.id === nodeId ? { ...n, status } : n) };
      if (onGraphChange) onGraphChange(next);
      return next;
    });
    setSelected((cur) => cur?.id === nodeId ? { ...cur, status } : cur);
  }, [onGraphChange]);

  // Classroom-scoped api adapters passed into NodeDetailPanel.
  const setStatusFn  = useCallback((nodeId, s) => roadmapApi.classroom.setStatus(classId, nodeId, s), [classId]);
  const quizSubmitFn = useCallback((nodeId, score) => roadmapApi.classroom.quizSubmit(classId, nodeId, score), [classId]);
  // Resources are embedded on the node at generate time — no fetch needed.
  const getResourcesFn = useCallback((node) => node.resources || {}, []);

  if (!graph?.nodes?.length) {
    return <Empty description="This roadmap has no steps yet." style={{ padding: 48 }} />;
  }

  return (
    <div className="rm-shell-plain" style={{ height: "calc(10vh - 280px)", minHeight: 820, position: "relative" }}>
      {/* Stage nav */}


      {/* Status counters */}
      <div style={{ display: "flex", gap: 12, padding: "0 4px 8px", fontSize: 12 }}>
        {Object.entries(STATUS_META).map(([id, t]) => (
          <span key={id} className="rm-navbar-stat" title={t.label}>
            <i style={{ background: t.color }} />
            {countByStatus(graph, id)} {t.label}
          </span>
        ))}
      </div>

      {/* Canvas */}
      <main className="rm-canvas-wrap-plain" style={{ flex: 1, position: "relative", border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden" }}>
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
              <span>Step Details {readOnly && <Tag color="default" style={{ marginLeft: 6 }}>read-only</Tag>}</span>
              <button onClick={() => setSelected(null)}>✕</button>
            </div>
            <NodeDetailPanel
              node={selected}
              onStatusChange={applyStatus}
              setStatusFn={setStatusFn}
              quizSubmitFn={quizSubmitFn}
              getResourcesFn={getResourcesFn}
              readOnly={readOnly}
              embedded
            />
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Student progress table (teacher only) ─────────────────────────── */
function StudentTable({ dashboard }) {
  return (
    <Card style={{ borderRadius: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <Text strong>Class average: </Text>
        <Progress
          percent={dashboard?.classAverage || 0}
          strokeColor="#4f46e5"
          style={{ maxWidth: 320 }}
        />
      </div>
      <Table
        size="small"
        rowKey={(r) => r.studentId}
        dataSource={dashboard?.students || []}
        pagination={false}
        locale={{ emptyText: "No students enrolled yet." }}
        columns={[
          { title: "Student", dataIndex: "name", key: "name" },
          {
            title: "Progress",
            dataIndex: "progress",
            key: "progress",
            render: (p) => <Progress percent={p} size="small" />,
            sorter: (a, b) => a.progress - b.progress,
          },
          {
            title: "Avg quiz score",
            dataIndex: "avgQuizScore",
            key: "avgQuizScore",
            render: (s) => `${s}%`,
            sorter: (a, b) => a.avgQuizScore - b.avgQuizScore,
          },
          {
            title: "Certificate",
            dataIndex: "certificateIssuedAt",
            key: "cert",
            render: (d) => (d ? <Tag color="gold">🏆 Earned</Tag> : <Tag>—</Tag>),
          },
          {
            title: "Last activity",
            dataIndex: "lastActivityAt",
            key: "lastActivityAt",
            render: (d) => (d ? new Date(d).toLocaleDateString() : "—"),
          },
        ]}
      />
    </Card>
  );
}

/* ── Create modal ──────────────────────────────────────────────────── */
function CreateRoadmapModal({ open, onCancel, onOk, confirmLoading, form }) {
  return (
    <Modal
      title="Create classroom roadmap"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={confirmLoading ? "Generating…" : "Generate & share"}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: "Give your roadmap a title" }]}
        >
          <Input placeholder="e.g. Intro to Web Development" />
        </Form.Item>
        <Form.Item
          name="careerGoal"
          label="Goal / topic"
          rules={[{ required: true, message: "What is this roadmap about?" }]}
        >
          <Input placeholder="e.g. Become a junior full-stack developer" />
        </Form.Item>
        <Form.Item name="languages" label="Programming languages (comma-separated)">
          <Input placeholder="JavaScript, Python" />
        </Form.Item>
        <Form.Item name="interests" label="Interests (comma-separated)">
          <Input placeholder="react, databases, algorithms" />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: 12 }}>
          A roadmap will be generated by AI and a copy will be shared with every student in this classroom.
        </Text>
      </Form>
    </Modal>
  );
}
