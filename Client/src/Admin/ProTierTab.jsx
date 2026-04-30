import React, { useEffect, useMemo, useState } from "react";
import { Card, Input, Switch, Table, Tag, Typography, message } from "antd";
import { fetchAllProblems, setProblemProTier } from "./planApi";

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// PRO TIER MANAGER
// L'admin coche/décoche les problèmes visibles aux utilisateurs "pro".
// Pro voit aussi les problèmes "free" → ici on gère uniquement le bonus Pro.
// ─────────────────────────────────────────────────────────────────────────────
const ProTierTab = () => {
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
    setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, isProTier: checked } : p)));
    try {
      await setProblemProTier(id, checked);
      message.success(checked ? "Added to pro tier" : "Removed from pro tier");
    } catch (err) {
      message.error(err.message);
      // ÉTAPE 3 : rollback en cas d'erreur.
      setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, isProTier: !checked } : p)));
    }
  };

  // Filtre par titre / catégorie.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(
      (p) => p.title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }, [problems, search]);

  // Compteur affiché en haut.
  const proCount = problems.filter((p) => p.isProTier).length;

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
      title: "Pro tier",
      dataIndex: "isProTier",
      key: "isProTier",
      render: (val, row) => (
        <Switch checked={!!val} onChange={(checked) => onToggle(row.id, checked)} />
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Pro Tier Manager</Title>
        <Text type="secondary">
          Pick which problems users on the <b>Pro</b> plan can solve. Currently
          showing <b>{proCount}</b> pro-tier problem{proCount === 1 ? "" : "s"}.
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

export default ProTierTab;
