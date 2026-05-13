import { useEffect, useState } from "react";
import { Button, Card, Empty, Progress, Space, Spin, Tag, Typography } from "antd";
import { ArrowRightOutlined, TrophyOutlined } from "@ant-design/icons";
import { roadmapApi } from "../Roadmap/api";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

// ─── Main tab component ───────────────────────────────────────────────────────
export default function RoadmapTab() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    roadmapApi.list()
      .then(setRoadmaps)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!roadmaps.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            No roadmaps yet —{" "}
            <a onClick={() => navigate("/roadmap")}>generate one here!</a>
          </span>
        }
      />
    );
  }

  // Summary numbers shown at the top
  const total     = roadmaps.length;
  const completed = roadmaps.filter((r) => r.progress === 100).length;
  const certs     = roadmaps.filter((r) => r.certificateIssuedAt).length;

  // Roadmaps that earned a certificate — shown in the bottom section
  const earnedCerts = roadmaps.filter((r) => r.certificateIssuedAt);

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>

      {/* ── Summary stats ── */}
      <div style={{ display: "flex", gap: 12 }}>
        <StatCard value={total}     label="Roadmaps"   color="#4f46e5" emoji="🗺️" />
        <StatCard value={completed} label="Completed"  color="#10b981" emoji="✅" />
        <StatCard value={certs}     label="Certs Earned" color="#f59e0b" emoji="🏆" />
      </div>

      {/* ── Roadmap list ── */}
      <div>
        <Title level={5} style={{ marginBottom: 12 }}>Your Roadmaps</Title>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {roadmaps.map((r) => (
            <RoadmapCard
              key={r.id}
              roadmap={r}
              onOpen={() => navigate("/roadmap")}
            />
          ))}
        </Space>
      </div>

      {/* ── Certifications section — only if at least one cert earned ── */}
      {earnedCerts.length > 0 && (
        <div>
          <Title level={5} style={{ marginBottom: 12 }}>
            <TrophyOutlined style={{ color: "#f59e0b", marginRight: 8 }} />
            Earned Certificates
          </Title>
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {earnedCerts.map((r) => (
              <CertCard key={r.id} roadmap={r} />
            ))}
          </Space>
        </div>
      )}

    </Space>
  );
}

// ─── Small stat card at the top ───────────────────────────────────────────────
function StatCard({ value, label, color, emoji }) {
  return (
    <Card
      size="small"
      style={{
        flex: 1,
        textAlign: "center",
        borderRadius: 12,
        border: `1.5px solid ${color}22`,
        background: `${color}08`,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 2 }}>{emoji}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
    </Card>
  );
}

// ─── One roadmap card ─────────────────────────────────────────────────────────
function RoadmapCard({ roadmap, onOpen }) {
  const { title, progress, isActive, certificateIssuedAt, createdAt } = roadmap;

  // Pick a color based on how far along the roadmap is
  const barColor =
    progress === 100 ? "#10b981" :   // green  — done
    progress >= 50   ? "#4f46e5" :   // purple — halfway
    progress > 0     ? "#f59e0b" :   // amber  — just started
                       "#d1d5db";    // grey   — not started

  const statusLabel =
    progress === 100 ? "Completed" :
    progress > 0     ? "In Progress" :
                       "Not Started";

  const statusTagColor =
    progress === 100 ? "success" :
    progress > 0     ? "warning" :
                       "default";

  return (
    <Card
      style={{
        borderRadius: 12,
        // Highlight the active roadmap with a purple border
        border: isActive ? "2px solid #4f46e5" : "1px solid #f0f0f0",
        background: isActive ? "#fafaff" : "#fff",
        transition: "box-shadow 0.2s",
      }}
      hoverable
    >
      {/* Top row: title + tags + open button */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <Space align="center" wrap>
            <Title level={5} style={{ margin: 0 }}>
              {title || "Untitled Roadmap"}
            </Title>
            {isActive && (
              <Tag color="purple" style={{ marginLeft: 4 }}>Active</Tag>
            )}
            <Tag color={statusTagColor}>{statusLabel}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
            Created {dayjs(createdAt).format("MMM D, YYYY")}
          </Text>
        </div>

        <Button
          size="small"
          type={isActive ? "primary" : "default"}
          icon={<ArrowRightOutlined />}
          onClick={onOpen}
          style={isActive ? { background: "#4f46e5", borderColor: "#4f46e5" } : {}}
        >
          Open
        </Button>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: barColor }}>
            {progress}% complete
          </Text>
          {certificateIssuedAt && (
            <Space size={4}>
              <span>🏆</span>
              <Text style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
                Certificate earned
              </Text>
            </Space>
          )}
        </div>
        <Progress
          percent={progress}
          showInfo={false}
          strokeColor={barColor}
          trailColor="#f0f0f0"
          strokeWidth={8}
          status={progress === 100 ? "success" : "normal"}
        />
      </div>

      {/* Certificate hint when not yet earned */}
      {!certificateIssuedAt && (
        <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6 }}>
          {progress === 100
            ? "🔒 Complete all quizzes with ≥ 80% avg to earn your certificate"
            : `🎯 ${100 - progress}% remaining — keep going!`}
        </Text>
      )}
    </Card>
  );
}

// ─── Certificate card shown in the "Earned Certificates" section ──────────────
function CertCard({ roadmap }) {
  const { title, certificateIssuedAt } = roadmap;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 16px",
        borderRadius: 10,
        background: "linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)",
        border: "1px solid #fde68a",
      }}
    >
      {/* Trophy icon circle */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "#f59e0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 20,
        }}
      >
        🏆
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <Text strong style={{ display: "block", color: "#92400e" }}>
          {title || "Untitled Roadmap"}
        </Text>
        <Text style={{ fontSize: 12, color: "#b45309" }}>
          Issued on {dayjs(certificateIssuedAt).format("MMMM D, YYYY")}
        </Text>
      </div>

      {/* Badge */}
      <Tag
        color="gold"
        style={{ fontWeight: 600, fontSize: 11, border: "1px solid #fbbf24" }}
      >
        Verified
      </Tag>
    </div>
  );
}
