import { useEffect, useState, useMemo } from "react";
import { SERVER_URL } from "../config";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Empty,
  Spin,
  Progress,
  Space,
  Button,
  theme,
} from "antd";
import {
  TrophyOutlined,
  FileTextOutlined,
  BulbOutlined,
  RiseOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";

const { Title, Text } = Typography;

const WORKSPACE_API = `${SERVER_URL}/api/workspace`;

const api = axios.create();
api.interceptors.request.use((config) => {
  const token =
    Cookies.get("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Color a score: red < 40%, gold 40–70%, green ≥ 70%.
const scoreColor = (pct) => (pct >= 70 ? "#52c41a" : pct >= 40 ? "#faad14" : "#ff4d4f");
const scoreLabel = (pct) => (pct >= 70 ? "Strong" : pct >= 40 ? "Learning" : "Weak");

export default function LearningDashboard({ embedded = false }) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hRes, iRes] = await Promise.all([
          api.get(`${WORKSPACE_API}/history`),
          api.get(`${WORKSPACE_API}/list`),
        ]);
        if (cancelled) return;
        setHistory(hRes.data.history || []);
        setItems(iRes.data.items || []);
      } catch (err) {
        // Silent — stays on the empty state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const quizzes = useMemo(
    () => history.filter((h) => h.type === "quiz" && h.total > 0),
    [history]
  );
  const explanations = useMemo(
    () => history.filter((h) => h.type === "explanation"),
    [history]
  );

  // Aggregate stats.
  const stats = useMemo(() => {
    const totalQuizzes = quizzes.length;
    const avgPct = totalQuizzes
      ? Math.round(
          (quizzes.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) / totalQuizzes) * 1
        )
      : 0;
    const docsStudied = new Set(history.map((h) => h.documentName)).size;
    return {
      totalQuizzes,
      avgPct,
      docsStudied,
      explanations: explanations.length,
    };
  }, [quizzes, explanations, history]);

  // Progress over time — chronological score percentages.
  const progressData = useMemo(() => {
    return [...quizzes]
      .reverse()
      .map((q, idx) => ({
        idx: idx + 1,
        date: new Date(q.date).toLocaleDateString(),
        pct: Math.round((q.score / q.total) * 100),
        name: q.documentName,
      }));
  }, [quizzes]);

  // Knowledge map — average mastery per document (topic).
  const knowledgeMap = useMemo(() => {
    const byDoc = {};
    quizzes.forEach((q) => {
      const pct = (q.score / q.total) * 100;
      if (!byDoc[q.documentName]) byDoc[q.documentName] = { total: 0, count: 0, attempts: 0 };
      byDoc[q.documentName].total += pct;
      byDoc[q.documentName].count += 1;
      byDoc[q.documentName].attempts += 1;
    });
    return Object.entries(byDoc)
      .map(([name, v]) => ({
        name: name.length > 22 ? name.slice(0, 22) + "..." : name,
        fullName: name,
        mastery: Math.round(v.total / v.count),
        attempts: v.attempts,
      }))
      .sort((a, b) => b.mastery - a.mastery);
  }, [quizzes]);

  // Per-document summary table.
  const docsSummary = useMemo(() => {
    const map = {};
    history.forEach((h) => {
      if (!map[h.documentName]) {
        map[h.documentName] = { name: h.documentName, quizzes: 0, explanations: 0, scoreSum: 0, scoreCount: 0, lastDate: h.date };
      }
      const m = map[h.documentName];
      if (h.type === "quiz" && h.total > 0) {
        m.quizzes += 1;
        m.scoreSum += (h.score / h.total) * 100;
        m.scoreCount += 1;
      } else if (h.type === "explanation") {
        m.explanations += 1;
      }
      if (new Date(h.date) > new Date(m.lastDate)) m.lastDate = h.date;
    });
    return Object.values(map).map((m) => ({
      ...m,
      avgScore: m.scoreCount ? Math.round(m.scoreSum / m.scoreCount) : null,
    }));
  }, [history]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  const hasAnyData = history.length > 0;

  return (
    <div
      style={
        embedded
          ? { padding: 0, background: "transparent" }
          : { padding: 24, background: token.colorBgLayout, minHeight: "100vh" }
      }
    >
      {!embedded && (
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <RiseOutlined /> Learning Dashboard
            </Title>
            <Text type="secondary">Your study activity, progress, and topic mastery</Text>
          </div>
          <Button type="primary" icon={<ReadOutlined />} onClick={() => navigate("/classroom-pdf")}>
            Go to Workspace
          </Button>
        </div>
      )}

      {!hasAnyData ? (
        <Card>
          <Empty
            description={
              <span>
                No study activity yet. Take a quiz or generate an explanation in your{" "}
                <a onClick={() => navigate("/classroom-pdf")}>workspace</a> to start tracking.
              </span>
            }
          />
        </Card>
      ) : (
        <>
          {/* Stats row */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="Quizzes Taken"
                  value={stats.totalQuizzes}
                  prefix={<TrophyOutlined style={{ color: "#1890ff" }} />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="Average Score"
                  value={stats.avgPct}
                  suffix="%"
                  valueStyle={{ color: scoreColor(stats.avgPct) }}
                  prefix={<RiseOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="Documents Studied"
                  value={stats.docsStudied}
                  prefix={<FileTextOutlined style={{ color: "#722ed1" }} />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="AI Explanations"
                  value={stats.explanations}
                  prefix={<BulbOutlined style={{ color: "#faad14" }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Progress chart + Knowledge map */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
              <Card title="Progress Over Time" style={{ height: "100%" }}>
                {progressData.length === 0 ? (
                  <Empty description="No quizzes yet" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="idx" label={{ value: "Quiz #", position: "insideBottom", offset: -2 }} />
                      <YAxis domain={[0, 100]} unit="%" />
                      <ReTooltip
                        formatter={(value) => [`${value}%`, "Score"]}
                        labelFormatter={(idx, payload) => {
                          const d = payload?.[0]?.payload;
                          return d ? `${d.name} — ${d.date}` : `Quiz ${idx}`;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pct"
                        stroke="#1890ff"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="Knowledge Map (Topic Mastery)" style={{ height: "100%" }}>
                {knowledgeMap.length === 0 ? (
                  <Empty description="Take a quiz to map your knowledge" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={knowledgeMap} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                        <ReTooltip
                          formatter={(value, _, payload) => [
                            `${value}% — ${scoreLabel(value)}`,
                            `${payload.payload.fullName} (${payload.payload.attempts} attempts)`,
                          ]}
                        />
                        <Bar dataKey="mastery" radius={[0, 4, 4, 0]}>
                          {knowledgeMap.map((d, i) => (
                            <Cell key={i} fill={scoreColor(d.mastery)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <Space size={12} wrap style={{ marginTop: 12 }}>
                      <Tag color="green">Strong (≥70%)</Tag>
                      <Tag color="gold">Learning (40–69%)</Tag>
                      <Tag color="red">Weak (&lt;40%)</Tag>
                    </Space>
                  </>
                )}
              </Card>
            </Col>
          </Row>

          {/* Documents studied + Recent quizzes */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Documents You've Studied">
                {docsSummary.length === 0 ? (
                  <Empty description="No documents yet" />
                ) : (
                  <Table
                    dataSource={docsSummary.map((d, i) => ({ ...d, key: i }))}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    columns={[
                      {
                        title: "File name",
                        dataIndex: "name",
                        render: (name) => <Text strong>{name}</Text>,
                      },
                      {
                        title: "Quizzes",
                        dataIndex: "quizzes",
                        width: 80,
                        align: "center",
                      },
                      {
                        title: "Mastery",
                        dataIndex: "avgScore",
                        width: 130,
                        render: (v) =>
                          v == null ? (
                            <Text type="secondary">—</Text>
                          ) : (
                            <Progress
                              percent={v}
                              size="small"
                              strokeColor={scoreColor(v)}
                              format={(p) => `${p}%`}
                            />
                          ),
                      },
                    ]}
                  />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Recent Quizzes">
                {quizzes.length === 0 ? (
                  <Empty description="No quizzes yet" />
                ) : (
                  <Table
                    dataSource={quizzes.slice(0, 20).map((q) => ({
                      ...q,
                      key: q.id,
                      pct: Math.round((q.score / q.total) * 100),
                    }))}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    columns={[
                      {
                        title: "File name",
                        dataIndex: "documentName",
                        render: (name) => <Text strong>{name}</Text>,
                      },
                      {
                        title: "Date",
                        dataIndex: "date",
                        width: 110,
                        render: (d) => new Date(d).toLocaleDateString(),
                      },
                      {
                        title: "Score",
                        dataIndex: "pct",
                        width: 100,
                        render: (pct, row) => (
                          <Tag color={scoreColor(pct) === "#52c41a" ? "green" : scoreColor(pct) === "#faad14" ? "gold" : "red"}>
                            {row.score}/{row.total} ({pct}%)
                          </Tag>
                        ),
                      },
                    ]}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
