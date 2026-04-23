import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon, Code2Icon, SearchIcon } from "lucide-react";
import { getDifficultyBadgeClass } from "./utils";
import Navbar from "../components/Navbar";

const FILTERS = ["All", "Easy", "Medium", "Hard"];

function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/ai/ai/getallproblems", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch problems: ${response.status}`);
        }

        const data = await response.json();
        setProblems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching problems:", error);
        setProblems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const easyCount = problems.filter((p) => p.difficulty === "Easy").length;
  const mediumCount = problems.filter((p) => p.difficulty === "Medium").length;
  const hardCount = problems.filter((p) => p.difficulty === "Hard").length;

  const visibleProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems.filter((p) => {
      const matchesFilter = filter === "All" || p.difficulty === filter;
      const matchesSearch =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [problems, search, filter]);

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Practice Problems</h1>
          <p className="text-base-content/70">
            Sharpen your coding skills with these curated problems
          </p>
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
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <label className="input input-bordered flex items-center gap-2 flex-1">
            <SearchIcon className="size-4 opacity-60" />
            <input
              type="text"
              className="grow"
              placeholder="Search by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="tabs tabs-boxed">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`tab ${filter === f ? "tab-active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* PROBLEMS GRID */}
        {isLoading ? (
          <div className="card bg-base-100">
            <div className="card-body text-base-content/70">Loading problems...</div>
          </div>
        ) : visibleProblems.length === 0 ? (
          <div className="card bg-base-100">
            <div className="card-body text-base-content/70">No problems found.</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProblems.map((problem) => (
              <Link
                key={problem.id}
                to={`/problems/${problem.id}`}
                className="card bg-base-100 shadow hover:shadow-lg hover:-translate-y-0.5 transition-all border border-base-300"
              >
                <div className="card-body p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Code2Icon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold truncate">{problem.title}</h2>
                      <p className="text-xs text-base-content/60 truncate">
                        {problem.category}
                      </p>
                    </div>
                    <span className={`badge badge-sm ${getDifficultyBadgeClass(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                  </div>

                  <p className="text-sm text-base-content/70 line-clamp-2 mb-3">
                    {problem.description?.text || "No description available."}
                  </p>

                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-auto">
                    Solve
                    <ChevronRightIcon className="size-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default ProblemsPage;
