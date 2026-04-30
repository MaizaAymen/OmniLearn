import React, { useEffect, useMemo, useState } from "react";
import { Card, Input, Switch, Table, Tag, Typography, message } from "antd";
import { fetchAllProblems, setProblemFreeTier } from "./planApi";

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// FREE-TIER MANAGER
// L'admin coche/décoche les problèmes qui sont visibles aux utilisateurs free.
// Si on a 10 cochés → les free voient 10. Si l'admin en coche un de plus → 11.
// ─────────────────────────────────────────────────────────────────────────────
const FreeTierTab = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ÉTAPE 1 : on charge la liste de tous les problèmes au montage.
  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllProblems();
      setProblems(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // ÉTAPE 2 : toggle local optimiste + appel backend.
  const onToggle = async (id, checked) => {
    setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, isFreeTier: checked } : p)));
    try {
      await setProblemFreeTier(id, checked);
      message.success(checked ? "Added to free tier" : "Removed from free tier");
    } catch (err) {
      message.error(err.message);
      // ÉTAPE 3 : si l'API échoue, on revient à l'état précédent.
      setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, isFreeTier: !checked } : p)));
    }
  };

  // Filtre par titre.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(
      (p) => p.title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }, [problems, search]);

  // Compteur affiché en haut : "X / Y problèmes en free tier".
  const freeCount = problems.filter((p) => p.isFreeTier).length;

  const columns = [
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Category", dataIndex: "category", key: "category" },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      key: "difficulty",
      render: (d) => {
        const color = d === "Easy" ? "green" : d === "Medium" ? "orange" : "red";
        return <Tag color={color}>{d}</Tag>;
      },
    },
    {
      title: "Free tier",
      dataIndex: "isFreeTier",
      key: "isFreeTier",
      render: (val, row) => (
        <Switch checked={!!val} onChange={(checked) => onToggle(row.id, checked)} />
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Free Tier Manager</Title>
        <Text type="secondary">
          Pick which problems users on the <b>Free</b> plan can solve. Currently
          showing <b>{freeCount}</b> free-tier problem{freeCount === 1 ? "" : "s"}.
        </Text>
      </Card>

      <Input.Search
        placeholder="Search by title or category"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 400 }}
        allowClear
      />

      <Table
        rowKey="id"
        loading={loading}
        dataSource={filtered}
        columns={columns}
        pagination={{ pageSize: 15 }}
      />
    </div>
  );
};

export default FreeTierTab;
