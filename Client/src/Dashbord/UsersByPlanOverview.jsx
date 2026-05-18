import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar, Button, Card, Col, Descriptions, Form, Input, Modal, Row, Segmented,
  Select, Space, Statistic, Table, Tag, Typography, message,
} from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import dayjs from "dayjs";
import Cookies from "js-cookie";
import { fetchUsersOverview } from "../Admin/planApi";

// Endpoint partagé pour update un user (déjà existant côté backend).
const API_BASE = "http://localhost:5000/api";
const updateUser = async (id, payload) => {
  const token = Cookies.get("token");
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Update failed (${res.status})`);
  }
  return res.json();
};

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// USERS BY PLAN — VUE RICHE pour le dashboard /users
//
// Cette page montre :
//   1) 4 cartes de compteurs (free / pro / institution / total)
//   2) 3 charts Recharts : users par plan, langages utilisés, top solvers
//   3) Un filtre par plan
//   4) Un tableau d'utilisateurs avec ligne dépliable qui affiche
//      tous les détails du user (et les stats de son institution s'il
//      est institution_admin).
// ─────────────────────────────────────────────────────────────────────────────

// Couleurs partagées avec les charts pour rester cohérent visuellement.
const PLAN_COLOR = { free: "#9CA3AF", pro: "#1677ff", institution: "#722ed1" };
const PLAN_TAG_COLOR = { free: "default", pro: "blue", institution: "purple" };
const ROLE_COLOR = {
  admin: "red",
  institution_admin: "magenta",
  teacher: "blue",
  student: "green",
};
// Palette pour le pie chart des langages.
const LANG_PALETTE = ["#1677ff", "#52c41a", "#faad14", "#722ed1", "#eb2f96", "#13c2c2", "#fa541c"];

const UsersByPlanOverview = () => {
  // État principal : data renvoyée par l'API + filtre sélectionné.
  const [data, setData] = useState({ counts: {}, users: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // ── État du modal d'édition ─────────────────────────────────────────────
  // Quand `editing` est null → modal fermé. Sinon → modal ouvert pour ce user.
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // ÉTAPE 1 : on charge tout en une fois (plus simple que plusieurs appels).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchUsersOverview();
        if (alive) setData(res);
      } catch (err) {
        message.error(err.message || "Failed to load users");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ÉTAPE 2 : on filtre côté client (rapide, pas besoin d'un nouvel appel API).
  const filteredUsers = useMemo(() => {
    if (filter === "all") return data.users;
    return data.users.filter((u) => u.plan === filter);
  }, [data.users, filter]);

  // ÉTAPE 3 : on construit les datasets pour Recharts.
  const planChartData = [
    { name: "Free", value: data.counts.free || 0, fill: PLAN_COLOR.free },
    { name: "Pro", value: data.counts.pro || 0, fill: PLAN_COLOR.pro },
    { name: "Institution", value: data.counts.institution || 0, fill: PLAN_COLOR.institution },
  ];
  const languageChartData = data.stats?.languageStats || [];
  const topSolversData = data.stats?.topSolvers || [];

  // Users par rôle (admin / institution_admin / teacher / student).
  // On parcourt la liste UNE seule fois pour construire les compteurs.
  const roleChartData = useMemo(() => {
    const buckets = { admin: 0, institution_admin: 0, teacher: 0, student: 0 };
    for (const u of data.users) buckets[u.role] = (buckets[u.role] || 0) + 1;
    return [
      { name: "Admin", value: buckets.admin, fill: "#ff4d4f" },
      { name: "Institution admin", value: buckets.institution_admin, fill: "#eb2f96" },
      { name: "Teacher", value: buckets.teacher, fill: "#1677ff" },
      { name: "Student", value: buckets.student, fill: "#52c41a" },
    ];
  }, [data.users]);

  // Users vérifiés vs non vérifiés (pour le pie chart).
  const verifiedChartData = useMemo(() => {
    const verified = data.users.filter((u) => u.isEmailVerified).length;
    const unverified = data.users.length - verified;
    return [
      { name: "Verified", value: verified, fill: "#52c41a" },
      { name: "Not verified", value: unverified, fill: "#ff4d4f" },
    ];
  }, [data.users]);

  // ÉTAPE 4 : colonnes du tableau (vue résumée).
  const columns = [
    {
      title: "",
      key: "avatar",
      width: 56,
      render: (_, u) => (
        <Avatar src={u.avatar || undefined} icon={<UserOutlined />} />
      ),
    },
    {
      title: "Name",
      key: "name",
      render: (_, u) => `${u.firstname} ${u.lastname}`,
    },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (r) => <Tag color={ROLE_COLOR[r]}>{r.replace("_", " ")}</Tag>,
    },
    {
      title: "Plan",
      dataIndex: "plan",
      key: "plan",
      render: (p) => <Tag color={PLAN_TAG_COLOR[p]}>{p}</Tag>,
    },
    {
      title: "Institution",
      dataIndex: "institutionName",
      key: "institutionName",
      render: (n) => n || <Text type="secondary">—</Text>,
    },
    {
      title: "Solved",
      dataIndex: "solvedCount",
      key: "solvedCount",
      sorter: (a, b) => a.solvedCount - b.solvedCount,
    },
    {
      title: "Submissions",
      dataIndex: "submissionCount",
      key: "submissionCount",
      sorter: (a, b) => a.submissionCount - b.submissionCount,
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => dayjs(d).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    // ÉTAPE 6 : actions sur la ligne. `onClick` stoppe la propagation pour
    // éviter que la ligne se déplie en même temps qu'on clique sur "Edit".
    {
      title: "Actions",
      key: "actions",
      render: (_, u) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(u)}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  // ── ÉDITION D'UN USER ───────────────────────────────────────────────────
  // ÉTAPE 1 : on ouvre le modal en pré-remplissant le formulaire avec les
  // valeurs actuelles du user.
  const openEdit = (user) => {
    setEditing(user);
    form.setFieldsValue({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      plan: user.plan,
      isActive: user.isActive,
    });
  };

  // ÉTAPE 2 : on appelle l'API /users/:id, puis on met à jour la ligne
  // localement (mise à jour optimiste — pas besoin de re-fetch toute la liste).
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const updated = await updateUser(editing.id, values);
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === editing.id ? { ...u, ...updated } : u
        ),
      }));
      message.success("User updated");
      setEditing(null);
      form.resetFields();
    } catch (err) {
      if (err?.errorFields) return; // Erreur de validation antd → pas de toast.
      message.error(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // ÉTAPE 5 : ligne dépliable → affiche le détail complet d'un user
  // (et, pour un institution_admin, les chiffres de son école).
  const expandedRowRender = (u) => (
    <Descriptions
      size="small"
      bordered
      column={2}
      style={{ background: "#fafafa" }}
      labelStyle={{ width: 200, fontWeight: 500 }}
    >
      <Descriptions.Item label="Full name">{u.firstname} {u.lastname}</Descriptions.Item>
      <Descriptions.Item label="Email">{u.email}</Descriptions.Item>
      <Descriptions.Item label="Role">
        <Tag color={ROLE_COLOR[u.role]}>{u.role.replace("_", " ")}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Plan">
        <Tag color={PLAN_TAG_COLOR[u.plan]}>{u.plan}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Account created">
        {dayjs(u.createdAt).format("YYYY-MM-DD HH:mm")}
      </Descriptions.Item>
      <Descriptions.Item label="Joined plan on">
        {u.planJoinedAt ? dayjs(u.planJoinedAt).format("YYYY-MM-DD HH:mm") : "—"}
      </Descriptions.Item>
      <Descriptions.Item label="Institution">
        {u.institutionName || <Text type="secondary">Not in any institution</Text>}
      </Descriptions.Item>
      <Descriptions.Item label="Active">
        <Tag color={u.isActive ? "success" : "default"}>{u.isActive ? "Yes" : "No"}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Submissions made">{u.submissionCount}</Descriptions.Item>
      <Descriptions.Item label="Problems solved">{u.solvedCount}</Descriptions.Item>

      {/* Bloc institution_admin uniquement : stats de leur école. */}
      {u.adminInfo && (
        <>
          <Descriptions.Item label="Members in institution">
            {u.adminInfo.institutionMemberCount}
          </Descriptions.Item>
          <Descriptions.Item label="Teachers in institution">
            {u.adminInfo.institutionTeacherCount}
          </Descriptions.Item>
          <Descriptions.Item label="Classrooms in institution">
            {u.adminInfo.institutionClassroomCount}
          </Descriptions.Item>
        </>
      )}
    </Descriptions>
  );

  return (
    <div>
      {/* ÉTAPE 1 : 4 cartes — un coup d'œil rapide. */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Free" value={data.counts.free || 0} valueStyle={{ color: PLAN_COLOR.free }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Pro" value={data.counts.pro || 0} valueStyle={{ color: PLAN_COLOR.pro }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Institution" value={data.counts.institution || 0} valueStyle={{ color: PLAN_COLOR.institution }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Total users" value={data.counts.total || 0} />
          </Card>
        </Col>
      </Row>

      {/* ÉTAPE 2 : Charts Recharts. */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Bar chart : nombre d'utilisateurs par plan. */}
        <Col xs={24} md={8}>
          <Card title="Users by plan">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={planChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Users">
                  {planChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Bar chart : top 10 utilisateurs ayant résolu le plus de problèmes (global). */}
        <Col xs={24} md={8}>
          <Card title="Top solvers (global)">
            {topSolversData.length === 0 ? (
              <Text type="secondary">No solved problems yet.</Text>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topSolversData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="solved" fill="#52c41a" name="Solved" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Pie chart : langages les plus utilisés à travers tous les users. */}
        <Col xs={24} md={8}>
          <Card title="Most used languages (global)">
            {languageChartData.length === 0 ? (
              <Text type="secondary">No submissions yet.</Text>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={languageChartData}
                    dataKey="count"
                    nameKey="language"
                    outerRadius={90}
                    label={(e) => e.language}
                  >
                    {languageChartData.map((entry, idx) => (
                      <Cell key={idx} fill={LANG_PALETTE[idx % LANG_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* ÉTAPE 2bis : 2 charts supplémentaires demandés
          - Users by Role (bar chart)
          - Users by Email Verified (pie chart) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Users by role">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={roleChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Users">
                  {roleChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Users by email verification">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={verifiedChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  // On affiche le nom + le total directement sur la part.
                  label={(e) => `${e.name}: ${e.value}`}
                >
                  {verifiedChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Carte avec total submissions / solved (pour donner du contexte aux charts). */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Total submissions (global)"
              value={data.stats?.totalSubmissions || 0}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Problems solved (global)"
              value={data.stats?.totalSolved || 0}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* ÉTAPE 3 : filtre + tableau. */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>Users by plan</Title>
        <Text type="secondary">Click a row to see all the user details.</Text>
        <div style={{ marginTop: 12 }}>
          <Segmented
            options={[
              { label: "All", value: "all" },
              { label: "Free", value: "free" },
              { label: "Pro", value: "pro" },
              { label: "Institution", value: "institution" },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={filteredUsers}
        columns={columns}
        pagination={{ pageSize: 10 }}
        // Une seule ligne dépliée à la fois → garde le visuel propre.
        expandable={{ expandedRowRender, expandRowByClick: true }}
      />

      {/* ─── MODAL D'ÉDITION ───────────────────────────────────────────────
          L'admin peut modifier les infos de base + le ROLE et le PLAN.
          Le passage à un autre plan met automatiquement à jour
          `planJoinedAt` côté serveur. */}
      <Modal
        title={editing ? `Edit ${editing.firstname} ${editing.lastname}` : "Edit user"}
        open={!!editing}
        onCancel={() => { setEditing(null); form.resetFields(); }}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Save"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstname"
                label="First name"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="lastname"
                label="Last name"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input />
          </Form.Item>

          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "admin", label: "Admin" },
                    { value: "institution_admin", label: "Institution admin" },
                    { value: "teacher", label: "Teacher" },
                    { value: "student", label: "Student" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {/* Plan = promotion directe. L'admin peut basculer un user
                  entre Free / Pro / Institution. */}
              <Form.Item name="plan" label="Plan" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "free", label: "Free" },
                    { value: "pro", label: "Pro" },
                    { value: "institution", label: "Institution" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isActive" label="Status">
            <Select
              options={[
                { value: true, label: "Active" },
                { value: false, label: "Inactive" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersByPlanOverview;
