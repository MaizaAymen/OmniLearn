import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import {
  PlusIcon, TrashIcon, CheckCircleIcon, CircleIcon,
  ChevronLeftIcon, ChevronRightIcon, BarChart2Icon, XIcon,
} from "lucide-react";

const API = "http://localhost:5000/api";
const ADMIN = `${API}/admin`;

function ClassAssignmentsPage() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(Cookies.get("user") || "{}"); } catch { return {}; } })();
  const isTeacher = user.role === "teacher" || user.role === "admin";

  // ── Drill-down selectors ──────────────────────────────────────────────────
  const [classes, setClasses]   = useState([]);
  const [courses, setCourses]   = useState([]);
  const [modules, setModules]   = useState([]);
  const [classId, setClassId]   = useState("");
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");

  // ── Data ──────────────────────────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Create form ───────────────────────────────────────────────────────────
  const [newTitle, setNewTitle]                   = useState("");
  const [selectedPids, setSelectedPids]           = useState([]);
  const [dueDate, setDueDate]                     = useState("");
  const [maxAttempts, setMaxAttempts]             = useState("");
  const [autoDifficulty, setAutoDifficulty]       = useState("");
  const [creating, setCreating]                   = useState(false);

  // ── Student: one-at-a-time navigator ─────────────────────────────────────
  const [activeAssignment, setActiveAssignment]   = useState(null); // { assignment, index }

  // ── Teacher: stats modal ──────────────────────────────────────────────────
  const [statsData, setStatsData]                 = useState(null); // { assignmentId, countByProblem }
  const [statsAssignment, setStatsAssignment]     = useState(null);

  // Load classes
  useEffect(() => {
    if (!user.id) return;
    fetch(`${API}/users/${user.id}/classrooms`)
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [user.id]);

  // Load courses when class changes
  useEffect(() => {
    setCourseId(""); setModuleId(""); setCourses([]); setModules([]); setAssignments([]);
    if (!classId) return;
    fetch(`${ADMIN}/classrooms/${classId}/courses`)
      .then((r) => r.json())
      .then((d) => setCourses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [classId]);

  // Load modules when course changes
  useEffect(() => {
    setModuleId(""); setModules([]); setAssignments([]);
    if (!courseId) return;
    fetch(`${ADMIN}/courses/${courseId}/modules`)
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
    fetch(url)
      .then((r) => r.json())
      .then((d) => setAssignments(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load assignments"))
      .finally(() => setLoading(false));
  }, [moduleId]);

  // Load all problems for teacher picker
  useEffect(() => {
    if (!isTeacher) return;
    fetch(`${API}/ai/ai/getallproblems`)
      .then((r) => r.json())
      .then((d) => setAllProblems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [isTeacher]);

  // Auto-fill problem selection by difficulty
  useEffect(() => {
    if (!autoDifficulty) return;
    const ids = allProblems.filter((p) => p.difficulty === autoDifficulty).map((p) => p.id);
    setSelectedPids(ids);
  }, [autoDifficulty, allProblems]);

  const toggleProblem = (pid) =>
    setSelectedPids((prev) => prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]);

  const handleCreate = async () => {
    if (!newTitle.trim() || selectedPids.length === 0 || !moduleId) {
      toast.error("Title and at least one problem are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId, title: newTitle, problemIds: selectedPids,
          dueDate: dueDate || null, maxAttempts: maxAttempts ? Number(maxAttempts) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setAssignments((prev) => [...prev, { ...created, solved: 0, total: selectedPids.length, solvedIds: [] }]);
      setNewTitle(""); setSelectedPids([]); setDueDate(""); setMaxAttempts(""); setAutoDifficulty("");
      toast.success("Assignment created");
    } catch {
      toast.error("Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/assignments/${id}`, { method: "DELETE" });
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    toast.success("Deleted");
  };

  const handleStats = async (a) => {
    const res = await fetch(`${API}/assignments/${a.id}/stats`);
    const data = await res.json();
    setStatsData(data);
    setStatsAssignment(a);
  };

  // ── Student navigator helpers ─────────────────────────────────────────────
  const openAssignment = (a) => setActiveAssignment({ assignment: a, index: 0 });
  const closeAssignment = () => setActiveAssignment(null);
  const goTo = (idx) => setActiveAssignment((prev) => ({ ...prev, index: idx }));

  if (activeAssignment) {
    const { assignment: a, index } = activeAssignment;
    const pid = a.problemIds[index];
    const problem = allProblems.find((p) => p.id === pid);
    const isSolved = a.solvedIds?.includes(pid);
    const total = a.problemIds.length;

    return (
      <div className="min-h-screen bg-base-300 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm gap-1" onClick={closeAssignment}>
              <ChevronLeftIcon className="size-4" /> Back
            </button>
            <div>
              <h2 className="font-bold">{a.title}</h2>
              <p className="text-xs text-base-content/40">Problem {index + 1} of {total}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <progress className="progress progress-primary w-full" value={a.solved} max={total} />
            <p className="text-xs text-base-content/40 mt-1">{a.solved}/{total} solved</p>
          </div>

          {/* Problem card */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-center gap-2">
                {isSolved
                  ? <CheckCircleIcon className="size-5 text-success shrink-0" />
                  : <CircleIcon className="size-5 text-base-content/30 shrink-0" />}
                <h3 className="font-semibold text-lg">{problem?.title || pid}</h3>
                {problem?.difficulty && (
                  <span className={`badge badge-sm ml-auto ${
                    problem.difficulty === "Easy" ? "badge-success" :
                    problem.difficulty === "Medium" ? "badge-warning" : "badge-error"
                  }`}>{problem.difficulty}</span>
                )}
              </div>

              {a.maxAttempts && (
                <p className="text-xs text-base-content/50">
                  Max attempts: <span className="font-semibold">{a.maxAttempts}</span>
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

          {/* Problem dots navigation */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {a.problemIds.map((p, i) => {
              const solved = a.solvedIds?.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => goTo(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    i === index
                      ? "bg-primary text-primary-content scale-110"
                      : solved
                      ? "bg-success text-success-content"
                      : "bg-base-300 text-base-content/50"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Prev / Next */}
          <div className="flex justify-between">
            <button
              className="btn btn-outline btn-sm gap-1"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeftIcon className="size-4" /> Prev
            </button>
            <button
              className="btn btn-outline btn-sm gap-1"
              disabled={index === total - 1}
              onClick={() => goTo(index + 1)}
            >
              Next <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Module Assignments</h1>
          <p className="text-sm text-base-content/50 mt-1">
            {isTeacher ? "Create problem sets inside modules" : "Your module practice problems"}
          </p>
        </div>

        {/* Drill-down: Class → Course → Module */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body py-4 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">Class</label>
                <select className="select select-bordered select-sm w-full" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">— Class —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">Course</label>
                <select className="select select-bordered select-sm w-full" value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={!classId}>
                  <option value="">— Course —</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title || c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">Module</label>
                <select className="select select-bordered select-sm w-full" value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={!courseId}>
                  <option value="">— Module —</option>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher: create form */}
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

              {/* Auto-assign by difficulty */}
              <div>
                <label className="text-xs text-base-content/50 mb-1 block">Auto-pick by difficulty</label>
                <div className="flex gap-2">
                  {["", "Easy", "Medium", "Hard"].map((d) => (
                    <button
                      key={d}
                      className={`btn btn-xs ${autoDifficulty === d ? "btn-primary" : "btn-outline"}`}
                      onClick={() => setAutoDifficulty(d)}
                    >
                      {d || "Manual"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Problem picker */}
              <div>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1">
                  Problems — {selectedPids.length} selected
                </p>
                <div className="max-h-44 overflow-y-auto border border-base-300 rounded-lg p-2 space-y-0.5">
                  {allProblems
                    .filter((p) => !autoDifficulty || p.difficulty === autoDifficulty)
                    .map((p) => (
                      <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-base-200 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs checkbox-primary"
                          checked={selectedPids.includes(p.id)}
                          onChange={() => toggleProblem(p.id)}
                        />
                        <span className="text-sm flex-1">{p.title}</span>
                        <span className={`badge badge-xs ${
                          p.difficulty === "Easy" ? "badge-success" :
                          p.difficulty === "Medium" ? "badge-warning" : "badge-error"
                        }`}>{p.difficulty}</span>
                      </label>
                    ))}
                </div>
              </div>

              <button className="btn btn-primary btn-sm gap-2 self-end" onClick={handleCreate} disabled={creating}>
                <PlusIcon className="size-4" />
                {creating ? "Creating…" : "Create Assignment"}
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
              const overdue = a.dueDate && new Date(a.dueDate) < new Date() && !done;

              return (
                <div key={a.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body py-4 gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{a.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {a.dueDate && (
                            <span className={`text-xs ${overdue ? "text-error" : "text-base-content/40"}`}>
                              Due {new Date(a.dueDate).toLocaleDateString()}{overdue && " · Overdue"}
                            </span>
                          )}
                          {a.maxAttempts && (
                            <span className="text-xs text-base-content/40">Max {a.maxAttempts} attempts</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {done && <span className="badge badge-success badge-sm">Done</span>}
                        {isTeacher && (
                          <>
                            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => handleStats(a)} title="Stats">
                              <BarChart2Icon className="size-3.5" />
                            </button>
                            <button className="btn btn-ghost btn-xs btn-circle text-error" onClick={() => handleDelete(a.id)}>
                              <TrashIcon className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-base-content/40 mb-1">
                        <span>{solved}/{total} solved</span>
                        <span>{pct}%</span>
                      </div>
                      <progress className="progress progress-primary w-full h-2" value={pct} max={100} />
                    </div>

                    {/* Problem chips (teacher) or Start button (student) */}
                    {isTeacher ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(a.problemIds || []).map((pid) => {
                          const prob = allProblems.find((p) => p.id === pid);
                          return (
                            <button key={pid} className="btn btn-xs btn-outline gap-1" onClick={() => navigate(`/problems/${pid}`)}>
                              {prob?.title || pid}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        className={`btn btn-sm gap-2 ${done ? "btn-outline btn-success" : "btn-primary"}`}
                        onClick={() => openAssignment(a)}
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

      {/* Teacher Stats Modal */}
      {statsData && statsAssignment && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => { setStatsData(null); setStatsAssignment(null); }}>
              <XIcon className="size-4" />
            </button>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <BarChart2Icon className="size-5 text-primary" />
              {statsAssignment.title} — Stats
            </h3>
            <div className="space-y-3">
              {statsAssignment.problemIds.map((pid) => {
                const prob = allProblems.find((p) => p.id === pid);
                const count = statsData.countByProblem?.[pid] ?? 0;
                return (
                  <div key={pid}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{prob?.title || pid}</span>
                      <span className="font-semibold text-primary">{count} solved</span>
                    </div>
                    <progress className="progress progress-primary w-full h-1.5" value={count} max={Math.max(...Object.values(statsData.countByProblem), 1)} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setStatsData(null); setStatsAssignment(null); }} />
        </dialog>
      )}
    </div>
  );
}

export default ClassAssignmentsPage;
