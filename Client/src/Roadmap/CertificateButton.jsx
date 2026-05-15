import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { roadmapApi } from "./api";

/* ── Eligibility check ──────────────────────────────────────────── */
export function checkEligibility(graph) {
  const nodes = graph?.nodes || [];
  if (!nodes.length)
    return { eligible: false, allCompleted: false, allQuizzed: false, avgScore: 0 };

  const allCompleted = nodes.every((n) => n.status === "completed");
  const allQuizzed   = nodes.every((n) => (n.quizAttempts || []).length > 0);
  const avgScore     = Math.round(
    nodes.reduce((sum, n) => sum + (n.bestScore || 0), 0) / nodes.length
  );

  return { eligible: allCompleted, allCompleted, allQuizzed, avgScore };
}

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Draw a rounded rectangle path (jsPDF has roundedRect but this gives us more control) */
function roundRect(doc, x, y, w, h, r, style) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

/** Centered text shorthand */
function cText(doc, text, y, opts = {}) {
  doc.text(text, opts.cx ?? 148.5, y, { align: "center", ...opts });
}

/**
 * Draw decorative corner ornament using pure jsPDF curves.
 * Each corner is a stylised floral "L" built from arcs and bezier curves.
 */
function drawCornerOrnament(doc, cx, cy, flipX, flipY) {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;

  doc.setDrawColor(212, 175, 55);   // gold
  doc.setLineWidth(0.6);

  // Outer petal sweep (large arc)
  const steps = 40;
  const r1 = 18, r2 = 14;

  // Draw a decorative spiral-fan from corner
  for (let i = 0; i < 5; i++) {
    const angle = (i / 4) * (Math.PI / 2);
    const nextAngle = ((i + 1) / 4) * (Math.PI / 2);
    const r = r1 - i * 1.5;
    doc.lines(
      [[
        Math.cos(angle) * r * sx, Math.sin(angle) * r * sy,
        Math.cos((angle + nextAngle) / 2) * (r + 4) * sx,
        Math.sin((angle + nextAngle) / 2) * (r + 4) * sy,
        Math.cos(nextAngle) * r * sx,
        Math.sin(nextAngle) * r * sy,
      ]],
      cx, cy,
      [1, 1],
      null,
      false
    );
  }

  // Small swirl dots
  doc.setFillColor(212, 175, 55);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 3) * (Math.PI / 2);
    const r = r2 - i * 2;
    doc.circle(
      cx + Math.cos(angle) * r * sx,
      cy + Math.sin(angle) * r * sy,
      0.8,
      "F"
    );
  }

  // Decorative L-bracket lines
  doc.setLineWidth(1.2);
  doc.setDrawColor(212, 175, 55);
  doc.line(cx, cy, cx + 22 * sx, cy);
  doc.line(cx, cy, cx, cy + 22 * sy);

  doc.setLineWidth(0.4);
  doc.line(cx + 2 * sx, cy + 2 * sy, cx + 18 * sx, cy + 2 * sy);
  doc.line(cx + 2 * sx, cy + 2 * sy, cx + 2 * sx, cy + 18 * sy);
}

/** Draw the decorative double-border frame */
function drawFrame(doc, W, H) {
  // Cream fill
  doc.setFillColor(255, 253, 245);
  doc.rect(0, 0, W, H, "F");

  // Outer thick gold border
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(3);
  doc.rect(8, 8, W - 16, H - 16);

  // Thin inner gold border
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.6);
  doc.rect(12, 12, W - 24, H - 24);

  // Extra thin line inside that
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 145, 30);
  doc.rect(14, 14, W - 28, H - 28);
}

/** Draw all four corner ornaments */
function drawOrnaments(doc, W, H) {
  drawCornerOrnament(doc, 14, 14, false, false);    // top-left
  drawCornerOrnament(doc, W - 14, 14, true, false); // top-right
  drawCornerOrnament(doc, 14, H - 14, false, true); // bottom-left
  drawCornerOrnament(doc, W - 14, H - 14, true, true); // bottom-right
}

/** Thin horizontal ornamental divider line with center diamond */
function drawDivider(doc, y, W) {
  const lx1 = 40, lx2 = W - 40, cx = W / 2;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(lx1, y, cx - 6, y);
  doc.line(cx + 6, y, lx2, y);

  // Center diamond
  doc.setFillColor(212, 175, 55);
  doc.lines(
    [[6, 0], [0, 3], [-6, 0], [0, -3]],
    cx - 0, y - 3,
    [1, 1],
    "F"
  );
}

