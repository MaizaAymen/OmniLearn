import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  getBezierPath,
} from '@xyflow/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Drawer, Button, Tag, Collapse, Typography, Spin, Alert, Space } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';
import '@xyflow/react/dist/style.css';

const STORAGE_KEY = 'omnilearn_uml_reactflow_v1';
const SAVE_DEBOUNCE_MS = 250;
const UML_API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uml`;

const TYPES = {
  class: { label: 'Class', bg: '#EFF6FF', border: '#3B82F6', italic: false },
  interface: { label: 'Interface', bg: '#F5F3FF', border: '#8B5CF6', italic: true },
  abstract: { label: 'Abstract', bg: '#F8FAFC', border: '#64748B', italic: true },
  enum: { label: 'Enum', bg: '#FFFBEB', border: '#F59E0B', italic: false },
  note: { label: 'Note', bg: '#FEFCE8', border: '#EAB308', italic: false },
};

const LINKS = [
  { id: 'association', label: 'Association' },
  { id: 'inheritance', label: 'Inheritance' },
  { id: 'realization', label: 'Realization' },
  { id: 'aggregation', label: 'Aggregation' },
  { id: 'composition', label: 'Composition' },
  { id: 'dependency', label: 'Dependency' },
];

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function norm(dx, dy) {
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}

function rotate(vx, vy) {
  return { x: -vy, y: vx };
}

function pointsToStr(points) {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function triangleAtTip(tip, dir, size) {
  const ortho = rotate(dir.x, dir.y);
  const base = { x: tip.x - dir.x * size, y: tip.y - dir.y * size };
  return [
    tip,
    { x: base.x + ortho.x * (size * 0.55), y: base.y + ortho.y * (size * 0.55) },
    { x: base.x - ortho.x * (size * 0.55), y: base.y - ortho.y * (size * 0.55) },
  ];
}

function openArrowAtTip(tip, dir, size) {
  const ortho = rotate(dir.x, dir.y);
  const back = { x: tip.x - dir.x * size, y: tip.y - dir.y * size };
  return [
    { x: back.x + ortho.x * (size * 0.5), y: back.y + ortho.y * (size * 0.5) },
    tip,
    { x: back.x - ortho.x * (size * 0.5), y: back.y - ortho.y * (size * 0.5) },
  ];
}

function diamondAtSource(source, dir, size) {
  const ortho = rotate(dir.x, dir.y);
  const p0 = source;
  const p1 = { x: source.x + dir.x * (size * 0.6) + ortho.x * (size * 0.45), y: source.y + dir.y * (size * 0.6) + ortho.y * (size * 0.45) };
  const p2 = { x: source.x + dir.x * (size * 1.2), y: source.y + dir.y * (size * 1.2) };
  const p3 = { x: source.x + dir.x * (size * 0.6) - ortho.x * (size * 0.45), y: source.y + dir.y * (size * 0.6) - ortho.y * (size * 0.45) };
  return [p0, p1, p2, p3];
}

function relationStyle(relationType) {
  if (relationType === 'realization') return { dash: '6 4', stroke: '#475569' };
  if (relationType === 'dependency') return { dash: '5 4', stroke: '#475569' };
  return { dash: undefined, stroke: '#475569' };
}

function UmlEdge(props) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
  } = props;

  const relationType = data?.relationType || 'association';
  const label = LINKS.find((l) => l.id === relationType)?.label || relationType;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { dash, stroke } = relationStyle(relationType);
  const dir = norm(targetX - sourceX, targetY - sourceY);

  let sourceMarker = null;
  let targetMarker = null;

  if (relationType === 'inheritance' || relationType === 'realization') {
    targetMarker = (
      <polygon
        points={pointsToStr(triangleAtTip({ x: targetX, y: targetY }, dir, 14))}
        fill='white'
        stroke='#1E293B'
        strokeWidth='1.4'
      />
    );
  } else if (relationType === 'dependency') {
    const pts = openArrowAtTip({ x: targetX, y: targetY }, dir, 12);
    targetMarker = (
      <polyline
        points={pointsToStr(pts)}
        fill='none'
        stroke='#1E293B'
        strokeWidth='1.4'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    );
  }

  if (relationType === 'aggregation' || relationType === 'composition') {
    sourceMarker = (
      <polygon
        points={pointsToStr(diamondAtSource({ x: sourceX, y: sourceY }, dir, 14))}
        fill={relationType === 'composition' ? '#1E293B' : 'white'}
        stroke='#1E293B'
        strokeWidth='1.4'
      />
    );
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke, strokeWidth: selected ? 2.2 : 1.6, strokeDasharray: dash }}
      />
      {sourceMarker}
      {targetMarker}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'none',
            fontSize: 10,
            color: '#64748B',
            background: 'rgba(255,255,255,0.85)',
            padding: '1px 5px',
            borderRadius: 6,
            border: '1px solid #E2E8F0',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function UmlNode({ data, selected }) {
  const t = TYPES[data.umlType] || TYPES.class;

  return (
    <div
      style={{
        minWidth: 220,
        borderRadius: 8,
        border: `2px solid ${selected ? '#1D4ED8' : t.border}`,
        background: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : '0 1px 2px rgba(15,23,42,0.08)',
      }}
    >
      <div style={{ background: t.bg, borderBottom: `1px solid ${t.border}`, padding: '8px 10px' }}>
        {!!data.stereotype && <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic' }}>{data.stereotype}</div>}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontStyle: t.italic ? 'italic' : 'normal' }}>{data.name}</div>
      </div>

      <div style={{ borderBottom: '1px solid #E2E8F0', padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: '#334155', minHeight: 28 }}>
        {data.attributes?.length ? data.attributes.map((a, i) => <div key={i}>{a}</div>) : <div style={{ color: '#94A3B8' }}>-</div>}
      </div>

      <div style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: '#334155', minHeight: 28 }}>
        {data.operations?.length ? data.operations.map((o, i) => <div key={i}>{o}</div>) : <div style={{ color: '#94A3B8' }}>-</div>}
      </div>

      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='target' position={Position.Top} id='t-top' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

const nodeTypes = { uml: UmlNode };
const edgeTypes = { uml: UmlEdge };

const S = {
  ribbon: {
    height: 56,
    flexShrink: 0,
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 12,
  },
  sideHeader: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#0F172A',
    whiteSpace: 'nowrap',
  },
  ribbonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    overflowX: 'auto',
  },
  ribbonBtn: (active = false, danger = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    background: active ? '#1D4ED8' : danger ? '#7F1D1D' : '#F8FAFC',
    color: active ? '#FFFFFF' : danger ? '#FFFFFF' : '#334155',
    border: `1px solid ${active ? '#1D4ED8' : danger ? '#7F1D1D' : '#E2E8F0'}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }),
  btn: (active = false, danger = false) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '7px 10px',
    marginBottom: 3,
    background: active ? '#1D4ED8' : danger ? '#7F1D1D' : '#1E293B',
    color: active ? '#FFFFFF' : '#CBD5E1',
    border: active ? '1px solid #3B82F6' : '1px solid transparent',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
  }),
  dot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  sep: { width: 1, alignSelf: 'stretch', background: '#E2E8F0' },
  divider: { height: 1, background: '#1E293B', margin: '8px 0' },
  panel: {
    width: 280,
    flexShrink: 0,
    background: '#FFFFFF',
    borderLeft: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #F1F5F9',
    background: '#F8FAFC',
  },
  panelBody: { flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' },
  fieldInput: {
    width: '100%',
    padding: '6px 9px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid #E2E8F0',
    outline: 'none',
    background: '#F8FAFC',
    color: '#1E293B',
    boxSizing: 'border-box',
  },
  rowFlex: { display: 'flex', gap: 4, marginBottom: 3 },
  removeBtn: {
    flexShrink: 0,
    background: '#FEE2E2',
    border: 'none',
    borderRadius: 4,
    color: '#DC2626',
    cursor: 'pointer',
    padding: '0 8px',
    fontSize: 14,
    lineHeight: '28px',
  },
  addBtn: {
    fontSize: 11,
    color: '#3B82F6',
    background: 'none',
    border: '1px dashed #BFDBFE',
    borderRadius: 5,
    cursor: 'pointer',
    padding: '5px 8px',
    marginTop: 2,
    width: '100%',
    textAlign: 'left',
  },
  applyBtn: {
    margin: '4px 14px 14px',
    padding: '9px',
    background: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(248,250,252,0.92)',
    borderTop: '1px solid #E2E8F0',
    padding: '5px 14px',
    fontSize: 11,
    color: '#64748B',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
};
// initial diagram that will be find by default 
function initialDiagram() {
  const animalId = uid('node');
  const dogId = uid('node');
  const iId = uid('node');
  return {
    nodes: [
      {
        id: animalId,
        type: 'uml',
        position: { x: 80, y: 80 },
        data: {
          umlType: 'class',
          name: 'Animal',
          stereotype: '',
          attributes: ['+ name : String', '+ age : int'],
          operations: ['+ speak() : void', '+ move() : void'],
        },
      },
      {
        id: dogId,
        type: 'uml',
        position: { x: 80, y: 340 },
        data: {
          umlType: 'class',
          name: 'Dog',
          stereotype: '',
          attributes: ['+ breed : String'],
          operations: ['+ fetch() : void'],
        },
      },
      {
        id: iId,
        type: 'uml',
        position: { x: 420, y: 90 },
        data: {
          umlType: 'interface',
          name: 'Serializable',
          stereotype: '«interface»',
          attributes: [],
          operations: ['+ serialize() : String', '+ deserialize() : void'],
        },
      },
    ],
    edges: [
      { id: uid('edge'), source: dogId, target: animalId, type: 'uml', data: { relationType: 'inheritance' } },
      { id: uid('edge'), source: animalId, target: iId, type: 'uml', data: { relationType: 'realization' } },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function sanitizeStored(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const edges = Array.isArray(payload.edges) ? payload.edges : [];

  const safeNodes = nodes
    .filter((n) => n && typeof n.id === 'string')
    .map((n) => ({
      ...n,
      type: 'uml',
      position: {
        x: Number.isFinite(n?.position?.x) ? n.position.x : 120,
        y: Number.isFinite(n?.position?.y) ? n.position.y : 120,
      },
      data: {
        umlType: TYPES[n?.data?.umlType] ? n.data.umlType : 'class',
        name: n?.data?.name || 'Unnamed',
        stereotype: n?.data?.stereotype || '',
        attributes: Array.isArray(n?.data?.attributes) ? n.data.attributes : [],
        operations: Array.isArray(n?.data?.operations) ? n.data.operations : [],
      },
    }));

  const idSet = new Set(safeNodes.map((n) => n.id));
  const safeEdges = edges
    .filter((e) => e && typeof e.id === 'string' && idSet.has(e.source) && idSet.has(e.target))
    .map((e) => ({
      ...e,
      type: 'uml',
      data: {
        relationType: LINKS.some((l) => l.id === e?.data?.relationType) ? e.data.relationType : 'association',
      },
    }));

  const viewport = payload?.viewport || { x: 0, y: 0, zoom: 1 };
  const safeViewport = {
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
    zoom: Number.isFinite(viewport.zoom) ? viewport.zoom : 1,
  };

  if (!safeNodes.length) return null;
  return { nodes: safeNodes, edges: safeEdges, viewport: safeViewport };
}

function UMLEditorInner() {
  const navigate = useNavigate();
  const { id: problemId } = useParams();
  const wrapperRef = useRef(null);
  const reactFlowRef = useRef(null);
  const saveTimerRef = useRef(null);
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [ready, setReady] = useState(false);

  const [linkType, setLinkType] = useState('association');
  const [statusText, setStatusText] = useState('Ready');
  const [zoom, setZoom] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [panel, setPanel] = useState(null);
  const [problemMeta, setProblemMeta] = useState(null);
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemError, setProblemError] = useState('');
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const persist = useCallback((nextNodes, nextEdges, nextViewport) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ nodes: nextNodes, edges: nextEdges, viewport: nextViewport || viewportRef.current })
        );
      } catch {
        // ignore storage write issues
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (problemId) {
      setNodes([]);
      setEdges([]);
      viewportRef.current = { x: 0, y: 0, zoom: 1 };
      setSelectedNodeId(null);
      setPanel(null);
      setStatusText('Problem mode');
      setReady(true);
      return () => {
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
      };
    }

    let loaded = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = sanitizeStored(JSON.parse(raw));
        if (parsed) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          viewportRef.current = parsed.viewport;
          loaded = true;
          setStatusText('Diagram restored');
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    if (!loaded) {
      const seed = initialDiagram();
      setNodes(seed.nodes);
      setEdges(seed.edges);
      viewportRef.current = seed.viewport;
    }

    setReady(true);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [problemId]);

  useEffect(() => {
    if (!ready) return;
    if (problemId) return;
    persist(nodes, edges, viewportRef.current);
  }, [nodes, edges, ready, persist, problemId]);

  const onInit = useCallback((instance) => {
    reactFlowRef.current = instance;
    const v = viewportRef.current;
    window.requestAnimationFrame(() => {
      instance.setViewport(v, { duration: 0 });
      setZoom(Math.round((v.zoom || 1) * 100));
      if (!nodes.length) {
        instance.fitView({ padding: 0.2, duration: 0 });
      }
    });
  }, [nodes.length]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection) => {
    if (!connection.source || !connection.target) return;
    setEdges((eds) => [
      ...eds,
      {
        id: uid('edge'),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'uml',
        data: { relationType: linkType },
      },
    ]);
    setStatusText(`${LINKS.find((l) => l.id === linkType)?.label || 'Relationship'} created`);
  }, [linkType]);

  const addShape = useCallback((umlType) => {
    const rf = reactFlowRef.current;
    const bounds = wrapperRef.current?.getBoundingClientRect();

    const defaultPos = { x: 260, y: 140 };
    let pos = defaultPos;

    if (rf && bounds) {
      const flowPos = rf.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
      pos = { x: flowPos.x - 120, y: flowPos.y - 60 };
    }

    const t = TYPES[umlType] || TYPES.class;
    const node = {
      id: uid('node'),
      type: 'uml',
      position: pos,
      data: {
        umlType,
        name: umlType === 'class' ? 'NewClass' : `New${t.label}`,
        stereotype: umlType === 'interface' ? '«interface»' : umlType === 'abstract' ? '«abstract»' : '',
        attributes: umlType === 'class' ? ['+ attribute : type'] : [],
        operations: ['+ method() : void'],
      },
    };

    setNodes((nds) => [...nds, node]);
    setSelectedNodeId(node.id);
    setStatusText(`${t.label} added`);
  }, []);

  const openNodeEditor = useCallback((node) => {
    setSelectedNodeId(node.id);
    setPanel({
      id: node.id,
      name: node.data.name || '',
      umlType: node.data.umlType || 'class',
      stereotype: node.data.stereotype || '',
      attributes: [...(node.data.attributes || [])],
      operations: [...(node.data.operations || [])],
    });
  }, []);

  const applyPanel = useCallback(() => {
    if (!panel) return;
    setNodes((nds) => nds.map((n) => (
      n.id === panel.id
        ? {
            ...n,
            data: {
              ...n.data,
              name: panel.name,
              umlType: panel.umlType,
              stereotype: panel.stereotype,
              attributes: panel.attributes,
              operations: panel.operations,
            },
          }
        : n
    )));
    setPanel(null);
    setStatusText('Node updated');
  }, [panel]);

  const clearCanvas = useCallback(() => {
    if (!window.confirm('Clear the canvas?')) return;
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setPanel(null);
    localStorage.removeItem(STORAGE_KEY);
    setStatusText('Canvas cleared');
  }, []);

  const resetDiagram = useCallback(() => {
    if (!window.confirm('Reset diagram to default?')) return;
    const seed = initialDiagram();
    setNodes(seed.nodes);
    setEdges(seed.edges);
    viewportRef.current = seed.viewport;
    reactFlowRef.current?.setViewport(seed.viewport, { duration: 0 });
    setSelectedNodeId(null);
    setPanel(null);
    setStatusText('Diagram reset');
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setPanel(null);
  }, [selectedNodeId]);

  const exportJSON = useCallback(() => {
    const data = {
      nodes,
      edges,
      viewport: viewportRef.current,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'diagram.json';
    a.click();
  }, [nodes, edges]);

  const importJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = (ev) => {
        try {
          const parsed = sanitizeStored(JSON.parse(String(ev.target?.result || '{}')));
          if (!parsed) throw new Error('Invalid diagram');
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          viewportRef.current = parsed.viewport;
          reactFlowRef.current?.setViewport(parsed.viewport, { duration: 0 });
          setStatusText('Diagram imported');
        } catch {
          alert('Invalid JSON file');
        }
      };
      r.readAsText(file);
    };
    input.click();
  }, []);

  const fitView = useCallback(() => {
    reactFlowRef.current?.fitView({ padding: 0.2, duration: 180 });
    setStatusText('Fitted to view');
  }, []);

  const onMoveEnd = useCallback((_evt, viewport) => {
    viewportRef.current = viewport;
    setZoom(Math.round((viewport.zoom || 1) * 100));
  }, []);

  const onSelectionChange = useCallback(({ nodes: selNodes }) => {
    const first = selNodes?.[0];
    setSelectedNodeId(first?.id || null);
  }, []);

  useEffect(() => {
    if (!problemId) {
      setProblemMeta(null);
      setProblemError('');
      return;
    }

    const controller = new AbortController();

    const loadProblem = async () => {
      setProblemLoading(true);
      setProblemError('');
      try {
        const response = await fetch(`${UML_API_BASE}/problems/${problemId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Could not load UML problem details');
        }

        const data = await response.json();
        setProblemMeta(data);
        setStatusText('Problem loaded');
      } catch (error) {
        if (error.name === 'AbortError') return;
        setProblemError(error.message || 'Could not load UML problem details');
      } finally {
        setProblemLoading(false);
      }
    };

    loadProblem();
    return () => controller.abort();
  }, [problemId]);

  const loadProblemSolution = useCallback(async () => {
    if (!problemId) return;
    setSolutionLoading(true);
    setProblemError('');

    try {
      const response = await fetch(`${UML_API_BASE}/problems/${problemId}/solution?regenerate=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Could not load UML solution');
      }

      const data = await response.json();
      const diagram = sanitizeStored({
        nodes: data?.solution?.nodes || [],
        edges: data?.solution?.edges || [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      if (!diagram) {
        throw new Error('Solution format is invalid');
      }

      setNodes(diagram.nodes);
      setEdges(diagram.edges);
      viewportRef.current = diagram.viewport;
      reactFlowRef.current?.setViewport(diagram.viewport, { duration: 0 });
      window.setTimeout(() => {
        reactFlowRef.current?.fitView({ padding: 0.2, duration: 180 });
      }, 20);
      setStatusText('Solution loaded');
    } catch (error) {
      setProblemError(error.message || 'Could not load UML solution');
    } finally {
      setSolutionLoading(false);
    }
  }, [problemId]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        background: '#F8FAFC',
      }}
    >
      <div style={S.ribbon}>
        <div style={S.sideHeader}>
          <span style={{ color: '#3B82F6' }}>⬡</span>&nbsp; UML Editor
        </div>

        <div style={S.sep} />

        <div style={S.ribbonGroup}>
          {Object.entries(TYPES).map(([id, t]) => (
            <button key={id} style={S.ribbonBtn(false)} onClick={() => addShape(id)}>
              <span style={S.dot(t.border)} />
              {t.label}
            </button>
          ))}
        </div>

        <div style={S.sep} />

        <div style={S.ribbonGroup}>
          {LINKS.map(({ id, label }) => (
            <button key={id} style={S.ribbonBtn(linkType === id)} onClick={() => setLinkType(id)}>
              <span style={{ ...S.dot(linkType === id ? '#93C5FD' : '#94A3B8'), borderRadius: 2 }} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto' }} />

        <div style={S.sep} />
        {/* action buttons */}
        <div style={S.ribbonGroup}>
          <button style={S.ribbonBtn(false)} onClick={fitView}>Fit</button>
          <button style={S.ribbonBtn(false)} onClick={exportJSON}>Export</button>
          <button style={S.ribbonBtn(false)} onClick={importJSON}>Import</button>
          <button style={S.ribbonBtn(false)} onClick={resetDiagram}>Reset</button>
          <button style={S.ribbonBtn(false, true)} onClick={clearCanvas}>Clear</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div ref={wrapperRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={onInit}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={(_evt, node) => openNodeEditor(node)}
            onSelectionChange={onSelectionChange}
            onMoveEnd={onMoveEnd}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.25}
            maxZoom={2.5}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={14} size={1} color='#CBD5E1' />
            <Controls showInteractive={false} />
          </ReactFlow>

          <div
            style={{
              position: 'absolute',
              top: 14,
              right: panel ? 294 : 14,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              transition: 'right 0.2s',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: '#64748B',
                background: 'white',
                padding: '3px 10px',
                borderRadius: 20,
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {zoom}%
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              background: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 11,
              color: '#374151',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ ...S.dot(TYPES[linkType]?.border || '#3B82F6'), borderRadius: 2 }} />
            {LINKS.find((l) => l.id === linkType)?.label}
          </div>

          <div style={S.statusBar}>
            <span>{statusText}</span>
            {selectedNode && <span style={{ color: '#3B82F6' }}>1 element selected</span>}
          </div>
        </div>

        {panel && (
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Edit Element</span>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 16, padding: 0 }}
                onClick={() => setPanel(null)}
              >
                ✕
              </button>
            </div>

            <div style={S.panelBody}>
              <div>
                <label style={S.fieldLabel}>Class Name</label>
                <input style={S.fieldInput} value={panel.name} onChange={(e) => setPanel((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div>
                <label style={S.fieldLabel}>Type</label>
                <select style={S.fieldInput} value={panel.umlType} onChange={(e) => setPanel((p) => ({ ...p, umlType: e.target.value }))}>
                  {Object.entries(TYPES).map(([id, t]) => (
                    <option key={id} value={id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={S.fieldLabel}>Stereotype</label>
                <input
                  style={S.fieldInput}
                  placeholder='e.g. «entity»'
                  value={panel.stereotype}
                  onChange={(e) => setPanel((p) => ({ ...p, stereotype: e.target.value }))}
                />
              </div>

              <div style={{ height: 1, background: '#F1F5F9' }} />

              <div>
                <label style={S.fieldLabel}>Attributes</label>
                {panel.attributes.map((attr, i) => (
                  <div key={i} style={S.rowFlex}>
                    <input
                      style={{ ...S.fieldInput, flex: 1 }}
                      value={attr}
                      placeholder='+ name : type'
                      onChange={(e) => {
                        const arr = [...panel.attributes];
                        arr[i] = e.target.value;
                        setPanel((p) => ({ ...p, attributes: arr }));
                      }}
                    />
                    <button style={S.removeBtn} onClick={() => setPanel((p) => ({ ...p, attributes: p.attributes.filter((_, j) => j !== i) }))}>×</button>
                  </div>
                ))}
                <button style={S.addBtn} onClick={() => setPanel((p) => ({ ...p, attributes: [...p.attributes, '+ attr : type'] }))}>+ Add Attribute</button>
              </div>

              <div>
                <label style={S.fieldLabel}>Operations</label>
                {panel.operations.map((op, i) => (
                  <div key={i} style={S.rowFlex}>
                    <input
                      style={{ ...S.fieldInput, flex: 1 }}
                      value={op}
                      placeholder='+ method() : void'
                      onChange={(e) => {
                        const arr = [...panel.operations];
                        arr[i] = e.target.value;
                        setPanel((p) => ({ ...p, operations: arr }));
                      }}
                    />
                    <button style={S.removeBtn} onClick={() => setPanel((p) => ({ ...p, operations: p.operations.filter((_, j) => j !== i) }))}>×</button>
                  </div>
                ))}
                <button style={S.addBtn} onClick={() => setPanel((p) => ({ ...p, operations: [...p.operations, '+ method() : void'] }))}>+ Add Operation</button>
              </div>
            </div>

            <button style={S.applyBtn} onClick={applyPanel}>Apply Changes</button>
          </div>
        )}

        {problemId && !drawerOpen && (
          <Button
            type="primary"
            icon={<MenuUnfoldOutlined />}
            onClick={() => setDrawerOpen(true)}
            style={{
              position: 'absolute',
              top: 70,
              right: 16,
              zIndex: 10,
            }}
          >
            Problem
          </Button>
        )}

        <Drawer
          title="Problem Details"
          placement="right"
          open={problemId && drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={380}
          mask={false}
          styles={{ body: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 } }}
          getContainer={false}
        >
          {problemLoading && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Spin tip="Loading problem..." />
            </div>
          )}

          {problemError && (
            <Alert message={problemError} type="error" showIcon closable onClose={() => setProblemError('')} />
          )}

          {problemMeta && (
            <>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Title</Typography.Text>
                <Typography.Title level={5} style={{ margin: '4px 0 0' }}>
                  {problemMeta.title || 'Untitled Problem'}
                </Typography.Title>
              </div>

              <Tag color="purple">{problemMeta.topic || 'General'}</Tag>

              <Collapse
                defaultActiveKey={[]}
                items={[
                  {
                    key: 'desc',
                    label: 'Description',
                    children: (
                      <Typography.Paragraph
                        style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.7 }}
                      >
                        {problemMeta.problemDescription}
                      </Typography.Paragraph>
                    ),
                  },
                ]}
              />
            </>
          )}

          <Space direction="vertical" style={{ width: '100%', marginTop: 'auto' }} size="middle">
            <Button
              type="primary"
              block
              size="large"
              loading={solutionLoading}
              disabled={problemLoading}
              onClick={loadProblemSolution}
            >
              Show Solution
            </Button>
            <Button block size="large" onClick={() => navigate('/uml/problems')}>
              Back to Problems
            </Button>
          </Space>
        </Drawer>
      </div>
    </div>
  );
}

export default function UMLEditor() {
  return (
    <ReactFlowProvider>
      <UMLEditorInner />
    </ReactFlowProvider>
  );
}
