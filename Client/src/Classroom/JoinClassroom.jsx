import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { Card, Typography, Button, Spin, Result, Space, Tag } from "antd";
import { TeamOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const API = "http://localhost:5000/api";
const ADMIN_API = "http://localhost:5000/api/admin";

const getUser = () => {
  try {
    return JSON.parse(Cookies.get("user") || "{}");
  } catch {
    return {};
  }
};

export default function JoinClassroom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [classroom, setClassroom] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${ADMIN_API}/classrooms/join/${code}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setClassroom(d);
      })
      .catch(() => setError("Failed to load classroom info"))
      .finally(() => setPageLoading(false));
  }, [code]);

  const handleJoin = async () => {
    if (!user.id) {
      navigate("/auth");
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`${API}/join-classroom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setJoined(true);
      } else if (res.status === 409) {
        navigate("/my-classrooms");
      } else {
        setError(data.error || "Failed to join");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (pageLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (joined) {
    return (
      <Result
        status="success"
        title={`You joined "${classroom?.name}"!`}
        subTitle="You can now access all lessons, modules, and assignments."
        extra={[
          <Button
            key="go"
            type="primary"
            size="large"
            onClick={() => navigate("/my-classrooms")}
            style={{ background: "#111827", borderColor: "#111827" }}
          >
            Go to My Classrooms
          </Button>,
        ]}
      />
    );
  }

  if (error) {
    return (
      <Result
        status="error"
        title="Invalid Invite Link"
        subTitle={error}
        extra={[
          <Button key="home" onClick={() => navigate("/my-classrooms")}>
            Go Home
          </Button>,
        ]}
      />
    );
  }

  return (
    <div style={{ maxWidth: 440, margin: "64px auto", padding: "0 16px" }}>
      <Card
        style={{
          borderRadius: 16,
          border: "1px solid #eef0f3",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          textAlign: "center",
          padding: "8px 0",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#eef4ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <TeamOutlined style={{ fontSize: 28, color: "#1e40af" }} />
        </div>

        <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
          {classroom?.name}
        </Title>

        {classroom?.academicYear && (
          <Tag style={{ marginBottom: 16, borderRadius: 6 }}>{classroom.academicYear}</Tag>
        )}

        <Text type="secondary" style={{ display: "block", marginBottom: 28, fontSize: 14 }}>
          You&apos;ve been invited to join this classroom.
        </Text>

        {!user.id ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              You need to log in before joining.
            </Text>
            <Button
              type="primary"
              size="large"
              block
              onClick={() => navigate("/auth")}
              style={{ background: "#111827", borderColor: "#111827" }}
            >
              Log in to Join
            </Button>
          </Space>
        ) : user.role !== "student" ? (
          <Text type="secondary" style={{ fontSize: 13 }}>
            Only students can join classrooms via invite link.
          </Text>
        ) : (
          <Button
            type="primary"
            size="large"
            block
            loading={joining}
            onClick={handleJoin}
            style={{ background: "#111827", borderColor: "#111827" }}
          >
            Join Classroom
          </Button>
        )}
      </Card>
    </div>
  );
}
