import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import {
  Breadcrumb,
  Card,
  Col,
  Row,
  Tabs,
  Tag,
  Typography,
  Empty,
  Spin,
  Space,
  Avatar,
  Button,
  Progress,
  Tooltip,
  ConfigProvider,
  message,
  Input,
} from "antd";
import {
  UserOutlined,
  ReadOutlined,
  FileTextOutlined,
  BookOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  LockOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  SearchOutlined,
  DownOutlined,
  RightOutlined,
  CodeOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const { Title, Text } = Typography;
const API = "http://localhost:5000/api";
const ADMIN = `${API}/admin`;
const STUDENT = `${API}/student`;
const SERVER_URL = "http://localhost:5000";

const getUser = () => {
  try {
    return JSON.parse(Cookies.get("user") || "{}");
  } catch {
    return {};
  }
};

const teacherName = (t) =>
  t ? `${t.firstname || ""} ${t.lastname || ""}`.trim() || t.email : "—";

const getPdfUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SERVER_URL}${url}`;
};

export default function ClassroomView() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [classroom, setClassroom] = useState(null);
  const [courses, setCourses] = useState([]);
  const [modulesByCourse, setModulesByCourse] = useState({});
  const [lessonsByModule, setLessonsByModule] = useState({});
  const [assignmentsByModule, setAssignmentsByModule] = useState({});
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lessonSearch, setLessonSearch] = useState("");
  const [activeTab, setActiveTab] = useState("content");
  const [allProblems, setAllProblems] = useState([]);

  const defaultLayoutPluginInstance = defaultLayoutPlugin({ sidebarTabs: () => [] });

  const BASE = user.role === "student" ? STUDENT : ADMIN;

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/classrooms/${classId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${BASE}/classrooms/${classId}/courses`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API}/ai/ai/getallproblems`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(async ([clsData, coursesData, problemsData]) => {
        setClassroom(clsData);
        setAllProblems(Array.isArray(problemsData) ? problemsData : []);
        const courseList = Array.isArray(coursesData) ? coursesData : [];
        setCourses(courseList);

        const moduleEntries = await Promise.all(
          courseList.map(async (c) => {
            try {
              const res = await fetch(`${BASE}/courses/${c.id}/modules`);
              const data = await res.json();
              return [c.id, Array.isArray(data) ? data : []];
            } catch {
              return [c.id, []];
            }
          })
        );
        setModulesByCourse(Object.fromEntries(moduleEntries));
      })
      .catch(() => message.error("Failed to load classroom"))
      .finally(() => setLoading(false));
  }, [classId]);

  const loadModulesForCourse = async (courseId) => {
    if (modulesByCourse[courseId]) return modulesByCourse[courseId];
    try {
      const res = await fetch(`${BASE}/courses/${courseId}/modules`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setModulesByCourse((prev) => ({ ...prev, [courseId]: arr }));
      return arr;
    } catch {
      setModulesByCourse((prev) => ({ ...prev, [courseId]: [] }));
      return [];
    }
  };

  const loadLessonsForModule = async (moduleId) => {
    if (lessonsByModule[moduleId]) return lessonsByModule[moduleId];
    try {
      const res = await fetch(`${BASE}/modules/${moduleId}/lessons`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: arr }));
      return arr;
    } catch {
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: [] }));
      return [];
    }
  };

  const loadAssignmentsForModule = async (moduleId) => {
    if (assignmentsByModule[moduleId] || !user.id) return;
    try {
      const res = await fetch(`${API}/assignments/student/${user.id}/module/${moduleId}`);
      const data = await res.json();
      setAssignmentsByModule((prev) => ({
        ...prev,
        [moduleId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      setAssignmentsByModule((prev) => ({ ...prev, [moduleId]: [] }));
    }
  };

  const toggleCourse = async (courseId) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else {
        next.add(courseId);
        loadModulesForCourse(courseId);
      }
      return next;
    });
  };

  const toggleModule = async (moduleId) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else {
        next.add(moduleId);
        loadLessonsForModule(moduleId);
      }
      return next;
    });
  };

  const openAiAssistant = (lesson) => {
    if (!lesson?.contentUrl || lesson.type !== "pdf") return;
    navigate("/pdf-assistant", {
      state: { pdfFile: getPdfUrl(lesson.contentUrl), filename: lesson.title },
    });
  };

  const highlightCode = (code) =>
    Prism.highlight(code || "", Prism.languages.javascript, "javascript");

  const allModulesFlat = useMemo(
    () => courses.flatMap((c) => modulesByCourse[c.id] || []),
    [courses, modulesByCourse]
  );

  useEffect(() => {
    if (activeTab !== "assignments" || !user.id) return;
    allModulesFlat.forEach((m) => {
      if (!assignmentsByModule[m.id]) loadAssignmentsForModule(m.id);
    });
  }, [activeTab, allModulesFlat, user.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <Card style={{ borderRadius: 14 }}>
        <Empty description="Classroom not found" />
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Button onClick={() => navigate("/my-classrooms")} icon={<ArrowLeftOutlined />}>
            Back to my classrooms
          </Button>
        </div>
      </Card>
    );
  }

  const lessonMatchesSearch = (l) =>
    !lessonSearch.trim() || l.title?.toLowerCase().includes(lessonSearch.toLowerCase());

  const contentTab = (
    <Row gutter={16} style={{ marginTop: 4 }}>
      {/* Left rail — compact course/module/lesson tree */}
      <Col xs={24} md={7} lg={6} xl={5}>
        <Card
          size="small"
          style={{
            borderRadius: 12,
            border: "1px solid #eef0f3",
            background: "#fff",
            height: "calc(100vh - 260px)",
            minHeight: 600,
            display: "flex",
            flexDirection: "column",
          }}
          styles={{
            body: { padding: 0, display: "flex", flexDirection: "column", height: "100%" },
          }}
        >
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #f3f4f6" }}>
            <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
              <Text strong style={{ fontSize: 13, letterSpacing: 0.3 }}>
                COURSE CONTENT
              </Text>
              <Tag style={tagStyle}>{courses.length}</Tag>
            </Space>
            <Input
              allowClear
              size="small"
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Search lessons"
              value={lessonSearch}
              onChange={(e) => setLessonSearch(e.target.value)}
              style={{ marginTop: 10, background: "#fafbfc", border: "1px solid #eef0f3" }}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
            {courses.length === 0 ? (
              <Empty description="No courses" style={{ padding: 24 }} />
            ) : (
              courses.map((course) => {
                const open = expandedCourses.has(course.id);
                const mods = modulesByCourse[course.id] || [];
                return (
                  <div key={course.id} style={{ marginBottom: 4 }}>
                    <div
                      onClick={() => toggleCourse(course.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: open ? "#f5f7fa" : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => !open && (e.currentTarget.style.background = "#fafbfc")}
                      onMouseLeave={(e) => !open && (e.currentTarget.style.background = "transparent")}
                    >
                      {open ? (
                        <DownOutlined style={{ fontSize: 10, color: "#6b7280" }} />
                      ) : (
                        <RightOutlined style={{ fontSize: 10, color: "#9ca3af" }} />
                      )}
                      <BookOutlined style={{ color: "#6b7280", fontSize: 13 }} />
                      <Text strong style={{ fontSize: 13, flex: 1 }}>
                        {course.title || course.name}
                      </Text>
                    </div>

                    {open && (
                      <div style={{ paddingLeft: 12 }}>
                        {mods.length === 0 ? (
                          <Text type="secondary" style={{ fontSize: 12, paddingLeft: 16 }}>
                            No modules
                          </Text>
                        ) : (
                          mods.map((m) => {
                            const mOpen = expandedModules.has(m.id);
                            const lessons = (lessonsByModule[m.id] || []).filter(lessonMatchesSearch);
                            return (
                              <div key={m.id} style={{ marginTop: 2 }}>
                                <div
                                  onClick={() => toggleModule(m.id)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "6px 10px",
                                    borderRadius: 7,
                                    cursor: "pointer",
                                    background: mOpen ? "#eef2f7" : "transparent",
                                    transition: "background 0.15s",
                                  }}
                                >
                                  {mOpen ? (
                                    <DownOutlined style={{ fontSize: 9, color: "#6b7280" }} />
                                  ) : (
                                    <RightOutlined style={{ fontSize: 9, color: "#9ca3af" }} />
                                  )}
                                  <Text style={{ fontSize: 12.5, flex: 1, color: "#374151" }}>
                                    {m.title}
                                  </Text>
                                </div>

                                {mOpen && (
                                  <div style={{ paddingLeft: 18, marginTop: 2 }}>
                                    {lessons.length === 0 ? (
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 11.5, paddingLeft: 8 }}
                                      >
                                        {lessonsByModule[m.id]
                                          ? "No lessons match"
                                          : "Loading…"}
                                      </Text>
                                    ) : (
                                      lessons.map((l) => {
                                        const active = selectedLesson?.id === l.id;
                                        return (
                                          <div
                                            key={l.id}
                                            onClick={() => setSelectedLesson(l)}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                              padding: "6px 10px",
                                              marginBottom: 2,
                                              borderRadius: 6,
                                              cursor: "pointer",
                                              background: active ? "#111827" : "transparent",
                                              color: active ? "#fff" : "#4b5563",
                                              transition: "all 0.15s",
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!active) e.currentTarget.style.background = "#f5f7fa";
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!active) e.currentTarget.style.background = "transparent";
                                            }}
                                          >
                                            {l.type === "pdf" ? (
                                              <FilePdfOutlined style={{ fontSize: 12 }} />
                                            ) : l.type === "code" ? (
                                              <CodeOutlined style={{ fontSize: 12 }} />
                                            ) : (
                                              <FileTextOutlined style={{ fontSize: 12 }} />
                                            )}
                                            <span
                                              style={{
                                                fontSize: 12.5,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                flex: 1,
                                              }}
                                            >
                                              {l.title}
                                            </span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </Col>

      {/* Right pane — big lesson viewer */}
      <Col xs={24} md={17} lg={18} xl={19}>
        <Card
          style={{
            borderRadius: 12,
            border: "1px solid #eef0f3",
            background: "#fff",
            height: "calc(100vh - 260px)",
            minHeight: 600,
            overflow: "hidden",
          }}
          styles={{ body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" } }}
        >
          {!selectedLesson ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 16,
                background: "#fafbfc",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: "#fff",
                  border: "1px solid #eef0f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BookOutlined style={{ fontSize: 28, color: "#9ca3af" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <Title level={5} style={{ margin: 0, color: "#374151" }}>
                  Pick a lesson to begin
                </Title>
                <Text type="secondary">
                  Expand a course on the left and choose any lesson to read.
                </Text>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <Space size={10}>
                  {selectedLesson.type === "pdf" ? (
                    <FilePdfOutlined style={{ fontSize: 18, color: "#1677ff" }} />
                  ) : selectedLesson.type === "code" ? (
                    <CodeOutlined style={{ fontSize: 18, color: "#722ed1" }} />
                  ) : (
                    <FileTextOutlined style={{ fontSize: 18, color: "#6b7280" }} />
                  )}
                  <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                    {selectedLesson.title}
                  </Title>
                  <Tag style={tagStyle}>{(selectedLesson.type || "").toUpperCase()}</Tag>
                </Space>
                <Space>
                  <Tag icon={<LockOutlined />} style={tagStyle}>
                    Read-only
                  </Tag>
                  {selectedLesson.type === "pdf" && (
                    <Button
                      type="primary"
                      icon={<RobotOutlined />}
                      onClick={() => openAiAssistant(selectedLesson)}
                      style={{ background: "#111827", borderColor: "#111827" }}
                    >
                      AI Assistant
                    </Button>
                  )}
                </Space>
              </div>

              <div style={{ flex: 1, overflow: "hidden", background: "#fafbfc" }}>
                {selectedLesson.type === "pdf" && selectedLesson.contentUrl ? (
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <Viewer
                      fileUrl={getPdfUrl(selectedLesson.contentUrl)}
                      plugins={[defaultLayoutPluginInstance]}
                    />
                  </Worker>
                ) : selectedLesson.type === "code" ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: 24,
                      height: "100%",
                      overflow: "auto",
                      color: "#e6edf3",
                      background: "#0f1117",
                      fontSize: 13.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
                    }}
                  >
                    <code
                      dangerouslySetInnerHTML={{
                        __html: highlightCode(selectedLesson.contentUrl),
                      }}
                    />
                  </pre>
                ) : (
                  <div style={{ padding: 32 }}>
                    <Empty description="This lesson has no previewable content" />
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </Col>
    </Row>
  );

  const assignmentsTab = (
    <div style={{ marginTop: 4 }}>
      {allModulesFlat.length === 0 ? (
        <Card style={{ borderRadius: 12, border: "1px solid #eef0f3" }}>
          <Empty description="Expand a course in the Content tab to load modules first." />
        </Card>
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {allModulesFlat.map((m) => {
            const list = assignmentsByModule[m.id];
            return (
              <Card
                key={m.id}
                size="small"
                title={
                  <Space>
                    <BookOutlined style={{ color: "#6b7280" }} />
                    <Text strong>{m.title}</Text>
                  </Space>
                }
                style={{ borderRadius: 12, border: "1px solid #eef0f3", background: "#fff" }}
              >
                {!list ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                    <Spin size="small" />
                  </div>
                ) : list.length === 0 ? (
                  <Text type="secondary">No assignments in this module.</Text>
                ) : (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    {list.map((a) => {
                      const total = a.total ?? a.problemIds?.length ?? 0;
                      const solved = a.solved ?? 0;
                      const pct = total ? Math.round((solved / total) * 100) : 0;
                      const done = solved === total && total > 0;
                      const overdue = a.dueDate && new Date(a.dueDate) < new Date() && !done;
                      const solvedSet = new Set(a.solvedIds || []);
                      return (
                        <div
                          key={a.id}
                          style={{
                            border: "1px solid #eef0f3",
                            borderRadius: 10,
                            background: "#fafbfc",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              padding: "12px 14px",
                              background: "#fff",
                              borderBottom: "1px solid #eef0f3",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <Space size={8} align="center">
                                {done ? (
                                  <CheckCircleOutlined style={{ fontSize: 18, color: "#10b981" }} />
                                ) : (
                                  <FileTextOutlined style={{ fontSize: 16, color: "#6b7280" }} />
                                )}
                                <Text strong style={{ fontSize: 14 }}>
                                  {a.title}
                                </Text>
                                {overdue && (
                                  <Tag icon={<ClockCircleOutlined />} color="red" style={{ marginLeft: 4 }}>
                                    Overdue
                                  </Tag>
                                )}
                                {a.dueDate && !overdue && (
                                  <Tag style={tagStyle}>
                                    Due {new Date(a.dueDate).toLocaleDateString()}
                                  </Tag>
                                )}
                              </Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {solved}/{total} solved
                              </Text>
                            </div>
                            <Progress
                              percent={pct}
                              size="small"
                              showInfo={false}
                              strokeColor={pct === 100 ? "#10b981" : "#111827"}
                            />
                            <Text type="secondary" style={{ fontSize: 11.5 }}>
                              Pick any problem to start — you choose the order.
                            </Text>
                          </div>

                          <div style={{ padding: 6 }}>
                            {(a.problemIds || []).map((pid, idx) => {
                              const prob = allProblems.find((p) => p.id === pid);
                              const isSolved = solvedSet.has(pid);
                              const diff = prob?.difficulty;
                              const diffColor =
                                diff === "Easy"
                                  ? { bg: "#ecfdf5", fg: "#047857" }
                                  : diff === "Medium"
                                  ? { bg: "#fffbeb", fg: "#b45309" }
                                  : diff === "Hard"
                                  ? { bg: "#fef2f2", fg: "#b91c1c" }
                                  : { bg: "#f3f4f6", fg: "#6b7280" };
                              return (
                                <div
                                  key={pid}
                                  onClick={() => navigate(`/problems/${pid}`)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    transition: "background 0.15s",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#eef2f7")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <div
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background: isSolved ? "#10b981" : "#fff",
                                      border: isSolved ? "none" : "1.5px solid #d1d5db",
                                      color: "#fff",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {isSolved ? (
                                      <CheckCircleOutlined style={{ fontSize: 14 }} />
                                    ) : (
                                      <span style={{ color: "#6b7280" }}>{idx + 1}</span>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      flex: 1,
                                      color: isSolved ? "#6b7280" : "#111827",
                                      textDecoration: isSolved ? "line-through" : "none",
                                    }}
                                  >
                                    {prob?.title || pid}
                                  </span>
                                  {diff && (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        background: diffColor.bg,
                                        color: diffColor.fg,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {diff}
                                    </span>
                                  )}
                                  <RightOutlined style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </Space>
                )}
              </Card>
            );
          })}
        </Space>
      )}
    </div>
  );

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#111827", borderRadius: 12 } }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <Breadcrumb
          style={{ marginBottom: 14 }}
          items={[
            { title: <a onClick={() => navigate("/my-classrooms")}>My Classrooms</a> },
            { title: classroom.name },
          ]}
        />

        <Card
          style={{
            borderRadius: 14,
            marginBottom: 16,
            background: "#fff",
            border: "1px solid #eef0f3",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
          styles={{ body: { padding: 20 } }}
        >
          <Row align="middle" justify="space-between" gutter={16}>
            <Col flex="auto">
              <Space align="center" size={14}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: "#f5f7fa",
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ReadOutlined style={{ fontSize: 22 }} />
                </div>
                <div>
                  <Title
                    level={4}
                    style={{ margin: 0, fontWeight: 700, letterSpacing: -0.3, color: "#111827" }}
                  >
                    {classroom.name}
                  </Title>
                  <Space size={14} wrap style={{ marginTop: 4 }}>
                    <Space size={6}>
                      <Avatar
                        size={18}
                        icon={<UserOutlined />}
                        style={{ background: "#f3f4f6", color: "#6b7280" }}
                      />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {teacherName(classroom.teacher)}
                      </Text>
                    </Space>
                    {classroom.grade?.name && <Tag style={tagStyle}>{classroom.grade.name}</Tag>}
                    {classroom.speciality?.name && (
                      <Tag style={tagStyle}>{classroom.speciality.name}</Tag>
                    )}
                    {classroom.level?.name && <Tag style={tagStyle}>{classroom.level.name}</Tag>}
                  </Space>
                </div>
              </Space>
            </Col>
            <Col>
              <Tooltip title="You can view but not edit this classroom">
                <Tag icon={<LockOutlined />} style={{ ...tagStyle, padding: "4px 10px" }}>
                  Read-only
                </Tag>
              </Tooltip>
            </Col>
          </Row>
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ marginBottom: 8 }}
          items={[
            {
              key: "content",
              label: (
                <Space size={6}>
                  <BookOutlined /> Content
                </Space>
              ),
              children: contentTab,
            },
            {
              key: "assignments",
              label: (
                <Space size={6}>
                  <FileTextOutlined /> Assignments
                </Space>
              ),
              children: assignmentsTab,
            },
          ]}
        />
      </div>
    </ConfigProvider>
  );
}

const tagStyle = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  color: "#374151",
  borderRadius: 6,
  fontSize: 11.5,
  padding: "1px 8px",
};