/**
 * Draw the OmniLearn logo:
 * A tan/beige outer circle containing:
 *   - Large pink circle (upper-left area)
 *   - Medium teal circle (lower-center)
 *   - Small orange circle (right)
 * Matches the uploaded logo image exactly.
 */
function drawLogo(doc, cx, cy, r) {
  // Outer tan circle with dark brown stroke
  doc.setFillColor(195, 185, 145);   // tan/beige
  doc.setDrawColor(55, 38, 20);       // dark brown
  doc.setLineWidth(0.8);
  doc.circle(cx, cy, r, "FD");

  // Large pink circle — upper-left quadrant, radius ~60% of outer
  const rPink = r * 0.60;
  doc.setFillColor(225, 170, 200);   // soft pink
  doc.setDrawColor(55, 38, 20);
  doc.setLineWidth(0.5);
  doc.circle(cx - r * 0.16, cy - r * 0.10, rPink, "FD");

  // Medium teal circle — lower-center, radius ~35% of outer
  const rTeal = r * 0.35;
  doc.setFillColor(110, 200, 200);   // teal/cyan
  doc.setDrawColor(55, 38, 20);
  doc.setLineWidth(0.5);
  doc.circle(cx - r * 0.08, cy + r * 0.35, rTeal, "FD");

  // Small orange circle — right side, radius ~18% of outer
  const rOrange = r * 0.18;
  doc.setFillColor(240, 165, 100);   // orange
  doc.setDrawColor(55, 38, 20);
  doc.setLineWidth(0.4);
  doc.circle(cx + r * 0.55, cy + r * 0.25, rOrange, "FD");
}

/**
 * Draw a realistic cursive signature using bezier curves.
 * Simulates a flowing pen signature for "A. Rahman" style.
 * ox, oy = origin (left baseline of signature)
 * scale  = size multiplier (default 1 → ~40mm wide)
 */
function drawSignature(doc, ox, oy, scale = 1) {
  doc.setDrawColor(20, 20, 80);   // dark navy ink
  doc.setLineWidth(0.45 * scale);

  const s = scale;

  // Helper: draw a cubic bezier segment relative to ox, oy
  const bz = (x1, y1, cx1, cy1, cx2, cy2, x2, y2) => {
    doc.lines(
      [[cx1 - x1, cy1 - y1, cx2 - x1, cy2 - y1, x2 - x1, y2 - y1]],
      ox + x1 * s, oy + y1 * s,
      [1, 1], null, false
    );
  };

  // ── Letter "O" loop (first initial) ──────────────────────────
  bz(0, 0,   2,-5,  6,-5,  8, 0);
  bz(8, 0,  10, 4,  6, 6,  4, 3);
  bz(4, 3,   2, 1,  3,-1,  8, 1);   // exit stroke rightward

  // ── Connecting flourish ───────────────────────────────────────
  bz(8, 1,  12,-2, 13,-3, 15, 0);

  // ── Letter "m" hump 1 ────────────────────────────────────────
  bz(15, 0, 16,-4, 19,-4, 20, 0);
  // hump 2
  bz(20, 0, 21,-4, 24,-4, 25, 0);

  // ── Descending tail ──────────────────────────────────────────
  bz(25, 0, 27, 1, 29, 5, 27, 7);
  bz(27, 7, 25, 9, 21, 8, 22, 5);

  // ── Long underline flourish ───────────────────────────────────
  doc.setLineWidth(0.3 * scale);
  bz(0, 3,  10, 6, 20, 7, 30, 3);
  bz(30, 3, 34, 1, 36, 2, 38, 1);
}

