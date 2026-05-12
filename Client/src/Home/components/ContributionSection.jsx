import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Activity, Calendar } from "lucide-react";

const COLS = 53;
const ROWS = 7;
const TICK_MS = 95;
const INITIAL_LEN = 5;
const MAX_LEN = 22;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generateGrid() {
  const grid = [];
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = 0; r < ROWS; r++) {
      const v = Math.random();
      let intensity = 0;
      if (v > 0.42) intensity = 1;
      if (v > 0.68) intensity = 2;
      if (v > 0.85) intensity = 3;
      if (v > 0.95) intensity = 4;
      col.push(intensity);
    }
    grid.push(col);
  }
  return grid;
}

function buildPath() {
  const path = [];
  for (let c = 0; c < COLS; c++) {
    if (c % 2 === 0) {
      for (let r = 0; r < ROWS; r++) path.push([c, r]);
    } else {
      for (let r = ROWS - 1; r >= 0; r--) path.push([c, r]);
    }
  }
  return path;
}

const PATH = buildPath();

const SUBMISSIONS = [
  { title: "Two Sum", status: "Accepted", time: "now", diff: "Easy" },
  { title: "Binary Search", status: "Accepted", time: "2m", diff: "Easy" },
  { title: "DFS Traversal", status: "Wrong Answer", time: "9m", diff: "Medium" },
  { title: "Sliding Window", status: "Accepted", time: "21m", diff: "Medium" },
  { title: "LRU Cache", status: "Accepted", time: "48m", diff: "Hard" },
  { title: "Word Ladder", status: "Wrong Answer", time: "1h", diff: "Hard" },
];

export default function ContributionSection() {
  const [grid, setGrid] = useState(generateGrid);
  const [snake, setSnake] = useState(() =>
    Array.from({ length: INITIAL_LEN }, (_, i) => PATH[INITIAL_LEN - 1 - i])
  );
  const [eaten, setEaten] = useState(() => new Set());
  const [flashCell, setFlashCell] = useState(null);

  const headIdxRef = useRef(INITIAL_LEN - 1);
  const tailGrowRef = useRef(0);
  const gridRef = useRef(grid);
  const eatenRef = useRef(eaten);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { eatenRef.current = eaten; }, [eaten]);

  useEffect(() => {
    const id = setInterval(() => {
      headIdxRef.current = (headIdxRef.current + 1) % PATH.length;
      const next = PATH[headIdxRef.current];
      const [nc, nr] = next;
      const key = `${nc}-${nr}`;
      const isFood = gridRef.current[nc][nr] > 0 && !eatenRef.current.has(key);

      if (isFood) tailGrowRef.current += 1;

      setSnake((prev) => {
        const newSnake = [next, ...prev];
        if (tailGrowRef.current > 0 && newSnake.length <= MAX_LEN) {
          tailGrowRef.current -= 1;
          return newSnake;
        }
        newSnake.pop();
        if (tailGrowRef.current > 0) tailGrowRef.current -= 1;
        return newSnake;
      });

      if (isFood) {
        setEaten((prev) => {
          const ns = new Set(prev);
          ns.add(key);
          return ns;
        });
        setFlashCell(key);
        setTimeout(() => setFlashCell((cur) => (cur === key ? null : cur)), 500);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const filled = grid.flat().filter((v) => v > 0).length;
    if (filled > 0 && eaten.size > filled * 0.85) {
      const t = setTimeout(() => {
        setGrid(generateGrid());
        setEaten(new Set());
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [eaten, grid]);

  const snakeMap = useMemo(() => {
    const m = new Map();
    snake.forEach((pos, i) => m.set(`${pos[0]}-${pos[1]}`, i));
    return m;
  }, [snake]);

  return (
    <section className="omni-contrib-section">
      <motion.div
        className="omni-contrib-header"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <div className="omni-section-eyebrow">
            <Calendar size={13} /> <span>Contribution graph</span>
          </div>
          <h2>Your coding journey, visualized.</h2>
          <p>Every submission counts. Watch the algorithm devour your wins, one square at a time.</p>
        </div>
        <div className="omni-contrib-legend">
          <span>Less</span>
          <span className="omni-cell omni-i0" />
          <span className="omni-cell omni-i1" />
          <span className="omni-cell omni-i2" />
          <span className="omni-cell omni-i3" />
          <span className="omni-cell omni-i4" />
          <span>More</span>
        </div>
      </motion.div>

      <div className="omni-contrib-wrap">
        <motion.div
          className="omni-contrib-card"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="omni-month-row" aria-hidden>
            {MONTHS.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <div className="omni-grid">
            {Array.from({ length: COLS }).map((_, c) => (
              <div className="omni-col" key={c}>
                {Array.from({ length: ROWS }).map((_, r) => {
                  const key = `${c}-${r}`;
                  const baseIntensity = grid[c][r];
                  const isEaten = eaten.has(key);
                  const intensity = isEaten ? 0 : baseIntensity;
                  const snakeIdx = snakeMap.get(key);
                  const isHead = snakeIdx === 0;
                  const isBody = snakeIdx !== undefined && !isHead;
                  const isFlash = flashCell === key;
                  return (
                    <div
                      key={r}
                      className={[
                        "omni-cell",
                        `omni-i${intensity}`,
                        isFlash ? "omni-flash" : "",
                        isHead ? "omni-snake-head" : "",
                        isBody ? "omni-snake-body" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="omni-contrib-footer">
            <span>
              <strong>{eaten.size}</strong> cells eaten this round
            </span>
            <span>
              <span className="omni-snake-dot" /> Live snake
            </span>
          </div>
        </motion.div>

        <ActivityPanel />
      </div>
    </section>
  );
}

function ActivityPanel() {
  return (
    <motion.aside
      className="omni-activity"
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: 0.25, duration: 0.55 }}
    >
      <div className="omni-activity-head">
        <Activity size={14} />
        <span>Recent submissions</span>
        <span className="omni-live-pulse" aria-hidden />
      </div>
      <ul className="omni-activity-list">
        {SUBMISSIONS.map((s, i) => {
          const ok = s.status === "Accepted";
          return (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
              whileHover={{ x: 4 }}
              className={ok ? "omni-sub omni-sub-ok" : "omni-sub omni-sub-fail"}
            >
              <span className="omni-sub-icon">
                {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              </span>
              <div className="omni-sub-meta">
                <span className="omni-sub-title">{s.title}</span>
                <span className="omni-sub-status">
                  {s.status} · {s.diff}
                </span>
              </div>
              <span className="omni-sub-time">{s.time}</span>
            </motion.li>
          );
        })}
      </ul>
    </motion.aside>
  );
}
