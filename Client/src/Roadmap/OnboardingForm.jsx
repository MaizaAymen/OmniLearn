import React, { useState } from "react";

const SUGGESTED_INTERESTS = [
  "React", "Backend", "AI", "DevOps", "Algorithms", "Databases",
  "System Design", "Mobile", "Security", "Frontend", "Cloud", "Testing",
];
const SUGGESTED_LANGS = [
  "JavaScript", "TypeScript", "Python", "Go", "Java", "C#", "Rust", "PHP", "SQL",
];
const SUGGESTED_PROBLEMS = [
  "JWT authentication", "Recursion", "React state management",
  "Async/await", "SQL joins", "Memory leaks", "REST API design",
  "Regex", "CORS", "Race conditions", "Closures", "TypeScript generics",
];

export default function OnboardingForm({ initial, onSubmit, submitting }) {
  const [careerGoal, setCareerGoal] = useState(initial?.careerGoal || "");
  const [interests, setInterests] = useState(initial?.interests || []);
  const [langs, setLangs] = useState(initial?.programmingLanguages || []);
  const [problems, setProblems] = useState(initial?.problems || []);
  const [customProblem, setCustomProblem] = useState("");

  const toggle = (arr, setArr, v) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const addProblem = () => {
    const v = customProblem.trim();
    if (v && !problems.includes(v)) setProblems([...problems, v]);
    setCustomProblem("");
  };

  const submit = () => {
    if (!careerGoal.trim()) return alert("Please set a career goal.");
    if (!interests.length) return alert("Pick at least one interest.");
    if (!langs.length) return alert("Pick at least one language.");
    onSubmit({
      careerGoal: careerGoal.trim(),
      interests,
      programmingLanguages: langs,
      problems,
    });
  };

  return (
    <div style={{ background: "#FFFFFF", borderTop: "2px solid #10162F" }}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div style={{
          background: "#FFF7F0", border: "2px solid #10162F",
          borderRadius: 12, padding: 32,
        }}>
          <h2 className="font-bold mb-2" style={{ fontSize: "1.8rem", color: "#10162F", letterSpacing: "-0.01em" }}>
            Tell us about you
          </h2>
          <p style={{ color: "#3D4168", marginBottom: 28, fontSize: 15, lineHeight: 1.6 }}>
            Pick your goal, your stack, and the problems you keep getting stuck on.
            We'll build a pyramid of practical challenges tuned to your weak spots.
          </p>

          <Field label="🎯 Career goal">
            <input
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="e.g. Full Stack MERN Developer"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3A10E5")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#10162F")}
            />
          </Field>

          <Field label="✨ Interests">
            <div>
              {SUGGESTED_INTERESTS.map((s) => (
                <span key={s} className={`rm-chip ${interests.includes(s) ? "active" : ""}`} onClick={() => toggle(interests, setInterests, s)}>
                  {s}
                </span>
              ))}
            </div>
          </Field>

          <Field label="💻 Programming languages">
            <div>
              {SUGGESTED_LANGS.map((s) => (
                <span key={s} className={`rm-chip ${langs.includes(s) ? "active" : ""}`} onClick={() => toggle(langs, setLangs, s)}>
                  {s}
                </span>
              ))}
            </div>
          </Field>

          <Field label="🐞 Problems / weaknesses you want to fix">
            <div style={{ marginBottom: 12 }}>
              {SUGGESTED_PROBLEMS.map((s) => (
                <span key={s} className={`rm-chip ${problems.includes(s) ? "active" : ""}`} onClick={() => toggle(problems, setProblems, s)}>
                  {s}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={customProblem}
                onChange={(e) => setCustomProblem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProblem())}
                placeholder="Add your own (e.g. 'flexbox alignment')"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3A10E5")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#10162F")}
              />
              <button onClick={addProblem} className="rm-btn ghost">Add</button>
            </div>
            {problems.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {problems.map((p) => (
                  <span key={p} className="rm-chip active" onClick={() => setProblems(problems.filter((x) => x !== p))} title="click to remove">
                    {p} ✕
                  </span>
                ))}
              </div>
            )}
          </Field>

          <button onClick={submit} disabled={submitting} className="rm-btn" style={{ marginTop: 14, padding: "12px 24px", fontSize: 14 }}>
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating your pyramid…
              </>
            ) : (
              <>⚡ Generate my roadmap →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "#FFFFFF",
  border: "2px solid #10162F",
  borderRadius: 8,
  color: "#10162F",
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  transition: "border-color 150ms",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ display: "block", color: "#10162F", fontSize: 14, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.005em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
