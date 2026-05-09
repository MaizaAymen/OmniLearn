import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { NODE_META, STATUS_META } from "./nodeTypes";

// UML class-style node — header (stereotype + title), attributes, operations.
function RoadmapNode({ data, selected }) {
  const meta = NODE_META[data.type] || NODE_META.concept;
  const status = data.status || "pending";
  const sm = STATUS_META[status];

  const attributes = [
    `+ type : ${meta.label}`,
    data.difficulty ? `+ difficulty : ${data.difficulty}` : null,
    `+ status : ${status}`,
  ].filter(Boolean);

  const operations = [
    "+ openChallenge() : void",
    "+ stackOverflow() : Question[]",
    "+ youtube() : Video[]",
  ];

  return (
    <div
      className="rm-uml"
      style={{
        minWidth: 240,
        maxWidth: 240,
        borderRadius: 8,
        border: `2px solid ${selected ? "#1D4ED8" : meta.color}`,
        background: "#FFFFFF",
        overflow: "hidden",
        boxShadow: selected
          ? "0 0 0 3px rgba(29,78,216,0.18)"
          : "0 1px 2px rgba(15,23,42,0.08)",
        transition: "transform 180ms, box-shadow 180ms",
        cursor: "pointer",
      }}
    >
      {/* ── Header (stereotype + title) ─────────────────────────────── */}
      <div
        style={{
          background: `${meta.color}14`,
          borderBottom: `1px solid ${meta.color}`,
          padding: "8px 10px",
        }}
      >
        <div style={{ fontSize: 10, color: "#64748B", fontStyle: "italic", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>«{meta.label.toLowerCase()}»</span>
          <span>{meta.icon}</span>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#0F172A",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {data.title}
        </div>
      </div>

      {/* ── Attributes compartment ─────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid #E2E8F0",
          padding: "8px 10px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          color: "#334155",
          minHeight: 28,
          background: "#FFFFFF",
        }}
      >
        {attributes.map((a, i) => {
          const accent =
            a.includes("status : completed")
              ? "#008A27"
              : a.includes("status : in_progress")
              ? "#F59E0B"
              : a.startsWith("+ difficulty")
              ? difficultyColor(data.difficulty)
              : "#334155";
          return (
            <div key={i} style={{ color: accent }}>
              {a}
            </div>
          );
        })}
      </div>

      {/* ── Operations compartment ─────────────────────────────────── */}
      <div
        style={{
          padding: "8px 10px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          color: "#475569",
          background: "#FFFFFF",
        }}
      >
        {operations.map((o, i) => <div key={i}>{o}</div>)}
      </div>

      {/* status overlay strip at the bottom */}
      <div
        style={{
          height: 4,
          background:
            status === "completed"
              ? "#008A27"
              : status === "in_progress"
              ? "repeating-linear-gradient(45deg,#F59E0B 0 8px,#FBBF24 8px 16px)"
              : "#E2E8F0",
        }}
        title={sm.label}
      />

      {/* Handles — child (below) sources UP via top, parent (above) targets at bottom */}
      <Handle type="source" position={Position.Top} id="s-top" style={handleStyle} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="t-left" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="s-right" style={handleStyle} />
    </div>
  );
}

const handleStyle = {
  width: 8,
  height: 8,
  border: "1px solid #94A3B8",
  background: "#FFFFFF",
};

function difficultyColor(d) {
  if (d === "easy") return "#008A27";
  if (d === "hard") return "#E91C11";
  if (d === "medium") return "#B45309";
  return "#334155";
}

export default memo(RoadmapNode);
