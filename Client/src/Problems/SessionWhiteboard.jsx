import { useEffect, useRef } from "react";

function drawStroke(ctx, stroke) {
  if (!ctx || !stroke) return;
  ctx.strokeStyle = stroke.color || "#0ea5e9";
  ctx.lineWidth = stroke.width || 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(stroke.fromX, stroke.fromY);
  ctx.lineTo(stroke.toX, stroke.toY);
  ctx.stroke();
}

function SessionWhiteboard({
  enabled,
  strokes,
  onAddStroke,
  onClear,
}) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes.forEach((stroke) => drawStroke(ctx, stroke));
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [strokes]);

  const addStroke = (stroke) => {
    const ctx = canvasRef.current?.getContext("2d");
    drawStroke(ctx, stroke);
    onAddStroke?.(stroke);
  };

  const getPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event) => {
    if (!enabled) return;
    isDrawingRef.current = true;
    lastPointRef.current = getPosition(event);
  };

  const handlePointerMove = (event) => {
    if (!enabled || !isDrawingRef.current) return;

    const next = getPosition(event);
    const prev = lastPointRef.current;

    const stroke = {
      fromX: prev.x,
      fromY: prev.y,
      toX: next.x,
      toY: next.y,
      color: "#0ea5e9",
      width: 2,
    };

    addStroke(stroke);
    lastPointRef.current = next;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  return (
    <div className="problem-panel rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 bg-base-100">
        <h3 className="text-sm font-semibold">Shared Whiteboard</h3>
        <button
          className="btn btn-xs btn-outline"
          disabled={!enabled}
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      <div className="flex-1 bg-base-200/60 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {!enabled && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-base-content/60 bg-base-200/50">
            Join a session to draw with others
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionWhiteboard;
