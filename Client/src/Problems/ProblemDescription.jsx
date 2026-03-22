import { useEffect, useMemo, useRef, useState } from "react";
import { getDifficultyBadgeClass } from "./utils";
import {
  BookOpenIcon,
  LightbulbIcon,
  TagIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
function ProblemDescription({
  problem,
  currentProblemId,
  onProblemChange,
  allProblems,
}) {
  const [activeTab, setActiveTab] = useState("description");
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [activeRoadmapNodeId, setActiveRoadmapNodeId] = useState(null);
  const roadmapCanvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  const [roadmapZoom, setRoadmapZoom] = useState(1);

  const roadmapNodes = useMemo(() => {
    if (!problem?.roadmap || !Array.isArray(problem.roadmap.nodes)) return [];
    return problem.roadmap.nodes;
  }, [problem]);

  const roadmapEdges = useMemo(() => {
    if (!problem?.roadmap || !Array.isArray(problem.roadmap.edges)) return [];
    return problem.roadmap.edges;
  }, [problem]);

  const roadmapNodeById = useMemo(() => {
    return new Map(roadmapNodes.map((node) => [node.id, node]));
  }, [roadmapNodes]);

  useEffect(() => {
    if (roadmapNodes.length === 0) {
      setActiveRoadmapNodeId(null);
      return;
    }
    setActiveRoadmapNodeId((current) => {
      if (current && roadmapNodeById.has(current)) return current;
      return roadmapNodes[0].id;
    });
  }, [currentProblemId, roadmapNodes, roadmapNodeById]);

  useEffect(() => {
    const node = roadmapCanvasRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width && height) setCanvasSize({ width, height });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const roadmapPositions = useMemo(() => {
    if (roadmapNodes.length === 0) return new Map();
    const positions = new Map();
    const padding = 48;
    const innerHeight = Math.max(canvasSize.height - padding * 2, 1);
    const centerX = canvasSize.width / 2;
    const stepCount = Math.max(roadmapNodes.length - 1, 1);
    const stepGap = innerHeight / stepCount;

    roadmapNodes.forEach((node, index) => {
      const x = centerX;
      const y = padding + index * stepGap;
      positions.set(node.id, { x, y });
    });

    return positions;
  }, [roadmapNodes, canvasSize]);

  const activeRoadmapNode = activeRoadmapNodeId
    ? roadmapNodeById.get(activeRoadmapNodeId)
    : null;

  const handleRoadmapZoom = (delta) => {
    setRoadmapZoom((current) => {
      const next = Number((current + delta).toFixed(2));
      return Math.min(2, Math.max(0.6, next));
    });
  };


  const handleCopyExample = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };


  return (
    <div className="h-full flex flex-col bg-base-100">
      {/* Quick Generate */}

      {/* TABS */}
      <div className="flex items-center bg-base-100 border-b border-base-300 px-2 shrink-0">
        <button
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "description"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/50 hover:text-base-content/80"
          }`}
          onClick={() => setActiveTab("description")}
        >
          <BookOpenIcon className="size-3.5" />
          Description
        </button>
        <button
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "hints"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/50 hover:text-base-content/80"
          }`}
          onClick={() => setActiveTab("hints")}
        >
          <LightbulbIcon className="size-3.5" />
          Hints
        </button>
        <button
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "paint"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/50 hover:text-base-content/80"
          }`}
          onClick={() => setActiveTab("paint")}
        >
          <BookOpenIcon className="size-3.5" />
          Paint
        </button>
        <button
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "roadmap"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/50 hover:text-base-content/80"
          }`}
          onClick={() => setActiveTab("roadmap")}
        >
          <BookOpenIcon className="size-3.5" />
          Roadmap
        </button>
        
      </div>

      {/* CONTENT */}
      <div
        className={`flex-1 ${
          activeTab === "paint" ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        <div
        className={`flex-1 ${
          activeTab === "roadmap" ? "overflow-hidden" : "overflow-y-auto"
        }`}
        >
          {activeTab === "roadmap" && (
            <div className="h-full w-full p-4">
              {roadmapNodes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-base-content/40">
                  <BookOpenIcon className="size-8 mb-2" />
                  <p className="text-sm font-medium">No roadmap available yet.</p>
                  <p className="text-xs">Generate a problem roadmap to see steps here.</p>
                </div>
              ) : (
                <div className="h-full flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-base-content">
                        {problem.roadmap?.title || "Problem Roadmap"}
                      </h3>
                      <p className="text-xs text-base-content/50">
                        {problem.roadmap?.difficulty || problem.difficulty}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="join">
                        <button
                          type="button"
                          className="btn btn-xs join-item"
                          onClick={() => handleRoadmapZoom(-0.1)}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs join-item"
                          onClick={() => setRoadmapZoom(1)}
                        >
                          {Math.round(roadmapZoom * 100)}%
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs join-item"
                          onClick={() => handleRoadmapZoom(0.1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="badge badge-sm badge-outline">
                        {roadmapNodes.length} steps
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 min-h-0">
                    <div
                      ref={roadmapCanvasRef}
                      className="relative min-h-[320px] rounded-xl border border-base-300 bg-base-200/40 overflow-auto"
                      onWheel={(event) => {
                        if (!event.ctrlKey) return;
                        event.preventDefault();
                        handleRoadmapZoom(event.deltaY > 0 ? -0.05 : 0.05);
                      }}
                    >
                      <div
                        className="relative"
                        style={{
                          width: canvasSize.width,
                          height: canvasSize.height,
                          transform: `scale(${roadmapZoom})`,
                          transformOrigin: "top left",
                        }}
                      >
                        <svg className="absolute inset-0 w-full h-full">
                          {roadmapEdges.map((edge, idx) => {
                            const from = roadmapPositions.get(edge.from);
                            const to = roadmapPositions.get(edge.to);
                            if (!from || !to) return null;
                            return (
                              <line
                                key={`${edge.from}-${edge.to}-${idx}`}
                                x1={from.x}
                                y1={from.y}
                                x2={to.x}
                                y2={to.y}
                                stroke="currentColor"
                                className="text-base-content/20"
                                strokeWidth="2"
                              />
                            );
                          })}
                        </svg>

                        {roadmapNodes.map((node, index) => {
                          const pos = roadmapPositions.get(node.id) || { x: 0, y: 0 };
                          const isActive = node.id === activeRoadmapNodeId;
                          return (
                            <button
                              key={node.id}
                              type="button"
                              onClick={() => setActiveRoadmapNodeId(node.id)}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-lg border text-left text-xs shadow-sm transition ${
                                isActive
                                  ? "bg-base-100 border-primary text-base-content"
                                  : "bg-base-100/80 border-base-300 text-base-content/80 hover:border-primary/60"
                              }`}
                              style={{ left: pos.x, top: pos.y, maxWidth: 220 }}
                            >
                              <div className="text-[10px] uppercase tracking-wide text-base-content/50">
                                Step {index + 1}
                              </div>
                              <div className="font-semibold mt-1 truncate">
                                {node.title}
                              </div>
                              <div className="text-[10px] text-base-content/50 uppercase tracking-wide">
                                {node.type}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border border-base-300 bg-base-100 p-4 overflow-auto">
                      {activeRoadmapNode ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-base-content/40 uppercase tracking-wide">
                              Step Details
                            </div>
                            <h4 className="text-base font-semibold text-base-content">
                              {activeRoadmapNode.title}
                            </h4>
                            <p className="text-xs text-base-content/70 mt-1">
                              {activeRoadmapNode.description}
                            </p>
                          </div>

                          <div>
                            <div className="text-[11px] font-semibold text-base-content/60 mb-1">
                              Example
                            </div>
                            <pre className="bg-base-200/60 border border-base-300 rounded-lg p-2 text-[11px] whitespace-pre-wrap">
                              <code>{activeRoadmapNode.example || "(no example)"}</code>
                            </pre>
                          </div>

                          <div>
                            <div className="text-[11px] font-semibold text-base-content/60 mb-1">
                              Hint
                            </div>
                            <div className="text-xs text-base-content/70 bg-base-200/50 border border-base-300 rounded-lg p-2">
                              {activeRoadmapNode.hint || "(no hint)"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-base-content/40">
                          Select a node to see details.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {activeTab === "description" && (
          <div className="p-5 space-y-5">
            {/* TITLE + DIFFICULTY */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-base-content leading-tight">
                  {problem.title}
                </h1>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`badge badge-sm font-bold ${getDifficultyBadgeClass(
                    problem.difficulty
                  )}`}
                >
                  {problem.difficulty}
                </span>

                {/* Category tags */}
                {problem.category.split("•").map((cat, idx) => (
                  <span
                    key={idx}
                    className="badge badge-sm badge-outline badge-ghost gap-1"
                  >
                    <TagIcon className="size-2.5" />
                    {cat.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-3">
              <p className="text-sm text-base-content/85 leading-relaxed">
                {problem.description.text}
              </p>
              {problem.description.notes.map((note, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 text-sm text-base-content/70 bg-info/5 border border-info/10 rounded-lg p-3"
                >
                  <InfoIcon className="size-4 text-info shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>

            {/* EXAMPLES */}
            <div>
              <h3 className="text-sm font-bold text-base-content mb-3 flex items-center gap-1.5">
                <CheckCircleIcon className="size-4 text-primary" />
                Examples
              </h3>
              <div className="space-y-3">
                {problem.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="relative bg-base-200/60 rounded-lg border border-base-300 overflow-hidden"
                  >
                    {/* Example header */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-base-200 border-b border-base-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                        Example {idx + 1}
                      </span>
                      <button
                        onClick={() =>
                          handleCopyExample(
                            `Input: ${example.input}\nOutput: ${example.output}`,
                            idx
                          )
                        }
                        className="btn btn-ghost btn-xs btn-circle"
                      >
                        {copiedIdx === idx ? (
                          <CheckIcon className="size-3 text-success" />
                        ) : (
                          <CopyIcon className="size-3" />
                        )}
                      </button>
                    </div>

                    <div className="p-3 font-mono text-xs space-y-1">
                      <div className="flex gap-2">
                        <span className="text-primary font-semibold min-w-[60px]">
                          Input:
                        </span>
                        <span className="text-base-content/90">
                          {example.input}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-success font-semibold min-w-[60px]">
                          Output:
                        </span>
                        <span className="text-base-content/90">
                          {example.output}
                        </span>
                      </div>
                    </div>

                    {example.explanation && (
                      <div className="px-3 pb-3">
                        <div className="text-xs text-base-content/50 bg-base-300/30 rounded-md px-3 py-2 border-l-2 border-primary/30">
                          <span className="font-semibold text-base-content/60">
                            Explanation:{" "}
                          </span>
                          {example.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CONSTRAINTS */}
            <div>
              <h3 className="text-sm font-bold text-base-content mb-3 flex items-center gap-1.5">
                <AlertCircleIcon className="size-4 text-warning" />
                Constraints
              </h3>
              <div className="bg-base-200/40 rounded-lg border border-base-300 p-3">
                <ul className="space-y-1.5">
                  {problem.constraints.map((constraint, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-base-content/80"
                    >
                      <span className="text-warning mt-0.5">•</span>
                      <code className="font-mono bg-base-300/50 px-1.5 py-0.5 rounded text-[11px]">
                        {constraint}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
 
        {activeTab === "hints" && (
          <div className="p-5 space-y-4">
            {Array.isArray(problem.hints) && problem.hints.length > 0 ? (
              <div className="space-y-3">
                {problem.hints.map((hint, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 text-sm text-base-content/80 bg-warning/5 border border-warning/20 rounded-lg p-3"
                  >
                    <LightbulbIcon className="size-4 text-warning shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold text-base-content/90">
                        Hint {idx + 1}: 
                      </span>
                      {hint}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/30">
                <LightbulbIcon className="size-10 mb-3" />
                <p className="text-sm font-medium">
                  No hints available for this problem yet.
                </p>
                <p className="text-xs mt-1">Try solving it on your own first!</p>
              </div>
            )}
          </div>
        )}
        
        <div
          className={`h-full w-full p-2 ${
            activeTab === "paint" ? "block" : "hidden"
          }`}
        >
          <div className="h-full w-full rounded-lg border border-base-300 overflow-hidden bg-base-100">
            <Tldraw />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProblemDescription;
