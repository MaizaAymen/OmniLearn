import Editor, { DiffEditor } from "@monaco-editor/react";
import { Loader2Icon, PlayIcon, XIcon } from "lucide-react";
import { LANGUAGE_CONFIG } from "./constants";

function CodeEditorPanel({
  selectedLanguage,
  code,
  isRunning,
  readOnly = false,
  onLanguageChange,
  onCodeChange,
  onRunCode,
  showDiff = false,
  originalCode = "",
  onCloseDiff = () => {},
}) {

  return (
    <div className="h-full bg-base-300 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-base-100 border-t border-base-300">
        <div className="flex items-center gap-3">
          <img
            src={LANGUAGE_CONFIG[selectedLanguage].icon || "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/code/code-original.svg"}
            alt={LANGUAGE_CONFIG[selectedLanguage].name}
            className="size-6"
          />
          <select className="select select-sm" value={selectedLanguage} onChange={onLanguageChange}>
            {Object.entries(LANGUAGE_CONFIG).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.name}
              </option>
            ))}
          </select>
          {showDiff && (
            <div className="flex items-center gap-2 ml-2">
              <span className="badge badge-primary badge-sm">Showing Corrections</span>
              <button
                className="btn btn-ghost btn-xs btn-circle"
                onClick={onCloseDiff}
                title="Close diff view"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )}
        </div>

        <button className="btn btn-primary btn-sm gap-2" disabled={isRunning} onClick={onRunCode}>
          {isRunning ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayIcon className="size-4" />
              Run Code
            </>
          )}
        </button>
      </div>

      <div className="flex-1">
        {showDiff ? (
          <DiffEditor
            height={"100%"}
            language={LANGUAGE_CONFIG[selectedLanguage].monacoLang}
            original={originalCode}
            modified={code}
            theme="vs-dark"
            options={{
              fontSize: 16,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              minimap: { enabled: false },
              readOnly,
              renderSideBySide: true,
            }}
            onModifiedChange={onCodeChange}
          />
        ) : (
          <Editor
            height={"100%"}
            language={LANGUAGE_CONFIG[selectedLanguage].monacoLang}
            value={code}
            onChange={onCodeChange}
            theme="vs-dark"
            options={{
              fontSize: 16,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              minimap: { enabled: false },
              readOnly,
            }}
          />
        )}
      </div>
    </div>
  );
}
export default CodeEditorPanel;
