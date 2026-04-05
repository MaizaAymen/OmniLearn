import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";

const COLORS = ["#0ea5e9", "#f43f5e", "#22c55e", "#f59e0b", "#a855f7", "#ffffff", "#000000"];
const BRUSH_SIZES = [2, 5, 12];

function applyStrokeStyle(ctx, stroke) {
  ctx.strokeStyle = stroke.color || "#0ea5e9";
  ctx.lineWidth   = stroke.width || 2;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
  }
}

function renderStroke(ctx, stroke) {
  if (!ctx || !stroke) return;
  applyStrokeStyle(ctx, stroke);
  ctx.beginPath();
  ctx.moveTo(stroke.fromX, stroke.fromY);
  ctx.lineTo(stroke.toX, stroke.toY);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}

const SessionWhiteboard = forwardRef(function SessionWhiteboard(
  { enabled, strokes, onAddStroke, onClear },
  ref
) {
  const canvasRef      = useRef(null);
  const isDrawingRef   = useRef(false);
  const lastPointRef   = useRef({ x: 0, y: 0 });
  const allStrokesRef  = useRef([]);   // full history (local + remote) for resize
  const rafRef         = useRef(null); // throttle

  const [color, setColor]         = useState("#0ea5e9");
  const [brushSize, setBrushSize] = useState(2);
  const [tool, setTool]           = useState("pen"); // pen | eraser

  // ── Imperative API ──────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    /** Draw a remote stroke directly — no React state update needed */
    addRemoteStroke(stroke) {
      allStrokesRef.current.push(stroke);
      const ctx = canvasRef.current?.getContext("2d");
      renderStroke(ctx, stroke);
    },
  }));

  // ── Resize: redraws all known strokes from the ref ───────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const redrawAll = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      canvas.width  = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      allStrokesRef.current.forEach((s) => renderStroke(ctx, s));
    };

    redrawAll();
    window.addEventListener("resize", redrawAll);
    return () => window.removeEventListener("resize", redrawAll);
  }, []);

  // ── Sync from prop — smart diff to avoid flicker ─────────────────────────
  // This fires when:
  //   • joining a session (bulk load)         → full redraw
  //   • a stroke is added locally or remotely → append only (no clear)
  //   • clear                                 → full clear
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const incoming = strokes ?? [];

    if (incoming.length === 0) {
      // Clear
      allStrokesRef.current = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const prevLen = allStrokesRef.current.length;

    if (incoming.length > prevLen) {
      // Append only the truly new strokes — avoids full clear+redraw
      // NOTE: addRemoteStroke already painted its stroke AND pushed to allStrokesRef,
      // so allStrokesRef.length may already equal incoming.length → nothing to do.
      const newStrokes = incoming.slice(allStrokesRef.current.length);
      allStrokesRef.current = [...incoming];
      newStrokes.forEach((s) => renderStroke(ctx, s));
      return;
    }

    // incoming.length <= prevLen and > 0: treat as a full state reset
    // (e.g. rejoining a session after leaving — shouldn't normally happen)
    allStrokesRef.current = [...incoming];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    incoming.forEach((s) => renderStroke(ctx, s));
  }, [strokes]);

  // ── Local drawing helpers ────────────────────────────────────────────────
  const commitStroke = (stroke) => {
    allStrokesRef.current.push(stroke);
    const ctx = canvasRef.current?.getContext("2d");
    renderStroke(ctx, stroke);
    onAddStroke?.(stroke);
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    if (!enabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current  = true;
    lastPointRef.current  = getPos(e);
  };

  const handlePointerMove = (e) => {
    if (!enabled || !isDrawingRef.current) return;

    // Throttle via requestAnimationFrame
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!isDrawingRef.current) return;

      const next = getPos(e);
      const prev = lastPointRef.current;

      // Skip near-zero movement to reduce noise
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      if (dx * dx + dy * dy < 1) return;

      commitStroke({
        fromX: prev.x, fromY: prev.y,
        toX:   next.x, toY:   next.y,
        color, width: brushSize, tool,
      });
      lastPointRef.current = next;
    });
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  return (
    <div className="problem-panel rounded-xl overflow-hidden h-full flex flex-col">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-base-300 bg-base-100 flex-wrap">
        <h3 className="text-sm font-semibold shrink-0">Whiteboard</h3>

        {/* Color swatches */}
        <div className="flex items-center gap-1 ml-1">
          {COLORS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              style={{ background: c, border: color === c && tool === "pen" ? "2px solid #60a5fa" : "2px solid transparent" }}
              className="w-5 h-5 rounded-full shrink-0 ring-offset-base-100 hover:scale-110 transition-transform"
            />
          ))}
        </div>

        {/* Brush sizes */}
        <div className="flex items-center gap-1 ml-1">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              title={`${s}px`}
              onClick={() => { setBrushSize(s); setTool("pen"); }}
              className={`flex items-center justify-center w-6 h-6 rounded-full border transition-colors ${
                brushSize === s && tool === "pen"
                  ? "border-primary bg-primary/10"
                  : "border-base-300 hover:border-primary/50"
              }`}
            >
              <div
                className="rounded-full bg-base-content"
                style={{ width: Math.max(2, s * 0.7), height: Math.max(2, s * 0.7) }}
              />
            </button>
          ))}
        </div>

        {/* Eraser */}
        <button
          title="Eraser"
          onClick={() => setTool("eraser")}
          className={`btn btn-xs px-2 ml-1 ${tool === "eraser" ? "btn-primary" : "btn-ghost border border-base-300"}`}
        >
          ✕ Eraser
        </button>

        {/* Clear */}
        <button
          className="btn btn-xs btn-outline ml-auto"
          disabled={!enabled}
          onClick={onClear}
        >
          Clear all
        </button>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 bg-base-200/60 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair", touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {!enabled && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-base-content/60 bg-base-200/50 select-none">
            Join a session to draw with others
          </div>
        )}
      </div>
    </div>
  );
});

export default SessionWhiteboard;
