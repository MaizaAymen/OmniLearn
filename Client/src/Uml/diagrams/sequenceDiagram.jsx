import { BaseEdge, EdgeLabelRenderer, Handle, Position, getBezierPath, getStraightPath } from '@xyflow/react';

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const TYPES = {
  lifelineNode: { label: 'Lifeline', bg: '#EFF6FF', border: '#3B82F6', italic: false },
  activationNode: { label: 'Activation', bg: '#DBEAFE', border: '#2563EB', italic: false },
  fragmentNode: { label: 'Fragment', bg: 'transparent', border: '#64748B', italic: false },
};

export const LINKS = [
  { id: 'call', label: 'Call' },
  { id: 'return', label: 'Return' },
  { id: 'async', label: 'Async' },
];

export const STORAGE_KEY = 'omnilearn_uml_sequence_v1';

/* ── Nodes ─────────────────────────────────────────────── */

function LifelineNode({ data, selected }) {
  const lineHeight = data.lineHeight || 300;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minWidth: 100 }}>
      <div
        style={{
          padding: '8px 18px',
          borderRadius: 6,
          border: `2px solid ${selected ? '#1D4ED8' : '#3B82F6'}`,
          background: '#EFF6FF',
          fontSize: 13,
          fontWeight: 700,
          color: '#0F172A',
          textAlign: 'center',
          boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : '0 1px 2px rgba(15,23,42,0.08)',
          zIndex: 2,
          position: 'relative',
        }}
      >
        {data.name || 'Object'}
      </div>
      <div
        style={{
          width: 0,
          height: lineHeight,
          borderLeft: '2px dashed #94A3B8',
          marginTop: 0,
        }}
      />
      {/* Handles along the lifeline for connecting messages */}
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 50 }} />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 50 }} />
      <Handle type='target' position={Position.Left} id='t-left-2' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 110 }} />
      <Handle type='source' position={Position.Right} id='s-right-2' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 110 }} />
      <Handle type='target' position={Position.Left} id='t-left-3' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 170 }} />
      <Handle type='source' position={Position.Right} id='s-right-3' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 170 }} />
      <Handle type='target' position={Position.Left} id='t-left-4' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 230 }} />
      <Handle type='source' position={Position.Right} id='s-right-4' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 230 }} />
      <Handle type='target' position={Position.Left} id='t-left-5' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 290 }} />
      <Handle type='source' position={Position.Right} id='s-right-5' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff', top: 290 }} />
    </div>
  );
}

function ActivationNode({ data, selected }) {
  const height = data.height || 60;
  return (
    <div
      style={{
        width: 16,
        height,
        background: '#DBEAFE',
        border: `2px solid ${selected ? '#1D4ED8' : '#2563EB'}`,
        borderRadius: 3,
        position: 'relative',
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : 'none',
      }}
    >
      <Handle type='target' position={Position.Left} id='t-left' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Right} id='s-right' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='target' position={Position.Top} id='t-top' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
      <Handle type='source' position={Position.Bottom} id='s-bottom' style={{ width: 8, height: 8, border: '1px solid #94A3B8', background: '#fff' }} />
    </div>
  );
}

function FragmentNode({ data, selected }) {
  return (
    <div
      style={{
        minWidth: 200,
        minHeight: 80,
        width: data.width || 400,
        height: data.height || 120,
        borderRadius: 4,
        border: `2px solid ${selected ? '#1D4ED8' : '#64748B'}`,
        background: 'rgba(248,250,252,0.3)',
        position: 'relative',
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.18)' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          background: '#F1F5F9',
          padding: '3px 12px',
          fontSize: 11,
          fontWeight: 700,
          color: '#334155',
          borderRight: '2px solid #64748B',
          borderBottom: '2px solid #64748B',
          borderRadius: '4px 0 6px 0',
        }}
      >
        {data.fragmentType || 'alt'}
      </div>
      {data.condition && (
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 12,
            fontSize: 10,
            color: '#64748B',
            fontStyle: 'italic',
          }}
        >
          [{data.condition}]
        </div>
      )}
      {/* Dashed divider line for alt fragments */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          borderTop: '1px dashed #94A3B8',
        }}
      />
    </div>
  );
}

