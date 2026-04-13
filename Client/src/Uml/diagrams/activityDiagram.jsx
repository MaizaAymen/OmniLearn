import { BaseEdge, EdgeLabelRenderer, Handle, Position, getBezierPath } from '@xyflow/react';

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const TYPES = {
  activityNode: { label: 'Activity', bg: '#F0FDFA', border: '#14B8A6', italic: false },
  decisionNode: { label: 'Decision', bg: '#FFFBEB', border: '#F59E0B', italic: false },
  forkJoinNode: { label: 'Fork/Join', bg: '#0F172A', border: '#0F172A', italic: false },
  startNode: { label: 'Start', bg: '#0F172A', border: '#0F172A', italic: false },
  endNode: { label: 'End', bg: '#0F172A', border: '#0F172A', italic: false },
};

export const LINKS = [
  { id: 'flow', label: 'Flow' },
  { id: 'yesFlow', label: 'Yes' },
  { id: 'noFlow', label: 'No' },
];

export const STORAGE_KEY = 'omnilearn_uml_activity_v1';

/* ── Nodes ─────────────────────────────────────────────── */

function ActivityNode({ data, selected }) {
  return (
    <div
      style={{
        minWidth: 140,
        padding: '10px 20px',
        borderRadius: 24,
        border: `2px solid ${selected ? '#1D4ED8' : '#14B8A6'}`,
        background: '#FFFFFF',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        color: '#0F172A',
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : '0 1px 2px rgba(15,23,42,0.08)',
      }}
    >
      {data.label || 'Activity'}
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='target' position={Position.Top} id='t-top' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

function DecisionNode({ data, selected }) {
  return (
    <div style={{ width: 60, height: 60, position: 'relative' }}>
      <div
        style={{
          width: 60,
          height: 60,
          transform: 'rotate(45deg)',
          border: `2px solid ${selected ? '#1D4ED8' : '#F59E0B'}`,
          background: '#FFFBEB',
          boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : '0 1px 2px rgba(15,23,42,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ transform: 'rotate(-45deg)', fontSize: 10, fontWeight: 700, color: '#92400E', textAlign: 'center', lineHeight: 1.1, maxWidth: 40, wordBreak: 'break-word' }}>
          {data.condition || '?'}
        </span>
      </div>
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: '50%' }} />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: '50%' }} />
      <Handle type='target' position={Position.Top} id='t-top' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

function ForkJoinNode({ selected }) {
  return (
    <div style={{ width: 180, height: 8, position: 'relative' }}>
      <div
        style={{
          width: 180,
          height: 8,
          borderRadius: 4,
          background: '#0F172A',
          border: `2px solid ${selected ? '#3B82F6' : '#0F172A'}`,
          boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : 'none',
        }}
      />
      <Handle type='target' position={Position.Top} id='t-top' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

function StartNodeAct({ selected }) {
  return (
    <div style={{ width: 28, height: 28, position: 'relative' }}>
      <div
        style={{
          width: 28, height: 28, borderRadius: '50%', background: '#0F172A',
          border: `2px solid ${selected ? '#3B82F6' : '#0F172A'}`,
          boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : 'none',
        }}
      />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

function EndNodeAct({ selected }) {
  return (
    <div style={{ width: 32, height: 32, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `3px solid ${selected ? '#3B82F6' : '#0F172A'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : 'none',
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#0F172A' }} />
      </div>
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='target' position={Position.Top} id='t-top' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

/* ── Edge ──────────────────────────────────────────────── */

function ActivityEdge(props) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } = props;
  const relationType = data?.relationType || 'flow';
  const label = relationType === 'yesFlow' ? 'Yes' : relationType === 'noFlow' ? 'No' : (data?.label || '');

  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: '#475569', strokeWidth: selected ? 2.2 : 1.6 }} markerEnd='url(#act-arrow)' />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              fontSize: 10,
              color: relationType === 'yesFlow' ? '#16A34A' : relationType === 'noFlow' ? '#DC2626' : '#64748B',
              fontWeight: relationType !== 'flow' ? 700 : 400,
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
          <marker id='act-arrow' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='8' markerHeight='8' orient='auto-start-reverse'>
            <path d='M 0 0 L 10 5 L 0 10 z' fill='#475569' />
          </marker>
        </defs>
      </svg>
    </>
  );
}

export const nodeTypes = { activityNode: ActivityNode, decisionNode: DecisionNode, forkJoinNode: ForkJoinNode, startNode: StartNodeAct, endNode: EndNodeAct };
export const edgeTypes = { activityEdge: ActivityEdge };

export function initialDiagram() {
  const startId = uid('node');
  const enterCred = uid('node');
  const validate = uid('node');
  const dec1 = uid('node');
  const checkPw = uid('node');
  const dec2 = uid('node');
  const grantAccess = uid('node');
  const lockAccount = uid('node');
  const endId = uid('node');

  return {
    nodes: [
      { id: startId, type: 'startNode', position: { x: 40, y: 200 }, data: { label: 'Start' } },
      { id: enterCred, type: 'activityNode', position: { x: 130, y: 186 }, data: { label: 'Enter Credentials' } },
      { id: validate, type: 'activityNode', position: { x: 340, y: 186 }, data: { label: 'Validate Input' } },
      { id: dec1, type: 'decisionNode', position: { x: 530, y: 186 }, data: { condition: 'Valid?' } },
      { id: checkPw, type: 'activityNode', position: { x: 650, y: 186 }, data: { label: 'Check Password' } },
      { id: dec2, type: 'decisionNode', position: { x: 840, y: 186 }, data: { condition: 'Match?' } },
      { id: grantAccess, type: 'activityNode', position: { x: 960, y: 120 }, data: { label: 'Grant Access' } },
      { id: lockAccount, type: 'activityNode', position: { x: 960, y: 280 }, data: { label: 'Lock Account' } },
      { id: endId, type: 'endNode', position: { x: 1160, y: 200 }, data: { label: 'End' } },
    ],
    edges: [
      { id: uid('edge'), source: startId, target: enterCred, type: 'activityEdge', data: { relationType: 'flow', label: '' } },
      { id: uid('edge'), source: enterCred, target: validate, type: 'activityEdge', data: { relationType: 'flow', label: '' } },
      { id: uid('edge'), source: validate, target: dec1, type: 'activityEdge', data: { relationType: 'flow', label: '' } },
      { id: uid('edge'), source: dec1, target: checkPw, type: 'activityEdge', data: { relationType: 'yesFlow', label: 'Yes' } },
      { id: uid('edge'), source: dec1, target: enterCred, type: 'activityEdge', data: { relationType: 'noFlow', label: 'No' } },
      { id: uid('edge'), source: checkPw, target: dec2, type: 'activityEdge', data: { relationType: 'flow', label: '' } },
      { id: uid('edge'), source: dec2, target: grantAccess, type: 'activityEdge', data: { relationType: 'yesFlow', label: 'Yes' } },
      { id: uid('edge'), source: dec2, target: lockAccount, type: 'activityEdge', data: { relationType: 'noFlow', label: 'No' } },
      { id: uid('edge'), source: grantAccess, target: endId, type: 'activityEdge', data: { relationType: 'flow', label: '' } },
      { id: uid('edge'), source: lockAccount, target: endId, type: 'activityEdge', data: { relationType: 'flow', label: '' } },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function defaultNodeData(umlType) {
  if (umlType === 'startNode') return { label: 'Start' };
  if (umlType === 'endNode') return { label: 'End' };
  if (umlType === 'decisionNode') return { condition: '?' };
  if (umlType === 'forkJoinNode') return { label: 'Fork/Join' };
  return { label: 'New Activity' };
}

export function nodeTypeKey(umlType) {
  return umlType;
}

export function edgeTypeKey() {
  return 'activityEdge';
}

export function openPanelFor(node) {
  if (node.type === 'startNode' || node.type === 'endNode' || node.type === 'forkJoinNode') return null;
  if (node.type === 'decisionNode') {
    return { id: node.id, nodeType: node.type, condition: node.data.condition || '' };
  }
  return { id: node.id, nodeType: node.type, label: node.data.label || '' };
}

export function applyPanelToNode(nodeData, panel) {
  if (panel.nodeType === 'decisionNode') {
    return { ...nodeData, condition: panel.condition };
  }
  return { ...nodeData, label: panel.label };
}

export function PanelFields({ panel, setPanel, S }) {
  if (panel.nodeType === 'decisionNode') {
    return (
      <div>
        <label style={S.fieldLabel}>Decision Condition</label>
        <input style={S.fieldInput} value={panel.condition} onChange={(e) => setPanel((p) => ({ ...p, condition: e.target.value }))} />
      </div>
    );
  }
  return (
    <div>
      <label style={S.fieldLabel}>Activity Label</label>
      <input style={S.fieldInput} value={panel.label} onChange={(e) => setPanel((p) => ({ ...p, label: e.target.value }))} />
    </div>
  );
}

export function sanitizeNode(n) {
  const validTypes = ['activityNode', 'decisionNode', 'forkJoinNode', 'startNode', 'endNode'];
  const type = validTypes.includes(n?.type) ? n.type : 'activityNode';
  return {
    ...n,
    type,
    position: {
      x: Number.isFinite(n?.position?.x) ? n.position.x : 120,
      y: Number.isFinite(n?.position?.y) ? n.position.y : 120,
    },
    data: {
      label: n?.data?.label || 'Activity',
      condition: n?.data?.condition || '',
    },
  };
}

export function sanitizeEdge(e) {
  const validTypes = ['flow', 'yesFlow', 'noFlow'];
  return {
    ...e,
    type: 'activityEdge',
    data: {
      relationType: validTypes.includes(e?.data?.relationType) ? e.data.relationType : 'flow',
      label: e?.data?.label || '',
    },
  };
}
