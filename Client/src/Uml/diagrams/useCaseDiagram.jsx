import { BaseEdge, EdgeLabelRenderer, Handle, Position, getBezierPath } from '@xyflow/react';

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const TYPES = {
  actorNode: { label: 'Actor', bg: '#F8FAFC', border: '#64748B', italic: false },
  useCaseNode: { label: 'Use Case', bg: '#FDF2F8', border: '#EC4899', italic: false },
  systemBoundaryNode: { label: 'System', bg: 'transparent', border: '#94A3B8', italic: false },
};

export const LINKS = [
  { id: 'association', label: 'Association' },
  { id: 'include', label: '«include»' },
  { id: 'extend', label: '«extend»' },
];

export const STORAGE_KEY = 'omnilearn_uml_usecase_v1';

/* ── Nodes ─────────────────────────────────────────────── */

function ActorNode({ data, selected }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, position: 'relative', minWidth: 70 }}>
      <svg width='36' height='52' viewBox='0 0 36 52'>
        <circle cx='18' cy='8' r='7' fill='none' stroke={selected ? '#1D4ED8' : '#334155'} strokeWidth='2' />
        <line x1='18' y1='15' x2='18' y2='34' stroke={selected ? '#1D4ED8' : '#334155'} strokeWidth='2' />
        <line x1='4' y1='22' x2='32' y2='22' stroke={selected ? '#1D4ED8' : '#334155'} strokeWidth='2' />
        <line x1='18' y1='34' x2='6' y2='50' stroke={selected ? '#1D4ED8' : '#334155'} strokeWidth='2' />
        <line x1='18' y1='34' x2='30' y2='50' stroke={selected ? '#1D4ED8' : '#334155'} strokeWidth='2' />
      </svg>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', marginTop: 4, textAlign: 'center', maxWidth: 90, wordBreak: 'break-word' }}>
        {data.name || 'Actor'}
      </div>
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Left} id='s-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='target' position={Position.Right} id='t-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: '40%' }} />
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: '40%' }} />
    </div>
  );
}

function UseCaseNode({ data, selected }) {
  return (
    <div
      style={{
        minWidth: 140,
        padding: '14px 24px',
        borderRadius: '50%',
        border: `2px solid ${selected ? '#1D4ED8' : '#EC4899'}`,
        background: '#FDF2F8',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 600,
        color: '#0F172A',
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : '0 1px 2px rgba(15,23,42,0.08)',
      }}
    >
      {data.name || 'Use Case'}
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='target' position={Position.Top} id='t-top' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

function SystemBoundaryNode({ data, selected }) {
  return (
    <div
      style={{
        minWidth: 280,
        minHeight: 200,
        width: data.width || 300,
        height: data.height || 340,
        borderRadius: 12,
        border: `2px dashed ${selected ? '#1D4ED8' : '#94A3B8'}`,
        background: 'rgba(248,250,252,0.4)',
        padding: 0,
        position: 'relative',
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -12,
          left: 16,
          background: '#F8FAFC',
          padding: '2px 10px',
          fontSize: 12,
          fontWeight: 700,
          color: '#334155',
          border: '1px solid #E2E8F0',
          borderRadius: 6,
        }}
      >
        {data.name || 'System'}
      </div>
    </div>
  );
}

/* ── Edge ──────────────────────────────────────────────── */

function UseCaseEdge(props) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } = props;
  const relationType = data?.relationType || 'association';
  const label = LINKS.find((l) => l.id === relationType)?.label || '';
  const isDashed = relationType === 'include' || relationType === 'extend';

  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: '#475569',
          strokeWidth: selected ? 2.2 : 1.6,
          strokeDasharray: isDashed ? '6 4' : undefined,
        }}
        markerEnd={isDashed ? 'url(#uc-arrow)' : undefined}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              fontSize: 10,
              color: '#64748B',
              fontStyle: 'italic',
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
      )}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker id='uc-arrow' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='8' markerHeight='8' orient='auto-start-reverse'>
            <path d='M 0 0 L 10 5 L 0 10 z' fill='#475569' />
          </marker>
        </defs>
      </svg>
    </>
  );
}

export const nodeTypes = { actorNode: ActorNode, useCaseNode: UseCaseNode, systemBoundaryNode: SystemBoundaryNode };
export const edgeTypes = { useCaseEdge: UseCaseEdge };

