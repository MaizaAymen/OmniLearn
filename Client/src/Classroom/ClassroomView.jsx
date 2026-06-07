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
  Modal,
  Form,
  Select,
  Upload,
  Popconfirm,
  Checkbox,
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
  NotificationOutlined,
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  SettingOutlined,
  TeamOutlined,
  UserDeleteOutlined,
  EditOutlined,
  DeploymentUnitOutlined,
} from "@ant-design/icons";
import {
  createCourse,
  deleteCourse,
  createModule,
  deleteModule,
  createLesson,
  deleteLesson,
  uploadLessonFile,
  updateCourse,
  updateModule,
  updateLesson,
} from "../Admin/api";
import ClassroomProblemsTab from "./ClassroomProblemsTab";
import ClassroomRoadmapTab from "./ClassroomRoadmapTab";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const { Title, Text } = Typography;
import { SERVER_URL } from "../config";
const API = `${SERVER_URL}/api`;
const ADMIN = `${API}/admin`;
const STUDENT = `${API}/student`;

const getUser = () => {
  try {
    return JSON.parse(Cookies.get("user") || "{}");
  } catch {
    return {};
  }
};

const authHeaders = (json = false) => {
  const token = Cookies.get("token");
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
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
  const [announcements, setAnnouncements] = useState([]);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [announcementsLoaded, setAnnouncementsLoaded] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [editingAnnouncementDraft, setEditingAnnouncementDraft] = useState("");
  const [editingClassroomName, setEditingClassroomName] = useState(null);
  const [renaming, setRenaming] = useState(null); // { kind, id, value }
  const [instProblems, setInstProblems] = useState([]);
  // ── Teacher assignment management ────────────────────────────────────────
  const [createFor, setCreateFor] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [selectedPids, setSelectedPids] = useState([]);
  const [newDueDate, setNewDueDate] = useState("");
  const [newMaxAttempts, setNewMaxAttempts] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerDiff, setPickerDiff] = useState("");
  const [pickerTab, setPickerTab] = useState("all");
  const [newLanguage, setNewLanguage] = useState(null);
  const [newLockCorrect, setNewLockCorrect] = useState(false);
  const [newLockMentor, setNewLockMentor] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editAssignment, setEditAssignment] = useState(null);
  const [editLanguage, setEditLanguage] = useState(null);
  const [editLockCorrect, setEditLockCorrect] = useState(false);
  const [editLockMentor, setEditLockMentor] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPids, setEditPids] = useState([]);
  const [editDueDate, setEditDueDate] = useState("");
  const [editMaxAttempts, setEditMaxAttempts] = useState("");
  const [editSearch, setEditSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [rosterTarget, setRosterTarget] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  // Submissions viewer (teacher clicks a student name in the roster)
  const [codeStudent, setCodeStudent] = useState(null); // { id, name }
  const [codeData, setCodeData] = useState(null);       // { student, problems: [...] }
  const [codeLoading, setCodeLoading] = useState(false);

  const isTeacherOrAdmin = user.role === "teacher" || user.role === "admin";
  const canManage =
    user.role === "admin" ||
    (user.role === "teacher" && classroom?.teacher?.id === user.id);

  const [editor, setEditor] = useState(null); // { kind, course?, module? }
  const [editForm] = Form.useForm();
  const editType = Form.useWatch("type", editForm);

  const defaultLayoutPluginInstance = defaultLayoutPlugin({ sidebarTabs: () => [] });

  const BASE = user.role === "student" ? STUDENT : ADMIN;

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/classrooms/${classId}`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${BASE}/classrooms/${classId}/courses`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API}/ai/ai/getallproblems`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : [])),
      // Also pull any problems scoped specifically to this classroom so they show up in the picker.
      fetch(`${API}/ai/ai/getallproblems?classId=${classId}`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(async ([clsData, coursesData, problemsData, classProblems]) => {
        setClassroom(clsData);
        const globalList = Array.isArray(problemsData) ? problemsData : [];
        const classList = Array.isArray(classProblems) ? classProblems : [];
        setAllProblems([...globalList, ...classList]);
        const courseList = Array.isArray(coursesData) ? coursesData : [];
        setCourses(courseList);

        if (user.institutionId) {
          fetch(`${API}/ai/ai/getallproblems?scope=institution`, { headers: authHeaders() })
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => setInstProblems(Array.isArray(d) ? d : []))
            .catch(() => {});
        }

        const moduleEntries = await Promise.all(
          courseList.map(async (c) => {
            try {
              const res = await fetch(`${BASE}/courses/${c.id}/modules`, { headers: authHeaders() });
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
      const res = await fetch(`${BASE}/courses/${courseId}/modules`, { headers: authHeaders() });
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
      const res = await fetch(`${BASE}/modules/${moduleId}/lessons`, { headers: authHeaders() });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: arr }));
      return arr;
    } catch {
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: [] }));
      return [];
    }
  };

  const loadAnnouncements = async () => {
    if (!classId) return;
    try {
      const res = await fetch(`${BASE}/classrooms/${classId}/announcements`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoaded(true);
    }
  };

  const postAnnouncement = async () => {
    const content = announcementDraft.trim();
    if (!content) return;
    setPostingAnnouncement(true);
    try {
      const res = await fetch(`${ADMIN}/classrooms/${classId}/announcements`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to post");
      const created = await res.json();
      setAnnouncements((prev) => [created, ...prev]);
      setAnnouncementDraft("");
      message.success("Announcement posted");
    } catch {
      message.error("Failed to post announcement");
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const saveAnnouncementEdit = async () => {
    const content = editingAnnouncementDraft.trim();
    if (!content) return message.warning("Content cannot be empty");
    try {
      const res = await fetch(`${ADMIN}/announcements/${editingAnnouncementId}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setEditingAnnouncementId(null);
      message.success("Updated");
    } catch {
      message.error("Failed to update");
    }
  };

  const saveClassroomName = async () => {
    const name = (editingClassroomName || "").trim();
    if (!name) return message.warning("Name is required");
    try {
      const res = await fetch(`${ADMIN}/classrooms/${classId}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setClassroom((prev) => (prev ? { ...prev, name: updated.name } : prev));
      setEditingClassroomName(null);
      message.success("Updated");
    } catch {
      message.error("Failed to update");
    }
  };

  // Rename a course / module / lesson. Called when user finishes editing.
  const saveRename = async () => {
    if (!renaming) return;
    const title = renaming.value.trim();
    if (!title) {
      setRenaming(null);
      return;
    }

    try {
      if (renaming.kind === "course") {
        await updateCourse(renaming.id, { title });
      }
      if (renaming.kind === "module") {
        await updateModule(renaming.id, { title });
      }
      if (renaming.kind === "lesson") {
        await updateLesson(renaming.id, { title });
      }

      // Refresh the title in our local lists.
      if (renaming.kind === "course") {
        setCourses(courses.map((c) => c.id === renaming.id ? { ...c, title } : c));
      }
      if (renaming.kind === "module") {
        const next = {};
        for (const cid in modulesByCourse) {
          next[cid] = modulesByCourse[cid].map((m) => m.id === renaming.id ? { ...m, title } : m);
        }
        setModulesByCourse(next);
      }
      if (renaming.kind === "lesson") {
        const next = {};
        for (const mid in lessonsByModule) {
          next[mid] = lessonsByModule[mid].map((l) => l.id === renaming.id ? { ...l, title } : l);
        }
        setLessonsByModule(next);
        if (selectedLesson && selectedLesson.id === renaming.id) {
          setSelectedLesson({ ...selectedLesson, title });
        }
      }

      setRenaming(null);
      message.success("Renamed");
    } catch {
      message.error("Rename failed");
    }
  };

  const deleteAnnouncement = async (announcementId) => {
    try {
      const res = await fetch(`${ADMIN}/announcements/${announcementId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
      message.success("Deleted");
    } catch {
      message.error("Failed to delete");
    }
  };

  const removeStudent = async (studentId) => {
    try {
      const res = await fetch(`${ADMIN}/classrooms/${classId}/students/${studentId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to remove");
      setClassroom((prev) =>
        prev
          ? {
              ...prev,
              enrollments: (prev.enrollments || []).filter(
                (e) => (e.student?.id || e.studentId) !== studentId
              ),
            }
          : prev
      );
      message.success("Student removed");
    } catch {
      message.error("Failed to remove student");
    }
  };

  const openEditor = (kind, ctx = {}) => {
    editForm.resetFields();
    if (kind === "lesson") editForm.setFieldsValue({ type: "pdf" });
    setEditor({ kind, ...ctx });
  };

  const submitEditor = async () => {
    const values = await editForm.validateFields();
    try {
      if (editor.kind === "course") {
        const c = await createCourse({
          ...values,
          classId,
          levelId: classroom.levelId,
          teacherId: classroom.teacher?.id || user.id,
        });
        setCourses((p) => [...p, c]);
        setModulesByCourse((p) => ({ ...p, [c.id]: [] }));
      } else if (editor.kind === "module") {
        const m = await createModule({ ...values, courseId: editor.course.id });
        setModulesByCourse((p) => ({
          ...p,
          [editor.course.id]: [...(p[editor.course.id] || []), m],
        }));
      } else if (editor.kind === "lesson") {
        const l = await createLesson({
          ...values,
          moduleId: editor.module.id,
          courseId: editor.course.id,
        });
        setLessonsByModule((p) => ({
          ...p,
          [editor.module.id]: [...(p[editor.module.id] || []), l],
        }));
      }
      message.success("Created");
      setEditor(null);
    } catch (err) {
      message.error(err.message || "Failed");
    }
  };

  const removeEntity = async (kind, item, parent) => {
    try {
      if (kind === "course") {
        await deleteCourse(item.id);
        setCourses((p) => p.filter((c) => c.id !== item.id));
      } else if (kind === "module") {
        await deleteModule(item.id);
        setModulesByCourse((p) => ({
          ...p,
          [parent.id]: (p[parent.id] || []).filter((m) => m.id !== item.id),
        }));
      } else if (kind === "lesson") {
        await deleteLesson(item.id);
        setLessonsByModule((p) => ({
          ...p,
          [parent.id]: (p[parent.id] || []).filter((l) => l.id !== item.id),
        }));
        if (selectedLesson?.id === item.id) setSelectedLesson(null);
      }
      message.success("Deleted");
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  const handleLessonUpload = async ({ file, onSuccess, onError }) => {
    try {
      if (editType === "pdf" && file.type !== "application/pdf") {
        message.error("Please upload a PDF file");
        onError?.(new Error("bad type"));
        return;
      }
      const res = await uploadLessonFile(file);
      editForm.setFieldsValue({ contentUrl: res?.fileUrl || "" });
      message.success("File uploaded");
      onSuccess?.(res);
    } catch (err) {
      message.error(err.message || "Upload failed");
      onError?.(err);
    }
  };

  const loadAssignmentsForModule = async (moduleId, force = false) => {
    if ((assignmentsByModule[moduleId] && !force) || !user.id) return;
    try {
      const url = isTeacherOrAdmin
        ? `${API}/assignments/module/${moduleId}`
        : `${API}/assignments/student/${user.id}/module/${moduleId}`;
      const res = await fetch(url, { headers: authHeaders() });
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

  // ── Teacher assignment handlers ───────────────────────────────────────────
  const openCreateFor = (m) => {
    setCreateFor(m);
    setNewTitle(""); setSelectedPids([]); setNewDueDate(""); setNewMaxAttempts(""); setNewLanguage(null); setNewLockCorrect(false); setNewLockMentor(false);
    setPickerSearch(""); setPickerDiff(""); setPickerTab("all");
  };

  const handleCreateAssignment = async () => {
    if (!newTitle.trim() || selectedPids.length === 0) {
      message.error("Title and at least one problem are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/assignments`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          moduleId: createFor.id,
          classId,
          title: newTitle,
          problemIds: selectedPids,
          dueDate: newDueDate || null,
          maxAttempts: newMaxAttempts ? Number(newMaxAttempts) : null,
          language: newLanguage || null,
          lockCorrect: newLockCorrect,
          lockMentor: newLockMentor,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const created = await res.json();
      setAssignmentsByModule((prev) => ({
        ...prev,
        [createFor.id]: [...(prev[createFor.id] || []), created],
      }));
      setCreateFor(null);
      message.success("Draft saved — click Publish to notify students");
    } catch (err) {
      message.error(err.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handlePublishAssignment = async (a) => {
    try {
      const res = await fetch(`${API}/assignments/${a.id}/publish`, {
        method: "PUT",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAssignmentsByModule((prev) => {
        const list = prev[a.moduleId] || [];
        return { ...prev, [a.moduleId]: list.map((x) => x.id === updated.id ? updated : x) };
      });
      message.success(updated.isPublished ? "Published — students notified" : "Moved to draft");
    } catch {
      message.error("Failed");
    }
  };

  const openEditAssignment = (a) => {
    setEditAssignment(a);
    setEditTitle(a.title);
    setEditPids([...a.problemIds]);
    setEditDueDate(a.dueDate ? new Date(a.dueDate).toISOString().split("T")[0] : "");
    setEditMaxAttempts(a.maxAttempts ?? "");
    setEditLanguage(a.language || null);
    setEditLockCorrect(!!a.lockCorrect);
    setEditLockMentor(!!a.lockMentor);
    setEditSearch("");
  };

  const handleEditAssignment = async () => {
    if (!editTitle.trim() || editPids.length === 0) {
      message.error("Title and at least one problem required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/assignments/${editAssignment.id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({
          title: editTitle,
          problemIds: editPids,
          dueDate: editDueDate || null,
          maxAttempts: editMaxAttempts ? Number(editMaxAttempts) : null,
          language: editLanguage || null,
          lockCorrect: editLockCorrect,
          lockMentor: editLockMentor,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAssignmentsByModule((prev) => {
        const list = prev[editAssignment.moduleId] || [];
        return { ...prev, [editAssignment.moduleId]: list.map((x) => x.id === updated.id ? { ...x, ...updated } : x) };
      });
      setEditAssignment(null);
      message.success("Updated");
    } catch {
      message.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (a) => {
    try {
      await fetch(`${API}/assignments/${a.id}`, { method: "DELETE", headers: authHeaders() });
      setAssignmentsByModule((prev) => {
        const list = prev[a.moduleId] || [];
        return { ...prev, [a.moduleId]: list.filter((x) => x.id !== a.id) };
      });
      message.success("Deleted");
    } catch {
      message.error("Failed to delete");
    }
  };

  const openRoster = async (a) => {
    setRosterTarget(a);
    setRosterData(null);
    setRosterLoading(true);
    try {
      const res = await fetch(`${API}/assignments/${a.id}/roster`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setRosterData(await res.json());
    } catch {
      message.error("Failed to load roster");
    } finally {
      setRosterLoading(false);
    }
  };

  // Open the modal showing a student's submitted code for each problem
  // of the currently-open assignment (rosterTarget).
  const openStudentCode = async (student) => {
    if (!rosterTarget) return;
    setCodeStudent(student);
    setCodeData(null);
    setCodeLoading(true);
    try {
      const res = await fetch(
        `${API}/assignments/${rosterTarget.id}/student/${student.id}/submissions`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      setCodeData(await res.json());
    } catch {
      message.error("Failed to load student code");
    } finally {
      setCodeLoading(false);
    }
  };

  const pickerProblems = (search, diff, tab) => {
    let base;
    if (tab === "inst") base = instProblems;
    else if (tab === "class") base = allProblems.filter((p) => p.scope === "class" && p.classId === classId);
    else base = allProblems.filter((p) => p.scope !== "class" || p.classId === classId);
    return base.filter((p) =>
      (!diff || p.difficulty === diff) &&
      (!search || p.title?.toLowerCase().includes(search.toLowerCase()))
    );
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

  useEffect(() => {
    if (activeTab !== "announcements" || announcementsLoaded) return;
    loadAnnouncements();
  }, [activeTab, announcementsLoaded]);

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
              <Space size={6}>
                <Tag style={tagStyle}>{courses.length}</Tag>
                {canManage && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openEditor("course")}
                    style={{ background: "#111827", borderColor: "#111827" }}
                  >
                    Course
                  </Button>
                )}
              </Space>
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
                      {canManage && renaming?.kind === "course" && renaming.id === course.id ? (
                        <Input
                          autoFocus
                          size="small"
                          style={{ flex: 1 }}
                          value={renaming.value}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                          onPressEnter={saveRename}
                          onBlur={saveRename}
                        />
                      ) : (
                        <Text
                          strong
                          style={{ fontSize: 13, flex: 1 }}
                          onDoubleClick={(e) => {
                            if (!canManage) return;
                            e.stopPropagation();
                            setRenaming({ kind: "course", id: course.id, value: course.title || course.name || "" });
                          }}
                        >
                          {course.title || course.name}
                        </Text>
                      )}
                      {canManage && (
                        <Space size={2} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Add module">
                            <Button
                              size="small"
                              type="text"
                              icon={<PlusOutlined style={{ fontSize: 11 }} />}
                              onClick={() => openEditor("module", { course })}
                            />
                          </Tooltip>
                          <Popconfirm
                            title="Delete this course?"
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => removeEntity("course", course)}
                          >
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                            />
                          </Popconfirm>
                        </Space>
                      )}
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
                                  {canManage && renaming?.kind === "module" && renaming.id === m.id ? (
                                    <Input
                                      autoFocus
                                      size="small"
                                      style={{ flex: 1 }}
                                      value={renaming.value}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                                      onPressEnter={saveRename}
                                      onBlur={saveRename}
                                    />
                                  ) : (
                                    <Text
                                      style={{ fontSize: 12.5, flex: 1, color: "#374151" }}
                                      onDoubleClick={(e) => {
                                        if (!canManage) return;
                                        e.stopPropagation();
                                        setRenaming({ kind: "module", id: m.id, value: m.title || "" });
                                      }}
                                    >
                                      {m.title}
                                    </Text>
                                  )}
                                  {canManage && (
                                    <Space size={2} onClick={(e) => e.stopPropagation()}>
                                      <Tooltip title="Add lesson">
                                        <Button
                                          size="small"
                                          type="text"
                                          icon={<PlusOutlined style={{ fontSize: 11 }} />}
                                          onClick={() => openEditor("lesson", { course, module: m })}
                                        />
                                      </Tooltip>
                                      <Popconfirm
                                        title="Delete this module?"
                                        okText="Delete"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={() => removeEntity("module", m, course)}
                                      >
                                        <Button
                                          size="small"
                                          type="text"
                                          danger
                                          icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                                        />
                                      </Popconfirm>
                                    </Space>
                                  )}
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
                                            {canManage && renaming?.kind === "lesson" && renaming.id === l.id ? (
                                              <Input
                                                autoFocus
                                                size="small"
                                                style={{ flex: 1 }}
                                                value={renaming.value}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                                                onPressEnter={saveRename}
                                                onBlur={saveRename}
                                              />
                                            ) : (
                                              <span
                                                style={{
                                                  fontSize: 12.5,
                                                  whiteSpace: "nowrap",
                                                  overflow: "hidden",
                                                  textOverflow: "ellipsis",
                                                  flex: 1,
                                                }}
                                                onDoubleClick={(e) => {
                                                  if (!canManage) return;
                                                  e.stopPropagation();
                                                  setRenaming({ kind: "lesson", id: l.id, value: l.title || "" });
                                                }}
                                              >
                                                {l.title}
                                              </span>
                                            )}
                                            {canManage && (
                                              <Popconfirm
                                                title="Delete this lesson?"
                                                okText="Delete"
                                                okButtonProps={{ danger: true }}
                                                onConfirm={(e) => {
                                                  e?.stopPropagation?.();
                                                  removeEntity("lesson", l, m);
                                                }}
                                                onCancel={(e) => e?.stopPropagation?.()}
                                              >
                                                <Button
                                                  size="small"
                                                  type="text"
                                                  danger
                                                  onClick={(e) => e.stopPropagation()}
                                                  icon={
                                                    <DeleteOutlined
                                                      style={{
                                                        fontSize: 11,
                                                        color: active ? "#fff" : undefined,
                                                      }}
                                                    />
                                                  }
                                                />
                                              </Popconfirm>
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
                  {!canManage && (
                    <Tag icon={<LockOutlined />} style={tagStyle}>
                      Read-only
                    </Tag>
                  )}
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
          <Empty description="No modules found — add a course and modules in the Content tab first." />
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
                extra={canManage && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openCreateFor(m)}
                    style={{ background: "#111827", borderColor: "#111827" }}
                  >
                    New Assignment
                  </Button>
                )}
                style={{ borderRadius: 12, border: "1px solid #eef0f3", background: "#fff" }}
              >
                {!list ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                    <Spin size="small" />
                  </div>
                ) : list.length === 0 ? (
                  <Text type="secondary">
                    {canManage
                      ? "No assignments yet — click New Assignment to create one."
                      : "No assignments in this module."}
                  </Text>
                ) : canManage ? (
                  /* ── Teacher view ── */
                  <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    {list.map((a) => {
                      const total = a.problemIds?.length ?? 0;
                      const now = new Date();
                      const isLate = a.dueDate && new Date(a.dueDate) < now;
                      const hoursLeft = a.dueDate ? (new Date(a.dueDate) - now) / 36e5 : null;
                      const soonDue = hoursLeft !== null && hoursLeft > 0 && hoursLeft < 24;
                      return (
                        <div
                          key={a.id}
                          style={{ border: "1px solid #eef0f3", borderRadius: 10, padding: "12px 14px", background: "#fafbfc" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                            <Space size={6} wrap align="center">
                              <Text strong style={{ fontSize: 14 }}>{a.title}</Text>
                              <Tag color={a.isPublished ? "green" : "orange"} style={{ fontSize: 11 }}>
                                {a.isPublished ? "Published" : "Draft"}
                              </Tag>
                              {isLate && <Tag icon={<ClockCircleOutlined />} color="red">Overdue</Tag>}
                              {soonDue && <Tag icon={<ClockCircleOutlined />} color="warning">{Math.round(hoursLeft)}h left</Tag>}
                              {a.dueDate && !isLate && !soonDue && (
                                <Tag style={tagStyle}>Due {new Date(a.dueDate).toLocaleDateString()}</Tag>
                              )}
                              {a.maxAttempts && <Tag style={tagStyle}>Max {a.maxAttempts} attempts</Tag>}
                              {a.language && <Tag color="blue" style={{ fontSize: 11 }}>🔒 {a.language}</Tag>}
                              {a.lockCorrect && <Tag color="red" style={{ fontSize: 11 }}>🔒 Correct off</Tag>}
                              {a.lockMentor && <Tag color="red" style={{ fontSize: 11 }}>🔒 Mentor off</Tag>}
                              <Text type="secondary" style={{ fontSize: 12 }}>{total} problem{total !== 1 ? "s" : ""}</Text>
                            </Space>
                            <Space size={4}>
                              <Button
                                size="small"
                                type={a.isPublished ? "default" : "primary"}
                                icon={<SendOutlined />}
                                onClick={() => handlePublishAssignment(a)}
                                style={!a.isPublished ? { background: "#111827", borderColor: "#111827" } : {}}
                              >
                                {a.isPublished ? "Unpublish" : "Publish"}
                              </Button>
                              <Tooltip title="Edit">
                                <Button size="small" icon={<EditOutlined />} onClick={() => openEditAssignment(a)} />
                              </Tooltip>
                              <Tooltip title="Student roster">
                                <Button size="small" icon={<TeamOutlined />} onClick={() => openRoster(a)} />
                              </Tooltip>
                              <Popconfirm
                                title="Delete this assignment?"
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleDeleteAssignment(a)}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {(a.problemIds || []).map((pid) => {
                              const prob = allProblems.find((p) => p.id === pid);
                              return (
                                <Tag
                                  key={pid}
                                  style={{ cursor: "pointer", ...tagStyle }}
                                  onClick={() => navigate(`/problems/${pid}`)}
                                >
                                  {prob?.title || pid}
                                </Tag>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </Space>
                ) : (
                  /* ── Student view ── */
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
                          style={{ border: "1px solid #eef0f3", borderRadius: 10, background: "#fafbfc", overflow: "hidden" }}
                        >
                          <div style={{ padding: "12px 14px", background: "#fff", borderBottom: "1px solid #eef0f3" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                              <Space size={8} align="center">
                                {done
                                  ? <CheckCircleOutlined style={{ fontSize: 18, color: "#10b981" }} />
                                  : <FileTextOutlined style={{ fontSize: 16, color: "#6b7280" }} />}
                                <Text strong style={{ fontSize: 14 }}>{a.title}</Text>
                                {overdue && <Tag icon={<ClockCircleOutlined />} color="red">Overdue</Tag>}
                                {a.dueDate && !overdue && (
                                  <Tag style={tagStyle}>Due {new Date(a.dueDate).toLocaleDateString()}</Tag>
                                )}
                              </Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>{solved}/{total} solved</Text>
                            </div>
                            <Progress percent={pct} size="small" showInfo={false} strokeColor={pct === 100 ? "#10b981" : "#111827"} />
                            <Text type="secondary" style={{ fontSize: 11.5 }}>Pick any problem to start — you choose the order.</Text>
                          </div>
                          <div style={{ padding: 6 }}>
                            {(a.problemIds || []).map((pid, idx) => {
                              const prob = allProblems.find((p) => p.id === pid);
                              const isSolved = solvedSet.has(pid);
                              const diff = prob?.difficulty;
                              const diffColor =
                                diff === "Easy" ? { bg: "#ecfdf5", fg: "#047857" } :
                                diff === "Medium" ? { bg: "#fffbeb", fg: "#b45309" } :
                                diff === "Hard" ? { bg: "#fef2f2", fg: "#b91c1c" } :
                                { bg: "#f3f4f6", fg: "#6b7280" };
                              return (
                                <div
                                  key={pid}
                                  onClick={() => navigate(`/problems/${pid}`, (a.language || a.lockCorrect || a.lockMentor) ? { state: { lockedLanguage: a.language || null, lockCorrect: !!a.lockCorrect, lockMentor: !!a.lockMentor } } : undefined)}
                                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#eef2f7")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: isSolved ? "#10b981" : "#fff", border: isSolved ? "none" : "1.5px solid #d1d5db", color: "#fff", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                                    {isSolved
                                      ? <CheckCircleOutlined style={{ fontSize: 14 }} />
                                      : <span style={{ color: "#6b7280" }}>{idx + 1}</span>}
                                  </div>
                                  <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, color: isSolved ? "#6b7280" : "#111827", textDecoration: isSolved ? "line-through" : "none" }}>
                                    {prob?.title || pid}
                                  </span>
                                  {diff && (
                                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: diffColor.bg, color: diffColor.fg, flexShrink: 0 }}>
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

  const announcementsTab = (
    <div style={{ marginTop: 4 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {isTeacherOrAdmin && (
          <Card
            size="small"
            style={{ borderRadius: 12, border: "1px solid #eef0f3", background: "#fff" }}
          >
            <Input.TextArea
              placeholder="Share something with your class…"
              value={announcementDraft}
              onChange={(e) => setAnnouncementDraft(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={postingAnnouncement}
                onClick={postAnnouncement}
                style={{ background: "#111827", borderColor: "#111827" }}
              >
                Post
              </Button>
            </div>
          </Card>
        )}

        {!announcementsLoaded ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : announcements.length === 0 ? (
          <Card style={{ borderRadius: 12, border: "1px solid #eef0f3" }}>
            <Empty description="No announcements yet." />
          </Card>
        ) : (
          announcements.map((a) => {
            const isOwner = a.author && a.author.id === user.id;
            const canEdit = isOwner;
            const canDelete = user.role === "admin" || isOwner;
            const isEditing = editingAnnouncementId === a.id;
            return (
              <Card
                key={a.id}
                size="small"
                style={{ borderRadius: 12, border: "1px solid #eef0f3", background: "#fff" }}
              >
                <Space align="start" size={10} style={{ width: "100%" }}>
                  <Avatar
                    size={36}
                    icon={<UserOutlined />}
                    style={{ background: "#f3f4f6", color: "#6b7280" }}
                  />
                  <div style={{ flex: 1 }}>
                    <Space
                      size={8}
                      wrap
                      style={{ width: "100%", justifyContent: "space-between" }}
                    >
                      <Space size={8} wrap>
                        <Text strong style={{ fontSize: 13 }}>
                          {teacherName(a.author)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11.5 }}>
                          {new Date(a.createdAt).toLocaleString()}
                        </Text>
                      </Space>
                      <Space size={4}>
                        {canEdit && !isEditing && (
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setEditingAnnouncementId(a.id);
                              setEditingAnnouncementDraft(a.content || "");
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && !isEditing && (
                          <Button
                            type="text"
                            size="small"
                            danger
                            onClick={() => deleteAnnouncement(a.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </Space>
                    </Space>
                    {isEditing ? (
                      <div style={{ marginTop: 6 }}>
                        <Input.TextArea
                          value={editingAnnouncementDraft}
                          onChange={(e) => setEditingAnnouncementDraft(e.target.value)}
                          autoSize={{ minRows: 2, maxRows: 8 }}
                        />
                        <Space style={{ marginTop: 8 }}>
                          <Button type="primary" size="small" onClick={saveAnnouncementEdit}>
                            Save
                          </Button>
                          <Button size="small" onClick={() => setEditingAnnouncementId(null)}>
                            Cancel
                          </Button>
                        </Space>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 6,
                          whiteSpace: "pre-wrap",
                          color: "#1f2937",
                          fontSize: 13.5,
                          lineHeight: 1.5,
                        }}
                      >
                        {a.content}
                      </div>
                    )}
                  </div>
                </Space>
              </Card>
            );
          })
        )}
      </Space>
    </div>
  );

  const students = (classroom.enrollments || [])
    .map((e) => e.student)
    .filter(Boolean);

  const membersTab = (
    <Card
      size="small"
      style={{ borderRadius: 12, border: "1px solid #eef0f3", background: "#fff", marginTop: 4 }}
    >
      <Space align="center" style={{ marginBottom: 12 }}>
        <TeamOutlined style={{ color: "#6b7280" }} />
        <Text strong>Students</Text>
        <Tag style={tagStyle}>{students.length}</Tag>
      </Space>

      {students.length === 0 ? (
        <Empty description="No students have joined yet." />
      ) : (
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          {students.map((s) => {
            const fullName =
              `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.email;
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                }}
              >
                <Avatar
                  size={32}
                  src={s.avatar || undefined}
                  icon={!s.avatar ? <UserOutlined /> : undefined}
                  style={{ background: "#eef2f7", color: "#374151" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ display: "block", fontSize: 13 }}>{fullName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{s.email}</Text>
                </div>
                {canManage && (
                  <Popconfirm
                    title={`Remove ${fullName}?`}
                    okText="Remove"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeStudent(s.id)}
                  >
                    <Button type="text" size="small" danger icon={<UserDeleteOutlined />} />
                  </Popconfirm>
                )}
              </div>
            );
          })}
        </Space>
      )}
    </Card>
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
                  {editingClassroomName !== null ? (
                    <Space.Compact style={{ width: 360 }}>
                      <Input
                        autoFocus
                        value={editingClassroomName}
                        onChange={(e) => setEditingClassroomName(e.target.value)}
                        onPressEnter={saveClassroomName}
                      />
                      <Button type="primary" onClick={saveClassroomName}>Save</Button>
                      <Button onClick={() => setEditingClassroomName(null)}>Cancel</Button>
                    </Space.Compact>
                  ) : (
                    <Space align="center" size={6}>
                      <Title
                        level={4}
                        style={{ margin: 0, fontWeight: 700, letterSpacing: -0.3, color: "#111827" }}
                      >
                        {classroom.name}
                      </Title>
                      {canManage && (
                        <Tooltip title="Edit classroom name">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setEditingClassroomName(classroom.name || "")}
                          />
                        </Tooltip>
                      )}
                    </Space>
                  )}
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
              <Tooltip
                title={
                  canManage
                    ? "You can manage this classroom's content"
                    : "You can view but not edit this classroom"
                }
              >
                <Tag
                  icon={canManage ? <SettingOutlined /> : <LockOutlined />}
                  style={{ ...tagStyle, padding: "4px 10px" }}
                >
                  {canManage ? "Manage" : "Read-only"}
                </Tag>
              </Tooltip>
            </Col>
          </Row>
        </Card>

        <Modal
          title={
            editor?.kind === "course"
              ? "New course"
              : editor?.kind === "module"
              ? `New module in ${editor?.course?.title || ""}`
              : editor?.kind === "lesson"
              ? `New lesson in ${editor?.module?.title || ""}`
              : ""
          }
          open={!!editor}
          onCancel={() => setEditor(null)}
          onOk={submitEditor}
          okText="Create"
          destroyOnClose
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input autoFocus placeholder="Title" />
            </Form.Item>

            {editor?.kind !== "lesson" && (
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} placeholder="Optional" />
              </Form.Item>
            )}

            {editor?.kind === "lesson" && (
              <>
                <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "pdf", label: "PDF" },
                      { value: "code", label: "Code" },
                      { value: "video", label: "Video" },
                      { value: "text", label: "Text" },
                    ]}
                  />
                </Form.Item>

                {editType === "pdf" ? (
                  <Form.Item label="PDF file" required>
                    <Upload customRequest={handleLessonUpload} maxCount={1} accept="application/pdf">
                      <Button icon={<UploadOutlined />}>Upload PDF</Button>
                    </Upload>
                    <Form.Item
                      name="contentUrl"
                      noStyle
                      rules={[{ required: true, message: "Upload a PDF" }]}
                    >
                      <Input type="hidden" />
                    </Form.Item>
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="contentUrl"
                    label={editType === "code" ? "Code" : "Content URL / text"}
                    rules={[{ required: true }]}
                  >
                    {editType === "code" ? (
                      <Input.TextArea rows={6} placeholder="Paste code here" />
                    ) : (
                      <Input placeholder="https://..." />
                    )}
                  </Form.Item>
                )}
              </>
            )}
          </Form>
        </Modal>

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
              key: "announcements",
              label: (
                <Space size={6}>
                  <NotificationOutlined /> Announcements
                </Space>
              ),
              children: announcementsTab,
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
            {
              key: "roadmap",
              label: (
                <Space size={6}>
                  <DeploymentUnitOutlined /> Roadmap
                </Space>
              ),
              children: <ClassroomRoadmapTab classId={classId} canManage={canManage} />,
            },
            ...(canManage
              ? [
                  {
                    key: "problems",
                    label: (
                      <Space size={6}>
                        <CodeOutlined /> Problems
                      </Space>
                    ),
                    children: (
                      <ClassroomProblemsTab
                        classId={classId}
                        onBankChanged={() => {
                          // Refresh the assignment picker so newly-added classroom
                          // problems show up immediately when the teacher switches tabs.
                          fetch(`${API}/ai/ai/getallproblems?classId=${classId}`, { headers: authHeaders() })
                            .then((r) => (r.ok ? r.json() : []))
                            .then((classProbs) => {
                              setAllProblems((prev) => {
                                const globalOnly = prev.filter((p) => p.scope !== "class");
                                return [...globalOnly, ...(Array.isArray(classProbs) ? classProbs : [])];
                              });
                            })
                            .catch(() => {});
                        }}
                      />
                    ),
                  },
                ]
              : []),
            {
              key: "members",
              label: (
                <Space size={6}>
                  <TeamOutlined /> Students ({students.length})
                </Space>
              ),
              children: membersTab,
            },
          ]}
        />
      </div>
      {/* ── Create Assignment Modal ── */}
      <Modal
        title={`New Assignment — ${createFor?.title || ""}`}
        open={!!createFor}
        onCancel={() => setCreateFor(null)}
        onOk={handleCreateAssignment}
        okText={creating ? "Creating…" : "Save as Draft"}
        confirmLoading={creating}
        width={520}
        destroyOnClose
      >
        <Space direction="vertical" size={14} style={{ width: "100%", paddingTop: 4 }}>
          <Input
            placeholder="Assignment title (e.g. Arrays Practice)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Due date (optional)</Text>
              <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
            </Col>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Max attempts (optional)</Text>
              <Input type="number" min={1} placeholder="Unlimited" value={newMaxAttempts} onChange={(e) => setNewMaxAttempts(e.target.value)} />
            </Col>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Lock language</Text>
              <Select
                allowClear
                placeholder="Any"
                style={{ width: "100%" }}
                value={newLanguage || undefined}
                onChange={(v) => setNewLanguage(v || null)}
                options={[
                  { value: "javascript", label: "JavaScript" },
                  { value: "python", label: "Python" },
                  { value: "java", label: "Java" },
                  { value: "typescript", label: "TypeScript" },
                  { value: "csharp", label: "C#" },
                  { value: "php", label: "PHP" },
                ]}
              />
            </Col>
          </Row>

          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>AI restrictions</Text>
            <Checkbox checked={newLockCorrect} onChange={(e) => setNewLockCorrect(e.target.checked)}>
              Lock "Correct with AI"
            </Checkbox>
            <Checkbox checked={newLockMentor} onChange={(e) => setNewLockMentor(e.target.checked)}>
              Lock "AI Mentor"
            </Checkbox>
          </Space>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>Problems — {selectedPids.length} selected</Text>
              <Space size={4}>
                {["", "Easy", "Medium", "Hard"].map((d) => (
                  <Tag
                    key={d}
                    style={{ cursor: "pointer", ...(pickerDiff === d ? { background: "#111827", color: "#fff", border: "none" } : tagStyle) }}
                    onClick={() => setPickerDiff(d)}
                  >{d || "All"}</Tag>
                ))}
              </Space>
            </div>
            <Input
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Search problems…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              style={{ marginBottom: 8 }}
              allowClear
            />
            <Space size={0} style={{ marginBottom: 8, flexWrap: "wrap" }}>
              {[
                { key: "all", label: "Global" },
                ...(user.institutionId ? [{ key: "inst", label: "My Institution" }] : []),
                ...(canManage ? [{ key: "class", label: "This classroom" }] : []),
              ].map((t) => (
                <Button
                  key={t.key}
                  size="small"
                  type={pickerTab === t.key ? "primary" : "default"}
                  onClick={() => setPickerTab(t.key)}
                  style={pickerTab === t.key ? { background: "#111827", borderColor: "#111827" } : {}}
                >
                  {t.label}
                </Button>
              ))}
            </Space>
            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #eef0f3", borderRadius: 8, padding: 4 }}>
              {pickerProblems(pickerSearch, pickerDiff, pickerTab).length === 0
                ? <Text type="secondary" style={{ display: "block", textAlign: "center", padding: 16 }}>No problems match</Text>
                : pickerProblems(pickerSearch, pickerDiff, pickerTab).map((p) => (
                  <div
                    key={p.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f7fa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={() => setSelectedPids((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                  >
                    <Checkbox checked={selectedPids.includes(p.id)} onChange={() => {}} />
                    <Text style={{ flex: 1, fontSize: 13 }}>{p.title}</Text>
                    {p.difficulty && (
                      <Tag color={p.difficulty === "Easy" ? "green" : p.difficulty === "Medium" ? "orange" : "red"} style={{ fontSize: 11 }}>
                        {p.difficulty}
                      </Tag>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </Space>
      </Modal>

      {/* ── Edit Assignment Modal ── */}
      <Modal
        title="Edit Assignment"
        open={!!editAssignment}
        onCancel={() => setEditAssignment(null)}
        onOk={handleEditAssignment}
        okText={saving ? "Saving…" : "Save Changes"}
        confirmLoading={saving}
        width={520}
        destroyOnClose
      >
        <Space direction="vertical" size={14} style={{ width: "100%", paddingTop: 4 }}>
          <Input
            placeholder="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Due date</Text>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </Col>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Max attempts</Text>
              <Input type="number" min={1} placeholder="Unlimited" value={editMaxAttempts} onChange={(e) => setEditMaxAttempts(e.target.value)} />
            </Col>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Lock language</Text>
              <Select
                allowClear
                placeholder="Any"
                style={{ width: "100%" }}
                value={editLanguage || undefined}
                onChange={(v) => setEditLanguage(v || null)}
                options={[
                  { value: "javascript", label: "JavaScript" },
                  { value: "python", label: "Python" },
                  { value: "java", label: "Java" },
                  { value: "typescript", label: "TypeScript" },
                  { value: "csharp", label: "C#" },
                  { value: "php", label: "PHP" },
                ]}
              />
            </Col>
          </Row>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>AI restrictions</Text>
            <Checkbox checked={editLockCorrect} onChange={(e) => setEditLockCorrect(e.target.checked)}>
              Lock "Correct with AI"
            </Checkbox>
            <Checkbox checked={editLockMentor} onChange={(e) => setEditLockMentor(e.target.checked)}>
              Lock "AI Mentor"
            </Checkbox>
          </Space>
          <div>
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>Problems — {editPids.length} selected</Text>
            <Input
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Search problems…"
              value={editSearch}
              onChange={(e) => setEditSearch(e.target.value)}
              style={{ marginBottom: 8 }}
              allowClear
            />
            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #eef0f3", borderRadius: 8, padding: 4 }}>
              {allProblems
                .filter((p) => !editSearch || p.title?.toLowerCase().includes(editSearch.toLowerCase()))
                .map((p) => (
                  <div
                    key={p.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f7fa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={() => setEditPids((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                  >
                    <Checkbox checked={editPids.includes(p.id)} onChange={() => {}} />
                    <Text style={{ flex: 1, fontSize: 13 }}>{p.title}</Text>
                    {p.difficulty && (
                      <Tag color={p.difficulty === "Easy" ? "green" : p.difficulty === "Medium" ? "orange" : "red"} style={{ fontSize: 11 }}>
                        {p.difficulty}
                      </Tag>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </Space>
      </Modal>

      {/* ── Roster Modal ── */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: "#1677ff" }} />
            <span>{rosterTarget?.title} — Student Roster</span>
          </Space>
        }
        open={!!rosterTarget}
        onCancel={() => { setRosterTarget(null); setRosterData(null); }}
        footer={null}
        width={620}
        destroyOnClose
      >
        {rosterLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Spin /></div>
        ) : rosterData ? (
          <>
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              {rosterData.students.filter((s) => s.solvedIds.length === rosterTarget.problemIds.length).length}
              {" / "}{rosterData.total} students fully completed
            </Text>
            {rosterData.students.length === 0 ? (
              <Empty description="No enrolled students — assign classId when creating the assignment to see roster data." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #eef0f3" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Student</th>
                      {rosterTarget.problemIds.map((pid, i) => {
                        const prob = allProblems.find((p) => p.id === pid);
                        return (
                          <th key={pid} style={{ textAlign: "center", padding: "8px 6px", fontWeight: 600, fontSize: 11 }} title={prob?.title}>
                            P{i + 1}
                          </th>
                        );
                      })}
                      <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600 }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterData.students.map((s) => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 500 }}>
                          <Button type="link" style={{ padding: 0, fontWeight: 500 }} onClick={() => openStudentCode(s)}>
                            {s.name}
                          </Button>
                        </td>
                        {rosterTarget.problemIds.map((pid) => (
                          <td key={pid} style={{ textAlign: "center", padding: "8px 6px" }}>
                            {s.solvedIds.includes(pid)
                              ? <CheckCircleOutlined style={{ color: "#10b981", fontSize: 16 }} />
                              : <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #d1d5db", display: "inline-block" }} />}
                          </td>
                        ))}
                        <td style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600 }}>
                          {s.solvedIds.length}/{rosterTarget.problemIds.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </Modal>

      {/* ── Student Code Modal (opens when teacher clicks a student name) ── */}
      <Modal
        title={
          <Space>
            <CodeOutlined style={{ color: "#1677ff" }} />
            <span>{codeStudent?.name} — Submitted code</span>
          </Space>
        }
        open={!!codeStudent}
        onCancel={() => { setCodeStudent(null); setCodeData(null); }}
        footer={null}
        width={780}
        destroyOnClose
      >
        {codeLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Spin /></div>
        ) : codeData ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {codeData.problems.map((p, i) => (
              <div key={p.problemId}>
                <Text strong>P{i + 1}. {p.title}</Text>
                {p.submission ? (
                  <>
                    <div style={{ margin: "4px 0 6px", fontSize: 12, color: "#6b7280" }}>
                      <Tag color={p.submission.isCorrect ? "green" : "default"}>
                        {p.submission.isCorrect ? "Correct" : (p.submission.status || "submitted")}
                      </Tag>
                      <span>{p.submission.language}</span>
                      <span style={{ margin: "0 6px" }}>·</span>
                      <span>{new Date(p.submission.createdAt).toLocaleString()}</span>
                    </div>
                    <pre style={{
                      background: "#1e1e1e", color: "#e5e7eb", padding: 12,
                      borderRadius: 6, fontSize: 12, overflowX: "auto", margin: 0,
                    }}>
                      <code dangerouslySetInnerHTML={{ __html: highlightCode(p.submission.userCode) }} />
                    </pre>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>
                    No submission yet.
                  </div>
                )}
              </div>
            ))}
          </Space>
        ) : null}
      </Modal>

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
