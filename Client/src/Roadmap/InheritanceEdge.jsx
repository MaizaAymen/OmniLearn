import React from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";

// Inheritance edge — solid line with hollow white triangle at the target.
function norm(dx, dy) {
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}
function rotate(vx, vy) {
  return { x: -vy, y: vx };
}
function pointsToStr(points) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
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

export default function InheritanceEdge(props) {
  const {
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, selected, data,
  } = props;

  // Pull tip back so triangle isn't buried in the node border.
  const dir = norm(targetX - sourceX, targetY - sourceY);
  const TIP_PULL = 8;
  const tipX = targetX - dir.x * TIP_PULL;
  const tipY = targetY - dir.y * TIP_PULL;

  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX: tipX, targetY: tipY, targetPosition,
  });

  const stroke = data?.color || "#1E293B";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke, strokeWidth: selected ? 2.4 : 1.6 }}
      />
      <polygon
        points={pointsToStr(triangleAtTip({ x: tipX, y: tipY }, dir, 14))}
        fill="#FFFFFF"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {data?.showLabel !== false && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              fontSize: 10,
              color: "#64748B",
              background: "rgba(255,255,255,0.92)",
              padding: "1px 6px",
              borderRadius: 6,
              border: "1px solid #E2E8F0",
              whiteSpace: "nowrap",
              fontStyle: "italic",
            }}
          >
            extends
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