export function initialDiagram() {
  const userId = uid('node');
  const adminId = uid('node');
  const sysId = uid('node');
  const loginId = uid('node');
  const viewBalId = uid('node');
  const transferId = uid('node');
  const manageId = uid('node');

  return {
    nodes: [
      { id: userId, type: 'actorNode', position: { x: 40, y: 140 }, data: { name: 'User' } },
      { id: adminId, type: 'actorNode', position: { x: 40, y: 380 }, data: { name: 'Admin' } },
      { id: sysId, type: 'systemBoundaryNode', position: { x: 200, y: 60 }, data: { name: 'Banking System', width: 320, height: 400 } },
      { id: loginId, type: 'useCaseNode', position: { x: 270, y: 100 }, data: { name: 'Login' } },
      { id: viewBalId, type: 'useCaseNode', position: { x: 270, y: 210 }, data: { name: 'View Balance' } },
      { id: transferId, type: 'useCaseNode', position: { x: 270, y: 320 }, data: { name: 'Transfer Funds' } },
      { id: manageId, type: 'useCaseNode', position: { x: 270, y: 420 }, data: { name: 'Manage Users' } },
    ],
    edges: [
      { id: uid('edge'), source: userId, target: loginId, type: 'useCaseEdge', data: { relationType: 'association' } },
      { id: uid('edge'), source: userId, target: viewBalId, type: 'useCaseEdge', data: { relationType: 'association' } },
      { id: uid('edge'), source: userId, target: transferId, type: 'useCaseEdge', data: { relationType: 'association' } },
      { id: uid('edge'), source: adminId, target: manageId, type: 'useCaseEdge', data: { relationType: 'association' } },
      { id: uid('edge'), source: transferId, target: loginId, type: 'useCaseEdge', data: { relationType: 'include' } },
      { id: uid('edge'), source: viewBalId, target: loginId, type: 'useCaseEdge', data: { relationType: 'include' } },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function defaultNodeData(umlType) {
  if (umlType === 'actorNode') return { name: 'Actor' };
  if (umlType === 'systemBoundaryNode') return { name: 'System', width: 300, height: 340 };
  return { name: 'Use Case' };
}

export function nodeTypeKey(umlType) {
  return umlType;
}

export function edgeTypeKey() {
  return 'useCaseEdge';
}

export function openPanelFor(node) {
  if (node.type === 'systemBoundaryNode') {
    return { id: node.id, nodeType: node.type, name: node.data.name || '', width: node.data.width || 300, height: node.data.height || 340 };
  }
  return { id: node.id, nodeType: node.type, name: node.data.name || '' };
}

export function applyPanelToNode(nodeData, panel) {
  if (panel.nodeType === 'systemBoundaryNode') {
    return { ...nodeData, name: panel.name, width: panel.width, height: panel.height };
  }
  return { ...nodeData, name: panel.name };
}

export function PanelFields({ panel, setPanel, S }) {
  return (
    <>
      <div>
        <label style={S.fieldLabel}>{panel.nodeType === 'actorNode' ? 'Actor Name' : panel.nodeType === 'systemBoundaryNode' ? 'System Name' : 'Use Case Name'}</label>
        <input style={S.fieldInput} value={panel.name} onChange={(e) => setPanel((p) => ({ ...p, name: e.target.value }))} />
      </div>
      {panel.nodeType === 'systemBoundaryNode' && (
        <>
          <div>
            <label style={S.fieldLabel}>Width</label>
            <input style={S.fieldInput} type='number' value={panel.width} onChange={(e) => setPanel((p) => ({ ...p, width: Number(e.target.value) || 300 }))} />
          </div>
          <div>
            <label style={S.fieldLabel}>Height</label>
            <input style={S.fieldInput} type='number' value={panel.height} onChange={(e) => setPanel((p) => ({ ...p, height: Number(e.target.value) || 340 }))} />
          </div>
        </>
      )}
    </>
  );
}

export function sanitizeNode(n) {
  const validTypes = ['actorNode', 'useCaseNode', 'systemBoundaryNode'];
  const type = validTypes.includes(n?.type) ? n.type : 'useCaseNode';
  return {
    ...n,
    type,
    position: {
      x: Number.isFinite(n?.position?.x) ? n.position.x : 120,
      y: Number.isFinite(n?.position?.y) ? n.position.y : 120,
    },
    data: {
      name: n?.data?.name || 'Unnamed',
      ...(type === 'systemBoundaryNode' ? { width: n?.data?.width || 300, height: n?.data?.height || 340 } : {}),
    },
  };
}

export function sanitizeEdge(e) {
  const validTypes = ['association', 'include', 'extend'];
  return {
    ...e,
    type: 'useCaseEdge',
    data: {
      relationType: validTypes.includes(e?.data?.relationType) ? e.data.relationType : 'association',
    },
  };
}