/* ── Edge ──────────────────────────────────────────────── */

function SequenceEdge(props) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } = props;
  const relationType = data?.relationType || 'call';
  const label = data?.label || '';
  const isDashed = relationType === 'return';
  const isAsync = relationType === 'async';

  const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  const markerId = relationType === 'async' ? 'seq-open-arrow' : 'seq-arrow';

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
        markerEnd={`url(#${markerId})`}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -120%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              fontSize: 10,
              color: '#334155',
              fontWeight: 500,
              background: 'rgba(255,255,255,0.9)',
              padding: '1px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker id='seq-arrow' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='8' markerHeight='8' orient='auto-start-reverse'>
            <path d='M 0 0 L 10 5 L 0 10 z' fill='#475569' />
          </marker>
          <marker id='seq-open-arrow' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='8' markerHeight='8' orient='auto-start-reverse'>
            <path d='M 0 0 L 10 5 L 0 10' fill='none' stroke='#475569' strokeWidth='1.5' />
          </marker>
        </defs>
      </svg>
    </>
  );
}

export const nodeTypes = { lifelineNode: LifelineNode, activationNode: ActivationNode, fragmentNode: FragmentNode };
export const edgeTypes = { sequenceEdge: SequenceEdge };

export function initialDiagram() {
  const browserId = uid('node');
  const authId = uid('node');
  const dbId = uid('node');
  const fragId = uid('node');

  return {
    nodes: [
      { id: browserId, type: 'lifelineNode', position: { x: 60, y: 40 }, data: { name: 'Browser', lineHeight: 320 } },
      { id: authId, type: 'lifelineNode', position: { x: 300, y: 40 }, data: { name: 'Auth Server', lineHeight: 320 } },
      { id: dbId, type: 'lifelineNode', position: { x: 540, y: 40 }, data: { name: 'Database', lineHeight: 320 } },
      { id: fragId, type: 'fragmentNode', position: { x: 40, y: 220 }, data: { fragmentType: 'alt', condition: 'credentials valid', width: 600, height: 160 } },
    ],
    edges: [
      { id: uid('edge'), source: browserId, sourceHandle: 's-right', target: authId, targetHandle: 't-left', type: 'sequenceEdge', data: { relationType: 'call', label: 'login(user, pass)' } },
      { id: uid('edge'), source: authId, sourceHandle: 's-right', target: dbId, targetHandle: 't-left-2', type: 'sequenceEdge', data: { relationType: 'call', label: 'findUser(user)' } },
      { id: uid('edge'), source: dbId, sourceHandle: 's-right-2', target: authId, targetHandle: 't-left-3', type: 'sequenceEdge', data: { relationType: 'return', label: 'userData' } },
      { id: uid('edge'), source: authId, sourceHandle: 's-right-3', target: browserId, targetHandle: 't-left-3', type: 'sequenceEdge', data: { relationType: 'return', label: 'token' } },
      { id: uid('edge'), source: authId, sourceHandle: 's-right-4', target: browserId, targetHandle: 't-left-4', type: 'sequenceEdge', data: { relationType: 'return', label: '401 Unauthorized' } },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function defaultNodeData(umlType) {
  if (umlType === 'lifelineNode') return { name: 'Object', lineHeight: 300 };
  if (umlType === 'activationNode') return { height: 60 };
  if (umlType === 'fragmentNode') return { fragmentType: 'alt', condition: 'condition', width: 400, height: 120 };
  return { name: 'Object' };
}

export function nodeTypeKey(umlType) {
  return umlType;
}

export function edgeTypeKey() {
  return 'sequenceEdge';
}

export function openPanelFor(node) {
  if (node.type === 'lifelineNode') {
    return { id: node.id, nodeType: node.type, name: node.data.name || '', lineHeight: node.data.lineHeight || 300 };
  }
  if (node.type === 'activationNode') {
    return { id: node.id, nodeType: node.type, height: node.data.height || 60 };
  }
  if (node.type === 'fragmentNode') {
    return {
      id: node.id,
      nodeType: node.type,
      fragmentType: node.data.fragmentType || 'alt',
      condition: node.data.condition || '',
      width: node.data.width || 400,
      height: node.data.height || 120,
    };
  }
  return null;
}

export function applyPanelToNode(nodeData, panel) {
  if (panel.nodeType === 'lifelineNode') {
    return { ...nodeData, name: panel.name, lineHeight: panel.lineHeight };
  }
  if (panel.nodeType === 'activationNode') {
    return { ...nodeData, height: panel.height };
  }
  if (panel.nodeType === 'fragmentNode') {
    return { ...nodeData, fragmentType: panel.fragmentType, condition: panel.condition, width: panel.width, height: panel.height };
  }
  return nodeData;
}

export function PanelFields({ panel, setPanel, S }) {
  if (panel.nodeType === 'lifelineNode') {
    return (
      <>
        <div>
          <label style={S.fieldLabel}>Lifeline Name</label>
          <input style={S.fieldInput} value={panel.name} onChange={(e) => setPanel((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label style={S.fieldLabel}>Line Height</label>
          <input style={S.fieldInput} type='number' value={panel.lineHeight} onChange={(e) => setPanel((p) => ({ ...p, lineHeight: Number(e.target.value) || 300 }))} />
        </div>
      </>
    );
  }
  if (panel.nodeType === 'activationNode') {
    return (
      <div>
        <label style={S.fieldLabel}>Activation Height</label>
        <input style={S.fieldInput} type='number' value={panel.height} onChange={(e) => setPanel((p) => ({ ...p, height: Number(e.target.value) || 60 }))} />
      </div>
    );
  }
  if (panel.nodeType === 'fragmentNode') {
    return (
      <>
        <div>
          <label style={S.fieldLabel}>Fragment Type</label>
          <select style={S.fieldInput} value={panel.fragmentType} onChange={(e) => setPanel((p) => ({ ...p, fragmentType: e.target.value }))}>
            <option value='alt'>alt</option>
            <option value='loop'>loop</option>
            <option value='opt'>opt</option>
            <option value='par'>par</option>
            <option value='break'>break</option>
          </select>
        </div>
        <div>
          <label style={S.fieldLabel}>Condition</label>
          <input style={S.fieldInput} value={panel.condition} onChange={(e) => setPanel((p) => ({ ...p, condition: e.target.value }))} />
        </div>
        <div>
          <label style={S.fieldLabel}>Width</label>
          <input style={S.fieldInput} type='number' value={panel.width} onChange={(e) => setPanel((p) => ({ ...p, width: Number(e.target.value) || 400 }))} />
        </div>
        <div>
          <label style={S.fieldLabel}>Height</label>
          <input style={S.fieldInput} type='number' value={panel.height} onChange={(e) => setPanel((p) => ({ ...p, height: Number(e.target.value) || 120 }))} />
        </div>
      </>
    );
  }
  return null;
}

export function sanitizeNode(n) {
  const validTypes = ['lifelineNode', 'activationNode', 'fragmentNode'];
  const type = validTypes.includes(n?.type) ? n.type : 'lifelineNode';
  return {
    ...n,
    type,
    position: {
      x: Number.isFinite(n?.position?.x) ? n.position.x : 120,
      y: Number.isFinite(n?.position?.y) ? n.position.y : 120,
    },
    data: {
      name: n?.data?.name || 'Object',
      lineHeight: n?.data?.lineHeight || 300,
      height: n?.data?.height || 60,
      fragmentType: n?.data?.fragmentType || 'alt',
      condition: n?.data?.condition || '',
      width: n?.data?.width || 400,
    },
  };
}

export function sanitizeEdge(e) {
  const validTypes = ['call', 'return', 'async'];
  return {
    ...e,
    type: 'sequenceEdge',
    data: {
      relationType: validTypes.includes(e?.data?.relationType) ? e.data.relationType : 'call',
      label: e?.data?.label || '',
    },
  };
}
