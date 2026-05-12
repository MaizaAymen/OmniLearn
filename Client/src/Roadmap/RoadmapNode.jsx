import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { NODE_META, STATUS_META } from "./nodeTypes";

/* Premium roadmap.sh-inspired card.
   - Accent stripe at top driven by node type.
   - Clean two-row body: type chip + title + footer (difficulty + status).
   - Active stage gets a purple drop-shadow; non-active stages dim. */
function RoadmapNode({ data, selected }) {
  const meta = NODE_META[data.type] || NODE_META.concept;
  const status = data.status || "pending";
  const sm = STATUS_META[status];
  const stageNum = (data.stageIndex ?? 0) + 1;

  const cls = [
    "rm-node-v2",
    `status-${status}`,
    data.isActiveStage ? "is-active-stage" : "",
    data.isActiveStage === false ? "is-dimmed" : "",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} style={{ "--rm-accent": meta.color }}>
      <div className="rm-v2-bar" />
      <div className="rm-v2-body">
        <div className="rm-v2-head">
          <span className="rm-v2-type">
            <span>{meta.icon}</span>
            {meta.label}
          </span>
          <span className="rm-v2-stage">Step {stageNum}</span>
        </div>

        <div className="rm-v2-title">{data.title}</div>

        <div className="rm-v2-foot">
          {data.difficulty ? (
            <span className={`rm-v2-diff diff-${data.difficulty}`}>
              {data.difficulty}
            </span>
          ) : (
            <span />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Quiz score badge — only shown after at least one attempt */}
            {data.bestScore != null && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px",
                borderRadius: 4,
                background: data.bestScore >= 80 ? "#F0FDF4" : "#FFF7ED",
                color:      data.bestScore >= 80 ? "#16A34A" : "#EA580C",
                border:     `1px solid ${data.bestScore >= 80 ? "#BBF7D0" : "#FED7AA"}`,
              }}>
                🧠 {data.bestScore}%
              </span>
            )}
            <span className="rm-v2-status">
              <i className="dot" style={{ background: sm.color }} />
              {sm.label}
            </span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Top} id="s-top" style={handleStyle} />
      <Handle type="target" position={Position.Top} id="t-top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" style={handleStyle} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" style={handleStyle} />
    </div>
  );
}

const handleStyle = {
  width: 6,
  height: 6,
  border: "1px solid #10162F33",
  background: "#FFFFFF",
  opacity: 0,
};

export default memo(RoadmapNode);
