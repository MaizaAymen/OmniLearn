import { useCallback, useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { StreamLanguage } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { php } from "@codemirror/lang-php";
import { csharp as csharpLegacy } from "@codemirror/legacy-modes/mode/clike";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion } from "@codemirror/autocomplete";
import { MergeView } from "@codemirror/merge";
import { Loader2Icon, PlayIcon, XIcon } from "lucide-react";
import { LANGUAGE_CONFIG } from "./constants";

// C# mode (legacy)
const CSHARP_LANG = StreamLanguage.define(csharpLegacy);

// Map language keys to CodeMirror language extensions
const LANG_FACTORIES = {
  javascript: () => javascript({ jsx: false, typescript: false }),
  typescript: () => javascript({ jsx: false, typescript: true }),
  python: () => python(),
  java: () => java(),
  php: () => php(),
  csharp: () => CSHARP_LANG,
};

function getLanguageExtension(lang) {
  return (LANG_FACTORIES[lang] || LANG_FACTORIES.javascript)();
}

/**
 * Diff View using @codemirror/merge
 * Shows side‑by‑side comparison of original and modified code.
 */
function DiffView({ original, modified, language, readOnly, onCodeChange }) {
  const hostRef = useRef(null);
  const mergeRef = useRef(null);
  const onCodeChangeRef = useRef(onCodeChange);

  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  // Create MergeView only once (when language or readOnly changes)
  useEffect(() => {
    if (!hostRef.current) return;

    const merge = new MergeView({
      a: {
        doc: original,
        extensions: [
          EditorView.editable.of(false),          // left side is read‑only
          getLanguageExtension(language),
          oneDark,
        ],
      },
      b: {
        doc: modified,
        extensions: [
          EditorView.editable.of(!readOnly),       // right side editable only if not readOnly
          getLanguageExtension(language),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onCodeChangeRef.current?.(update.state.doc.toString());
            }
          }),
        ],
      },
      parent: hostRef.current,
      gutter: true,
    });

    mergeRef.current = merge;
    return () => {
      merge.destroy();
      mergeRef.current = null;
    };
    // Only re‑create when language or readOnly changes – not on every prop update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly]);

  // Sync external `original` changes (e.g., when AI correction provides a new original)
  useEffect(() => {
    const merge = mergeRef.current;
    if (!merge) return;
    const cur = merge.a.state.doc.toString();
    if (cur !== original) {
      merge.a.dispatch({ changes: { from: 0, to: cur.length, insert: original } });
    }
  }, [original]);

  // Sync external `modified` changes (e.g., when user receives a corrected version)
  useEffect(() => {
    const merge = mergeRef.current;
    if (!merge) return;
    const cur = merge.b.state.doc.toString();
    if (cur !== modified) {
      merge.b.dispatch({ changes: { from: 0, to: cur.length, insert: modified } });
    }
  }, [modified]);

  return <div ref={hostRef} className="cm-merge-host h-full overflow-auto" />;
}

/**
 * Main Code Editor Panel using CodeMirror 6.
 * Replaces Monaco completely – no cursor jumps, no missing keystrokes.
 */
function CodeEditorPanel({
  selectedLanguage,
  code,
  isRunning,
  readOnly = false,
  languageLocked = false,
  onLanguageChange,
  onCodeChange,
  onRunCode,
  showDiff = false,
  originalCode = "",
  onCloseDiff = () => {},
  onMount,
}) {
  const langCompartment = useRef(new Compartment());
  const viewRef = useRef(null);

  // Base extensions: language (dynamic) + theme + autocompletion
  const extensions = useMemo(() => {
    const base = [
      langCompartment.current.of(getLanguageExtension(selectedLanguage)),
      EditorView.theme({
        "&": { height: "100%", fontSize: "16px" },
        ".cm-scroller": { overflow: "auto" },
      }),
      oneDark,
      autocompletion({
        activateOnTyping: true,    // shows suggestions as you type
        defaultKeymap: true,       // Ctrl+Space, Enter, Arrow keys work
        closeOnBlur: true,
      }),
    ];
    return base;
  }, [selectedLanguage]);

  // Reconfigure language compartment when selectedLanguage changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: langCompartment.current.reconfigure(getLanguageExtension(selectedLanguage)),
    });
  }, [selectedLanguage]);

  const handleCreate = useCallback(
    (view) => {
      viewRef.current = view;
      if (typeof onMount === "function") onMount(view);
    },
    [onMount]
  );

  const handleChange = useCallback(
    (value) => {
      if (typeof onCodeChange === "function") onCodeChange(value ?? "");
    },
    [onCodeChange]
  );

  return (
    <div className="h-full bg-base-300 flex flex-col">
      {/* Header bar with language selector and run button */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-100 border-t border-base-300">
        <div className="flex items-center gap-3">
          <img
            src={
              LANGUAGE_CONFIG[selectedLanguage].icon ||
              "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/code/code-original.svg"
            }
            alt={LANGUAGE_CONFIG[selectedLanguage].name}
            className="size-6"
          />
          <select
            className="select select-sm"
            value={selectedLanguage}
            onChange={onLanguageChange}
            disabled={languageLocked}
          >
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
        <button
          className="btn btn-primary btn-sm gap-2"
          disabled={isRunning}
          onClick={onRunCode}
        >
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

      {/* Editor area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {showDiff ? (
          <DiffView
            original={originalCode}
            modified={code ?? ""}
            language={selectedLanguage}
            readOnly={readOnly}
            onCodeChange={onCodeChange}
          />
        ) : (
          <CodeMirror
            value={code ?? ""}
            height="100%"
            theme={oneDark}
            extensions={extensions}
            editable={!readOnly}
            readOnly={readOnly}
            onChange={handleChange}
            onCreateEditor={handleCreate}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
              // autocompletion is already enabled via extensions above,
              // but we keep it false here to avoid duplication.
              autocompletion: false,
              bracketMatching: true,
              closeBrackets: true,
              indentOnInput: true,
              tabSize: 2,
            }}
            style={{ height: "100%" }}
          />
        )}
      </div>
    </div>
  );
}

export default CodeEditorPanel;