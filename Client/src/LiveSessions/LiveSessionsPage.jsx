import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchSessionList, getMySessionIds, forgetSession } from "../lib/roomClient";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  Avatar,
} from "antd";
import {
  LockOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  UnlockOutlined,
  LinkOutlined,
  WifiOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

function LiveSessionsPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("Guest");
  const [sessions, setSessions] = useState([]);
  const [joinSessionId, setJoinSessionId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [passwordModal, setPasswordModal] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [showAll, setShowAll] = useState(false); // false = only sessions I created/joined
  const [myIds, setMyIds] = useState(() => new Set(getMySessionIds()));

  useEffect(() => {
    const savedName = localStorage.getItem("collabDisplayName");
    if (savedName) {
      setDisplayName(savedName);
      return;
    }
    setDisplayName(`Guest-${Math.floor(Math.random() * 1000)}`);
  }, []);



  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await fetchSessionList();
      if (cancelled) return;
      setSessions(list);
      // Prune locally-remembered IDs that no longer exist on the server, then
      // resync myIds from localStorage so newly-created sessions in other tabs
      // also appear in the "Mine" filter.
      const live = new Set(list.map((s) => s.id));
      const remembered = new Set(getMySessionIds());
      remembered.forEach((id) => { if (!live.has(id)) forgetSession(id); });
      setMyIds(new Set(getMySessionIds()));
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const sessionById = useMemo(() => {
    const map = new Map();
    sessions.forEach((s) => map.set(s.id, s));
    return map;
  }, [sessions]);

  const visibleSessions = useMemo(
    () => (showAll ? sessions : sessions.filter((s) => myIds.has(s.id))),
    [sessions, showAll, myIds]
  );

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return visibleSessions;
    const q = searchQuery.toLowerCase();
    return visibleSessions.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q) ||
        s.hostName?.toLowerCase().includes(q)
    );
  }, [visibleSessions, searchQuery]);

  const totalParticipants = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.participantCount || 0), 0),
    [sessions]
  );

  const goToProblemSession = (session, password = "") => {
    if (!session?.problemId || !session?.id) {
      toast.error("Invalid session data");
      return;
    }
    const params = new URLSearchParams();
    params.set("session", session.id);
    if (password) params.set("joinPassword", password);
    navigate(`/problems/${session.problemId}?${params.toString()}`);
  };

  const handleJoinById = () => {
    const target = sessionById.get(joinSessionId.trim());
    if (!target) {
      toast.error("Session ID not found in active sessions");
      return;
    }
    if (target.visibility === "private" && !joinPassword) {
      toast.error("Password required for private session");
      return;
    }
    goToProblemSession(target, joinPassword);
  };

  const handleJoinCard = (session) => {
    if (session.requiresPassword) {
      setPasswordModal(session);
      setPasswordInput("");
    } else {
      goToProblemSession(session);
    }
  };

  const handlePasswordModalJoin = () => {
    if (!passwordModal) return;
    goToProblemSession(passwordModal, passwordInput);
    setPasswordModal(null);
    setPasswordInput("");
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 4px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Space align="center" size={12}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "#f5f7fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WifiOutlined style={{ fontSize: 20, color: "#111827" }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: "#111827" }}>
              Live Sessions
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Join a real-time coding session and collaborate with others.
            </Text>
          </div>
        </Space>

        
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          {
            title: "Active Sessions",
            value: sessions.length,
            icon: <WifiOutlined style={{ color: "#111827" }} />,
          },
          {
            title: "Total Participants",
            value: totalParticipants,
            icon: <TeamOutlined style={{ color: "#111827" }} />,
          },
          {
            title: "Public Sessions",
            value: sessions.filter((s) => s.visibility === "public").length,
            icon: <GlobalOutlined style={{ color: "#111827" }} />,
          },
        ].map((stat) => (
          <Col xs={24} sm={8} key={stat.title} style={{ marginBottom: 12 }}>
            <Card
              size="small"
              style={{
                borderRadius: 12,
                border: "1px solid #eef0f3",
                background: "#fff",
              }}
              styles={{ body: { padding: "14px 18px" } }}
            >
              <Space>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "#f5f7fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {stat.icon}
                </div>
                <Statistic
                  title={<span style={{ fontSize: 12, color: "#6b7280" }}>{stat.title}</span>}
                  value={stat.value}
                  valueStyle={{ fontSize: 22, fontWeight: 700, color: "#111827" }}
                />
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Join by ID */}
      <Card
        size="small"
        style={{
          borderRadius: 12,
          border: "1px solid #eef0f3",
          background: "#fff",
          marginBottom: 20,
        }}
        styles={{ body: { padding: "16px 20px" } }}
      >
        <Space align="center" style={{ marginBottom: 12 }}>
          <LinkOutlined style={{ color: "#6b7280" }} />
          <Text strong style={{ fontSize: 13 }}>
            Join by Session ID
          </Text>
        </Space>
        <Space wrap size={8}>
          <Input
            size="small"
            value={joinSessionId}
            onChange={(e) => setJoinSessionId(e.target.value)}
            placeholder="Session ID (e.g. S-AB12CD)"
            onPressEnter={handleJoinById}
            style={{ width: 220, borderRadius: 8 }}
          />
          <Input.Password
            size="small"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            placeholder="Password (if required)"
            onPressEnter={handleJoinById}
            style={{ width: 190, borderRadius: 8 }}
          />
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={handleJoinById}
            style={{
              background: "#111827",
              borderColor: "#111827",
              color: "#fff",
              borderRadius: 8,
            }}
          >
            Join
          </Button>
        </Space>
      </Card>

      {/* Search + Session Cards */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Button.Group size="small">
            <Button
              type={showAll ? "default" : "primary"}
              onClick={() => setShowAll(false)}
              style={!showAll ? { background: "#111827", borderColor: "#111827" } : undefined}
            >
              Mine ({myIds.size})
            </Button>
            <Button
              type={showAll ? "primary" : "default"}
              onClick={() => setShowAll(true)}
              style={showAll ? { background: "#111827", borderColor: "#111827" } : undefined}
            >
              All ({sessions.length})
            </Button>
          </Button.Group>
          <Input
            size="small"
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            allowClear
            style={{ maxWidth: 260, borderRadius: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
          </Text>
        </div>

        {filteredSessions.length === 0 ? (
          <Card
            style={{
              borderRadius: 12,
              border: "1px dashed #e5e7eb",
              background: "#fafbfc",
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: "#9ca3af" }}>
                  {searchQuery ? "No sessions match your search." : "No active sessions right now."}
                </span>
              }
            />
            {!searchQuery && (
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Open any problem to start a session and invite others.
                </Text>
              </div>
            )}
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredSessions.map((session) => {
              const isFull = session.participantCount >= session.maxParticipants;
              const isPrivate = session.visibility === "private";
              const fillPct = Math.min(
                100,
                Math.round((session.participantCount / session.maxParticipants) * 100)
              );
              const barColor =
                fillPct >= 90 ? "#ef4444" : fillPct >= 60 ? "#f59e0b" : "#10b981";

              return (
                <Col xs={24} sm={12} lg={8} key={session.id}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 12,
                      border: "1px solid #eef0f3",
                      background: "#fff",
                      height: "100%",
                    }}
                    styles={{ body: { padding: "16px" } }}
                  >
                    {/* Top row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          strong
                          style={{
                            fontSize: 13,
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {session.name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11.5 }}>
                          Host: {session.hostName}
                        </Text>
                      </div>
                      <Tag
                        icon={isPrivate ? <LockOutlined /> : <UnlockOutlined />}
                        style={{
                          borderRadius: 6,
                          fontSize: 11,
                          padding: "1px 8px",
                          background: isPrivate ? "#fffbeb" : "#ecfdf5",
                          border: isPrivate ? "1px solid #fde68a" : "1px solid #a7f3d0",
                          color: isPrivate ? "#b45309" : "#047857",
                          flexShrink: 0,
                        }}
                      >
                        {session.visibility}
                      </Tag>
                    </div>

                    {/* Session ID */}
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 10.5,
                        background: "#f9fafb",
                        border: "1px solid #eef0f3",
                        borderRadius: 6,
                        padding: "4px 10px",
                        color: "#6b7280",
                        marginBottom: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {session.id}
                    </div>

                    {/* Participants */}
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <Space size={4}>
                          <TeamOutlined style={{ fontSize: 12, color: "#6b7280" }} />
                          <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            {session.participantCount} / {session.maxParticipants}
                          </Text>
                        </Space>
                        <Text style={{ fontSize: 11.5, color: "#9ca3af" }}>{fillPct}% full</Text>
                      </div>
                      <Progress
                        percent={fillPct}
                        size="small"
                        showInfo={false}
                        strokeColor={barColor}
                        trailColor="#f3f4f6"
                      />
                    </div>

                    {/* Action */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      {isPrivate ? (
                        <Button
                          size="small"
                          icon={<LockOutlined />}
                          onClick={() => setJoinSessionId(session.id)}
                          style={{ borderRadius: 8, fontSize: 12 }}
                        >
                          Use Session ID
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          icon={<ThunderboltOutlined />}
                          disabled={isFull}
                          onClick={() => handleJoinCard(session)}
                          style={{
                            borderRadius: 8,
                            fontSize: 12,
                            background: isFull ? undefined : "#111827",
                            borderColor: isFull ? undefined : "#111827",
                            color: isFull ? undefined : "#fff",
                          }}
                        >
                          {isFull ? "Full" : "Join"}
                        </Button>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      {/* Password Modal */}
      <Modal
        open={!!passwordModal}
        onCancel={() => setPasswordModal(null)}
        onOk={handlePasswordModalJoin}
        okText="Join"
        cancelText="Cancel"
        title={
          <Space>
            <LockOutlined style={{ color: "#b45309" }} />
            Password Required
          </Space>
        }
        okButtonProps={{
          style: { background: "#111827", borderColor: "#111827" },
        }}
        width={360}
      >
        <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
          <Text strong>{passwordModal?.name}</Text> is password-protected.
        </Text>
        <Input.Password
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="Enter session password"
          autoFocus
          onPressEnter={handlePasswordModalJoin}
          style={{ borderRadius: 8 }}
        />
      </Modal>
    </div>
  );
}

export default LiveSessionsPage;
