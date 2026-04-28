import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, Space, Table, Tag, Tabs, message } from "antd";
import { ForkOutlined, PlusOutlined, RobotOutlined, SearchOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";

const API = "http://localhost:5000/api/ai/ai";
const ADMIN_API = "http://localhost:5000/api/admin";
const DIFFS = ["Easy", "Medium", "Hard"];

function getUser() {
  try { return JSON.parse(Cookies.get("user") || "{}"); } catch { return {}; }
}

const STATUS_COLOR = { published: "green", draft: "orange", review: "blue", archived: "default" };
const DIFF_COLOR   = { Easy: "green", Medium: "orange", Hard: "red" };

// ── Browse tab ────────────────────────────────────────────────────────────────
function BrowseTab({ moduleId }) {
  const user = getUser();
  const navigate = useNavigate();
  const [problems, setProblems]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [forking, setForking]     = useState(null);

  useEffect(() => {
    fetch(`${API}/getallproblems?status=published`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setProblems(Array.isArray(d) ? d : []))
      .catch(() => setProblems([]))
      .finally(() => setLoading(false));
  }, []);

  async function forkIntoModule(id) {
    setForking(id);
    try {
      const res = await fetch(`${API}/problems/${id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, createdBy: user.id || null }),
      });
      if (!res.ok) throw new Error();
      const { forkedProblem, original } = await res.json();
      message.success("Forked! Opening editor pre-filled with the original…");
      navigate(`/problems/create?edit=${forkedProblem.id}&source=${original.id}&moduleId=${moduleId}`);
    } catch {
      message.error("Error forking problem");
    } finally {
      setForking(null);
    }
  }

  const filtered = problems.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (t, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{t}</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{r.category}</span>
          {r.forkedFrom && <Tag style={{ fontSize: 10 }}>fork of {r.forkedFrom}</Tag>}
        </Space>
      ),
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      key: "difficulty",
      width: 90,
      render: d => <Tag color={DIFF_COLOR[d]}>{d}</Tag>,
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      render: tags => (tags || []).slice(0, 3).map(t => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>),
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_, r) => (
        <Button
          size="small"
          icon={<ForkOutlined />}
          loading={forking === r.id}
          onClick={() => forkIntoModule(r.id)}
        >
          Fork & Customize
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search global problems…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12, maxWidth: 360 }}
        allowClear
      />
      <Table
        loading={loading}
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}

// ── Create tab ────────────────────────────────────────────────────────────────
function CreateTab({ moduleId }) {
  const user = getUser();
  const dupTimer = useRef(null);
  const [form, setForm] = useState({
    title: "", difficulty: "Easy", category: "", tags: "",
    descriptionText: "", constraints: "", hints: "",
  });
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function checkDup(title) {
    if (!title.trim()) return setDupWarning(null);
    try {
      const res = await fetch(`${API}/problems/check-duplicate?title=${encodeURIComponent(title)}`);
      if (res.ok) setDupWarning(await res.json());
    } catch { /* ignore */ }
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.category.trim()) return message.error("Title and category are required");
    if (dupWarning?.isDuplicate) return message.error("A problem with this title already exists");
    setSaving(true);
    try {
      const res = await fetch(`${API}/problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          difficulty: form.difficulty,
          category: form.category.trim(),
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
          description: { text: form.descriptionText.trim(), notes: [] },
          constraints: form.constraints.split("\n").map(c => c.trim()).filter(Boolean),
          hints: form.hints.split("\n").map(h => h.trim()).filter(Boolean),
          examples: [],
          starterCode: { javascript: "", python: "", java: "" },
          expectedOutput: { javascript: "", python: "", java: "" },
          scope: "module",
          moduleId: moduleId ? parseInt(moduleId) : null,
          createdBy: user.id || null,
        }),
      });
      if (!res.ok) throw new Error();
      message.success("Problem created and published!");
      setForm({ title: "", difficulty: "Easy", category: "", tags: "", descriptionText: "", constraints: "", hints: "" });
      setDupWarning(null);
    } catch {
      message.error("Error creating problem");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <Input
            value={form.title}
            onChange={e => { setF("title", e.target.value); clearTimeout(dupTimer.current); dupTimer.current = setTimeout(() => checkDup(e.target.value), 600); }}
            placeholder="Two Sum"
            status={dupWarning?.isDuplicate ? "error" : ""}
          />
          {dupWarning?.isDuplicate && <span style={{ color: "#ef4444", fontSize: 12 }}>Title already exists</span>}
          {!dupWarning?.isDuplicate && dupWarning?.matches?.length > 0 && (
            <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>Similar: {dupWarning.matches.map(m => m.title).join(", ")}</div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Category *</label>
          <Input value={form.category} onChange={e => setF("category", e.target.value)} placeholder="Array • Hash Table" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Difficulty</label>
          <Select value={form.difficulty} onChange={v => setF("difficulty", v)} style={{ width: "100%" }} options={DIFFS.map(d => ({ value: d, label: d }))} />
        </div>
        <div>
          <label style={labelStyle}>Tags (comma-separated)</label>
          <Input value={form.tags} onChange={e => setF("tags", e.target.value)} placeholder="array, sorting" />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Description</label>
        <Input.TextArea rows={4} value={form.descriptionText} onChange={e => setF("descriptionText", e.target.value)} placeholder="Describe the problem…" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Constraints (one per line)</label>
          <Input.TextArea rows={3} value={form.constraints} onChange={e => setF("constraints", e.target.value)} placeholder={"1 ≤ n ≤ 10⁴"} />
        </div>
        <div>
          <label style={labelStyle}>Hints (one per line)</label>
          <Input.TextArea rows={3} value={form.hints} onChange={e => setF("hints", e.target.value)} placeholder={"Try a hash map"} />
        </div>
      </div>

      <Button type="primary" icon={<PlusOutlined />} loading={saving} onClick={handleCreate} disabled={dupWarning?.isDuplicate}>
        Create & Publish
      </Button>
    </div>
  );
}

// ── Generate tab ──────────────────────────────────────────────────────────────
function GenerateTab({ moduleId }) {
  const user = getUser();
  const [topic, setTopic]       = useState("");
  const [diff, setDiff]         = useState(undefined);
  const [count, setCount]       = useState(1);
  const [generating, setGen]    = useState(false);
  const [drafts, setDrafts]     = useState([]);
  const [savingId, setSavingId] = useState(null);

  async function generate() {
    if (!topic.trim()) return message.error("Enter a topic");
    setGen(true);
    setDrafts([]);
    try {
      const res = await fetch(`${API}/problems/generate-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), difficulty: diff, count }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDrafts(Array.isArray(data) ? data : [data]);
    } catch {
      message.error("Generation failed");
    } finally {
      setGen(false);
    }
  }

  async function saveDraft(draft, idx) {
    setSavingId(idx);
    try {
      const res = await fetch(`${API}/problems/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: { ...draft, scope: "module", moduleId: moduleId ? parseInt(moduleId) : null },
          createdBy: user.id || null,
        }),
      });
      if (!res.ok) throw new Error();
      message.success(`"${draft.title}" saved as draft`);
      setDrafts(prev => prev.filter((_, i) => i !== idx));
    } catch {
      message.error("Error saving draft");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>Topic</label>
          <Input value={topic} onChange={e => setTopic(e.target.value)} onPressEnter={generate} placeholder="Binary Trees, Graph BFS…" />
        </div>
        <div>
          <label style={labelStyle}>Difficulty</label>
          <Select allowClear placeholder="Any" value={diff} onChange={setDiff} style={{ width: 120 }} options={DIFFS.map(d => ({ value: d, label: d }))} />
        </div>
        <div>
          <label style={labelStyle}>Count</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 3, 5].map(n => (
              <Button key={n} size="small" type={count === n ? "primary" : "default"} onClick={() => setCount(n)}>{n}</Button>
            ))}
          </div>
        </div>
        <Button type="primary" icon={<RobotOutlined />} loading={generating} onClick={generate}>
          Generate {count} draft{count > 1 ? "s" : ""}
        </Button>
      </div>

      {drafts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>{drafts.length} draft{drafts.length > 1 ? "s" : ""} — review and save the ones you want</span>
          {drafts.map((draft, i) => (
            <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, background: "#fafbfc" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>Draft {i + 1}</span>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{draft.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{draft.category}</div>
                </div>
                <Tag color={DIFF_COLOR[draft.difficulty]}>{draft.difficulty}</Tag>
              </div>
              <p style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>{draft.description?.text}</p>
              {draft.examples?.length > 0 && (
                <div style={{ background: "#f3f4f6", borderRadius: 6, padding: "6px 10px", fontFamily: "monospace", fontSize: 12, marginBottom: 8 }}>
                  in: {draft.examples[0].input} → out: {draft.examples[0].output}
                </div>
              )}
              {(draft.tags || []).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {draft.tags.slice(0, 4).map(t => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>)}
                </div>
              )}
              <Space>
                <Button size="small" danger onClick={() => setDrafts(prev => prev.filter((_, idx) => idx !== i))}>Discard</Button>
                <Button size="small" type="primary" loading={savingId === i} onClick={() => saveDraft(draft, i)}>Save as Draft</Button>
              </Space>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ModuleProblemsTab({ moduleId }) {
  return (
    <Tabs
      defaultActiveKey="browse" 
      items={[
        {
          key: "browse",
          label: <Space><SearchOutlined /> Browse Global Bank</Space>,
          children: <BrowseTab moduleId={moduleId} />,
        },
        {
          key: "create",
          label: <Space><PlusOutlined /> Create</Space>,
          children: <CreateTab moduleId={moduleId} />,
        },
        {
          key: "generate",
          label: <Space><RobotOutlined /> Generate with AI</Space>,
          children: <GenerateTab moduleId={moduleId} />,
        },
      ]}
    />
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 };
