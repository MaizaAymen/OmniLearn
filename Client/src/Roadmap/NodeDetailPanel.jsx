import React, { useEffect, useState } from "react";
import { roadmapApi } from "./api";
import { NODE_META, STATUS_META } from "./nodeTypes";

const TABS = [
  { id: "docs",          label: "Docs",          icon: "📄" },
  { id: "youtube",       label: "YouTube",        icon: "▶" },
  { id: "stackoverflow", label: "Stack Overflow", icon: "💬" },
];

export default function NodeDetailPanel({ node, onClose, onStatusChange, embedded = false }) {
  const [resources, setResources] = useState({ stackoverflow: [], youtube: [], docs: [] });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [tab, setTab]             = useState("docs");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTab("docs");
    roadmapApi
      .resources(node.id)
      .then((r) => !cancelled && setResources({ stackoverflow: [], youtube: [], docs: [], ...r }))
      .catch(() => !cancelled && setResources({ stackoverflow: [], youtube: [], docs: [] }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [node.id]);

  const meta = NODE_META[node.type] || NODE_META.concept;
  const status = node.status || "pending";

  const setStatus = async (s) => {
    setSaving(true);
    try {
      await roadmapApi.setStatus(node.id, s);
      onStatusChange(node.id, s);
    } finally {
      setSaving(false);
    }
  };

  const Body = (
    <div style={styles.wrap}>
      {/* ── Node header ──────────────────────────────────────────── */}
      <div style={styles.header}>
        <span style={{ ...styles.typeBadge, color: meta.color, background: meta.color + "15" }}>
          {meta.icon} {meta.label}
        </span>
        {node.difficulty && (
          <span style={{ ...styles.diffBadge, ...diffStyle(node.difficulty) }}>
            {node.difficulty}
          </span>
        )}
      </div>

      <div style={styles.title}>{node.title}</div>

      {node.description && (
        <p style={styles.desc}>{node.description}</p>
      )}

      {/* ── Status switcher ──────────────────────────────────────── */}
      <div style={styles.statusRow}>
        {["pending", "in_progress", "completed"].map((s) => {
          const active = status === s;
          const sm = STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => !saving && setStatus(s)}
              disabled={saving}
              style={{
                ...styles.statusBtn,
                background: active ? sm.color : "#F8FAFC",
                color: active ? "#FFFFFF" : "#475569",
                borderColor: active ? sm.color : "#E2E8F0",
              }}
            >
              {active && <span style={styles.statusDot} />}
              {sm.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab navbar ───────────────────────────────────────────── */}
      <div style={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...styles.tabBtn,
              color: tab === t.id ? "#1D4ED8" : "#64748B",
              borderBottom: tab === t.id ? "2px solid #3B82F6" : "2px solid transparent",
              fontWeight: tab === t.id ? 700 : 500,
              background: tab === t.id ? "#F0F7FF" : "transparent",
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────── */}
      <div style={styles.tabContent}>
        {tab === "docs" && (
          loading ? <SkeletonList /> : resources.docs.length === 0
            ? <Empty text={`No docs found for "${node.title}"`} />
            : resources.docs.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noreferrer" style={styles.card}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#93C5FD"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
              >
                <div style={styles.cardTop}>
                  <span style={styles.cardSource}>{d.source}</span>
                  <span style={styles.cardArrow}>↗</span>
                </div>
                <div style={styles.cardTitle}>{d.title}</div>
                {d.description && <div style={styles.cardSub}>{d.description}</div>}
              </a>
            ))
        )}

        {tab === "youtube" && (
          loading ? <SkeletonList /> : resources.youtube.length === 0
            ? <Empty text="No videos found" />
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Header — matches messaging chat style */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <YouTubeLogo />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#1F2937" }}>
                    YouTube Videos
                  </span>
                </div>
                {resources.youtube.slice(0, 3).map((v, i) => (
                  <a
                    key={i}
                    href={v.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: 8,
                      borderRadius: 10,
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#1F2937",
                      textDecoration: "none",
                      transition: "border-color 140ms",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#F87171"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#FECACA"}
                  >
                    {(v.thumbnail || v.thumb) && (
                      <img
                        src={v.thumbnail || v.thumb}
                        alt=""
                        style={{ width: 96, height: 54, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, lineHeight: 1.35,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {v.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>
                        {v.channel}{v.duration ? ` · ${v.duration}` : ""}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )
        )}

        {tab === "stackoverflow" && (
          loading ? <SkeletonList /> : resources.stackoverflow.length === 0
            ? <Empty text={`No results for "${node.stackoverflowQuery || node.title}"`} />
            : resources.stackoverflow.map((q, i) => (
              <a key={i} href={q.link} target="_blank" rel="noreferrer" style={styles.card}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#93C5FD"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
              >
                <div style={styles.cardTop}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={styles.soStat}>▲ {q.votes}</span>
                    <span style={styles.soStat}>{q.answers} ans</span>
                    {q.isAnswered && <span style={{ ...styles.soStat, color: "#059669" }}>✓ answered</span>}
                  </div>
                  <span style={styles.cardArrow}>↗</span>
                </div>
                <div style={styles.cardTitle}>{q.title}</div>
              </a>
            ))
        )}
      </div>

      {/* ── Practice challenge ───────────────────────────────────── */}
      {node.challenge && (
        <div style={styles.challenge}>
          <div style={styles.challengeLabel}>🧩 Practice challenge</div>
          <div style={styles.challengeBody}>{node.challenge}</div>
        </div>
      )}
    </div>
  );

  if (embedded) return Body;

  return (
    <aside style={styles.aside}>
      <div style={styles.asideHead}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>Step Details</span>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>
      {Body}
    </aside>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function YouTubeLogo({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: "#FF0000",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="#fff">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}

function SkeletonList() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ ...styles.card, height: 60, background: "#F1F5F9", borderColor: "#F1F5F9" }} />
      ))}
    </>
  );
}

function Empty({ text }) {
  return (
    <div style={{ color: "#94A3B8", fontSize: 12, fontStyle: "italic", padding: "12px 0" }}>
      {text}
    </div>
  );
}

function diffStyle(d) {
  if (d === "easy")   return { color: "#047857", background: "#10B98112" };
  if (d === "medium") return { color: "#B45309", background: "#F59E0B12" };
  if (d === "hard")   return { color: "#B91C1C", background: "#EF444412" };
  return { color: "#64748B", background: "#F1F5F9" };
}

/* ── Styles ──────────────────────────────────────────────────────── */
const styles = {
  wrap: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#FFFFFF",
    color: "#0F172A",
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  header: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  typeBadge: {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 10, fontWeight: 800, letterSpacing: "0.07em",
    textTransform: "uppercase", padding: "3px 8px", borderRadius: 4,
  },
  diffBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
    textTransform: "uppercase", padding: "3px 8px", borderRadius: 4,
  },
  title: {
    fontSize: 16, fontWeight: 700, color: "#0F172A",
    lineHeight: 1.3, letterSpacing: "-0.01em",
  },
  desc: {
    margin: 0, fontSize: 12.5, color: "#475569", lineHeight: 1.6,
  },
  statusRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  statusBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 11px", borderRadius: 6,
    fontSize: 11.5, fontWeight: 600, cursor: "pointer",
    border: "1px solid", transition: "all 140ms",
    fontFamily: "inherit",
  },
  statusDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "rgba(255,255,255,0.7)", flexShrink: 0,
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid #E5E7EB",
    gap: 0,
    marginBottom: 4,
  },
  tabBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px",
    border: "none", cursor: "pointer",
    fontSize: 12, transition: "all 140ms",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  tabContent: {
    display: "flex", flexDirection: "column", gap: 8,
    flex: 1,
  },
  card: {
    display: "block",
    padding: "10px 12px",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    textDecoration: "none",
    color: "#0F172A",
    transition: "border-color 140ms",
    cursor: "pointer",
  },
  cardTop: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 4,
  },
  cardSource: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "#3B82F6",
  },
  cardArrow: { fontSize: 12, color: "#94A3B8" },
  cardTitle: {
    fontSize: 12.5, fontWeight: 600, color: "#0F172A",
    lineHeight: 1.4,
    overflow: "hidden", textOverflow: "ellipsis",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  },
  cardSub: { fontSize: 11, color: "#64748B", marginTop: 3 },
  soStat: { fontSize: 10, fontWeight: 700, color: "#64748B" },
  thumb: {
    width: 90, height: 52, borderRadius: 6,
    objectFit: "cover", flexShrink: 0,
    border: "1px solid #E5E7EB",
  },
  challenge: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 8, padding: "10px 12px",
  },
  challengeLabel: {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.07em",
    textTransform: "uppercase", color: "#64748B", marginBottom: 6,
  },
  challengeBody: {
    fontSize: 12, color: "#334155",
    lineHeight: 1.6,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  aside: {
    position: "fixed", top: 0, right: 0, bottom: 0, width: 380,
    background: "#FFFFFF", borderLeft: "1px solid #E2E8F0",
    display: "flex", flexDirection: "column", zIndex: 50,
  },
  asideHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 16px", borderBottom: "1px solid #F1F5F9",
    background: "#F8FAFC",
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#94A3B8", fontSize: 16, padding: "4px 8px", borderRadius: 4,
  },
};
