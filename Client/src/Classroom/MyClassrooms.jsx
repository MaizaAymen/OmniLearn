import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import {
  Card,
  Col,
  Row,
  Tag,
  Typography,
  Avatar,
  Empty,
  Spin,
  Space,
  Input,
  Badge,
  ConfigProvider,
  Modal,
  Button,
  message,
  Tooltip,
  Popconfirm,
  Form,
  Select,
} from "antd";
import {
  ReadOutlined,
  UserOutlined,
  ArrowRightOutlined,
  TeamOutlined,
  SearchOutlined,
  LockOutlined,
  CopyOutlined,
  PlusOutlined,
  LinkOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  createClassroom,
  deleteClassroom,
  fetchGrades,
  fetchSpecialities,
  fetchLevels,
  fetchAvailableStudents,
  assignStudentsToClassroom,
} from "../Admin/api";

const { Title, Text } = Typography;
const API = "http://localhost:5000/api";

const getUser = () => {
  try {
    return JSON.parse(Cookies.get("user") || "{}");
  } catch {
    return {};
  }
};

const accentPalette = [
  { bg: "#eef4ff", fg: "#1e40af" },
  { bg: "#fef3f2", fg: "#be123c" },
  { bg: "#ecfdf5", fg: "#047857" },
  { bg: "#fffbeb", fg: "#b45309" },
  { bg: "#f5f3ff", fg: "#6d28d9" },
  { bg: "#ecfeff", fg: "#0e7490" },
];

