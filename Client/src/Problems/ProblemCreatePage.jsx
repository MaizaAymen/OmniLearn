import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import {
  CheckCircleIcon, EyeIcon, GitForkIcon, MapIcon, PencilIcon, PlusIcon,
  SparklesIcon, TrashIcon, XIcon,
} from "lucide-react";

const API = "http://localhost:5000/api/ai/ai";
const AI_ROOT = "http://localhost:5000/api/ai";
const ADMIN_API = "http://localhost:5000/api/admin";
const DIFFS = ["Easy", "Medium", "Hard"];

function getUser() {
  try { return JSON.parse(Cookies.get("user") || "{}"); } catch { return {}; }
}

function DiffPill({ d }) {
  const cls =
    d === "Easy"   ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
    d === "Medium" ? "bg-amber-50 text-amber-700 ring-amber-200" :
                     "bg-rose-50 text-rose-700 ring-rose-200";
  return <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ${cls}`}>{d}</span>;
}
function StatusPill({ s }) {
  const cls = {
    draft:     "bg-amber-50 text-amber-700 ring-amber-200",
    review:    "bg-sky-50 text-sky-700 ring-sky-200",
    published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    archived:  "bg-gray-50 text-gray-600 ring-gray-200",
  }[s] || "bg-gray-50 text-gray-600 ring-gray-200";
  return <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ring-1 ${cls}`}>{s}</span>;
}

// Shared input/textarea/select classes — light, minimal
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/5 transition";
const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";

