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
} from "antd";
import {
  ReadOutlined,
  UserOutlined,
  ArrowRightOutlined,
  TeamOutlined,
  SearchOutlined,
  LockOutlined,
} from "@ant-design/icons";

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

  useEffect(() => {
    if (!user.id) {
      setLoading(false);
      return;
    }
    fetch(`${API}/users/${user.id}/classrooms`)
      .then((r) => r.json())
      .then((d) => setClassrooms(Array.isArray(d) ? d : []))
      .catch(() => setClassrooms([]))
      .finally(() => setLoading(false));
  }, [user.id]);

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
              Browse modules, lessons, and assignments from the classrooms you joined.
            </Text>
          </div>
          {classrooms.length > 0 && (
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Search classrooms, subjects, teachers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                maxWidth: 360,
                background: "#fff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
            />
          )}
        </div>

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
                    You haven't joined any classroom yet
                  </Text>
                  <Text type="secondary">
                    Ask your teacher for an invite code to get started.
                  </Text>
                </Space>
              }
            />
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
                      <Badge
                        count={<LockOutlined style={{ color: "#9ca3af", fontSize: 11 }} />}
                        style={{ background: "transparent" }}
                      />
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
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>
    </ConfigProvider>
  );
}
