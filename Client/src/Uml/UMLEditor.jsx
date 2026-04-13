import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Drawer, Button, Tag, Collapse, Typography, Spin, Alert, Space } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';
import '@xyflow/react/dist/style.css';

import CONFIGS, { DIAGRAM_TABS } from './diagrams';

const SAVE_DEBOUNCE_MS = 250;
const UML_API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uml`;

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeStored(payload, config) {
  if (!payload || typeof payload !== 'object') return null;
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const edges = Array.isArray(payload.edges) ? payload.edges : [];

  const safeNodes = nodes
    .filter((n) => n && typeof n.id === 'string')
    .map((n) => config.sanitizeNode(n));

  const idSet = new Set(safeNodes.map((n) => n.id));
  const safeEdges = edges
    .filter((e) => e && typeof e.id === 'string' && idSet.has(e.source) && idSet.has(e.target))
    .map((e) => config.sanitizeEdge(e));

  const viewport = payload?.viewport || { x: 0, y: 0, zoom: 1 };
  const safeViewport = {
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
    zoom: Number.isFinite(viewport.zoom) ? viewport.zoom : 1,
  };

  if (!safeNodes.length) return null;
  return { nodes: safeNodes, edges: safeEdges, viewport: safeViewport };
}

/* ── Styles ────────────────────────────────────────────── */

const S = {
  ribbon: {
    flexShrink: 0,
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
  },
  ribbonRow: {
    height: 56,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 12,
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 2,
    borderTop: '1px solid #F1F5F9',
    background: '#F8FAFC',
  },
  tab: (active = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 14px',
    background: active ? '#FFFFFF' : 'transparent',
    color: active ? '#1D4ED8' : '#64748B',
    border: 'none',
    borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }),
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
  dot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  sep: { width: 1, alignSelf: 'stretch', background: '#E2E8F0' },
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

/* ── Main component ────────────────────────────────────── */

function UMLEditorInner() {
  const navigate = useNavigate();
  const { id: problemId } = useParams();
  const wrapperRef = useRef(null);
  const reactFlowRef = useRef(null);
  const saveTimerRef = useRef(null);
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });

  const [diagramType, setDiagramType] = useState('class');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [ready, setReady] = useState(false);

  const [linkType, setLinkType] = useState(null);
  const [statusText, setStatusText] = useState('Ready');
  const [zoom, setZoom] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [panel, setPanel] = useState(null);
  const [problemMeta, setProblemMeta] = useState(null);
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemError, setProblemError] = useState('');
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const config = useMemo(() => CONFIGS[diagramType], [diagramType]);
  const mergedNodeTypes = useMemo(() => config.nodeTypes, [config]);
  const mergedEdgeTypes = useMemo(() => config.edgeTypes, [config]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  // Set default link type whenever diagram type changes
  useEffect(() => {
    if (config.LINKS.length > 0) {
      setLinkType(config.LINKS[0].id);
    }
  }, [config]);

  /* ── Persistence ──────────────────────────────────────── */

  const persist = useCallback((nextNodes, nextEdges, nextViewport, storageKey) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ nodes: nextNodes, edges: nextEdges, viewport: nextViewport || viewportRef.current })
        );
      } catch {
        // ignore storage write issues
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // Load diagram when type changes or on mount
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
        if (saveTimerRef.current) { window.clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
      };
    }

    let loaded = false;
    try {
      const raw = localStorage.getItem(config.STORAGE_KEY);
      if (raw) {
        const parsed = sanitizeStored(JSON.parse(raw), config);
        if (parsed) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          viewportRef.current = parsed.viewport;
          loaded = true;
          setStatusText('Diagram restored');
        } else {
          localStorage.removeItem(config.STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(config.STORAGE_KEY);
    }

    if (!loaded) {
      const seed = config.initialDiagram();
      setNodes(seed.nodes);
      setEdges(seed.edges);
      viewportRef.current = seed.viewport;
    }

    setReady(true);
    setSelectedNodeId(null);
    setPanel(null);

    // After state update, fit view
    window.requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({ padding: 0.2, duration: 0 });
    });

    return () => {
      if (saveTimerRef.current) { window.clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    };
  }, [diagramType, problemId, config]);

  // Auto-save when nodes/edges change
  useEffect(() => {
    if (!ready) return;
    if (problemId) return;
    persist(nodes, edges, viewportRef.current, config.STORAGE_KEY);
  }, [nodes, edges, ready, persist, problemId, config]);

  /* ── React Flow callbacks ─────────────────────────────── */

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
    const edgeKey = config.edgeTypeKey();
    const currentLinkType = linkType || config.LINKS[0]?.id || 'association';
    setEdges((eds) => [
      ...eds,
      {
        id: uid('edge'),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: edgeKey,
        data: { relationType: currentLinkType, label: currentLinkType },
      },
    ]);
    setStatusText(`${config.LINKS.find((l) => l.id === currentLinkType)?.label || 'Relationship'} created`);
  }, [linkType, config]);

  /* ── Actions ──────────────────────────────────────────── */

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

    const nodeType = config.nodeTypeKey(umlType);
    const t = config.TYPES[umlType];
    const node = {
      id: uid('node'),
      type: nodeType,
      position: pos,
      data: config.defaultNodeData(umlType),
    };

    setNodes((nds) => [...nds, node]);
    setSelectedNodeId(node.id);
    setStatusText(`${t?.label || umlType} added`);
  }, [config]);

  const openNodeEditor = useCallback((node) => {
    setSelectedNodeId(node.id);
    const panelData = config.openPanelFor(node);
    setPanel(panelData);
  }, [config]);

  const applyPanel = useCallback(() => {
    if (!panel) return;
    setNodes((nds) => nds.map((n) => (
      n.id === panel.id
        ? { ...n, data: config.applyPanelToNode(n.data, panel) }
        : n
    )));
    setPanel(null);
    setStatusText('Node updated');
  }, [panel, config]);

  const clearCanvas = useCallback(() => {
    if (!window.confirm('Clear the canvas?')) return;
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setPanel(null);
    localStorage.removeItem(config.STORAGE_KEY);
    setStatusText('Canvas cleared');
  }, [config]);

  const resetDiagram = useCallback(() => {
    if (!window.confirm('Reset diagram to default?')) return;
    const seed = config.initialDiagram();
    setNodes(seed.nodes);
    setEdges(seed.edges);
    viewportRef.current = seed.viewport;
    reactFlowRef.current?.setViewport(seed.viewport, { duration: 0 });
    window.requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({ padding: 0.2, duration: 180 });
    });
    setSelectedNodeId(null);
    setPanel(null);
    setStatusText('Diagram reset');
  }, [config]);

  const deleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setPanel(null);
  }, [selectedNodeId]);

  const exportJSON = useCallback(() => {
    const data = { nodes, edges, viewport: viewportRef.current, diagramType };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `${diagramType}-diagram.json`;
    a.click();
  }, [nodes, edges, diagramType]);

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
          const raw = JSON.parse(String(ev.target?.result || '{}'));
          // If the imported file has a diagramType, switch to it
          const importType = raw.diagramType || diagramType;
          const importConfig = CONFIGS[importType] || config;
          const parsed = sanitizeStored(raw, importConfig);
          if (!parsed) throw new Error('Invalid diagram');
          if (importType !== diagramType) {
            setDiagramType(importType);
          }
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
  }, [diagramType, config]);

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

  /* ── Tab switching ────────────────────────────────────── */

  const switchDiagram = useCallback((newType) => {
    if (newType === diagramType) return;
    setPanel(null);
    setSelectedNodeId(null);
    setDiagramType(newType);
    setStatusText(`Switched to ${DIAGRAM_TABS.find((t) => t.id === newType)?.label || newType}`);
  }, [diagramType]);

  /* ── Problem mode ─────────────────────────────────────── */

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
        const response = await fetch(`${UML_API_BASE}/problems/${problemId}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Could not load UML problem details');
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
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Could not load UML solution');
      const data = await response.json();
      const diagram = sanitizeStored(
        { nodes: data?.solution?.nodes || [], edges: data?.solution?.edges || [], viewport: { x: 0, y: 0, zoom: 1 } },
        config
      );
      if (!diagram) throw new Error('Solution format is invalid');
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
  }, [problemId, config]);

  /* ── Current link type for display ────────────────────── */
  const currentLinkType = linkType || config.LINKS[0]?.id;
  const currentLinkLabel = config.LINKS.find((l) => l.id === currentLinkType)?.label || currentLinkType;

  /* ── Render ───────────────────────────────────────────── */

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
      {/* ── Ribbon ──────────────────────────────────────── */}
      <div style={S.ribbon}>
        <div style={S.ribbonRow}>
          <div style={S.sideHeader}>
            <span style={{ color: '#3B82F6' }}>⬡</span>&nbsp; UML Editor
          </div>

          <div style={S.sep} />

          {/* Node type buttons */}
          <div style={S.ribbonGroup}>
            {Object.entries(config.TYPES).map(([id, t]) => (
              <button key={id} style={S.ribbonBtn(false)} onClick={() => addShape(id)}>
                <span style={S.dot(t.border)} />
                {t.label}
              </button>
            ))}
          </div>

          <div style={S.sep} />

          {/* Edge type buttons */}
          <div style={S.ribbonGroup}>
            {config.LINKS.map(({ id, label }) => (
              <button key={id} style={S.ribbonBtn(currentLinkType === id)} onClick={() => setLinkType(id)}>
                <span style={{ ...S.dot(currentLinkType === id ? '#93C5FD' : '#94A3B8'), borderRadius: 2 }} />
                {label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto' }} />
          <div style={S.sep} />

          {/* Action buttons */}
          <div style={S.ribbonGroup}>
            <button style={S.ribbonBtn(false)} onClick={fitView}>Fit</button>
            <button style={S.ribbonBtn(false)} onClick={exportJSON}>Export</button>
            <button style={S.ribbonBtn(false)} onClick={importJSON}>Import</button>
            <button style={S.ribbonBtn(false)} onClick={resetDiagram}>Reset</button>
            <button style={S.ribbonBtn(false, true)} onClick={clearCanvas}>Clear</button>
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────── */}
        <div style={S.tabBar}>
          {DIAGRAM_TABS.map(({ id, label, icon }) => (
            <button key={id} style={S.tab(diagramType === id)} onClick={() => switchDiagram(id)}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Canvas + Panel ────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div ref={wrapperRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={mergedNodeTypes}
            edgeTypes={mergedEdgeTypes}
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

          {/* Zoom indicator */}
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

          {/* Current link type indicator */}
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
            <span style={{ ...S.dot(config.TYPES[currentLinkType]?.border || '#3B82F6'), borderRadius: 2 }} />
            {currentLinkLabel}
          </div>

          {/* Status bar */}
          <div style={S.statusBar}>
            <span>{statusText}</span>
            {selectedNode && <span style={{ color: '#3B82F6' }}>1 element selected</span>}
          </div>
        </div>

        {/* ── Edit Panel ──────────────────────────────────── */}
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
              <config.PanelFields panel={panel} setPanel={setPanel} S={S} />
            </div>

            <button style={S.applyBtn} onClick={applyPanel}>Apply Changes</button>
          </div>
        )}

        {/* ── Problem drawer ──────────────────────────────── */}
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
