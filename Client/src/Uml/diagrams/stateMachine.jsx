import { BaseEdge, EdgeLabelRenderer, Handle, Position, getBezierPath } from '@xyflow/react';

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const TYPES = {
  stateNode: { label: 'State', bg: '#F5F3FF', border: '#8B5CF6', italic: false },
  startNode: { label: 'Start', bg: '#0F172A', border: '#0F172A', italic: false },
  endNode: { label: 'End', bg: '#0F172A', border: '#0F172A', italic: false },
};

export const LINKS = [
  { id: 'transition', label: 'Transition' },
];

export const STORAGE_KEY = 'omnilearn_uml_statemachine_v1';

/* ── Nodes ─────────────────────────────────────────────── */

function StateNode({ data, selected }) {
  return (
    <div
      style={{
        minWidth: 160,
        borderRadius: 16,
        border: `2px solid ${selected ? '#1D4ED8' : '#8B5CF6'}`,
        background: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : '0 1px 2px rgba(15,23,42,0.08)',
      }}
    >
      <div style={{ background: '#F5F3FF', borderBottom: '1px solid #8B5CF6', padding: '8px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{data.name || 'State'}</div>
      </div>
      {(data.entryAction || data.exitAction) && (
        <div style={{ padding: '6px 14px', fontSize: 11, fontFamily: 'monospace', color: '#334155' }}>
          {data.entryAction && <div>entry / {data.entryAction}</div>}
          {data.exitAction && <div>exit / {data.exitAction}</div>}
        </div>
      )}
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='target' position={Position.Top} id='t-top' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

function StartNode({ selected }) {
  return (
    <div style={{ width: 28, height: 28, position: 'relative' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#0F172A',
          border: `2px solid ${selected ? '#3B82F6' : '#0F172A'}`,
          boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : 'none',
        }}
      />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

function EndNode({ selected }) {
  return (
    <div style={{ width: 32, height: 32, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `3px solid ${selected ? '#3B82F6' : '#0F172A'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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

function TransitionEdge(props) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } = props;
  const label = data?.label || '';

  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: '#475569', strokeWidth: selected ? 2.2 : 1.6 }} markerEnd='url(#sm-arrow)' />
      {label && (
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
      )}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker id='sm-arrow' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='8' markerHeight='8' orient='auto-start-reverse'>
            <path d='M 0 0 L 10 5 L 0 10 z' fill='#475569' />
          </marker>
        </defs>
      </svg>
    </>
  );
}

export const nodeTypes = { stateNode: StateNode, startNode: StartNode, endNode: EndNode };
export const edgeTypes = { transition: TransitionEdge };

export function initialDiagram() {
  const startId = uid('node');
  const idleId = uid('node');
  const loadingId = uid('node');
  const authId = uid('node');
  const errorId = uid('node');
  const endId = uid('node');

  return {
    nodes: [
      { id: startId, type: 'startNode', position: { x: 60, y: 200 }, data: { name: 'Start' } },
      { id: idleId, type: 'stateNode', position: { x: 160, y: 180 }, data: { name: 'Idle', entryAction: 'resetForm()', exitAction: '' } },
      { id: loadingId, type: 'stateNode', position: { x: 400, y: 180 }, data: { name: 'Loading', entryAction: 'showSpinner()', exitAction: 'hideSpinner()' } },
      { id: authId, type: 'stateNode', position: { x: 640, y: 100 }, data: { name: 'Authenticated', entryAction: 'loadDashboard()', exitAction: '' } },
      { id: errorId, type: 'stateNode', position: { x: 640, y: 300 }, data: { name: 'Error', entryAction: 'showError()', exitAction: '' } },
      { id: endId, type: 'endNode', position: { x: 880, y: 116 }, data: { name: 'End' } },
    ],
    edges: [
      { id: uid('edge'), source: startId, target: idleId, type: 'transition', data: { relationType: 'transition', label: '' } },
      { id: uid('edge'), source: idleId, target: loadingId, type: 'transition', data: { relationType: 'transition', label: 'submit [credentials valid]' } },
      { id: uid('edge'), source: loadingId, target: authId, type: 'transition', data: { relationType: 'transition', label: 'success / setToken()' } },
      { id: uid('edge'), source: loadingId, target: errorId, type: 'transition', data: { relationType: 'transition', label: 'failure / logError()' } },
      { id: uid('edge'), source: errorId, target: idleId, type: 'transition', data: { relationType: 'transition', label: 'retry [attempts < 3]' } },
      { id: uid('edge'), source: authId, target: endId, type: 'transition', data: { relationType: 'transition', label: 'logout' } },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function defaultNodeData(umlType) {
  if (umlType === 'startNode') return { name: 'Start' };
  if (umlType === 'endNode') return { name: 'End' };
  return { name: 'NewState', entryAction: '', exitAction: '' };
}

export function nodeTypeKey(umlType) {
  return umlType;
}

export function edgeTypeKey() {
  return 'transition';
}

export function openPanelFor(node) {
  if (node.type === 'startNode' || node.type === 'endNode') return null;
  return {
    id: node.id,
    nodeType: node.type,
    name: node.data.name || '',
    entryAction: node.data.entryAction || '',
    exitAction: node.data.exitAction || '',
  };
}

export function applyPanelToNode(nodeData, panel) {
  return {
    ...nodeData,
    name: panel.name,
    entryAction: panel.entryAction,
    exitAction: panel.exitAction,
  };
}

export function PanelFields({ panel, setPanel, S }) {
  return (
    <>
      <div>
        <label style={S.fieldLabel}>State Name</label>
        <input style={S.fieldInput} value={panel.name} onChange={(e) => setPanel((p) => ({ ...p, name: e.target.value }))} />
      </div>
      <div>
        <label style={S.fieldLabel}>Entry Action</label>
        <input style={S.fieldInput} placeholder='e.g. showSpinner()' value={panel.entryAction} onChange={(e) => setPanel((p) => ({ ...p, entryAction: e.target.value }))} />
      </div>
      <div>
        <label style={S.fieldLabel}>Exit Action</label>
        <input style={S.fieldInput} placeholder='e.g. hideSpinner()' value={panel.exitAction} onChange={(e) => setPanel((p) => ({ ...p, exitAction: e.target.value }))} />
      </div>
    </>
  );
}

export function sanitizeNode(n) {
  const validTypes = ['stateNode', 'startNode', 'endNode'];
  const type = validTypes.includes(n?.type) ? n.type : 'stateNode';
  return {
    ...n,
    type,
    position: {
      x: Number.isFinite(n?.position?.x) ? n.position.x : 120,
      y: Number.isFinite(n?.position?.y) ? n.position.y : 120,
    },
    data: {
      name: n?.data?.name || 'State',
      entryAction: n?.data?.entryAction || '',
      exitAction: n?.data?.exitAction || '',
    },
  };
}

export function sanitizeEdge(e) {
  return {
    ...e,
    type: 'transition',
    data: {
      relationType: 'transition',
      label: e?.data?.label || '',
    },
  };
}