const pickAccent = (id) => {
  const s = String(id || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return accentPalette[hash % accentPalette.length];
};

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export default function MyClassrooms() {
  const navigate = useNavigate();
  const user = getUser();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState([]);
  const [specialities, setSpecialities] = useState([]);
  const [levels, setLevels] = useState([]);
  const [classroomForm] = Form.useForm();
  const formGradeId = Form.useWatch("gradeId", classroomForm);
  const formSpecialityId = Form.useWatch("specialityId", classroomForm);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [createdClassroom, setCreatedClassroom] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentsToInvite, setStudentsToInvite] = useState([]);

  const isStudent = user.role === "student";
  const canManage = user.role === "teacher" || user.role === "admin";
  const canManageClassroom = (c) =>
    user.role === "admin" || (user.role === "teacher" && c.teacher?.id === user.id);

  const fetchClassrooms = () => {
    if (!user.id) { setLoading(false); return; }
    fetch(`${API}/users/${user.id}/classrooms`)
      .then((r) => r.json())
      .then((d) => setClassrooms(Array.isArray(d) ? d : []))
      .catch(() => setClassrooms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClassrooms(); }, [user.id]);

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      const res = await fetch(`${API}/join-classroom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(`Joined "${data.classroom.name}" successfully!`);
        setJoinModalOpen(false);
        setJoinCode("");
        setLoading(true);
        fetchClassrooms();
      } else {
        message.error(data.error || "Failed to join classroom");
      }
    } catch {
      message.error("Network error. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const openCreate = async () => {
    classroomForm.resetFields();
    setCreateOpen(true);
    try {
      const [g, s, l] = await Promise.all([fetchGrades(), fetchSpecialities(), fetchLevels()]);
      setGrades(g || []);
      setSpecialities(s || []);
      setLevels(l || []);
    } catch (err) {
      message.error(err.message || "Failed to load options");
    }
  };

  const submitClassroom = async () => {
    const values = await classroomForm.validateFields();
    setSaving(true);
    try {
      const created = await createClassroom(values);
      message.success("Classroom created");
      setCreateOpen(false);
      setLoading(true);
      fetchClassrooms();
      try {
        const students = await fetchAvailableStudents(created.id);
        setAvailableStudents(students || []);
      } catch {
        setAvailableStudents([]);
      }
      setStudentsToInvite([]);
      setCreatedClassroom(created);
      setInviteOpen(true);
    } catch (err) {
      message.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteStudents = async () => {
    if (!createdClassroom) return setInviteOpen(false);
    if (studentsToInvite.length === 0) return setInviteOpen(false);
    try {
      await assignStudentsToClassroom(createdClassroom.id, studentsToInvite);
      message.success(`${studentsToInvite.length} student(s) invited`);
    } catch (err) {
      message.error(err.message || "Failed to invite students");
    }
    setInviteOpen(false);
  };

  const removeClassroom = async (e, c) => {
    e.stopPropagation();
    try {
      await deleteClassroom(c.id);
      setClassrooms((p) => p.filter((x) => x.id !== c.id));
      message.success("Deleted");
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  const copyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    message.success("Invite code copied!");
  };

  const copyLink = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    message.success("Join link copied!");
  };

  const teacherName = (t) =>
    t ? `${t.firstname || ""} ${t.lastname || ""}`.trim() || t.email : "—";

  const filtered = classrooms.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.grade?.name?.toLowerCase().includes(q) ||
      c.speciality?.name?.toLowerCase().includes(q) ||
      teacherName(c.teacher).toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#111827", borderRadius: 12 } }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: -0.5 }}>
              My Classrooms
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {isStudent
                ? "Browse modules, lessons, and assignments from the classrooms you joined."
                : "Manage your classrooms and share invite codes with students."}
            </Text>
          </div>
          <Space wrap size={12}>
            {classrooms.length > 0 && (
              <Input
                allowClear
                size="large"
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Search classrooms, subjects, teachers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  maxWidth: 320,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              />
            )}
            {isStudent && (
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setJoinModalOpen(true)}
                style={{ background: "#111827", borderColor: "#111827" }}
              >
                Join Classroom
              </Button>
            )}
            {canManage && (
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={openCreate}
                style={{ background: "#111827", borderColor: "#111827" }}
              >
                Create Classroom
              </Button>
            )}
          </Space>
        </div>

        {/* Classroom list */}
        {classrooms.length === 0 ? (
          <Card
            style={{
              borderRadius: 16,
              border: "1px solid #eef0f3",
              background: "#fff",
            }}
          >
            <Empty
              image={<TeamOutlined style={{ fontSize: 56, color: "#d1d5db" }} />}
              description={
                <Space direction="vertical" size={6}>
                  <Text strong style={{ fontSize: 15 }}>
                    {isStudent
                      ? "You haven't joined any classroom yet"
                      : "No classrooms yet"}
                  </Text>
                  <Text type="secondary">
                    {isStudent
                      ? "Enter an invite code to get started."
                      : "Click Create Classroom to get started."}
                  </Text>
                </Space>
              }
            >
              {isStudent && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setJoinModalOpen(true)}
                  style={{ background: "#111827", borderColor: "#111827" }}
                >
                  Join Classroom
                </Button>
              )}
            </Empty>
          </Card>
        ) : filtered.length === 0 ? (
          <Card style={{ borderRadius: 16, border: "1px solid #eef0f3" }}>
            <Empty description={`No classroom matches "${query}"`} />
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {filtered.map((c) => {
              const accent = pickAccent(c.id);
              return (
                <Col key={c.id} xs={24} sm={12} lg={8}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/my-classrooms/${c.id}`)}
                    styles={{ body: { padding: 22 } }}
                    style={{
                      borderRadius: 16,
                      border: "1px solid #eef0f3",
                      background: "#fff",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      transition: "all 0.2s ease",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 18,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: accent.bg,
                          color: accent.fg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                        }}
                      >
                        {initials(c.name) || <ReadOutlined />}
                      </div>
                      {canManageClassroom(c) ? (
                        <Popconfirm
                          title="Delete this classroom?"
                          okText="Delete"
                          okButtonProps={{ danger: true }}
                          onConfirm={(e) => removeClassroom(e, c)}
                          onCancel={(e) => e?.stopPropagation?.()}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      ) : (
                        <Badge
                          count={<LockOutlined style={{ color: "#9ca3af", fontSize: 11 }} />}
                          style={{ background: "transparent" }}
                        />
                      )}
                    </div>

                    <Title
                      level={5}
                      style={{ margin: 0, marginBottom: 4, fontWeight: 600, lineHeight: 1.3 }}
                    >
                      {c.name}
                    </Title>

                    <Space size={6} style={{ marginBottom: 14 }}>
                      <Avatar size={18} icon={<UserOutlined />} style={{ background: "#f3f4f6", color: "#6b7280" }} />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {teacherName(c.teacher)}
                      </Text>
                    </Space>

                    <div style={{ minHeight: 26, marginBottom: 18 }}>
                      <Space size={[6, 6]} wrap>
                        {c.grade?.name && (
                          <Tag
                            style={{
                              background: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              color: "#374151",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "1px 8px",
                            }}
                          >
                            {c.grade.name}
                          </Tag>
                        )}
                        {c.speciality?.name && (
                          <Tag
                            style={{
                              background: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              color: "#374151",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "1px 8px",
                            }}
                          >
                            {c.speciality.name}
                          </Tag>
                        )}
                        {c.level?.name && (
                          <Tag
                            style={{
                              background: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              color: "#374151",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "1px 8px",
                            }}
                          >
                            {c.level.name}
                          </Tag>
                        )}
                      </Space>
                    </div>

                    {/* Card footer */}
                    {!isStudent && c.inviteCode ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 14,
                          borderTop: "1px solid #f3f4f6",
                        }}
                      >
                        <Space size={2}>
                          <Tooltip title="Copy invite code">
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined style={{ fontSize: 11 }} />}
                              onClick={(e) => copyCode(e, c.inviteCode)}
                              style={{
                                fontSize: 12,
                                color: "#374151",
                                fontFamily: "monospace",
                                fontWeight: 600,
                                letterSpacing: 1,
                                padding: "0 6px",
                                height: 24,
                              }}
                            >
                              {c.inviteCode}
                            </Button>
                          </Tooltip>
                          <Tooltip title="Copy join link">
                            <Button
                              type="text"
                              size="small"
                              icon={<LinkOutlined />}
                              onClick={(e) => copyLink(e, c.inviteCode)}
                              style={{ color: "#9ca3af", padding: "0 4px", height: 24 }}
                            />
                          </Tooltip>
                        </Space>
                        <Text strong style={{ color: "#111827", fontSize: 13 }}>
                          Open <ArrowRightOutlined style={{ fontSize: 11 }} />
                        </Text>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 14,
                          borderTop: "1px solid #f3f4f6",
                        }}
                      >
                        <Text style={{ fontSize: 12, color: "#9ca3af" }}>Read-only access</Text>
                        <Text strong style={{ color: "#111827", fontSize: 13 }}>
                          Open <ArrowRightOutlined style={{ fontSize: 11 }} />
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {/* Create classroom (teachers/admins) */}
        <Modal
          open={createOpen}
          title="Create Classroom"
          onCancel={() => setCreateOpen(false)}
          onOk={submitClassroom}
          okText="Create"
          confirmLoading={saving}
          centered
          width={460}
          destroyOnClose
        >
          <Form form={classroomForm} layout="vertical" style={{ paddingTop: 4 }}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. 3A" />
            </Form.Item>
            <Form.Item name="gradeId" label="Grade">
              <Select
                placeholder="Select grade"
                allowClear
                options={grades.map((g) => ({ value: g.id, label: g.displayName || g.name }))}
                onChange={() =>
                  classroomForm.setFieldsValue({ specialityId: undefined, levelId: undefined })
                }
              />
            </Form.Item>
            <Form.Item name="specialityId" label="Speciality">
              <Select
                placeholder="Select speciality"
                allowClear
                options={specialities
                  .filter((s) => !formGradeId || s.gradeId === formGradeId)
                  .map((s) => ({ value: s.id, label: s.displayName || s.name }))}
                onChange={() => classroomForm.setFieldsValue({ levelId: undefined })}
              />
            </Form.Item>
            <Form.Item name="levelId" label="Level">
              <Select
                placeholder="Select level"
                allowClear
                options={levels
                  .filter((l) => !formSpecialityId || l.specialityId === formSpecialityId)
                  .map((l) => ({ value: l.id, label: l.displayName || l.name }))}
              />
            </Form.Item>
            <Form.Item name="academicYear" label="Year">
              <Input placeholder="2025" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Post-create invite modal */}
        <Modal
          title="Classroom Created"
          open={inviteOpen}
          onCancel={() => setInviteOpen(false)}
          onOk={handleInviteStudents}
          okText={studentsToInvite.length > 0 ? "Invite & Close" : "Done"}
          width={480}
          destroyOnClose
        >
          {createdClassroom && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  textAlign: "center",
                  background: "#f8f9fa",
                  borderRadius: 8,
                  padding: "20px 16px",
                }}
              >
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  INVITE CODE
                </Text>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: 8,
                    color: "#111827",
                    fontFamily: "monospace",
                  }}
                >
                  {createdClassroom.inviteCode}
                </div>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    navigator.clipboard.writeText(createdClassroom.inviteCode);
                    message.success("Code copied!");
                  }}
                >
                  Copy Code
                </Button>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>JOIN LINK</Text>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Input
                    readOnly
                    value={`${window.location.origin}/join/${createdClassroom.inviteCode}`}
                    prefix={<LinkOutlined style={{ color: "#5f6368" }} />}
                  />
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/join/${createdClassroom.inviteCode}`
                      );
                      message.success("Link copied!");
                    }}
                  />
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  INVITE STUDENTS DIRECTLY (optional)
                </Text>
                <Select
                  mode="multiple"
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder="Select students to add now"
                  value={studentsToInvite}
                  onChange={setStudentsToInvite}
                  options={availableStudents.map((s) => ({
                    value: s.id,
                    label: `${s.firstname || ""} ${s.lastname || ""} (${s.email})`.trim(),
                  }))}
                />
              </div>
            </div>
          )}
        </Modal>

        {/* Join modal (students only) */}
        <Modal
          open={joinModalOpen}
          title="Join a Classroom"
          onCancel={() => { setJoinModalOpen(false); setJoinCode(""); }}
          footer={null}
          centered
          width={400}
        >
          <div style={{ padding: "8px 0 4px" }}>
            <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16 }}>
              Ask your teacher for the 6-character invite code and enter it below.
            </Text>
            <Input
              size="large"
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onPressEnter={handleJoin}
              maxLength={8}
              style={{
                fontFamily: "monospace",
                fontWeight: 600,
                letterSpacing: 3,
                fontSize: 18,
                textAlign: "center",
                marginBottom: 16,
              }}
              autoFocus
            />
            <Button
              type="primary"
              size="large"
              block
              loading={joining}
              disabled={!joinCode.trim()}
              onClick={handleJoin}
              style={{ background: "#111827", borderColor: "#111827" }}
            >
              Join Classroom
            </Button>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
}
