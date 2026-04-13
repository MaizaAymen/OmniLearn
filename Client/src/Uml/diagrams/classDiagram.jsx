import { BaseEdge, EdgeLabelRenderer, Handle, Position, getBezierPath } from '@xyflow/react';

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

export const TYPES = {
  class: { label: 'Class', bg: '#EFF6FF', border: '#3B82F6', italic: false },
  interface: { label: 'Interface', bg: '#F5F3FF', border: '#8B5CF6', italic: true },
  abstract: { label: 'Abstract', bg: '#F8FAFC', border: '#64748B', italic: true },
  enum: { label: 'Enum', bg: '#FFFBEB', border: '#F59E0B', italic: false },
  note: { label: 'Note', bg: '#FEFCE8', border: '#EAB308', italic: false },
};

export const LINKS = [
  { id: 'association', label: 'Association' },
  { id: 'inheritance', label: 'Inheritance' },
  { id: 'realization', label: 'Realization' },
  { id: 'aggregation', label: 'Aggregation' },
  { id: 'composition', label: 'Composition' },
  { id: 'dependency', label: 'Dependency' },
];

export const STORAGE_KEY = 'omnilearn_uml_reactflow_v1';

function ClassEdge(props) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } = props;
  const relationType = data?.relationType || 'association';
  const label = LINKS.find((l) => l.id === relationType)?.label || relationType;

  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const { dash, stroke } = relationStyle(relationType);
  const dir = norm(targetX - sourceX, targetY - sourceY);

  let sourceMarker = null;
  let targetMarker = null;

  if (relationType === 'inheritance' || relationType === 'realization') {
    targetMarker = (
      <polygon points={pointsToStr(triangleAtTip({ x: targetX, y: targetY }, dir, 14))} fill='white' stroke='#1E293B' strokeWidth='1.4' />
    );
  } else if (relationType === 'dependency') {
    const pts = openArrowAtTip({ x: targetX, y: targetY }, dir, 12);
    targetMarker = (
      <polyline points={pointsToStr(pts)} fill='none' stroke='#1E293B' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
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
      <BaseEdge id={id} path={path} style={{ stroke, strokeWidth: selected ? 2.2 : 1.6, strokeDasharray: dash }} />
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

function ClassNode({ data, selected }) {
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

export const nodeTypes = { uml: ClassNode };
export const edgeTypes = { uml: ClassEdge };

export function initialDiagram() {
  const animalId = uid('node');
  const dogId = uid('node');
  const iId = uid('node');
  return {
    nodes: [
      {
        id: animalId, type: 'uml', position: { x: 80, y: 80 },
        data: { umlType: 'class', name: 'Animal', stereotype: '', attributes: ['+ name : String', '+ age : int'], operations: ['+ speak() : void', '+ move() : void'] },
      },
      {
        id: dogId, type: 'uml', position: { x: 80, y: 340 },
        data: { umlType: 'class', name: 'Dog', stereotype: '', attributes: ['+ breed : String'], operations: ['+ fetch() : void'] },
      },
      {
        id: iId, type: 'uml', position: { x: 420, y: 90 },
        data: { umlType: 'interface', name: 'Serializable', stereotype: '«interface»', attributes: [], operations: ['+ serialize() : String', '+ deserialize() : void'] },
      },
    ],
    edges: [
      { id: uid('edge'), source: dogId, target: animalId, type: 'uml', data: { relationType: 'inheritance' } },
      { id: uid('edge'), source: animalId, target: iId, type: 'uml', data: { relationType: 'realization' } },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function defaultNodeData(umlType) {
  const t = TYPES[umlType] || TYPES.class;
  return {
    umlType,
    name: umlType === 'class' ? 'NewClass' : `New${t.label}`,
    stereotype: umlType === 'interface' ? '«interface»' : umlType === 'abstract' ? '«abstract»' : '',
    attributes: umlType === 'class' ? ['+ attribute : type'] : [],
    operations: ['+ method() : void'],
  };
}

export function nodeTypeKey() {
  return 'uml';
}

export function edgeTypeKey() {
  return 'uml';
}

export function openPanelFor(node) {
  return {
    id: node.id,
    name: node.data.name || '',
    umlType: node.data.umlType || 'class',
    stereotype: node.data.stereotype || '',
    attributes: [...(node.data.attributes || [])],
    operations: [...(node.data.operations || [])],
  };
}

export function applyPanelToNode(nodeData, panel) {
  return {
    ...nodeData,
    name: panel.name,
    umlType: panel.umlType,
    stereotype: panel.stereotype,
    attributes: panel.attributes,
    operations: panel.operations,
  };
}

export function PanelFields({ panel, setPanel, S }) {
  return (
    <>
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
        <input style={S.fieldInput} placeholder='e.g. «entity»' value={panel.stereotype} onChange={(e) => setPanel((p) => ({ ...p, stereotype: e.target.value }))} />
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
    </>
  );
}

export function sanitizeNode(n) {
  return {
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
  };
}

export function sanitizeEdge(e) {
  return {
    ...e,
    type: 'uml',
    data: {
      relationType: LINKS.some((l) => l.id === e?.data?.relationType) ? e.data.relationType : 'association',
    },
  };
}
