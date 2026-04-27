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
import { createClassroom, deleteClassroom } from "../Admin/api";

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
  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState("");
  const [saving, setSaving] = useState(false);

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

  const submitClassroom = async () => {
    if (!newName.trim()) return message.error("Name is required");
    setSaving(true);
    try {
      await createClassroom({ name: newName.trim(), academicYear: newYear.trim() || undefined });
      message.success("Classroom created");
      setCreateOpen(false);
      setNewName("");
      setNewYear("");
      setLoading(true);
      fetchClassrooms();
    } catch (err) {
      message.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
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
                onClick={() => setCreateOpen(true)}
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
          width={400}
        >
          <Space direction="vertical" size={12} style={{ width: "100%", padding: "4px 0" }}>
            <Input
              size="large"
              placeholder="Classroom name (e.g. 3A Math)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onPressEnter={submitClassroom}
              autoFocus
            />
            <Input
              size="large"
              placeholder="Academic year (optional, e.g. 2025)"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              onPressEnter={submitClassroom}
            />
          </Space>
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
