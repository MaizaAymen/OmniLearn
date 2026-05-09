import React, { useEffect, useState } from "react";
import { roadmapApi } from "./api";
import { NODE_META, STATUS_META } from "./nodeTypes";

export default function NodeDetailPanel({ node, onClose, onStatusChange }) {
  const [resources, setResources] = useState({ stackoverflow: [], youtube: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    roadmapApi.resources(node.id)
      .then((r) => !cancelled && setResources(r))
      .catch(() => !cancelled && setResources({ stackoverflow: [], youtube: [] }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [node.id]);

  const meta = NODE_META[node.type] || NODE_META.concept;

  const setStatus = async (s) => {
    setSaving(true);
    try {
      await roadmapApi.setStatus(node.id, s);
      onStatusChange(node.id, s);
    } finally { setSaving(false); }
  };

  return (
    <aside className="rm-panel" style={{ "--rm-accent": meta.color }}>
      {/* Accent bar */}
      <div style={{ height: 6, background: meta.color }} />

      <div style={{ padding: "20px 24px", borderBottom: "2px solid #10162F" }}>
        <div className="flex justify-between items-center mb-3">
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
            textTransform: "uppercase", color: meta.color,
            background: `${meta.color}12`, border: `1.5px solid ${meta.color}40`,
            padding: "3px 10px", borderRadius: 4,
          }}>
            {meta.icon} {meta.label}
          </span>
          <button onClick={onClose} className="rm-btn ghost" style={{ padding: "4px 12px" }}>✕</button>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "#10162F", letterSpacing: "-0.01em", fontWeight: 700, lineHeight: 1.25 }}>
          {node.title}
        </h2>
        <p style={{ color: "#3D4168", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{node.description}</p>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#3D4168", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
            Status
          </div>
          {["pending", "in_progress", "completed"].map((s) => (
            <span
              key={s}
              className={`rm-chip ${node.status === s ? "active" : ""}`}
              onClick={() => !saving && setStatus(s)}
            >
              {STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {node.challenge && (
        <Section title="🧩 Practice challenge">
          <p style={{ color: "#10162F", fontSize: 14, lineHeight: 1.6, margin: 0,
            padding: 14, background: "#FFF7F0",
            border: "2px solid #10162F", borderRadius: 8 }}>
            {node.challenge}
          </p>
        </Section>
      )}

      <Section title="💬 Stack Overflow">
        {loading ? <Skeleton /> : resources.stackoverflow.length === 0 ? (
          <Empty text={`No SO results for "${node.stackoverflowQuery || node.title}"`} />
        ) : resources.stackoverflow.map((q, i) => (
          <a key={i} className="rm-link" href={q.link} target="_blank" rel="noreferrer">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#10162F", lineHeight: 1.35 }}>
              {q.title}
            </div>
            <div style={{ fontSize: 11, color: "#3D4168", display: "flex", gap: 14, fontWeight: 600 }}>
              <span>▲ {q.votes} votes</span>
              <span>{q.answers} answers</span>
              {q.isAnswered && <span style={{ color: "#008A27" }}>✓ accepted</span>}
            </div>
          </a>
        ))}
      </Section>

      <Section title="🎥 YouTube">
        {loading ? <Skeleton /> : resources.youtube.length === 0 ? (
          <Empty text="No videos found" />
        ) : resources.youtube.map((v, i) => (
          <a key={i} className="rm-link" href={v.link} target="_blank" rel="noreferrer"
             style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {v.thumbnail && (
              <img src={v.thumbnail} alt="" style={{ width: 96, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0, border: "1.5px solid #10162F" }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#10162F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {v.title}
              </div>
              <div style={{ fontSize: 11, color: "#3D4168", fontWeight: 600 }}>
                {v.channel}{v.duration ? ` · ${v.duration}` : ""}
              </div>
            </div>
          </a>
        ))}
      </Section>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ padding: "18px 24px", borderBottom: "1px solid #E5E7EB" }}>
      <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: "#10162F", margin: "0 0 12px", fontWeight: 800 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <>
      {[1,2,3].map((i) => (
        <div key={i} className="rm-link" style={{ height: 48, opacity: 0.5, background: "#F1F5F9", borderColor: "#E5E5E5" }} />
      ))}
    </>
  );
}

function Empty({ text }) {
  return <div style={{ color: "#3D4168", fontSize: 12, fontStyle: "italic" }}>{text}</div>;
}