/* ── Main PDF generator ─────────────────────────────────────────── */
function downloadCertificate({ userName, roadmapTitle, avgScore, issuedAt }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.getWidth();   // 297
  const H   = doc.internal.pageSize.getHeight();  // 210
  const cx  = W / 2;

  const date = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Generate a cert ID
  const certId = `OL-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  // ── Background & frame ──────────────────────────────────────────
  drawFrame(doc, W, H);
  drawOrnaments(doc, W, H);

  // ── Logo (top-left area) ─────────────────────────────────────────
  drawLogo(doc, 46, 44, 18);

  // ── OMNILEARN logotype below logo ────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text("OMNILEARN", 46, 67, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(120, 100, 30);
  doc.text("AI-Powered Learning", 46, 71, { align: "center" });

  // ── Main title ──────────────────────────────────────────────────
  // "CERTIFICATE" in large spaced caps
  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.setTextColor(20, 20, 20);
  cText(doc, "CERTIFICATE", 52);

  // Divider below title
  drawDivider(doc, 57, W);

  // "OF COMPLETION" subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setCharSpace(3);
  doc.setTextColor(180, 145, 30);
  cText(doc, "OF COMPLETION", 65);
  doc.setCharSpace(0);

  // ── Body text ───────────────────────────────────────────────────
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(80, 70, 50);
  cText(doc, "This is to certify that", 80);

  // Student name — large, bold, blue-navy
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(14, 40, 100);
  cText(doc, userName || "Student Name", 96);

  // Underline under name
  const nameW = doc.getTextWidth(userName || "Student Name");
  doc.setDrawColor(180, 145, 30);
  doc.setLineWidth(0.5);
  doc.line(cx - nameW / 2, 98.5, cx + nameW / 2, 98.5);

  // "has successfully completed"
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(80, 70, 50);
  cText(doc, "has successfully completed the learning roadmap", 109);

  // Roadmap title
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  cText(doc, roadmapTitle || "AI Learning Roadmap", 120);

  // "and demonstrated proficiency..."
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(100, 85, 55);
  cText(doc, `and demonstrated proficiency with an average quiz score of ${avgScore}%`, 130);

  // Thin rule above signatures
  doc.setDrawColor(200, 180, 100);
  doc.setLineWidth(0.3);
  doc.line(35, 142, W - 35, 142);

  // ── Signatures ──────────────────────────────────────────────────
  // Left signature block
  const sig1x = 90;
  const sig2x = W - 90;
  const sigY  = 155;

  // Signature lines
  doc.setDrawColor(60, 50, 30);
  doc.setLineWidth(0.4);
  doc.line(sig1x - 25, sigY, sig1x + 25, sigY);
  doc.line(sig2x - 25, sigY, sig2x + 25, sigY);

  // Draw realistic cursive signatures ABOVE each line
  drawSignature(doc, sig1x - 19, sigY - 12, 0.75);
  drawSignature(doc, sig2x - 19, sigY - 11, 0.72);

  // Name below line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text("Platform Director", sig1x, sigY + 5, { align: "center" });
  doc.text("Head of Curriculum", sig2x, sigY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 110, 60);
  doc.text("OmniLearn", sig1x, sigY + 9, { align: "center" });
  doc.text("OmniLearn", sig2x, sigY + 9, { align: "center" });

  // ── Footer ───────────────────────────────────────────────────────
  doc.setDrawColor(200, 180, 100);
  doc.setLineWidth(0.2);
  doc.line(35, 170, W - 35, 170);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 130, 80);
  doc.text(`Certificate ID: ${certId}`, 38, 177);
  doc.text(`Issued on ${date}`, 38, 182);
  doc.text("OmniLearn · AI-Powered Learning Platform · omnilearn.ai", W - 38, 177, { align: "right" });
  doc.text("This certificate verifies completion of a structured AI learning roadmap.", W - 38, 182, { align: "right" });

  doc.save(
    `OmniLearn_Certificate_${(roadmapTitle || "Roadmap").replace(/\s+/g, "_")}.pdf`
  );
}

/* ── Button component ───────────────────────────────────────────── */
export default function CertificateButton({
  graph,
  userName,
  roadmapTitle,
  certificateIssuedAt,
  onIssued,
}) {
  const [loading, setLoading]   = useState(false);
  const [showTip, setShowTip]   = useState(false);

  const { eligible, allCompleted, allQuizzed, avgScore } = checkEligibility(graph);

  const handleClick = async () => {
    if (!eligible) return;
    setLoading(true);
    try {
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

  const missing = [
    !allCompleted && `Complete all steps`,
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
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          background: eligible
            ? "linear-gradient(135deg, #1D4ED8 0%, #1e40af 100%)"
            : "#E2E8F0",
          color:      eligible ? "#FFFFFF" : "#94A3B8",
          border:     eligible ? "1px solid #1e3a8a" : "1px solid #CBD5E1",
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 700,
          cursor:  eligible ? "pointer" : "not-allowed",
          filter:  eligible ? "none" : "blur(0.6px)",
          opacity: eligible ? 1 : 0.7,
          transition: "all 200ms",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          boxShadow: eligible ? "0 2px 8px rgba(29,78,216,0.3)" : "none",
        }}
      >
        🎓 {loading ? "Generating…" : certificateIssuedAt ? "Download Certificate" : "Get Certificate"}
      </button>

      {showTip && !eligible && (
        <div
          style={{
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
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#FCD34D" }}>
            Complete to unlock 🎓
          </div>
          {missing.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ color: "#F87171", flexShrink: 0 }}>✗</span>
              <span>{m}</span>
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              bottom: -5,
              right: 16,
              width: 10,
              height: 10,
              background: "#1E293B",
              transform: "rotate(45deg)",
            }}
          />
        </div>
      )}
    </div>
  );
}