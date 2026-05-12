import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { roadmapApi } from "./api";

/* ── Check if the user earned the certificate ───────────────────────
   Rules:
   1. All nodes status === "completed"
   2. Every node has at least one quiz attempt
   3. Average best score across all nodes >= 80%
────────────────────────────────────────────────────────────────────── */
export function checkEligibility(graph) {
  const nodes = graph?.nodes || [];
  if (!nodes.length) return { eligible: false, allCompleted: false, allQuizzed: false, avgScore: 0 };

  const allCompleted = nodes.every((n) => n.status === "completed");
  const allQuizzed   = nodes.every((n) => (n.quizAttempts || []).length > 0);
  const avgScore     = Math.round(
    nodes.reduce((sum, n) => sum + (n.bestScore || 0), 0) / nodes.length
  );

  return {
    eligible: allCompleted && allQuizzed && avgScore >= 80,
    allCompleted,
    allQuizzed,
    avgScore,
  };
}

/* ── Download a PDF certificate using jsPDF ─────────────────────────
   No images, no external fonts — pure vector so it always works.
────────────────────────────────────────────────────────────────────── */
function downloadCertificate({ userName, roadmapTitle, avgScore, issuedAt }) {
  const doc  = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W    = doc.internal.pageSize.getWidth();   // 297
  const H    = doc.internal.pageSize.getHeight();  // 210
  const cx   = W / 2;
  const date = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, W, H, "F");

  // Outer border
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, W - 20, H - 20);

  // Inner border
  doc.setDrawColor(147, 197, 253);
  doc.setLineWidth(0.4);
  doc.rect(13, 13, W - 26, H - 26);

  // Header accent bar
  doc.setFillColor(59, 130, 246);
  doc.rect(10, 10, W - 20, 14, "F");

  // "OMNILEARN" in header bar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("OMNILEARN", cx, 19, { align: "center" });

  // Certificate of Completion
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42);
  doc.text("Certificate of Completion", cx, 55, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text("This certifies that", cx, 70, { align: "center" });

  // User name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(29, 78, 216);
  doc.text(userName || "Student", cx, 88, { align: "center" });

  // Underline under name
  const nameW = doc.getTextWidth(userName || "Student");
  doc.setDrawColor(147, 197, 253);
  doc.setLineWidth(0.5);
  doc.line(cx - nameW / 2, 91, cx + nameW / 2, 91);

  // "has successfully completed"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text("has successfully completed the learning roadmap", cx, 102, { align: "center" });

  // Roadmap title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(roadmapTitle || "AI Learning Roadmap", cx, 116, { align: "center" });

  // Score badge box
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.setLineWidth(0.5);
  doc.roundedRect(cx - 28, 124, 56, 16, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(29, 78, 216);
  doc.text(`Average Quiz Score: ${avgScore}%`, cx, 134, { align: "center" });

  // Footer line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(30, 155, W - 30, 155);

  // Date + platform
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Issued on ${date}`, 35, 165);
  doc.text("OmniLearn · AI-Powered Learning Platform", W - 35, 165, { align: "right" });

  doc.save(`OmniLearn_Certificate_${(roadmapTitle || "Roadmap").replace(/\s+/g, "_")}.pdf`);
}

/* ── The button component ───────────────────────────────────────────
   - Blurred + tooltip when not eligible
   - Shows what's missing
   - Downloads PDF on click when eligible
────────────────────────────────────────────────────────────────────── */
export default function CertificateButton({ graph, userName, roadmapTitle, certificateIssuedAt, onIssued }) {
  const [loading, setLoading] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const { eligible, allCompleted, allQuizzed, avgScore } = checkEligibility(graph);

  const handleClick = async () => {
    if (!eligible) return;
    setLoading(true);
    try {
      // If not yet issued, stamp it in the DB first
      let issuedAt = certificateIssuedAt;
      if (!issuedAt) {
        const res = await roadmapApi.issueCertificate();
        issuedAt  = res.issuedAt;
        onIssued?.(issuedAt);
      }
      downloadCertificate({ userName, roadmapTitle, avgScore, issuedAt });
    } catch (e) {
      alert(e.response?.data?.error || "Could not issue certificate");
    } finally {
      setLoading(false);
    }
  };

  // Build the missing-items checklist for the tooltip
  const missing = [
    !allCompleted && `Complete all steps (status = done)`,
    !allQuizzed   && `Attempt every quiz`,
    avgScore < 80 && `Reach avg quiz score ≥ 80% (now ${avgScore}%)`,
  ].filter(Boolean);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={handleClick}
        onMouseEnter={() => !eligible && setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        disabled={loading}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px",
          background: eligible ? "#1D4ED8" : "#E2E8F0",
          color:      eligible ? "#FFFFFF"  : "#94A3B8",
          border:     "none",
          borderRadius: 7,
          fontSize: 12, fontWeight: 700,
          cursor:  eligible ? "pointer" : "not-allowed",
          // Blur the button until eligible
          filter:  eligible ? "none" : "blur(0.6px)",
          opacity: eligible ? 1 : 0.7,
          transition: "all 200ms",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        🎓 {loading ? "Generating…" : certificateIssuedAt ? "Download Certificate" : "Get Certificate"}
      </button>

      {/* Tooltip showing what's missing */}
      {showTip && !eligible && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          right: 0,
          background: "#1E293B",
          color: "#F1F5F9",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 11.5,
          fontWeight: 500,
          lineHeight: 1.6,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          zIndex: 999,
          minWidth: 220,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#FCD34D" }}>
            Complete to unlock 🎓
          </div>
          {missing.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ color: "#F87171", flexShrink: 0 }}>✗</span>
              <span>{m}</span>
            </div>
          ))}
          {/* Arrow */}
          <div style={{
            position: "absolute", bottom: -5, right: 16,
            width: 10, height: 10,
            background: "#1E293B",
            transform: "rotate(45deg)",
          }} />
        </div>
      )}
    </div>
  );
}
