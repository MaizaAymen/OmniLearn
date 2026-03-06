import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router";

import { PROBLEMS } from "./problems";
import ProblemDescription from "./ProblemDescription";
import OutputPanel from "../Codeeditor/OutputPanel";
import CodeEditorPanel from "../Codeeditor/Codeeditor";
import { executeCode } from "../Codeeditor/Api";
import Navbar from "../components/Navbar";

import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  SendIcon,
  Loader2Icon,
  TimerIcon,
  RotateCcwIcon,
  MaximizeIcon,
  MinimizeIcon,
  ListIcon,
} from "lucide-react";

import "./ProblemPage.css";

function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const problemIds = Object.keys(PROBLEMS);
  const [currentProblemId, setCurrentProblemId] = useState(id || "two-sum");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState(
    PROBLEMS[currentProblemId]?.starterCode?.javascript || ""
  );
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState("testcase"); // testcase | result

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Resizable state
  const [leftWidth, setLeftWidth] = useState(40);
  const [editorHeight, setEditorHeight] = useState(60);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  const containerRef = useRef(null);
  const rightPanelRef = useRef(null);

  const currentProblem = PROBLEMS[currentProblemId];
  const currentIndex = problemIds.indexOf(currentProblemId);

  // Timer effect
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (id && PROBLEMS[id]) {
      setCurrentProblemId(id);
      setCode(PROBLEMS[id].starterCode[selectedLanguage] || "");
      setOutput(null);
      setSeconds(0);
      setActiveRightTab("testcase");
    }
  }, [id, selectedLanguage]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    setCode(currentProblem.starterCode[newLang] || "");
    setOutput(null);
  };

  const handleProblemChange = (newProblemId) =>
    navigate(`/problems/${newProblemId}`);

  const handlePrevProblem = () => {
    if (currentIndex > 0) navigate(`/problems/${problemIds[currentIndex - 1]}`);
  };

  const handleNextProblem = () => {
    if (currentIndex < problemIds.length - 1)
      navigate(`/problems/${problemIds[currentIndex + 1]}`);
  };

  const handleResetCode = () => {
    setCode(currentProblem.starterCode[selectedLanguage] || "");
    setOutput(null);
    toast.success("Code reset to starter template");
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveRightTab("result");
    try {
      const result = await executeCode(selectedLanguage, code);
      setOutput(result);
      if (result.success) {
        toast.success("Code executed successfully!");
      } else {
        toast.error("Code execution failed");
      }
    } catch (err) {
      setOutput({ success: false, output: "", error: err.message });
      toast.error("Execution error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setActiveRightTab("result");
    try {
      const result = await executeCode(selectedLanguage, code);
      setOutput(result);

      if (result.success) {
        const expected = currentProblem.expectedOutput?.[selectedLanguage];
        const actual = result.output?.trim();
        if (expected && actual === expected.trim()) {
          toast.success("All test cases passed! 🎉");
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
          });
        } else {
          toast.error("Output doesn't match expected result");
        }
      } else {
        toast.error("Submission failed");
      }
    } catch (err) {
      setOutput({ success: false, output: "", error: err.message });
      toast.error("Submission error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================
  // Horizontal Resize
  // =========================
  const startHorizontalResize = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = leftWidth;

      const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.offsetWidth;
        const delta = e.clientX - startX;
        const newWidth =
          ((startWidth / 100) * containerWidth + delta) /
          containerWidth *
          100;
        if (newWidth > 20 && newWidth < 75) setLeftWidth(newWidth);
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [leftWidth]
  );

  // =========================
  // Vertical Resize
  // =========================
  const startVerticalResize = useCallback(
    (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = editorHeight;

      const handleMouseMove = (e) => {
        if (!rightPanelRef.current) return;
        const panelHeight = rightPanelRef.current.offsetHeight;
        const delta = e.clientY - startY;
        const newHeight =
          ((startHeight / 100) * panelHeight + delta) / panelHeight * 100;
        if (newHeight > 25 && newHeight < 85) setEditorHeight(newHeight);
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [editorHeight]
  );

  return (
    <div className="problem-page h-screen flex flex-col overflow-hidden bg-base-300">
      {/* TOP BAR */}
      <div className="problem-topbar flex items-center justify-between px-3 py-1.5 bg-base-100 border-b border-base-300 gap-2">
        {/* Left: Logo + Problem nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/problems")}
            className="btn btn-ghost btn-sm gap-1 text-primary font-bold"
          >
            <ListIcon className="size-4" />
            <span className="hidden sm:inline">Problems</span>
          </button>

          <div className="divider divider-horizontal mx-0 h-6" />

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevProblem}
              disabled={currentIndex <= 0}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <ChevronLeftIcon className="size-4" />
            </button>

            <select
              className="select select-xs select-bordered font-medium max-w-[180px]"
              value={currentProblemId}
              onChange={(e) => handleProblemChange(e.target.value)}
            >
              {problemIds.map((pid) => (
                <option key={pid} value={pid}>
                  {PROBLEMS[pid].title}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextProblem}
              disabled={currentIndex >= problemIds.length - 1}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Center: Run + Submit */}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-outline gap-1.5"
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
          >
            {isRunning ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PlayIcon className="size-3.5" />
            )}
            Run
          </button>
          <button
            className="btn btn-sm btn-success text-success-content gap-1.5"
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SendIcon className="size-3.5" />
            )}
            Submit
          </button>
        </div>

        {/* Right: Timer + Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCode}
            className="btn btn-ghost btn-xs btn-circle tooltip tooltip-bottom"
            data-tip="Reset code"
          >
            <RotateCcwIcon className="size-3.5" />
          </button>

          <div
            className="flex items-center gap-1.5 text-xs font-mono text-base-content/60 cursor-pointer select-none"
            onClick={() => setTimerRunning((r) => !r)}
            title={timerRunning ? "Click to pause" : "Click to resume"}
          >
            <TimerIcon className="size-3.5" />
            <span>{formatTime(seconds)}</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div ref={containerRef} className="flex flex-1 min-h-0 gap-1 p-1">
        {/* LEFT PANEL — Problem Description */}
        <div
          style={{ width: isLeftCollapsed ? "0%" : `${leftWidth}%` }}
          className={`problem-panel h-full rounded-xl overflow-hidden transition-[width] duration-200 ${
            isLeftCollapsed ? "hidden" : ""
          }`}
        >
          <ProblemDescription
            problem={currentProblem}
            currentProblemId={currentProblemId}
            onProblemChange={handleProblemChange}
            allProblems={Object.values(PROBLEMS)}
          />
        </div>

        {/* HORIZONTAL GUTTER */}
        {!isLeftCollapsed && (
          <div
            onMouseDown={startHorizontalResize}
            className="gutter-h group flex items-center justify-center w-2 cursor-col-resize rounded-full hover:bg-primary/20 transition-colors"
          >
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
            </div>
          </div>
        )}

        {/* RIGHT PANEL — Editor + Output */}
        <div
          ref={rightPanelRef}
          style={{
            width: isLeftCollapsed ? "100%" : `${100 - leftWidth - 1}%`,
          }}
          className="flex flex-col h-full gap-1"
        >
          {/* EDITOR PANEL */}
          <div
            style={{ height: `${editorHeight}%` }}
            className="problem-panel rounded-xl overflow-hidden"
          >
            <CodeEditorPanel
              selectedLanguage={selectedLanguage}
              code={code}
              isRunning={isRunning}
              onLanguageChange={handleLanguageChange}
              onCodeChange={setCode}
              onRunCode={handleRunCode}
            />
          </div>

          {/* VERTICAL GUTTER */}
          <div
            onMouseDown={startVerticalResize}
            className="gutter-v group flex items-center justify-center h-2 cursor-row-resize rounded-full hover:bg-primary/20 transition-colors"
          >
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
              <span className="block w-0.5 h-0.5 bg-primary rounded-full" />
            </div>
          </div>

          {/* OUTPUT / TEST PANEL */}
          <div
            style={{ height: `${100 - editorHeight - 1}%` }}
            className="problem-panel rounded-xl overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex items-center gap-0 bg-base-100 border-b border-base-300 px-2">
              <button
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "testcase"
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/50 hover:text-base-content/80"
                }`}
                onClick={() => setActiveRightTab("testcase")}
              >
                Testcase
              </button>
              <button
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeRightTab === "result"
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/50 hover:text-base-content/80"
                }`}
                onClick={() => setActiveRightTab("result")}
              >
                Result
                {output && (
                  <span
                    className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                      output.success ? "bg-success" : "bg-error"
                    }`}
                  />
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto h-[calc(100%-37px)]">
              {activeRightTab === "testcase" ? (
                <div className="p-4 space-y-3">
                  {currentProblem.examples.map((example, idx) => (
                    <div
                      key={idx}
                      className="bg-base-200 rounded-lg p-3 font-mono text-xs space-y-1"
                    >
                      <div className="text-base-content/50 text-[10px] font-sans font-semibold uppercase tracking-wider mb-1">
                        Case {idx + 1}
                      </div>
                      <div>
                        <span className="text-base-content/50">Input: </span>
                        <span className="text-base-content">
                          {example.input}
                        </span>
                      </div>
                      <div>
                        <span className="text-base-content/50">
                          Expected:{" "}
                        </span>
                        <span className="text-success">{example.output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <OutputPanel output={output} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProblemPage;