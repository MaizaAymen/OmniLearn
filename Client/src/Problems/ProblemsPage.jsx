import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { CheckCircle2Icon, ChevronRightIcon, Code2Icon, GitForkIcon, LockIcon, PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
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
  const isTeacher = user.role === "teacher";
  const isAdmin = user.role === "admin";
  const isStaff = isTeacher || isAdmin;
  // ÉTAPE 1 : on lit le plan depuis le cookie (rempli au login).
  // Si rien → "free" par défaut. Sert à afficher la bannière d'upgrade.
  const isFreeUser = !isStaff && (user.plan ?? "free") === "free";

  const [problems, setProblems]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState(() => new Set());
  const [search, setSearch]       = useState("");
  const [diffFilter, setDiffFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState(
    isStaff ? (searchParams.get("status") || "all") : "published"
  );

  async function fetchProblems(status) {
    setIsLoading(true);
    try {
      const param = isStaff ? (status || statusFilter) : "";
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
      if (!matchDiff || !matchSearch) return false;

      // Forks: only the teacher who created the fork can see it; admin sees all forks; others can't.
      if (p.forkedFrom) {
        if (isAdmin) return true;
        if (isTeacher && p.createdBy && p.createdBy === user.id) return true;
        return false;
      }
      // Archived originals are admin-only — a teacher must not see problems the admin archived.
      if (p.status === "archived" && !isAdmin) return false;
      return true;
    });
  }, [problems, search, diffFilter, isAdmin, isTeacher, user.id]);

  const easyCount   = problems.filter(p => p.difficulty === "Easy").length;
  const mediumCount = problems.filter(p => p.difficulty === "Medium").length;
  const hardCount   = problems.filter(p => p.difficulty === "Hard").length;

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* ─── BANNIÈRE D'UPGRADE (utilisateurs free seulement) ─────────────
            Étape 1 : on n'affiche que si l'utilisateur est sur le plan free.
            Étape 2 : un clic envoie vers /profile (où vivra le bouton upgrade).
            Étape 3 : on rappelle ce qu'il débloque (tous les problèmes + IA + PDF). */}
        {isFreeUser && (
          <div className="alert alert-info mb-6 shadow-md">
            <LockIcon className="size-5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold flex items-center gap-2">
                <SparklesIcon className="size-4" />
                You're on the Free plan
              </h3>
              <p className="text-sm opacity-80">
                You can solve our 10 free-tier problems. Upgrade to Pro to unlock
                all problems, AI code correction, and the PDF analyzer.
              </p>
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => navigate("/profile")}
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2">Practice Problems</h1>
            <p className="text-base-content/70">Sharpen your coding skills with curated problems</p>
          </div>
          {isStaff && (
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

          {/* Status filter — staff only */}
          {isStaff && (
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

                  {/* Status badge + fork-author badge — staff only */}
                  {isStaff && (
                    <div className="mb-2 flex items-center gap-1 flex-wrap">
                      {problem.status && problem.status !== "published" && (
                        <span className={`badge badge-sm ${STATUS_BADGE[problem.status] || "badge-ghost"}`}>
                          {problem.status}
                        </span>
                      )}
                      {problem.forkedFrom && (
                        <span className="badge badge-sm badge-outline gap-1">
                          <GitForkIcon className="size-3" />
                          {problem.creator
                            ? `Forked by ${problem.creator.firstname} ${problem.creator.lastname}`
                            : "Fork"}
                        </span>
                      )}
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

                    {isStaff && (() => {
                      const isFork = !!problem.forkedFrom;
                      const isOwnFork = isFork && problem.createdBy && problem.createdBy === user.id;
                      // Teachers can publish/archive/restore ONLY on their own forks.
                      // Admins can publish/archive/restore on any problem.
                      const canChangeStatus = isAdmin || (isTeacher && isOwnFork);
                      // Forking a fork is not useful — only allow forking originals.
                      const canFork = !isFork;
                      return (
                        <div className="flex gap-1 flex-wrap justify-end">
                          {canFork && (
                            <button
                              className="btn btn-xs btn-ghost gap-1"
                              onClick={() => forkProblem(problem.id)}
                              title="Fork & Customize"
                            >
                              <GitForkIcon className="size-3" /> Fork
                            </button>
                          )}
                          {canChangeStatus && (problem.status === "draft" || problem.status === "review" || !problem.status) && (
                            <button className="btn btn-xs btn-success" onClick={() => changeStatus(problem.id, "published")}>
                              Publish
                            </button>
                          )}
                          {canChangeStatus && problem.status === "published" && (
                            <button className="btn btn-xs btn-ghost" onClick={() => changeStatus(problem.id, "archived")}>
                              Archive
                            </button>
                          )}
                          {canChangeStatus && problem.status === "archived" && (
                            <button className="btn btn-xs btn-outline" onClick={() => changeStatus(problem.id, "published")}>
                              Restore
                            </button>
                          )}
                        </div>
                      );
                    })()}
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
