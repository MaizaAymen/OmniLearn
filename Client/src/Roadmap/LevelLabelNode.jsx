import React, { memo } from "react";

// Non-interactive label node rendered at the left of each pyramid row.
function LevelLabelNode({ data }) {
  const isAdvanced = data.advanced;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
        userSelect: "none",
        pointerEvents: "none",
        minWidth: 120,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: isAdvanced ? "#7C3AED" : "#94A3B8",
        }}
      >
        Level {data.index + 1}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: isAdvanced ? "#7C3AED" : "#0F172A",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {data.title}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "#64748B",
          fontStyle: "italic",
        }}
      >
        {data.subtitle}
      </span>
      <div
        style={{
          marginTop: 6,
          width: 2,
          height: 50,
          background: isAdvanced
            ? "linear-gradient(#7C3AED, transparent)"
            : "linear-gradient(#CBD5E1, transparent)",
        }}
      />
    </div>
  );
}

export default memo(LevelLabelNode);