// ── Student preview modal ─────────────────────────────────────────────────────
function PreviewModal({ problem, onClose }) {
  if (!problem) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Student view preview</p>
            <h2 className="text-lg font-semibold text-gray-900">{problem.title}</h2>
          </div>
          <button className="p-1.5 rounded-md hover:bg-gray-100" onClick={onClose}><XIcon className="size-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <DiffPill d={problem.difficulty} />
            {problem.category && <span className="text-[11px] px-2 py-0.5 rounded-full ring-1 ring-gray-200 text-gray-600">{problem.category}</span>}
            {(problem.tags || []).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-gray-200 text-gray-500">{t}</span>)}
          </div>
          {problem.description?.text && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{problem.description.text}</p>
            </div>
          )}
          {problem.examples?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Examples</p>
              {problem.examples.map((ex, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 mb-2 font-mono text-xs space-y-1 ring-1 ring-gray-100">
                  <div><span className="text-gray-400">Input:</span> {ex.input}</div>
                  <div><span className="text-gray-400">Output:</span> {ex.output}</div>
                  {ex.explanation && <div className="text-gray-500 text-[11px] font-sans">{ex.explanation}</div>}
                </div>
              ))}
            </div>
          )}
          {problem.constraints?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Constraints</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {problem.hints?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Hints</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                {problem.hints.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}
          {problem.starterCode?.javascript && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Starter Code (JavaScript)</p>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto">{problem.starterCode.javascript}</pre>
            </div>
          )}
          {problem.expectedOutput?.javascript && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Expected Output</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono ring-1 ring-gray-100">{problem.expectedOutput.javascript}</pre>
            </div>
          )}
          {problem.roadmap?.nodes?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Roadmap ({problem.roadmap.nodes.length} steps)</p>
              <ol className="space-y-2">
                {problem.roadmap.nodes.map((n, i) => (
                  <li key={n.id || i} className="bg-gray-50 rounded-lg p-3 ring-1 ring-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-gray-500">#{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{n.title}</span>
                      {n.type && <span className="text-[10px] text-gray-500 ring-1 ring-gray-200 rounded-full px-1.5">{n.type}</span>}
                    </div>
                    {n.description && <p className="text-xs text-gray-600">{n.description}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Test case validation modal ────────────────────────────────────────────────
function ValidateModal({ problem, onClose }) {
  if (!problem) return null;
  const examples = problem.examples || [];
  const expected = problem.expectedOutput?.javascript || "";
  const starter = problem.starterCode?.javascript || "";
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Test case validation</p>
            <h2 className="text-lg font-semibold text-gray-900">{problem.title}</h2>
          </div>
          <button className="p-1.5 rounded-md hover:bg-gray-100" onClick={onClose}><XIcon className="size-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-xs bg-sky-50 text-sky-800 rounded-lg p-3 ring-1 ring-sky-100">
            Review starter code and expected output. Confirm they match the examples before publishing.
          </div>
          {examples.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Examples ({examples.length})</p>
              {examples.map((ex, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 mb-2 font-mono text-xs space-y-1 ring-1 ring-gray-100">
                  <div><span className="text-gray-400">in:</span>  {ex.input}</div>
                  <div><span className="text-gray-400">out:</span> {ex.output}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">No examples defined.</p>}
          {starter && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Starter Code</p>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">{starter}</pre>
            </div>
          )}
          {expected && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Expected Output</p>
              <pre className="bg-emerald-50 ring-1 ring-emerald-100 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap text-emerald-900">{expected}</pre>
            </div>
          )}
          <button
            className="w-full rounded-lg bg-gray-900 text-white text-sm font-medium py-2 hover:bg-gray-800 transition"
            onClick={onClose}
          >Looks good</button>
        </div>
      </div>
    </div>
  );
}

// ── Draft card for AI generation ──────────────────────────────────────────────
function DraftCard({ draft, index, onSave, onDiscard, saving }) {
  const [preview, setPreview] = useState(false);
  const [validate, setValidate] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Draft {index + 1}</p>
          <h3 className="font-semibold text-gray-900 truncate">{draft.title}</h3>
          <p className="text-xs text-gray-500">{draft.category}</p>
        </div>
        <DiffPill d={draft.difficulty} />
      </div>
      <p className="text-sm text-gray-700 line-clamp-3">{draft.description?.text}</p>
      {draft.examples?.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-2 font-mono text-xs ring-1 ring-gray-100">
          <span className="text-gray-400">in:</span> {draft.examples[0].input} → <span className="text-gray-400">out:</span> {draft.examples[0].output}
        </div>
      )}
      {draft.tags?.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {draft.tags.slice(0, 4).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-gray-200 text-gray-500">{t}</span>)}
        </div>
      )}
      <div className="flex gap-2 pt-1 flex-wrap items-center">
        <button className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1" onClick={() => setPreview(true)}>
          <EyeIcon className="size-3.5" /> Preview
        </button>
        <button className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1" onClick={() => setValidate(true)}>
          <CheckCircleIcon className="size-3.5" /> Validate
        </button>
        <div className="flex-1" />
        <button className="text-xs text-rose-600 hover:text-rose-700" onClick={() => onDiscard(index)}>Discard</button>
        <button
          className="text-xs px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 inline-flex items-center gap-1 disabled:opacity-60"
          onClick={() => onSave(draft)} disabled={saving}
        >
          {saving ? <span className="size-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : null}
          Save Draft
        </button>
      </div>
      {preview && <PreviewModal problem={draft} onClose={() => setPreview(false)} />}
      {validate && <ValidateModal problem={draft} onClose={() => setValidate(false)} />}
    </div>
  );
}

// ── Small section wrapper — light, airy ───────────────────────────────────────
function Section({ title, subtitle, action, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: "", difficulty: "Easy", category: "", tags: "",
  descriptionText: "", constraints: "", hints: "",
  scope: "global", moduleId: "",
  starterJs: "", starterPy: "", starterJava: "",
  expectedJs: "", expectedPy: "", expectedJava: "",
};

export default function ProblemCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getUser();

  const editId   = searchParams.get("edit");
  const sourceId = searchParams.get("source");
  const presetModuleId = searchParams.get("moduleId") || "";
  const presetScope = searchParams.get("scope") || "";
  const isEditMode = !!editId;

  const [tab, setTab] = useState("manual");
  const [modules, setModules] = useState([]);
  const [forkSource, setForkSource] = useState(null);
  const [loadingPrefill, setLoadingPrefill] = useState(isEditMode);
  const [originalStatus, setOriginalStatus] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM, moduleId: presetModuleId });
  const [examples, setExamples] = useState([]);
  const [codeLang, setCodeLang] = useState("javascript");
  const [roadmap, setRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const [preview, setPreview] = useState(false);
  const [validate, setValidate] = useState(false);
  const dupTimer = useRef(null);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  useEffect(() => {
    fetch(`${ADMIN_API}/modules`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setModules(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const res = await fetch(`${API}/getproblembyid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId }),
        });
        if (!res.ok) throw new Error();
        const p = await res.json();
        setOriginalStatus(p.status);
        setForm({
          title: p.title || "",
          difficulty: p.difficulty || "Easy",
          category: p.category || "",
          tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
          descriptionText: p.description?.text || "",
          constraints: Array.isArray(p.constraints) ? p.constraints.join("\n") : "",
          hints: Array.isArray(p.hints) ? p.hints.join("\n") : "",
          scope: p.scope || (p.moduleId ? "module" : "global"),
          moduleId: p.moduleId ? String(p.moduleId) : presetModuleId,
          starterJs: p.starterCode?.javascript || "",
          starterPy: p.starterCode?.python || "",
          starterJava: p.starterCode?.java || "",
          expectedJs: p.expectedOutput?.javascript || "",
          expectedPy: p.expectedOutput?.python || "",
          expectedJava: p.expectedOutput?.java || "",
        });
        setExamples(Array.isArray(p.examples) ? p.examples : []);
        setRoadmap(p.roadmap || null);
      } catch {
        toast.error("Couldn't load problem to edit");
      } finally {
        setLoadingPrefill(false);
      }
    })();
  }, [editId]); // eslint-disable-line

  useEffect(() => {
    if (!sourceId) return;
    (async () => {
      try {
        const res = await fetch(`${API}/getproblembyid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sourceId }),
        });
        if (res.ok) {
          const p = await res.json();
          setForkSource({ id: p.id, title: p.title, difficulty: p.difficulty });
        }
      } catch { /* ignore */ }
    })();
  }, [sourceId]);

  async function checkDuplicate(title) {
    if (!title.trim() || isEditMode) return setDupWarning(null);
    try {
      const res = await fetch(`${API}/problems/check-duplicate?title=${encodeURIComponent(title)}`);
      if (res.ok) setDupWarning(await res.json());
    } catch { /* ignore */ }
  }
  function onTitleChange(v) {
    setField("title", v);
    clearTimeout(dupTimer.current);
    dupTimer.current = setTimeout(() => checkDuplicate(v), 600);
  }

  function buildProblem() {
    return {
      title: form.title.trim(),
      difficulty: form.difficulty,
      category: form.category.trim(),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      description: { text: form.descriptionText.trim(), notes: [] },
      constraints: form.constraints.split("\n").map(c => c.trim()).filter(Boolean),
      hints: form.hints.split("\n").map(h => h.trim()).filter(Boolean),
      examples: examples.filter(ex => ex.input || ex.output),
      starterCode: {
        javascript: form.starterJs,
        python: form.starterPy,
        java: form.starterJava,
      },
      expectedOutput: {
        javascript: form.expectedJs,
        python: form.expectedPy,
        java: form.expectedJava,
      },
      roadmap,
      scope: form.scope,
      moduleId: form.scope === "module" && form.moduleId ? parseInt(form.moduleId) : null,
    };
  }

  async function handleSave(e) {
    e?.preventDefault?.();
    if (!form.title.trim() || !form.category.trim()) return toast.error("Title and category are required");
    if (!isEditMode && dupWarning?.isDuplicate) return toast.error("A problem with this title already exists");

    setSaving(true);
    const payload = buildProblem();
    try {
      if (isEditMode) {
        const res = await fetch(`${API}/problems/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Changes saved — draft updated");
        navigate("/problems?status=all");
      } else {
        const res = await fetch(`${API}/problems`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, createdBy: user.id || null }),
        });
        if (!res.ok) throw new Error();
        toast.success("Problem created and published!");
        navigate("/problems");
      }
    } catch {
      toast.error(isEditMode ? "Error saving changes" : "Error creating problem");
    } finally {
      setSaving(false);
    }
  }

  function addExample() { setExamples(prev => [...prev, { input: "", output: "", explanation: "" }]); }
  function removeExample(i) { setExamples(prev => prev.filter((_, idx) => idx !== i)); }
  function updateExample(i, field, val) {
    setExamples(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: val } : ex));
  }

  // ── Roadmap generation for the manual form ────────────────────────────────
  async function generateRoadmap() {
    if (!form.descriptionText.trim() && !form.title.trim()) {
      return toast.error("Add a title or description first");
    }
    setRoadmapLoading(true);
    try {
      const problemText = [
        form.title && `Title: ${form.title}`,
        form.category && `Category: ${form.category}`,
        form.difficulty && `Difficulty: ${form.difficulty}`,
        form.descriptionText && `Description: ${form.descriptionText}`,
        examples.length && `Examples:\n${examples.map(ex => `  in: ${ex.input}\n  out: ${ex.output}`).join("\n")}`,
      ].filter(Boolean).join("\n\n");

      const res = await fetch(`${AI_ROOT}/generate/problem-roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: problemText }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRoadmap(data);
      toast.success(`Roadmap generated (${data?.nodes?.length || 0} steps)`);
    } catch {
      toast.error("Error generating roadmap");
    } finally {
      setRoadmapLoading(false);
    }
  }

  // AI tab state
  const [topic, setTopic] = useState("");
  const [aiDiff, setAiDiff] = useState("");
  const [aiCount, setAiCount] = useState(1);
  const [aiScope, setAiScope] = useState("global");
  const [aiModuleId, setAiModuleId] = useState(presetModuleId);
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [savingIdx, setSavingIdx] = useState(null);

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Enter a topic");
    setGenerating(true);
    setDrafts([]);
    try {
      const res = await fetch(`${API}/problems/generate-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), difficulty: aiDiff || undefined, count: aiCount }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDrafts(Array.isArray(data) ? data : [data]);
    } catch {
      toast.error("Error generating problems");
    } finally {
      setGenerating(false);
    }
  }
  async function saveDraft(draft) {
    setSavingIdx(drafts.indexOf(draft));
    try {
      const res = await fetch(`${API}/problems/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: {
            ...draft,
            scope: aiScope,
            moduleId: aiScope === "module" && aiModuleId ? parseInt(aiModuleId) : null,
          },
          createdBy: user.id || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`"${draft.title}" saved as draft`);
      setDrafts(prev => prev.filter(d => d !== draft));
    } catch {
      toast.error("Error saving draft");
    } finally {
      setSavingIdx(null);
    }
  }
  function discardDraft(index) { setDrafts(prev => prev.filter((_, i) => i !== index)); }

  const asProblem = { ...buildProblem(), title: form.title || "(untitled)" };

  if (loadingPrefill) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-500 text-sm">
          <span className="inline-block size-4 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin mr-2 align-middle" />
          Loading fork…
        </div>
      </div>
    );
  }

  const activeCodeStarterKey = codeLang === "javascript" ? "starterJs" : codeLang === "python" ? "starterPy" : "starterJava";
  const activeCodeExpectedKey = codeLang === "javascript" ? "expectedJs" : codeLang === "python" ? "expectedPy" : "expectedJava";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            {isEditMode ? "Edit Forked Problem" : "Create Problem"}
          </h1>
          <p className="text-sm text-gray-500">
            {isEditMode
              ? "This is a draft copy — customize anything you like and save your changes."
              : "Write manually or let AI generate a draft to review before publishing."}
          </p>
        </div>

        {/* Fork banner */}
        {forkSource && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
            <GitForkIcon className="size-4 text-gray-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">
                <span className="text-gray-400">Forked from:</span>{" "}
                <span className="font-medium text-gray-900">{forkSource.title}</span>{" "}
                <DiffPill d={forkSource.difficulty} />
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Lineage is preserved and cannot be changed.</p>
            </div>
            <Link to={`/problems/${forkSource.id}`} target="_blank" className="text-xs text-gray-600 hover:text-gray-900">
              View original
            </Link>
          </div>
        )}

        {/* Tabs */}
        {!isEditMode && (
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 mb-6">
            <button
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition ${
                tab === "manual" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setTab("manual")}
            >
              <PencilIcon className="size-3.5" /> Manual
            </button>
            <button
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition ${
                tab === "ai" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setTab("ai")}
            >
              <SparklesIcon className="size-3.5" /> AI Generate
            </button>
          </div>
        )}

        {/* ── MANUAL / EDIT TAB ── */}
        {(tab === "manual" || isEditMode) && (
          <form onSubmit={handleSave} className="space-y-5">

            {/* Basics */}
            <Section title="Basics" subtitle="Title, category, difficulty and tags.">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Title *</label>
                  <input
                    className={`${inputCls} ${dupWarning?.isDuplicate ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                    value={form.title}
                    onChange={e => onTitleChange(e.target.value)}
                    placeholder="Two Sum"
                  />
                  {dupWarning?.isDuplicate && (
                    <p className="text-rose-600 text-[11px] mt-1">A problem with this title already exists.</p>
                  )}
                  {!dupWarning?.isDuplicate && dupWarning?.matches?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-amber-600 text-[11px]">Similar problems already exist:</p>
                      {dupWarning.matches.map(m => (
                        <div key={m.id} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <span>• {m.title}</span> <StatusPill s={m.status} /> <DiffPill d={m.difficulty} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Category *</label>
                  <input className={inputCls} value={form.category} onChange={e => setField("category", e.target.value)} placeholder="Array • Hash Table" />
                </div>
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <select className={inputCls} value={form.difficulty} onChange={e => setField("difficulty", e.target.value)}>
                    {DIFFS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tags (comma-separated)</label>
                  <input className={inputCls} value={form.tags} onChange={e => setField("tags", e.target.value)} placeholder="array, sorting" />
                </div>
              </div>
            </Section>

            {/* Scope */}
            <Section title="Scope" subtitle="Choose where this problem shows up.">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Scope</label>
                  <select className={inputCls} value={form.scope} onChange={e => setField("scope", e.target.value)}>
                    <option value="global">Global Bank</option>
                    <option value="module">Module-only</option>
                  </select>
                </div>
                {form.scope === "module" && (
                  <div>
                    <label className={labelCls}>Module</label>
                    <select className={inputCls} value={form.moduleId} onChange={e => setField("moduleId", e.target.value)}>
                      <option value="">— pick a module —</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </Section>

            {/* Description, constraints, hints */}
            <Section title="Statement" subtitle="Description, constraints, and hints.">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea className={`${inputCls} h-28 resize-y`} value={form.descriptionText} onChange={e => setField("descriptionText", e.target.value)} placeholder="Describe the problem…" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Constraints (one per line)</label>
                    <textarea className={`${inputCls} h-24 resize-y`} value={form.constraints} onChange={e => setField("constraints", e.target.value)} placeholder={"1 ≤ n ≤ 10⁴"} />
                  </div>
                  <div>
                    <label className={labelCls}>Hints (one per line)</label>
                    <textarea className={`${inputCls} h-24 resize-y`} value={form.hints} onChange={e => setField("hints", e.target.value)} placeholder={"Try a hash map"} />
                  </div>
                </div>
              </div>
            </Section>

            {/* Examples */}
            <Section
              title="Examples & Test Cases"
              subtitle="Input/output pairs students will see and be tested against."
              action={
                <button type="button" className="text-xs inline-flex items-center gap-1 text-gray-600 hover:text-gray-900" onClick={addExample}>
                  <PlusIcon className="size-3.5" /> Add
                </button>
              }
            >
              {examples.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No examples yet. Click "Add" to create one.</p>
              ) : (
                <div className="space-y-3">
                  {examples.map((ex, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50/60 relative">
                      <button type="button" className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200" onClick={() => removeExample(i)}>
                        <TrashIcon className="size-3 text-gray-500" />
                      </button>
                      <div className="grid sm:grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-[11px] text-gray-500">Input</label>
                          <input className={`${inputCls} font-mono text-xs py-1.5`} value={ex.input} onChange={e => updateExample(i, "input", e.target.value)} placeholder="[1,2,3]" />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500">Output</label>
                          <input className={`${inputCls} font-mono text-xs py-1.5`} value={ex.output} onChange={e => updateExample(i, "output", e.target.value)} placeholder="6" />
                        </div>
                      </div>
                      <label className="text-[11px] text-gray-500">Explanation (optional)</label>
                      <input className={`${inputCls} text-xs py-1.5`} value={ex.explanation || ""} onChange={e => updateExample(i, "explanation", e.target.value)} placeholder="Sum of elements" />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Code */}
            <Section title="Starter Code & Expected Output" subtitle="One per supported language.">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 mb-3">
                {["javascript", "python", "java"].map(l => (
                  <button key={l} type="button"
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition ${
                      codeLang === l ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setCodeLang(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Starter Code</label>
                  <textarea
                    className={`${inputCls} h-32 resize-y font-mono text-xs`}
                    value={form[activeCodeStarterKey]}
                    onChange={e => setField(activeCodeStarterKey, e.target.value)}
                    placeholder={`function solve() {\n  // your code\n}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Expected Output</label>
                  <textarea
                    className={`${inputCls} h-32 resize-y font-mono text-xs`}
                    value={form[activeCodeExpectedKey]}
                    onChange={e => setField(activeCodeExpectedKey, e.target.value)}
                    placeholder="Expected stdout"
                  />
                </div>
              </div>
            </Section>

            {/* Roadmap */}
            <Section
              title="Learning Roadmap"
              subtitle="Step-by-step nodes that guide students from basics to the final solution."
              action={
                <div className="flex items-center gap-2">
                  {roadmap?.nodes?.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:text-rose-700"
                      onClick={() => setRoadmap(null)}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                    onClick={generateRoadmap}
                    disabled={roadmapLoading}
                  >
                    {roadmapLoading
                      ? <span className="size-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      : <SparklesIcon className="size-3.5" />}
                    {roadmap?.nodes?.length > 0 ? "Regenerate" : "Generate with AI"}
                  </button>
                </div>
              }
            >
              {!roadmap?.nodes?.length ? (
                <div className="flex flex-col items-center justify-center text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                  <MapIcon className="size-5 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-600">No roadmap yet.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Fill in title and description, then generate a roadmap with AI.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{roadmap.title || "Problem Roadmap"}</span>
                      {roadmap.difficulty && <> · <span className="capitalize">{roadmap.difficulty}</span></>}
                      {" · "}{roadmap.nodes.length} steps
                    </p>
                  </div>
                  <ol className="space-y-2">
                    {roadmap.nodes.map((n, i) => (
                      <li key={n.id || i} className="bg-gray-50 rounded-lg p-3 ring-1 ring-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-gray-400">#{i + 1}</span>
                          <span className="text-sm font-medium text-gray-900">{n.title}</span>
                          {n.type && <span className="text-[10px] text-gray-500 ring-1 ring-gray-200 rounded-full px-1.5 capitalize">{n.type}</span>}
                        </div>
                        {n.description && <p className="text-xs text-gray-600">{n.description}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </Section>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap items-center pt-2">
              <button type="button" className="text-sm inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900" onClick={() => setPreview(true)}>
                <EyeIcon className="size-4" /> Preview as Student
              </button>
              <button type="button" className="text-sm inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900" onClick={() => setValidate(true)}>
                <CheckCircleIcon className="size-4" /> Validate Test Cases
              </button>
              <div className="flex-1" />
              <button type="button"
                className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => navigate("/problems")}
              >
                Cancel
              </button>
              <button type="submit"
                className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 inline-flex items-center gap-2 disabled:opacity-60"
                disabled={saving || (!isEditMode && dupWarning?.isDuplicate)}
              >
                {saving ? <span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : null}
                {isEditMode ? "Save Changes" : "Create & Publish"}
              </button>
            </div>

            {isEditMode && originalStatus === "draft" && (
              <p className="text-[11px] text-gray-400 text-center">
                Saving keeps the problem as a draft — publish it from the Problems page when you're ready.
              </p>
            )}
          </form>
        )}

        {/* ── AI TAB ── */}
        {tab === "ai" && !isEditMode && (
          <div className="space-y-4">
            <Section title="Generate with AI" subtitle="Pick a topic and let the model draft problems you can review.">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Topic</label>
                    <input className={inputCls} value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGenerate()} placeholder="Binary Trees, Graph BFS…" />
                  </div>
                  <div>
                    <label className={labelCls}>Difficulty (optional)</label>
                    <select className={inputCls} value={aiDiff} onChange={e => setAiDiff(e.target.value)}>
                      <option value="">Any</option>
                      {DIFFS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Number of problems</label>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 w-full">
                      {[1, 3, 5].map(n => (
                        <button key={n} type="button"
                          className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition ${
                            aiCount === n ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
                          }`}
                          onClick={() => setAiCount(n)}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Scope</label>
                    <select className={inputCls} value={aiScope} onChange={e => setAiScope(e.target.value)}>
                      <option value="global">Global Bank</option>
                      <option value="module">Module-only</option>
                    </select>
                  </div>
                </div>
                {aiScope === "module" && (
                  <div>
                    <label className={labelCls}>Module</label>
                    <select className={inputCls} value={aiModuleId} onChange={e => setAiModuleId(e.target.value)}>
                      <option value="">— pick a module —</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                )}
                <button
                  className="w-full text-sm px-4 py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating
                    ? <><span className="size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Generating {aiCount} problem{aiCount > 1 ? "s" : ""}…</>
                    : <><SparklesIcon className="size-4" /> Generate {aiCount} Draft{aiCount > 1 ? "s" : ""}</>}
                </button>
              </div>
            </Section>

            {drafts.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">{drafts.length} draft{drafts.length > 1 ? "s" : ""} generated — review each before saving</p>
                {drafts.map((draft, i) => (
                  <DraftCard
                    key={i}
                    draft={draft}
                    index={i}
                    onSave={saveDraft}
                    onDiscard={discardDraft}
                    saving={savingIdx === i}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {preview && <PreviewModal problem={asProblem} onClose={() => setPreview(false)} />}
      {validate && <ValidateModal problem={asProblem} onClose={() => setValidate(false)} />}
    </div>
  );
}
