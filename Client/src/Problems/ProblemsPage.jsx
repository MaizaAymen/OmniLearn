import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { CheckCircle2Icon, ChevronRightIcon, Code2Icon, GitForkIcon, PlusIcon, SearchIcon } from "lucide-react";
import { getDifficultyBadgeClass } from "./utils";
import Navbar from "../components/Navbar";

const API = "http://localhost:5000/api/ai/ai";
const DIFF_FILTERS = ["All", "Easy", "Medium", "Hard"];
const STATUS_FILTERS = ["all", "published", "draft", "review", "archived"];

const STATUS_BADGE = {
  published: "badge-success",
  draft:     "badge-warning",
  review:    "badge-info",
  archived:  "badge-ghost",
};

function getUser() {
  try { return JSON.parse(Cookies.get("user") || "{}"); } catch { return {}; }
}

function ProblemsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getUser();
  const isTeacher = user.role === "teacher" || user.role === "admin";

  const [problems, setProblems]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState(() => new Set());
  const [search, setSearch]       = useState("");
  const [diffFilter, setDiffFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState(
    isTeacher ? (searchParams.get("status") || "all") : "published"
  );

  async function fetchProblems(status) {
    setIsLoading(true);
    try {
      const param = isTeacher ? (status || statusFilter) : "";
      const url = param ? `${API}/getallproblems?status=${param}` : `${API}/getallproblems`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProblems(Array.isArray(data) ? data : []);
    } catch {
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchProblems(); }, [statusFilter]);

  useEffect(() => {
    if (!user?.id) return;
    const token = Cookies.get("token");
    if (!token) return;
    fetch(`http://localhost:5000/api/submissions/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.solvedProblemIds)) {
          setSolvedIds(new Set(data.solvedProblemIds));
        }
      })
      .catch(() => {});
  }, [user?.id]);

  async function forkProblem(id) {
    try {
      const res = await fetch(`${API}/problems/${id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdBy: user.id || null }),
      });
      if (!res.ok) throw new Error();
      const { forkedProblem, original } = await res.json();
      toast.success("Forked! Opening editor pre-filled with the original…");
      navigate(`/problems/create?edit=${forkedProblem.id}&source=${original.id}`);
    } catch {
      toast.error("Error forking problem");
    }
  }

  async function changeStatus(id, newStatus) {
    try {
      const res = await fetch(`${API}/problems/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Problem ${newStatus}`);
      setProblems(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch {
      toast.error("Error updating status");
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems.filter(p => {
      const matchDiff   = diffFilter === "All" || p.difficulty === diffFilter;
      const matchSearch = !q || p.title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
      return matchDiff && matchSearch;
    });
  }, [problems, search, diffFilter]);

  const easyCount   = problems.filter(p => p.difficulty === "Easy").length;
  const mediumCount = problems.filter(p => p.difficulty === "Medium").length;
  const hardCount   = problems.filter(p => p.difficulty === "Hard").length;

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2">Practice Problems</h1>
            <p className="text-base-content/70">Sharpen your coding skills with curated problems</p>
          </div>
          {isTeacher && (
            <button
              className="btn btn-primary gap-2"
              onClick={() => navigate("/problems/create")}
            >
              <PlusIcon className="size-4" /> Create Problem
            </button>
          )}
        </div>

        {/* STATS */}
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-6 bg-base-100">
          <div className="stat">
            <div className="stat-title">Total</div>
            <div className="stat-value text-primary">{problems.length}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Easy</div>
            <div className="stat-value text-success">{easyCount}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Medium</div>
            <div className="stat-value text-warning">{mediumCount}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Hard</div>
            <div className="stat-value text-error">{hardCount}</div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Search + Difficulty */}
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="input input-bordered flex items-center gap-2 flex-1">
              <SearchIcon className="size-4 opacity-60" />
              <input
                type="text"
                className="grow"
                placeholder="Search by title or category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
            <div className="tabs tabs-boxed">
              {DIFF_FILTERS.map(f => (
                <button
                  key={f}
                  className={`tab ${diffFilter === f ? "tab-active" : ""}`}
                  onClick={() => setDiffFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter — teachers only */}
          {isTeacher && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-base-content/50 font-medium uppercase tracking-wide">Status:</span>
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  className={`btn btn-xs btn-ghost capitalize ${statusFilter === s ? "btn-active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PROBLEMS GRID */}
        {isLoading ? (
          <div className="card bg-base-100">
            <div className="card-body text-base-content/70">Loading problems...</div>
          </div>
        ) : visible.length === 0 ? (
          <div className="card bg-base-100">
            <div className="card-body text-base-content/70">No problems found.</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(problem => {
              const isSolved = solvedIds.has(problem.id);
              return (
              <div
                key={problem.id}
                className={`card bg-base-100 shadow hover:shadow-lg hover:-translate-y-0.5 transition-all border ${isSolved ? "border-success/60" : "border-base-300"}`}
              >
                <div className="card-body p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Code2Icon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-bold truncate">{problem.title}</h2>
                        {isSolved && (
                          <CheckCircle2Icon
                            className="size-4 text-success shrink-0"
                            aria-label="Solved"
                          />
                        )}
                      </div>
                      <p className="text-xs text-base-content/60 truncate">{problem.category}</p>
                    </div>
                    <span className={`badge badge-sm ${getDifficultyBadgeClass(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                  </div>

                  {/* Status badge — teachers only */}
                  {isTeacher && problem.status && problem.status !== "published" && (
                    <div className="mb-2">
                      <span className={`badge badge-sm ${STATUS_BADGE[problem.status] || "badge-ghost"}`}>
                        {problem.status}
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-base-content/70 line-clamp-2 mb-3">
                    {problem.description?.text || "No description available."}
                  </p>

                  {/* Tags */}
                  {problem.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {problem.tags.slice(0, 3).map(t => (
                        <span key={t} className="badge badge-outline badge-xs">{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-auto">
                    <Link
                      to={`/problems/${problem.id}`}
                      className="flex items-center gap-1 text-primary text-sm font-medium"
                    >
                      Solve <ChevronRightIcon className="size-4" />
                    </Link>

                    {isTeacher && (
                      <div className="flex gap-1 flex-wrap justify-end">
                        <button
                          className="btn btn-xs btn-ghost gap-1"
                          onClick={() => forkProblem(problem.id)}
                          title="Fork & Customize"
                        >
                          <GitForkIcon className="size-3" /> Fork
                        </button>
                        {(problem.status === "draft" || problem.status === "review" || !problem.status) && (
                          <button className="btn btn-xs btn-success" onClick={() => changeStatus(problem.id, "published")}>
                            Publish
                          </button>
                        )}
                        {problem.status === "published" && (
                          <button className="btn btn-xs btn-ghost" onClick={() => changeStatus(problem.id, "archived")}>
                            Archive
                          </button>
                        )}
                        {problem.status === "archived" && (
                          <button className="btn btn-xs btn-outline" onClick={() => changeStatus(problem.id, "published")}>
                            Restore
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProblemsPage;
