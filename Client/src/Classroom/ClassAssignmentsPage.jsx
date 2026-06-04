import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import {
  PlusIcon, TrashIcon, CheckCircleIcon, CircleIcon,
  ChevronLeftIcon, ChevronRightIcon, XIcon,
  PencilIcon, SendIcon, SearchIcon, UsersIcon, ClockIcon,
} from "lucide-react";
import { SERVER_URL } from "../config";

const API = `${SERVER_URL}/api`;
const ADMIN = `${API}/admin`;

const authHeaders = () => {
  const token = Cookies.get("token");
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

const getUser = () => {
  try { return JSON.parse(Cookies.get("user") || "{}"); } catch { return {}; }
};

function ClassAssignmentsPage() {
  const navigate = useNavigate();
  const user = getUser();
  const isTeacher = ["teacher", "admin", "institution_admin"].includes(user.role);

  // ── Drill-down ────────────────────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [classId, setClassId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");

  // ── Data ──────────────────────────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [instProblems, setInstProblems] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Create form ───────────────────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState("");
  const [selectedPids, setSelectedPids] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [creating, setCreating] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerDiff, setPickerDiff] = useState("");
  const [pickerTab, setPickerTab] = useState("all");

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPids, setEditPids] = useState([]);
  const [editDueDate, setEditDueDate] = useState("");
  const [editMaxAttempts, setEditMaxAttempts] = useState("");
  const [editSearch, setEditSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Roster modal ──────────────────────────────────────────────────────────
  const [rosterTarget, setRosterTarget] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // ── Student navigator ─────────────────────────────────────────────────────
  const [activeAssignment, setActiveAssignment] = useState(null);

  // Load classes
  useEffect(() => {
    if (!user.id) return;
    fetch(`${API}/users/${user.id}/classrooms`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [user.id]);

  // Load problem lists (all roles — students need titles too)
  useEffect(() => {
    fetch(`${API}/ai/ai/getallproblems`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setAllProblems(Array.isArray(d) ? d : []))
      .catch(() => {});

    if (user.institutionId) {
      fetch(`${API}/ai/ai/getallproblems?scope=institution`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => setInstProblems(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, []);

  // Load courses when class changes
  useEffect(() => {
    setCourseId(""); setModuleId(""); setCourses([]); setModules([]); setAssignments([]);
    if (!classId) return;
    fetch(`${ADMIN}/classrooms/${classId}/courses`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setCourses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [classId]);

  // Load modules when course changes
  useEffect(() => {
    setModuleId(""); setModules([]); setAssignments([]);
    if (!courseId) return;
    fetch(`${ADMIN}/courses/${courseId}/modules`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setModules(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [courseId]);

  // Load assignments when module changes
  useEffect(() => {
    setAssignments([]); setActiveAssignment(null);
    if (!moduleId) return;
    setLoading(true);
    const url = isTeacher
      ? `${API}/assignments/module/${moduleId}`
      : `${API}/assignments/student/${user.id}/module/${moduleId}`;
    fetch(url, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setAssignments(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load assignments"))
      .finally(() => setLoading(false));
  }, [moduleId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const togglePid = (pid, list, setList) =>
    setList((prev) => prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]);

  const filteredPickerProblems = () => {
    const base = pickerTab === "inst" ? instProblems : allProblems;
    return base.filter((p) => {
      const matchDiff = !pickerDiff || p.difficulty === pickerDiff;
      const matchSearch = !pickerSearch || p.title?.toLowerCase().includes(pickerSearch.toLowerCase());
      return matchDiff && matchSearch;
    });
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newTitle.trim() || selectedPids.length === 0) {
      toast.error("Title and at least one problem are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/assignments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          moduleId,
          classId: classId || null,
          title: newTitle,
          problemIds: selectedPids,
          dueDate: dueDate || null,
          maxAttempts: maxAttempts ? Number(maxAttempts) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const created = await res.json();
      setAssignments((prev) => [...prev, created]);
      setNewTitle(""); setSelectedPids([]); setDueDate(""); setMaxAttempts("");
      setPickerSearch(""); setPickerDiff("");
      toast.success("Draft created — click Publish to notify students");
    } catch (err) {
      toast.error(err.message || "Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  // ── Publish toggle ────────────────────────────────────────────────────────
  const handlePublish = async (a) => {
    try {
      const res = await fetch(`${API}/assignments/${a.id}/publish`, {
        method: "PUT",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAssignments((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      toast.success(updated.isPublished ? "Published — students notified" : "Moved back to draft");
    } catch {
      toast.error("Failed to update publish state");
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (a) => {
    setEditTarget(a);
    setEditTitle(a.title);
    setEditPids([...a.problemIds]);
    setEditDueDate(a.dueDate ? new Date(a.dueDate).toISOString().split("T")[0] : "");
    setEditMaxAttempts(a.maxAttempts ?? "");
    setEditSearch("");
  };

  const handleEdit = async () => {
    if (!editTitle.trim() || editPids.length === 0) {
      toast.error("Title and at least one problem are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/assignments/${editTarget.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          title: editTitle,
          problemIds: editPids,
          dueDate: editDueDate || null,
          maxAttempts: editMaxAttempts ? Number(editMaxAttempts) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAssignments((prev) => prev.map((x) => x.id === updated.id ? { ...x, ...updated } : x));
      setEditTarget(null);
      toast.success("Assignment updated");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/assignments/${id}`, { method: "DELETE", headers: authHeaders() });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ── Roster ────────────────────────────────────────────────────────────────
  const openRoster = async (a) => {
    setRosterTarget(a);
    setRosterData(null);
    setRosterLoading(true);
    try {
      const res = await fetch(`${API}/assignments/${a.id}/roster`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setRosterData(await res.json());
    } catch {
      toast.error("Failed to load roster");
    } finally {
      setRosterLoading(false);
    }
  };

  // ── Student navigator ─────────────────────────────────────────────────────
  if (activeAssignment) {
    const { assignment: a, index } = activeAssignment;
    const pid = a.problemIds[index];
    const problem = allProblems.find((p) => p.id === pid);
    const isSolved = a.solvedIds?.includes(pid);
    const total = a.problemIds.length;
    const now = new Date();
    const isLate = a.dueDate && new Date(a.dueDate) < now;
    const hoursLeft = a.dueDate ? (new Date(a.dueDate) - now) / 36e5 : null;
    const soonDue = hoursLeft !== null && hoursLeft > 0 && hoursLeft < 24;

    return (
      <div className="min-h-screen bg-base-300 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm gap-1" onClick={() => setActiveAssignment(null)}>
              <ChevronLeftIcon className="size-4" /> Back
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold truncate">{a.title}</h2>
              <p className="text-xs text-base-content/40">Problem {index + 1} of {total}</p>
            </div>
            {isLate && <span className="badge badge-error badge-sm shrink-0">Overdue</span>}
            {soonDue && <span className="badge badge-warning badge-sm shrink-0">{Math.round(hoursLeft)}h left</span>}
          </div>

          <div>
            <progress className="progress progress-primary w-full" value={a.solved} max={total} />
            <p className="text-xs text-base-content/40 mt-1">{a.solved}/{total} solved</p>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-center gap-2">
                {isSolved
                  ? <CheckCircleIcon className="size-5 text-success shrink-0" />
                  : <CircleIcon className="size-5 text-base-content/30 shrink-0" />}
                <h3 className="font-semibold text-lg flex-1">{problem?.title || pid}</h3>
                {problem?.difficulty && (
                  <span className={`badge badge-sm ${
                    problem.difficulty === "Easy" ? "badge-success" :
                    problem.difficulty === "Medium" ? "badge-warning" : "badge-error"
                  }`}>{problem.difficulty}</span>
                )}
              </div>
              {a.maxAttempts && (
                <p className="text-xs text-base-content/50">Max attempts: <span className="font-semibold">{a.maxAttempts}</span></p>
              )}
              {a.dueDate && (
                <p className={`text-xs flex items-center gap-1 ${isLate ? "text-error" : "text-base-content/50"}`}>
                  <ClockIcon className="size-3" />
                  Due {new Date(a.dueDate).toLocaleDateString()}{isLate ? " · Late submission" : ""}
                </p>
              )}
              <button
                className="btn btn-primary w-full gap-2"
                onClick={() => navigate(`/problems/${pid}`)}
              >
                {isSolved ? "Review Solution" : "Solve Problem"}
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {a.problemIds.map((p, i) => (
              <button
                key={p}
                onClick={() => setActiveAssignment((prev) => ({ ...prev, index: i }))}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  i === index ? "bg-primary text-primary-content scale-110" :
                  a.solvedIds?.includes(p) ? "bg-success text-success-content" :
                  "bg-base-300 text-base-content/50"
                }`}
              >{i + 1}</button>
            ))}
          </div>

          <div className="flex justify-between">
            <button className="btn btn-outline btn-sm gap-1" disabled={index === 0}
              onClick={() => setActiveAssignment((prev) => ({ ...prev, index: index - 1 }))}>
              <ChevronLeftIcon className="size-4" /> Prev
            </button>
            <button className="btn btn-outline btn-sm gap-1" disabled={index === total - 1}
              onClick={() => setActiveAssignment((prev) => ({ ...prev, index: index + 1 }))}>
              Next <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main list view ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-base-300 p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        <div>
          <h1 className="text-2xl font-bold">Module Assignments</h1>
          <p className="text-sm text-base-content/50 mt-1">
            {isTeacher ? "Create and manage problem sets inside modules" : "Your module practice problems"}
          </p>
        </div>

        {/* Drill-down selector */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Class", value: classId, set: setClassId, opts: classes, disabled: false, key: "c" },
                { label: "Course", value: courseId, set: setCourseId, opts: courses, disabled: !classId, key: "co" },
                { label: "Module", value: moduleId, set: setModuleId, opts: modules, disabled: !courseId, key: "m" },
              ].map(({ label, value, set, opts, disabled, key }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">{label}</label>
                  <select className="select select-bordered select-sm w-full" value={value} onChange={(e) => set(e.target.value)} disabled={disabled}>
                    <option value="">— {label} —</option>
                    {opts.map((o) => <option key={o.id} value={o.id}>{o.name || o.title}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Create form (teacher only) */}
        {isTeacher && moduleId && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <h2 className="card-title text-base">New Assignment</h2>

              <input
                className="input input-bordered input-sm w-full"
                placeholder="Assignment title (e.g. Arrays Practice)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-base-content/50 mb-1 block">Due date (optional)</label>
                  <input type="date" className="input input-bordered input-sm w-full" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-base-content/50 mb-1 block">Max attempts (optional)</label>
                  <input type="number" min={1} className="input input-bordered input-sm w-full" placeholder="Unlimited" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
                </div>
              </div>

              {/* Problem picker */}
              <div>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
                  Problems — {selectedPids.length} selected
                </p>

                <div className="flex flex-wrap gap-2 mb-2">
                  <div className="relative flex-1 min-w-[140px]">
                    <SearchIcon className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input
                      className="input input-bordered input-xs w-full pl-7"
                      placeholder="Search problems…"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1">
                    {["", "Easy", "Medium", "Hard"].map((d) => (
                      <button key={d} className={`btn btn-xs ${pickerDiff === d ? "btn-primary" : "btn-outline"}`} onClick={() => setPickerDiff(d)}>
                        {d || "All"}
                      </button>
                    ))}
                  </div>
                </div>

                {user.institutionId && (
                  <div role="tablist" className="tabs tabs-bordered mb-2">
                    <button role="tab" className={`tab tab-sm ${pickerTab === "all" ? "tab-active" : ""}`} onClick={() => setPickerTab("all")}>Global</button>
                    <button role="tab" className={`tab tab-sm ${pickerTab === "inst" ? "tab-active" : ""}`} onClick={() => setPickerTab("inst")}>My Institution</button>
                  </div>
                )}

                <div className="max-h-44 overflow-y-auto border border-base-300 rounded-lg p-2 space-y-0.5">
                  {filteredPickerProblems().length === 0
                    ? <p className="text-xs text-center text-base-content/40 py-4">No problems match</p>
                    : filteredPickerProblems().map((p) => (
                      <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-base-200 cursor-pointer">
                        <input type="checkbox" className="checkbox checkbox-xs checkbox-primary"
                          checked={selectedPids.includes(p.id)}
                          onChange={() => togglePid(p.id, selectedPids, setSelectedPids)} />
                        <span className="text-sm flex-1 truncate">{p.title}</span>
                        <span className={`badge badge-xs shrink-0 ${
                          p.difficulty === "Easy" ? "badge-success" :
                          p.difficulty === "Medium" ? "badge-warning" : "badge-error"
                        }`}>{p.difficulty}</span>
                      </label>
                    ))}
                </div>
              </div>

              <button className="btn btn-primary btn-sm gap-2 self-end" onClick={handleCreate} disabled={creating}>
                <PlusIcon className="size-4" />
                {creating ? "Creating…" : "Save as Draft"}
              </button>
            </div>
          </div>
        )}

        {/* Assignments list */}
        {moduleId && (
          <div className="space-y-3">
            {loading && <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>}

            {!loading && assignments.length === 0 && (
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body items-center text-base-content/40 py-10 italic text-sm">
                  No assignments in this module yet
                </div>
              </div>
            )}

            {assignments.map((a) => {
              const solved = a.solved ?? 0;
              const total = a.total ?? a.problemIds?.length ?? 0;
              const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
              const done = solved === total && total > 0;
              const now = new Date();
              const isLate = a.dueDate && new Date(a.dueDate) < now;
              const hoursLeft = a.dueDate ? (new Date(a.dueDate) - now) / 36e5 : null;
              const soonDue = hoursLeft !== null && hoursLeft > 0 && hoursLeft < 24;

              return (
                <div key={a.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body py-4 gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{a.title}</h3>
                          {isTeacher && (
                            <span className={`badge badge-xs ${a.isPublished ? "badge-success" : "badge-warning"}`}>
                              {a.isPublished ? "Published" : "Draft"}
                            </span>
                          )}
                          {done && <span className="badge badge-success badge-xs">Done</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {a.dueDate && (
                            <span className={`text-xs flex items-center gap-1 ${
                              isLate ? "text-error" : soonDue ? "text-warning" : "text-base-content/40"
                            }`}>
                              <ClockIcon className="size-3" />
                              Due {new Date(a.dueDate).toLocaleDateString()}
                              {isLate ? " · Overdue" : soonDue ? ` · ${Math.round(hoursLeft)}h left` : ""}
                            </span>
                          )}
                          {a.maxAttempts && (
                            <span className="text-xs text-base-content/40">Max {a.maxAttempts} attempts</span>
                          )}
                        </div>
                      </div>

                      {isTeacher && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            className={`btn btn-xs gap-1 ${a.isPublished ? "btn-outline" : "btn-success"}`}
                            onClick={() => handlePublish(a)}
                            title={a.isPublished ? "Move to draft" : "Publish to students"}
                          >
                            <SendIcon className="size-3" />
                            {a.isPublished ? "Unpublish" : "Publish"}
                          </button>
                          <button className="btn btn-ghost btn-xs btn-circle" onClick={() => openEdit(a)} title="Edit">
                            <PencilIcon className="size-3.5" />
                          </button>
                          <button className="btn btn-ghost btn-xs btn-circle" onClick={() => openRoster(a)} title="Student roster">
                            <UsersIcon className="size-3.5" />
                          </button>
                          <button className="btn btn-ghost btn-xs btn-circle text-error" onClick={() => handleDelete(a.id)} title="Delete">
                            <TrashIcon className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-base-content/40 mb-1">
                        <span>{solved}/{total} solved</span>
                        <span>{pct}%</span>
                      </div>
                      <progress className="progress progress-primary w-full h-2" value={pct} max={100} />
                    </div>

                    {isTeacher ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(a.problemIds || []).map((pid) => {
                          const prob = allProblems.find((p) => p.id === pid);
                          return (
                            <button key={pid} className="btn btn-xs btn-outline" onClick={() => navigate(`/problems/${pid}`)}>
                              {prob?.title || pid}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        className={`btn btn-sm gap-2 ${done ? "btn-outline btn-success" : "btn-primary"}`}
                        onClick={() => setActiveAssignment({ assignment: a, index: 0 })}
                      >
                        {done ? "Review" : "Start →"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      {editTarget && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setEditTarget(null)}>
              <XIcon className="size-4" />
            </button>
            <h3 className="font-bold text-lg mb-4">Edit Assignment</h3>

            <div className="space-y-3">
              <input className="input input-bordered input-sm w-full" placeholder="Title"
                value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-base-content/50 mb-1 block">Due date</label>
                  <input type="date" className="input input-bordered input-sm w-full"
                    value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-base-content/50 mb-1 block">Max attempts</label>
                  <input type="number" min={1} className="input input-bordered input-sm w-full" placeholder="Unlimited"
                    value={editMaxAttempts} onChange={(e) => setEditMaxAttempts(e.target.value)} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">
                  Problems — {editPids.length} selected
                </p>
                <div className="relative mb-2">
                  <SearchIcon className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-base-content/40" />
                  <input className="input input-bordered input-xs w-full pl-7" placeholder="Search…"
                    value={editSearch} onChange={(e) => setEditSearch(e.target.value)} />
                </div>
                <div className="max-h-44 overflow-y-auto border border-base-300 rounded-lg p-2 space-y-0.5">
                  {allProblems
                    .filter((p) => !editSearch || p.title?.toLowerCase().includes(editSearch.toLowerCase()))
                    .map((p) => (
                      <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-base-200 cursor-pointer">
                        <input type="checkbox" className="checkbox checkbox-xs checkbox-primary"
                          checked={editPids.includes(p.id)}
                          onChange={() => togglePid(p.id, editPids, setEditPids)} />
                        <span className="text-sm flex-1 truncate">{p.title}</span>
                        <span className={`badge badge-xs shrink-0 ${
                          p.difficulty === "Easy" ? "badge-success" :
                          p.difficulty === "Medium" ? "badge-warning" : "badge-error"
                        }`}>{p.difficulty}</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleEdit} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditTarget(null)} />
        </dialog>
      )}

      {/* ── Roster modal ────────────────────────────────────────────────────── */}
      {rosterTarget && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => { setRosterTarget(null); setRosterData(null); }}>
              <XIcon className="size-4" />
            </button>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <UsersIcon className="size-5 text-primary" />
              {rosterTarget.title}
            </h3>

            {rosterLoading && <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>}

            {!rosterLoading && rosterData && (
              <>
                <p className="text-sm text-base-content/50 mb-4">
                  {rosterData.students.filter((s) => s.solvedIds.length === rosterTarget.problemIds.length).length}
                  {" / "}{rosterData.total} students fully completed
                </p>

                {rosterData.students.length === 0 ? (
                  <p className="text-sm text-base-content/40 text-center py-6 italic">
                    No enrolled students — assign a class when creating the assignment to see roster data.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Student</th>
                          {rosterTarget.problemIds.map((pid, i) => {
                            const prob = allProblems.find((p) => p.id === pid);
                            return (
                              <th key={pid} className="text-center text-xs max-w-[60px] truncate" title={prob?.title || pid}>
                                P{i + 1}
                              </th>
                            );
                          })}
                          <th className="text-center">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rosterData.students.map((s) => (
                          <tr key={s.id}>
                            <td className="text-sm font-medium">{s.name}</td>
                            {rosterTarget.problemIds.map((pid) => (
                              <td key={pid} className="text-center">
                                {s.solvedIds.includes(pid)
                                  ? <CheckCircleIcon className="size-4 text-success mx-auto" />
                                  : <CircleIcon className="size-4 text-base-content/20 mx-auto" />}
                              </td>
                            ))}
                            <td className="text-center font-semibold text-sm">
                              {s.solvedIds.length}/{rosterTarget.problemIds.length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-backdrop" onClick={() => { setRosterTarget(null); setRosterData(null); }} />
        </dialog>
      )}
    </div>
  );
}

export default ClassAssignmentsPage;
