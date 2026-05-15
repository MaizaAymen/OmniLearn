import React, { useEffect, useState } from "react";
import {
  Button, Card, Col, Drawer, Empty, Form, Input, InputNumber, List, Modal,
  Popconfirm, Progress, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message,
} from "antd";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
// Icons used by the Institution Problem Bank tabs (create / fork / search / edit)
import { PlusOutlined, ForkOutlined, SearchOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
// useNavigate lets the panel open the SAME admin /problems/create page (locked to institution scope)
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

// Palette partagée avec /users pour rester cohérent visuellement.
const CHART_PALETTE = ["#1677ff", "#52c41a", "#faad14", "#722ed1", "#eb2f96", "#13c2c2", "#fa541c"];
const SEAT_COLORS = { used: "#1677ff", free: "#f0f0f0", over: "#ff4d4f" };
import {
  createInviteLink, fetchInviteLinks, fetchInstitutionMembers, revokeInviteLink, inviteUserByEmail, searchUsers,
  // Note: legacy planApi problem helpers were replaced by direct calls to
  // /api/ai/ai (same routes the admin Problem Bank uses) so the institution
  // panel supports manual create, AI generate, and forking like the admin.
  fetchInstitution, updateInstitution,
  fetchInstitutionStats, fetchInstitutionClassrooms, fetchClassroomAudit,
  setClassroomActive, removeMember,
  fetchAnnouncements, createAnnouncement, deleteAnnouncement, fetchAnalytics,
  fetchInstitutionGrades, createInstitutionGrade, updateInstitutionGrade, deleteInstitutionGrade,
  fetchInstitutionSpecialities, createInstitutionSpeciality, updateInstitutionSpeciality, deleteInstitutionSpeciality,
  fetchInstitutionLevels, createInstitutionLevel, updateInstitutionLevel, deleteInstitutionLevel,
  seedInstitutionCurriculum,
} from "./planApi";

// Vue institution_admin : command center complet pour gérer son école.
const getInstitutionId = () => {
  try { return JSON.parse(Cookies.get("user") || "null")?.institutionId || null; }
  catch { return null; }
};

const inviteUrl = (token) => `${window.location.origin}/join-institution/${token}`;

const InstitutionTab = () => {
  const id = getInstitutionId();
  if (!id) return <Empty description="You are not linked to any institution." />;

  return (
    <Tabs
      defaultActiveKey="overview"
      items={[
        { key: "overview", label: "Overview", children: <OverviewPanel id={id} /> },
        { key: "classrooms", label: "Classrooms", children: <ClassroomsPanel id={id} /> },
        { key: "teachers", label: "Teachers", children: <MembersPanel id={id} role="teacher" /> },
        { key: "students", label: "Students", children: <MembersPanel id={id} role="student" /> },
        { key: "invites", label: "Invites", children: <InvitesPanel id={id} /> },
        { key: "announcements", label: "Announcements", children: <AnnouncementsPanel id={id} /> },
        { key: "analytics", label: "Analytics", children: <AnalyticsPanel id={id} /> },
        { key: "curriculum", label: "Curriculum", children: <CurriculumPanel institutionId={id} /> },
        { key: "problems", label: "Problem Bank", children: <InstitutionProblemsPanel institutionId={id} /> },
        { key: "settings", label: "Settings", children: <SettingsPanel institutionId={id} /> },
      ]}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW : command center (stats + recent activity + quick actions)
// ─────────────────────────────────────────────────────────────────────────────
const OverviewPanel = ({ id }) => {
  const [stats, setStats] = useState(null);
  const [inst, setInst] = useState(null);

  useEffect(() => {
    fetchInstitutionStats(id).then(setStats).catch((e) => message.error(e.message));
    fetchInstitution(id).then(setInst).catch((e) => message.error(e.message));
  }, [id]);

  if (!stats || !inst) return <Card loading />;

  const seatLimit = inst.seatLimit || 0;
  const used = (stats.teacherCount || 0) + (stats.studentCount || 0);
  const seatPct = seatLimit > 0 ? Math.round((used / seatLimit) * 100) : 0;

  const membersChartData = [
    { name: "Classrooms", value: stats.classroomCount || 0, fill: "#722ed1" },
    { name: "Teachers", value: stats.teacherCount || 0, fill: "#1677ff" },
    { name: "Students", value: stats.studentCount || 0, fill: "#52c41a" },
    { name: "Enrollments", value: stats.enrolledCount || 0, fill: "#faad14" },
  ];

  const seatChartData = seatLimit > 0
    ? [
        { name: "Used", value: Math.min(used, seatLimit), fill: used >= seatLimit ? SEAT_COLORS.over : SEAT_COLORS.used },
        { name: "Available", value: Math.max(seatLimit - used, 0), fill: SEAT_COLORS.free },
      ]
    : [
        { name: "Teachers", value: stats.teacherCount || 0, fill: "#1677ff" },
        { name: "Students", value: stats.studentCount || 0, fill: "#52c41a" },
      ];

  return (
    <div>
      {/* Quick actions */}
   

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Classrooms" value={stats.classroomCount} /></Card></Col>
        <Col span={6}><Card><Statistic title="Teachers" value={stats.teacherCount} /></Card></Col>
        <Col span={6}><Card><Statistic title="Students" value={stats.studentCount} /></Card></Col>
        <Col span={6}><Card><Statistic title="Enrollments" value={stats.enrolledCount} /></Card></Col>
      </Row>

      {/* Charts : members breakdown + seat usage */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={14}>
          <Card title="Members & activity breakdown">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={membersChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Count">
                  {membersChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card title={seatLimit > 0 ? `Seat usage (${used}/${seatLimit})` : "Members composition"}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={seatChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={(e) => `${e.name}: ${e.value}`}
                >
                  {seatChartData.map((entry, idx) => (
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

      {/* Seat usage progress */}
      <Card title="Seat usage" style={{ marginBottom: 16 }}>
        {seatLimit > 0 ? (
          <>
            <Progress percent={seatPct} status={used >= seatLimit ? "exception" : "active"} />
            <div>{used} / {seatLimit} seats used (students + teachers)</div>
          </>
        ) : (
          <div>{used} members (unlimited)</div>
        )}
      </Card>

      {/* Recent activity */}
      <Card title="Recent activity">
        <List
          dataSource={stats.recentActivity}
          locale={{ emptyText: "No activity yet." }}
          renderItem={(a) => (
            <List.Item>
              <Tag>{a.type.replace(/_/g, " ")}</Tag>
              <span style={{ flex: 1, marginLeft: 8 }}>{a.text}</span>
              <span style={{ color: "#999", fontSize: 12 }}>
                {new Date(a.at).toLocaleString()}
              </span>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CLASSROOMS scoped à l'institution
// ─────────────────────────────────────────────────────────────────────────────
const ClassroomsPanel = ({ id }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [audit, setAudit] = useState(null);

  const load = () => {
    setLoading(true);
    fetchInstitutionClassrooms(id, filters)
      .then(setList)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const openAudit = async (classId) => {
    try { setAudit(await fetchClassroomAudit(id, classId)); }
    catch (err) { message.error(err.message); }
  };

  const toggleArchive = async (c) => {
    try {
      await setClassroomActive(id, c.id, !c.isActive);
      message.success(c.isActive ? "Archived" : "Reactivated");
      load();
    } catch (err) { message.error(err.message); }
  };

  return (
    <div>
      {/* Filtres */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder="Academic year (e.g. 2025-2026)" allowClear
            onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))} />
          <Input placeholder="Teacher ID" allowClear
            onChange={(e) => setFilters((f) => ({ ...f, teacherId: e.target.value }))} />
          <Button onClick={() => setFilters({})}>Reset</Button>
        </Space>
      </Card>

      <Table rowKey="id" dataSource={list} loading={loading} pagination={{ pageSize: 10 }}
        columns={[
          { title: "Name", dataIndex: "name" },
          {
            title: "Teacher",
            render: (_, c) => c.teacher ? `${c.teacher.firstname} ${c.teacher.lastname}` : "—",
          },
          { title: "Year", dataIndex: "academicYear" },
          { title: "Students", dataIndex: "enrollmentCount", align: "right" },
          {
            title: "Activity",
            render: (_, c) => c.isInactive
              ? <Tag color="orange">Inactive {c.daysSince}d</Tag>
              : <Tag color="green">Active</Tag>,
          },
          {
            title: "Status",
            render: (_, c) => c.isActive
              ? <Tag color="blue">Live</Tag>
              : <Tag color="default">Archived</Tag>,
          },
          {
            title: "",
            render: (_, c) => (
              <Space>
                <Button size="small" onClick={() => openAudit(c.id)}>View</Button>
                <Button size="small" onClick={() => toggleArchive(c)}>
                  {c.isActive ? "Archive" : "Reactivate"}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      {/* Audit drawer */}
      <Drawer
        title={audit?.classroom?.name}
        open={!!audit}
        onClose={() => setAudit(null)}
        width={520}
      >
        {audit && (
          <>
            <p><strong>Teacher:</strong> {audit.classroom.teacher
              ? `${audit.classroom.teacher.firstname} ${audit.classroom.teacher.lastname} (${audit.classroom.teacher.email})`
              : "—"}</p>
            <p><strong>Students ({audit.students.length})</strong></p>
            <List
              dataSource={audit.students}
              renderItem={(s) => (
                <List.Item>
                  {s.firstname} {s.lastname} — <span style={{ color: "#999" }}>{s.email}</span>
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS : un panneau par rôle (teacher | student) avec compteurs et remove
// ─────────────────────────────────────────────────────────────────────────────
const MembersPanel = ({ id, role }) => {
  const [members, setMembers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const load = async () => {
    try {
      setMembers(await fetchInstitutionMembers(id));
      setClassrooms(await fetchInstitutionClassrooms(id));
    } catch (err) { message.error(err.message); }
  };
  useEffect(() => { load(); }, [id]);

  const filtered = members.filter((m) => m.role === role);

  // Compteurs : pour profs = combien de classes ils enseignent ;
  // pour étudiants = combien d'inscriptions (enrollmentCount via classes).
  const classCountByTeacher = (uid) => classrooms.filter((c) => c.teacherId === uid).length;
  // Côté étudiant : on n'a pas l'info enrollment ici, on affiche "—" en fallback simple.

  const onRemove = async (uid) => {
    try {
      await removeMember(id, uid);
      message.success("Member removed");
      load();
    } catch (err) { message.error(err.message); }
  };

  return (
    <Table rowKey="id" dataSource={filtered} pagination={{ pageSize: 10 }}
      columns={[
        { title: "Name", render: (_, u) => `${u.firstname} ${u.lastname}` },
        { title: "Email", dataIndex: "email" },
        {
          title: role === "teacher" ? "Classrooms" : "Status",
          render: (_, u) => role === "teacher"
            ? classCountByTeacher(u.id)
            : <Tag color={u.isActive ? "green" : "default"}>{u.isActive ? "Active" : "Inactive"}</Tag>,
        },
        {
          title: "Joined",
          render: (_, u) => new Date(u.createdAt).toLocaleDateString(),
        },
        {
          title: "",
          render: (_, u) => (
            <Popconfirm title={`Remove ${u.firstname} from institution?`} onConfirm={() => onRemove(u.id)}>
              <Button size="small" danger>Remove</Button>
            </Popconfirm>
          ),
        },
      ]}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INVITES : génération + liste de liens (ex-tab "members" sans la liste)
// ─────────────────────────────────────────────────────────────────────────────
const InvitesPanel = ({ id }) => {
  const [links, setLinks] = useState([]);
  const [form] = Form.useForm();
  const [emailForm] = Form.useForm();

  const load = () => fetchInviteLinks(id).then(setLinks).catch((e) => message.error(e.message));
  useEffect(() => { load(); }, [id]);

  const onCreate = async (values) => {
    try {
      await createInviteLink(id, values);
      message.success("Link created");
      form.resetFields();
      load();
    } catch (err) { message.error(err.message); }
  };

  const [userOptions, setUserOptions] = useState([]);
  const [searching, setSearching] = useState(false);

  const onSearch = async (q) => {
    if (!q || q.length < 2) return setUserOptions([]);
    setSearching(true);
    try {
      const users = await searchUsers(q);
      setUserOptions(users.map((u) => ({
        value: u.email,
        label: `${u.firstname} ${u.lastname} — ${u.email}`,
      })));
    } catch { /* ignore */ }
    finally { setSearching(false); }
  };

  const onInviteByEmail = async (values) => {
    try {
      await inviteUserByEmail(id, values);
      message.success(`Invitation sent to ${values.email}`);
      emailForm.resetFields();
      setUserOptions([]);
      load();
    } catch (err) { message.error(err.message); }
  };

  return (
    <div>
      {/* Inviter par recherche nom/email = invitation personnelle + notification */}
      <Card title="Invite a user" style={{ marginBottom: 16 }}>
        <Form form={emailForm} layout="inline" onFinish={onInviteByEmail}
          initialValues={{ role: "student" }}>
          <Form.Item name="email" label="User" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Search by name or email..."
              filterOption={false}
              onSearch={onSearch}
              loading={searching}
              options={userOptions}
              notFoundContent={searching ? "Searching..." : "No users"}
              style={{ width: 320 }}
            />
          </Form.Item>
          <Form.Item name="role" label="Role">
            <Select style={{ width: 140 }} options={[
              { value: "student", label: "Student" },
              { value: "teacher", label: "Teacher" },
            ]} />
          </Form.Item>
          <Button type="primary" htmlType="submit">Send invitation</Button>
        </Form>
      </Card>

      <Card title="Generate invite link" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={onCreate}
          initialValues={{ role: "student", maxUses: 0, expiresInDays: 30 }}>
          <Form.Item name="role" label="Role">
            <Select style={{ width: 140 }} options={[
              { value: "student", label: "Student" },
              { value: "teacher", label: "Teacher" },
            ]} />
          </Form.Item>
          <Form.Item name="maxUses" label="Max uses (0 = ∞)">
            <InputNumber min={0} style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="expiresInDays" label="Expires in (days, 0 = never)">
            <InputNumber min={0} style={{ width: 90 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit">Create</Button>
        </Form>
      </Card>

      <Card title="Invite links">
        <Table rowKey="token" dataSource={links} pagination={false}
          columns={[
            { title: "Role", dataIndex: "role", render: (r) => <Tag>{r}</Tag> },
            {
              title: "URL", dataIndex: "token",
              render: (t) => <a onClick={() => navigator.clipboard.writeText(inviteUrl(t))}>Copy link</a>,
            },
            { title: "Used", render: (_, l) => `${l.usedCount} / ${l.maxUses || "∞"}` },
            {
              title: "Status",
              render: (_, l) => l.revoked
                ? <Tag color="red">Revoked</Tag>
                : <Tag color="green">Active</Tag>,
            },
            {
              title: "",
              render: (_, l) => !l.revoked && (
                <Button size="small" danger onClick={async () => {
                  await revokeInviteLink(l.token); load();
                }}>Revoke</Button>
              ),
            },
          ]} />
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS institution-wide
// ─────────────────────────────────────────────────────────────────────────────
const AnnouncementsPanel = ({ id }) => {
  const [list, setList] = useState([]);
  const [form] = Form.useForm();

  const load = () => fetchAnnouncements(id).then(setList).catch((e) => message.error(e.message));
  useEffect(() => { load(); }, [id]);

  const onPost = async (values) => {
    try {
      await createAnnouncement(id, values);
      message.success("Announcement posted");
      form.resetFields();
      load();
    } catch (err) { message.error(err.message); }
  };

  const onDelete = async (annId) => {
    try { await deleteAnnouncement(id, annId); load(); }
    catch (err) { message.error(err.message); }
  };

  return (
    <div>
      <Card title="Post announcement" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={onPost}
          initialValues={{ targetRole: "all", pinned: false }}>
          <Form.Item name="title" label="Title (optional)"><Input /></Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="targetRole" label="Audience">
            <Select options={[
              { value: "all", label: "Everyone" },
              { value: "students", label: "Students only" },
              { value: "teachers", label: "Teachers only" },
            ]} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="pinned" label="Pinned">
            <Select options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]}
              style={{ width: 120 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit">Post</Button>
        </Form>
      </Card>

      <Card title="Recent announcements">
        <List
          dataSource={list}
          locale={{ emptyText: "No announcements yet." }}
          renderItem={(a) => (
            <List.Item
              actions={[
                <Popconfirm title="Delete?" onConfirm={() => onDelete(a.id)} key="del">
                  <Button size="small" danger>Delete</Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {a.pinned && <Tag color="gold">📌 Pinned</Tag>}
                    <Tag>{a.targetRole}</Tag>
                    <strong>{a.title || "(no title)"}</strong>
                  </Space>
                }
                description={
                  <>
                    <div>{a.content}</div>
                    <div style={{ color: "#999", fontSize: 12 }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsPanel = ({ id }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalytics(id).then(setData).catch((e) => message.error(e.message));
  }, [id]);

  if (!data) return <Card loading />;

  const total = data.submissions.total || 0;
  const correct = data.submissions.correct || 0;
  const incorrect = Math.max(total - correct, 0);

  const submissionsPieData = [
    { name: "Correct", value: correct, fill: "#52c41a" },
    { name: "Incorrect", value: incorrect, fill: "#ff4d4f" },
  ];

  const heatmapChartData = (data.heatmap || []).map((h) => ({
    name: h.name,
    submissions: h.submissions || 0,
    students: h.students || 0,
  }));

  const teacherChartData = (data.teacherActivity || [])
    .slice()
    .sort((a, b) => (b.classCount || 0) - (a.classCount || 0))
    .slice(0, 10)
    .map((t) => ({ name: t.name, classrooms: t.classCount || 0 }));

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card><Statistic title="Total submissions" value={data.submissions.total} /></Card></Col>
        <Col span={8}><Card><Statistic title="Correct submissions" value={data.submissions.correct} /></Card></Col>
        <Col span={8}><Card><Statistic title="Avg completion" value={data.submissions.completionRate} suffix="%" /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Submissions outcome">
            {total === 0 ? (
              <Typography.Text type="secondary">No submissions yet.</Typography.Text>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={submissionsPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label={(e) => `${e.name}: ${e.value}`}
                  >
                    {submissionsPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="Submissions per classroom">
            {heatmapChartData.length === 0 ? (
              <Typography.Text type="secondary">No classroom data yet.</Typography.Text>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={heatmapChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submissions" fill="#722ed1" name="Submissions" />
                  <Bar dataKey="students" fill="#1677ff" name="Students" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Top teachers by classroom count" style={{ marginBottom: 16 }}>
        {teacherChartData.length === 0 ? (
          <Typography.Text type="secondary">No teachers yet.</Typography.Text>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={teacherChartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="classrooms" name="Classrooms">
                {teacherChartData.map((_, idx) => (
                  <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Teacher activity" style={{ marginBottom: 16 }}>
        <Table rowKey="id" dataSource={data.teacherActivity} pagination={false}
          columns={[
            { title: "Name", dataIndex: "name" },
            { title: "Email", dataIndex: "email" },
            { title: "Classrooms", dataIndex: "classCount", align: "right" },
            {
              title: "Last active",
              render: (_, t) => t.lastActiveAt ? new Date(t.lastActiveAt).toLocaleString() : "—",
            },
          ]}
        />
      </Card>

      <Card title="Activity heatmap (submissions per classroom)">
        <Table rowKey="id" dataSource={data.heatmap} pagination={false}
          columns={[
            { title: "Classroom", dataIndex: "name" },
            { title: "Students", dataIndex: "students", align: "right" },
            {
              title: "Submissions",
              render: (_, h) => {
                const max = Math.max(...data.heatmap.map((x) => x.submissions), 1);
                const pct = Math.round((h.submissions / max) * 100);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 120, height: 12,
                      background: `linear-gradient(to right, #722ed1 ${pct}%, #f0f0f0 ${pct}%)`,
                      borderRadius: 4,
                    }} />
                    <span>{h.submissions}</span>
                  </div>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS : éditer le profil de l'institution
// ─────────────────────────────────────────────────────────────────────────────
const SettingsPanel = ({ institutionId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInstitution(institutionId)
      .then((i) => form.setFieldsValue(i))
      .catch((e) => message.error(e.message));
  }, [institutionId]);

  const onSave = async (values) => {
    setLoading(true);
    try {
      await updateInstitution(institutionId, values);
      message.success("Saved");
    } catch (err) { message.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <Card title="Institution profile">
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="type" label="Type">
          <Select options={[
            { value: "school", label: "School" },
            { value: "university", label: "University" },
            { value: "training_center", label: "Training center" },
            { value: "company", label: "Company" },
          ]} />
        </Form.Item>
        <Form.Item name="logo" label="Logo URL"><Input /></Form.Item>
        <Form.Item name="contactEmail" label="Contact email"><Input type="email" /></Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>Save</Button>
      </Form>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM BANK (banque privée de l'institution)
//
// Reuses the SAME admin routes (/api/ai/ai/...) used by the global Problem Bank.
// Everything created / forked here is automatically scoped to "institution" so
// it stays private to this institution's members.
//
// Sub-tabs:
//   1. My Problems       – list, publish, archive, restore, delete
//   2. Create manually   – classic admin manual-create form
//   3. Generate with AI  – topic/difficulty/count → review drafts → save
//   4. Fork from Global  – browse the public global bank and fork into this institution
// ─────────────────────────────────────────────────────────────────────────────

// Same base URL the admin Problem Bank uses
const AI_API = "http://localhost:5000/api/ai/ai";
// Difficulty options reused everywhere in this panel
const DIFFS = ["Easy", "Medium", "Hard"];
const DIFF_COLOR = { Easy: "green", Medium: "orange", Hard: "red" };
const STATUS_COLOR = { published: "green", draft: "orange", review: "blue", archived: "default" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 };

// Read the logged-in user (used for createdBy + institutionId on every request)
const getCurrentUser = () => {
  try { return JSON.parse(Cookies.get("user") || "null") || {}; }
  catch { return {}; }
};
// Auth header builder — required because /getallproblems?scope=institution
// needs to know who is asking to filter by their institution.
const authHeaders = () => {
  const token = localStorage.getItem("token") || Cookies.get("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Sub-tab 1: list this institution's problems with status management ───────
const MyInstProblemsTab = ({ refreshKey }) => {
  // navigate is used by the "Edit" action to open the shared /problems/create page in edit mode
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Loader fetches problems with scope=institution (backend filters by the
  // user's institutionId thanks to optionalAuth on this route)
  const load = () => {
    setLoading(true);
    fetch(`${AI_API}/getallproblems?scope=institution&status=all`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProblems(Array.isArray(d) ? d : []))
      .catch(() => setProblems([]))
      .finally(() => setLoading(false));
  };
  // Re-run on mount + whenever refreshKey changes (after a create/fork/save)
  useEffect(() => { load(); }, [refreshKey]);

  // Toggle published / archived / restore via the same admin status endpoint
  const changeStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${AI_API}/problems/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      message.success(`Problem ${newStatus}`);
      // Optimistic local update — avoids a full refetch
      setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    } catch {
      message.error("Error updating status");
    }
  };

  // Hard delete via the admin endpoint
  const removeProblem = async (id, title) => {
    try {
      const res = await fetch(`${AI_API}/deletepromblem/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      message.success(`"${title}" deleted`);
      setProblems((prev) => prev.filter((p) => p.id !== id));
    } catch {
      message.error("Error deleting problem");
    }
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      render: (t, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{t}</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{r.category}</span>
          {/* Lineage tag when the problem was forked from the global bank */}
          {r.forkedFrom && <Tag style={{ fontSize: 10 }}>forked from: {r.forkedFrom}</Tag>}
        </Space>
      ),
    },
    { title: "Difficulty", dataIndex: "difficulty", width: 100, render: (d) => <Tag color={DIFF_COLOR[d]}>{d}</Tag> },
    { title: "Status", dataIndex: "status", width: 100, render: (s) => <Tag color={STATUS_COLOR[s] || "default"}>{s || "draft"}</Tag> },
    {
      title: "Actions",
      width: 290,
      render: (_, r) => (
        <Space size={4}>
          {/* Edit — opens the same /problems/create page in edit mode (scope locked to institution) */}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/problems/create?edit=${r.id}&scope=institution`)}
          >
            Edit
          </Button>
          {/* Draft / review → publish */}
          {(!r.status || r.status === "draft" || r.status === "review") && (
            <Button size="small" type="primary" onClick={() => changeStatus(r.id, "published")}>Publish</Button>
          )}
          {/* Published → archive */}
          {r.status === "published" && (
            <Button size="small" onClick={() => changeStatus(r.id, "archived")}>Archive</Button>
          )}
          {/* Archived → restore */}
          {r.status === "archived" && (
            <Button size="small" onClick={() => changeStatus(r.id, "published")}>Restore</Button>
          )}
          <Popconfirm title={`Delete "${r.title}"?`} okButtonProps={{ danger: true }} onConfirm={() => removeProblem(r.id, r.title)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={problems}
      columns={columns}
      size="small"
      pagination={{ pageSize: 10 }}
      locale={{ emptyText: "No institution problems yet — create one or fork a global problem." }}
    />
  );
};

// (Manual create and AI-generate sub-tabs were removed — the panel now
// navigates to /problems/create which is the SAME page admins use; it
// auto-locks scope to "institution" for institution_admin users.)

// ── Sub-tab 4: fork from the global bank into this institution ───────────────
const ForkGlobalInstTab = ({ institutionId, onSaved }) => {
  const user = getCurrentUser();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [forking, setForking] = useState(null);

  // Only PUBLISHED problems are fork candidates. Institution-scoped problems
  // are hidden to avoid forking the same institution into itself.
  useEffect(() => {
    fetch(`${AI_API}/getallproblems?status=published`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProblems((Array.isArray(d) ? d : []).filter((p) => p.scope !== "institution")))
      .catch(() => setProblems([]))
      .finally(() => setLoading(false));
  }, []);

  // Fork into this institution — backend sets scope:"institution" because we
  // send institutionId in the body.
  const forkIntoInstitution = async (id) => {
    setForking(id);
    try {
      const res = await fetch(`${AI_API}/problems/${id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ institutionId, createdBy: user?.id || null }),
      });
      if (!res.ok) throw new Error();
      message.success("Forked! It's a draft in 'My Problems' — publish it when ready.");
      onSaved?.();
    } catch {
      message.error("Error forking problem");
    } finally {
      setForking(null);
    }
  };

  // Client-side filter so we don't refetch on every keystroke
  const filtered = problems.filter((p) =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      render: (t, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{t}</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{r.category}</span>
        </Space>
      ),
    },
    { title: "Difficulty", dataIndex: "difficulty", width: 100, render: (d) => <Tag color={DIFF_COLOR[d]}>{d}</Tag> },
    { title: "Tags", dataIndex: "tags", render: (tags) => (tags || []).slice(0, 3).map((t) => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>) },
    {
      title: "",
      width: 180,
      render: (_, r) => (
        // The fork button clones the problem under scope:"institution" for this institution only
        <Button size="small" icon={<ForkOutlined />} loading={forking === r.id} onClick={() => forkIntoInstitution(r.id)}>
          Fork to Institution
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
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12, maxWidth: 360 }}
        allowClear
      />
      <Table rowKey="id" loading={loading} dataSource={filtered} columns={columns} size="small" pagination={{ pageSize: 10 }} />
    </div>
  );
};

// ── Orchestrator: list + fork sub-tabs, plus a header CTA that opens the
//    shared admin /problems/create page (which auto-locks scope to institution
//    for institution_admin users, giving them the exact same Manual / AI
//    Generate experience admins have, with full Examples / Code / Roadmap UI).
// ─────────────────────────────────────────────────────────────────────────────
const InstitutionProblemsPanel = ({ institutionId }) => {
  // navigate is used by the "+ New Problem" button to open the shared create page
  const navigate = useNavigate();
  // refreshKey bumps whenever a child saves/forks — used to reload "My Problems"
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <Card style={{ borderRadius: 8 }}>
      {/* Header: privacy reminder + the main CTA that opens the same create page admins use */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Institution Problem Bank</Typography.Title>
          <Typography.Text type="secondary">
            Problems here are private to your institution — they will never be shown to users outside it.
          </Typography.Text>
        </div>
        {/* Primary CTA — opens the SAME /problems/create page as the admin, with
            ?scope=institution so manual + AI tabs are pre-locked to institution. */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/problems/create?scope=institution")}
        >
          New Problem
        </Button>
      </div>

      <Tabs
        defaultActiveKey="mine"
        items={[
          {
            key: "mine",
            label: <Space><SearchOutlined /> My Problems</Space>,
            children: <MyInstProblemsTab refreshKey={refreshKey} />,
          },
          {
            key: "fork",
            label: <Space><ForkOutlined /> Fork from Global</Space>,
            children: <ForkGlobalInstTab institutionId={institutionId} onSaved={bump} />,
          },
        ]}
      />
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CURRICULUM : per-institution Grades / Specialities / Levels
// The institution_admin manages their own curriculum tree here. A "Seed from
// defaults" action clones the global templates as a starting point.
// ─────────────────────────────────────────────────────────────────────────────
const CurriculumPanel = ({ institutionId }) => {
  const [grades, setGrades] = useState([]);
  const [specialities, setSpecialities] = useState([]);
  const [levels, setLevels] = useState([]);
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [selectedSpecialityId, setSelectedSpecialityId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [editing, setEditing] = useState(null); // { entity, mode, record }
  const [form] = Form.useForm();

  const refreshGrades = async () => {
    const g = await fetchInstitutionGrades(institutionId);
    setGrades(g);
    return g;
  };
  const refreshSpecialities = async (gradeId) => {
    if (!gradeId) { setSpecialities([]); return []; }
    const s = await fetchInstitutionSpecialities(institutionId, gradeId);
    setSpecialities(s);
    return s;
  };
  const refreshLevels = async (specialityId) => {
    if (!specialityId) { setLevels([]); return []; }
    const lv = await fetchInstitutionLevels(institutionId, specialityId);
    setLevels(lv);
    return lv;
  };

  useEffect(() => {
    setLoading(true);
    refreshGrades()
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [institutionId]);

  useEffect(() => {
    refreshSpecialities(selectedGradeId).catch((e) => message.error(e.message));
    setSelectedSpecialityId(null);
  }, [selectedGradeId]);

  useEffect(() => {
    refreshLevels(selectedSpecialityId).catch((e) => message.error(e.message));
  }, [selectedSpecialityId]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const r = await seedInstitutionCurriculum(institutionId);
      message.success(
        `Seeded: ${r.createdGrades} grades, ${r.createdSpecialities} specialities, ${r.createdLevels} levels`
      );
      await refreshGrades();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSeeding(false);
    }
  };

  const openEditor = (entity, mode, record) => {
    setEditing({ entity, mode, record });
    form.resetFields();
    if (mode === "edit" && record) form.setFieldsValue(record);
  };

  const closeEditor = () => { setEditing(null); form.resetFields(); };

  const submit = async () => {
    const values = await form.validateFields();
    const { entity, mode, record } = editing;
    try {
      if (entity === "grade") {
        if (mode === "create") await createInstitutionGrade(institutionId, values);
        else await updateInstitutionGrade(institutionId, record.id, values);
        await refreshGrades();
      } else if (entity === "speciality") {
        const body = { ...values, gradeId: selectedGradeId };
        if (mode === "create") await createInstitutionSpeciality(institutionId, body);
        else await updateInstitutionSpeciality(institutionId, record.id, values);
        await refreshSpecialities(selectedGradeId);
      } else if (entity === "level") {
        const body = { ...values, specialityId: selectedSpecialityId };
        if (mode === "create") await createInstitutionLevel(institutionId, body);
        else await updateInstitutionLevel(institutionId, record.id, values);
        await refreshLevels(selectedSpecialityId);
      }
      message.success(mode === "create" ? "Created" : "Updated");
      closeEditor();
    } catch (e) {
      message.error(e.message);
    }
  };

  const removeRow = async (entity, record) => {
    try {
      if (entity === "grade") {
        await deleteInstitutionGrade(institutionId, record.id);
        if (selectedGradeId === record.id) setSelectedGradeId(null);
        await refreshGrades();
      } else if (entity === "speciality") {
        await deleteInstitutionSpeciality(institutionId, record.id);
        if (selectedSpecialityId === record.id) setSelectedSpecialityId(null);
        await refreshSpecialities(selectedGradeId);
      } else if (entity === "level") {
        await deleteInstitutionLevel(institutionId, record.id);
        await refreshLevels(selectedSpecialityId);
      }
      message.success("Deleted");
    } catch (e) {
      message.error(e.message);
    }
  };

  const baseColumns = (entity) => [
    { title: "Name", dataIndex: "name" },
    { title: "Display name", dataIndex: "displayName" },
    { title: "Order", dataIndex: "order", width: 80 },
    {
      title: "Active", dataIndex: "isActive", width: 80,
      render: (v) => <Tag color={v ? "green" : "default"}>{v ? "Yes" : "No"}</Tag>,
    },
    {
      title: "Actions", width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditor(entity, "edit", record)}>Edit</Button>
          <Popconfirm title="Delete this entry?" onConfirm={() => removeRow(entity, record)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const editorTitle = editing
    ? `${editing.mode === "create" ? "New" : "Edit"} ${editing.entity}`
    : "";

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Popconfirm
            title="Clone the platform's default grades, specialities and levels into this institution?"
            onConfirm={handleSeed}
          >
            <Button loading={seeding}>Seed from defaults</Button>
          </Popconfirm>
          <span style={{ color: "#888" }}>
            Each institution has its own Grades, Specialities and Levels.
            Pick a row to drill down.
          </span>
        </Space>
      </Card>

      {/* Grades */}
      <Card
        title="Grades"
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" onClick={() => openEditor("grade", "create")}>
            New grade
          </Button>
        }
      >
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={grades}
          columns={baseColumns("grade")}
          pagination={false}
          onRow={(record) => ({
            onClick: () => setSelectedGradeId(record.id),
            style: {
              cursor: "pointer",
              background: selectedGradeId === record.id ? "#e6f4ff" : undefined,
            },
          })}
          locale={{ emptyText: "No grades yet — create one or seed from defaults." }}
        />
      </Card>

      {/* Specialities */}
      <Card
        title={
          selectedGradeId
            ? `Specialities — ${grades.find((g) => g.id === selectedGradeId)?.displayName || ""}`
            : "Specialities"
        }
        style={{ marginBottom: 16 }}
        extra={
          <Button
            type="primary"
            disabled={!selectedGradeId}
            onClick={() => openEditor("speciality", "create")}
          >
            New speciality
          </Button>
        }
      >
        {!selectedGradeId ? (
          <Empty description="Select a grade to manage its specialities." />
        ) : (
          <Table
            rowKey="id"
            size="small"
            dataSource={specialities}
            columns={baseColumns("speciality")}
            pagination={false}
            onRow={(record) => ({
              onClick: () => setSelectedSpecialityId(record.id),
              style: {
                cursor: "pointer",
                background: selectedSpecialityId === record.id ? "#e6f4ff" : undefined,
              },
            })}
            locale={{ emptyText: "No specialities for this grade yet." }}
          />
        )}
      </Card>

      {/* Levels */}
      <Card
        title={
          selectedSpecialityId
            ? `Levels — ${specialities.find((s) => s.id === selectedSpecialityId)?.displayName || ""}`
            : "Levels"
        }
        extra={
          <Button
            type="primary"
            disabled={!selectedSpecialityId}
            onClick={() => openEditor("level", "create")}
          >
            New level
          </Button>
        }
      >
        {!selectedSpecialityId ? (
          <Empty description="Select a speciality to manage its levels." />
        ) : (
          <Table
            rowKey="id"
            size="small"
            dataSource={levels}
            columns={baseColumns("level")}
            pagination={false}
            locale={{ emptyText: "No levels for this speciality yet." }}
          />
        )}
      </Card>

      <Modal
        open={!!editing}
        title={editorTitle}
        onCancel={closeEditor}
        onOk={submit}
        okText={editing?.mode === "create" ? "Create" : "Save"}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Name (short identifier, e.g. L1)"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="Display name"
            rules={[{ required: true, message: "Display name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          {editing?.entity === "speciality" && (
            <Form.Item name="icon" label="Icon (optional)">
              <Input />
            </Form.Item>
          )}
          <Form.Item name="order" label="Order" initialValue={0}>
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" initialValue={true}>
            <Select
              options={[
                { value: true, label: "Yes" },
                { value: false, label: "No" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InstitutionTab;
