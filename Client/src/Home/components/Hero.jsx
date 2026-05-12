import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

function makeParticles(count) {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 5,
    duration: 7 + Math.random() * 10,
    delay: Math.random() * 6,
    drift: (Math.random() - 0.5) * 60,
    color: Math.random() > 0.4 ? "green" : Math.random() > 0.5 ? "blue" : "violet",
  }));
}

function CodeEditor() {
  return (
    <motion.div
      className="omni-code-card"
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, ease: [0.2, 0.7, 0.2, 1], delay: 0.15 }}
    >
      <div className="omni-code-aura" aria-hidden />
      <div className="omni-code-topbar">
        <div className="omni-code-dots">
          <span className="omni-code-dot omni-dot-red" />
          <span className="omni-code-dot omni-dot-yellow" />
          <span className="omni-code-dot omni-dot-green" />
        </div>
        <div className="omni-code-tab">
          <span className="omni-code-tab-ico">☕</span>
          <span>OmniLearn.java</span>
        </div>
        <div className="omni-code-meta">UTF-8 · Java 21</div>
      </div>

      <div className="omni-code-body">
        <div className="omni-code-gutter" aria-hidden>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <pre className="omni-code">
          <code>
            <span className="omni-line">
              <span className="t-k">public</span>{" "}
              <span className="t-k">class</span>{" "}
              <span className="t-c">OmniLearn</span>{" "}
              <span className="t-p">{"{"}</span>
            </span>
            {"\n"}
            <span className="omni-line">
              {"    "}
              <span className="t-k">public</span>{" "}
              <span className="t-k">static</span>{" "}
              <span className="t-k">void</span>{" "}
              <span className="t-f">main</span>
              <span className="t-p">(</span>
              <span className="t-k">String</span>
              <span className="t-p">[]</span>{" "}
              <span className="t-v">args</span>
              <span className="t-p">)</span>{" "}
              <span className="t-p">{"{"}</span>
            </span>
            {"\n"}
            <span className="omni-line">
              {"        "}
              <span className="t-c">System</span>
              <span className="t-p">.</span>
              <span className="t-fl">out</span>
              <span className="t-p">.</span>
              <span className="t-f">println</span>
              <span className="t-p">(</span>
              <span className="t-s">"Welcome to Omni Learn"</span>
              <span className="t-p">);</span>
              <span className="omni-caret" aria-hidden />
            </span>
            {"\n"}
            <span className="omni-line">
              {"    "}
              <span className="t-p">{"}"}</span>
            </span>
            {"\n"}
            <span className="omni-line">
              <span className="t-p">{"}"}</span>
            </span>
          </code>
        </pre>
      </div>

      <div className="omni-code-statusbar">
        <span className="omni-code-status-dot" />
        <span>main</span>
        <span className="omni-code-sep">·</span>
        <span>Ln 3, Col 38</span>
        <span className="omni-code-sep">·</span>
        <span>Spaces: 4</span>
        <span className="omni-code-spacer" />
        <span className="omni-code-badge">✓ Compiled</span>
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const particles = useMemo(() => makeParticles(32), []);

  return (
    <section className="omni-hero">
      <div className="omni-hero-grid" aria-hidden />
      <div className="omni-hero-glow" aria-hidden />
      <div className="omni-hero-particles" aria-hidden>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className={`omni-particle omni-particle-${p.color}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -50, 0],
              x: [0, p.drift, 0],
              opacity: [0.15, 0.9, 0.15],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <CodeEditor />

      <motion.p
        className="omni-hero-subtitle"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.55 }}
      >
        Master programming by solving real coding challenges every day.
      </motion.p>

      <motion.div
        className="omni-hero-cta"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.72, duration: 0.55 }}
      >
        <button className="omni-btn-primary" onClick={() => navigate("/problems")}>
          Start Solving
          <ArrowRight size={16} />
        </button>
        <button className="omni-btn-secondary" onClick={() => navigate("/problems")}>
          Explore Problems
        </button>
      </motion.div>
    </section>
  );
}
