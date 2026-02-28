import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Split from "react-split";
import { PROBLEMS } from "./problems";


import ProblemDescription from "./ProblemDescription";
import OutputPanel from "../Codeeditor/OutputPanel";
import CodeEditorPanel from "../Codeeditor/Codeeditor";
import { executeCode } from "../Codeeditor/Api";
import Navbar from "../components/Navbar";

import toast from "react-hot-toast";
import confetti from "canvas-confetti";

function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentProblemId, setCurrentProblemId] = useState("two-sum");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState(PROBLEMS[currentProblemId].starterCode.javascript);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const currentProblem = PROBLEMS[currentProblemId];

  // Update problem when URL param changes
  useEffect(() => {
    if (id && PROBLEMS[id]) {
      setCurrentProblemId(id);
      setCode(PROBLEMS[id].starterCode[selectedLanguage]);
      setOutput(null);
    }
  }, [id, selectedLanguage]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    setCode(currentProblem.starterCode[newLang]);
    setOutput(null);
  };

  const handleProblemChange = (newProblemId) => navigate(`/problems/${newProblemId}`);

  const triggerConfetti = () => {
    confetti({ particleCount: 80, spread: 250, origin: { x: 0.2, y: 0.6 } });
    confetti({ particleCount: 80, spread: 250, origin: { x: 0.8, y: 0.6 } });
  };

  const normalizeOutput = (output) => {
    return output
      .trim()
      .split("\n")
      .map((line) =>
        line
          .trim()
          .replace(/\[\s+/g, "[")
          .replace(/\s+\]/g, "]")
          .replace(/\s*,\s*/g, ",")
      )
      .filter((line) => line.length > 0)
      .join("\n");
  };

  const checkIfTestsPassed = (actualOutput, expectedOutput) => {
    return normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);

    const result = await executeCode(selectedLanguage, code);
    setOutput(result);
    setIsRunning(false);

    if (result.success) {
      const expectedOutput = currentProblem.expectedOutput[selectedLanguage];
      const testsPassed = checkIfTestsPassed(result.output, expectedOutput);

      if (testsPassed) {
        triggerConfetti();
        toast.success("All tests passed! Great job!");
      } else {
        toast.error("Tests failed. Check your output!");
      }
    } else {
      toast.error("Code execution failed!");
    }
  };

  return (
    <div className="h-screen bg-base-100 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 min-h-0">
        {/* Outer horizontal split: Problem vs Editor/Output */}
        <Split
          sizes={[38, 62]}
          minSize={200}
          gutterSize={8}
          className="h-full flex"
          direction="horizontal"
        >
          {/* Left panel: Problem Description */}
          <div className="h-full overflow-auto">
            <ProblemDescription
              problem={currentProblem}
              currentProblemId={currentProblemId}
              onProblemChange={handleProblemChange}
              allProblems={Object.values(PROBLEMS)}
            />
          </div>


          {/* Right panel: vertical split for CodeEditor and Output */}
          <Split
            sizes={[65, 35]}
            minSize={100}
            gutterSize={6}
            className="h-full flex flex-col"
            direction="vertical"
          >
            <div className="h-full overflow-auto">
              <CodeEditorPanel
                selectedLanguage={selectedLanguage}
                code={code}
                isRunning={isRunning}
                onLanguageChange={handleLanguageChange}
                onCodeChange={setCode}
                onRunCode={handleRunCode}
              />
            </div>

            <div className="h-full overflow-auto">
              <OutputPanel output={output} />
            </div>
          </Split>
        </Split>
      </div>
    </div>
  );
}

export default ProblemPage;