import { useState } from "react";
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

  const handleCopyExample = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const difficultyColor = {
    Easy: "text-success",
    Medium: "text-warning",
    Hard: "text-error",
  };

  return (
    <div className="h-full flex flex-col bg-base-100">
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
            activeTab === "Paint"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/50 hover:text-base-content/80"
          }`}
          onClick={() => setActiveTab("Paint")}
        >
          <BookOpenIcon className="size-3.5" />
          Paint
        </button>
        
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "description" && (
          <div className="p-5 space-y-5 display=fixed ">
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
            <div className="flex flex-col items-center justify-center py-12 text-base-content/30">
              <LightbulbIcon className="size-10 mb-3" />
              <p className="text-sm font-medium">
                No hints available for this problem yet.
              </p>
              <p className="text-xs mt-1">Try solving it on your own first!</p>
            </div>
          </div>
        )}
        {activeTab === "Paint" && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col items-center justify-center py-12 text-base-content/30">
              <LightbulbIcon className="size-10 mb-3" />
              <p className="text-sm font-medium">
                <div style={{ position: "fixed", inset: 0 }}>
               <Tldraw />
              </div>
              </p>
              <p className="text-xs mt-1">Try solving it on your own first!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProblemDescription;
