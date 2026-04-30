import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Col,
  List,
  Breadcrumb,
  Avatar,
  Divider,
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  message,
  Upload,
  Popconfirm,
  Spin,
  Tag,
  Modal,
  ConfigProvider,
  Drawer,
  Tabs,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  AppstoreOutlined,
  UploadOutlined,
  LeftOutlined,
  TeamOutlined,
  CopyOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
import LessonPdfViewer from "./LessonPdfViewer";
import ModuleAssignmentsTab from "./ModuleAssignmentsTab";
import AdminLayout from "./AdminLayout";
// Nouveaux onglets pour le système de plans / institutions.
import FreeTierTab from "./FreeTierTab";
import ProTierTab from "./ProTierTab";
import UsersByPlanTab from "./UsersByPlanTab";
import InstitutionTab from "./InstitutionTab";
import "./AdminDashboard.css";
import {
  fetchGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  fetchSpecialities,
  createSpeciality,
  updateSpeciality,
  deleteSpeciality,
  fetchLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  fetchUsers,
  fetchModules,
  createModule,
  updateModule,
  deleteModule,
  fetchLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  uploadLessonFile,
  fetchClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  fetchClassroomCourses,
  fetchClassroomModules,
  addClassroomModule,
  removeClassroomModule,
  fetchAvailableStudents,
  assignStudentsToClassroom,
  fetchClassroomStudents,
  removeStudentFromClassroom,
} from "./api";

const { Title, Text } = Typography;

const blackWhiteTheme = {
  token: {
    colorPrimary: "#1a73e8",
    colorBgContainer: "#ffffff",
    colorBorder: "#dadce0",
    colorBorderSecondary: "#e8eaed",
    borderRadius: 6,
    fontFamily: "'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    colorText: "#202124",
    colorTextSecondary: "#5f6368",
    colorFillAlter: "#f8f9fa",
  },
  components: {
    Table: {
      headerBg: "#f8f9fa",
      rowHoverBg: "#f1f3f4",
      borderColor: "#e8eaed",
    },
    Button: {
      borderRadius: 6,
    },
    Input: {
      borderRadius: 6,
    },
    Select: {
      borderRadius: 6,
    },
    Modal: {
      borderRadius: 8,
    },
  },
};

// ── Problem Bank Section (standalone, used inside AdminDashboard) ─────────────
const STATUS_COLOR = { published: "green", draft: "orange", review: "blue", archived: "default" };
const DIFF_COLOR   = { Easy: "green", Medium: "orange", Hard: "red" };

function ProblemBankSection() {
  const AI_API = "http://localhost:5000/api/ai/ai";
  const [problems, setProblems]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatus]   = useState("all");
  const [selected, setSelected]     = useState([]);
  const [bulkLoading, setBulk]      = useState(false);

  function load(status) {
    setLoading(true);
    const param = status === "all" ? "" : `?status=${status}`;
    fetch(`${AI_API}/getallproblems${param}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setProblems(Array.isArray(d) ? d : []))
      .catch(() => setProblems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  async function changeStatus(id, newStatus) {
    try {
      const res = await fetch(`${AI_API}/problems/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      message.success(`Problem ${newStatus}`);
      setProblems(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch {
      message.error("Error updating status");
    }
  }

  async function bulkArchive() {
    if (!selected.length) return;
    setBulk(true);
    await Promise.all(selected.map(id => changeStatus(id, "archived")));
    setSelected([]);
    setBulk(false);
  }

  async function deleteProblem(id, title) {
    try {
      const res = await fetch(`${AI_API}/deletepromblem/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error deleting problem");
      }
      message.success(`"${title}" deleted`);
      setProblems(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      message.error(err.message || "Error deleting problem");
    }
  }

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (t, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{t}</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{r.category}</span>
          {r.forkedFrom && (
            <Tag style={{ fontSize: 10 }}>forked from: {r.forkedFrom}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      key: "difficulty",
      width: 90,
      render: d => <Tag color={DIFF_COLOR[d]}>{d}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: s => <Tag color={STATUS_COLOR[s] || "default"}>{s || "published"}</Tag>,
    },
    {
      title: "Scope",
      dataIndex: "scope",
      key: "scope",
      width: 80,
      render: s => <Tag>{s || "global"}</Tag>,
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      render: tags => (tags || []).slice(0, 3).map(t => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>),
    },
    {
      title: "Actions",
      key: "actions",
      width: 210,
      render: (_, r) => (
        <Space size={4}>
          {(!r.status || r.status === "draft" || r.status === "review") && (
            <Button size="small" type="primary" onClick={() => changeStatus(r.id, "published")}>Publish</Button>
          )}
          {r.status === "published" && (
            <Button size="small" onClick={() => changeStatus(r.id, "archived")}>Archive</Button>
          )}
          {r.status === "archived" && (
            <Button size="small" onClick={() => changeStatus(r.id, "published")}>Restore</Button>
          )}
          <Popconfirm
            title={`Delete "${r.title}"?`}
            description="This cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => deleteProblem(r.id, r.title)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <Space>
          {["all", "published", "draft", "review", "archived"].map(s => (
            <Button key={s} size="small" type={statusFilter === s ? "primary" : "default"} onClick={() => setStatus(s)} style={{ textTransform: "capitalize" }}>{s}</Button>
          ))}
        </Space>
        <Space>
          {selected.length > 0 && (
            <Button danger size="small" loading={bulkLoading} onClick={bulkArchive}>
              Archive {selected.length} selected
            </Button>
          )}
          <span style={{ fontSize: 12, color: "#6b7280" }}>{problems.length} problems</span>
        </Space>
      </div>
      <Table
        loading={loading}
        dataSource={problems}
        columns={columns}
        rowKey="id"
        size="small"
        rowSelection={{
          selectedRowKeys: selected,
          onChange: keys => setSelected(keys),
          getCheckboxProps: r => ({ disabled: r.status === "published" }),
        }}
        pagination={{ pageSize: 15 }}
      />
    </Card>
  );
}

const getCurrentUser = () => {
  try {
    const u = document.cookie.split("; ").find((c) => c.startsWith("user="));
    if (!u) return null;
    return JSON.parse(decodeURIComponent(u.split("=")[1])) || null;
  } catch { return null; }
};

const getCurrentRole = () => getCurrentUser()?.role || null;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const currentRole = getCurrentRole();
  const [activeSection, setActiveSection] = useState(
    currentRole === "teacher" ? "classrooms" : "overview"
  );

  const [grades, setGrades] = useState([]);
  const [specialities, setSpecialities] = useState([]);
  const [levels, setLevels] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [users, setUsers] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [courseFromClassroom, setCourseFromClassroom] = useState(false);
  const [entityModal, setEntityModal] = useState({ open: false, section: null });
  const [classroomModuleModalOpen, setClassroomModuleModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createdClassroom, setCreatedClassroom] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentsToInvite, setSelectedStudentsToInvite] = useState([]);
  const [studentsDrawerOpen, setStudentsDrawerOpen] = useState(false);
  const [studentsToAdd, setStudentsToAdd] = useState([]);
  const [drawerAvailableStudents, setDrawerAvailableStudents] = useState([]);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeContent, setCodeContent] = useState("// Paste JavaScript code here\nfunction hello(name) {\n  return `Hello, ${name}`;\n}\n\nconsole.log(hello('OmniLearn'));\n");
  const [classroomCourses, setClassroomCourses] = useState({});
  const [classroomModules, setClassroomModules] = useState({});
  const [lessonUploading, setLessonUploading] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedClassroomCourses, setSelectedClassroomCourses] = useState([]);
  const [selectedClassroomStudents, setSelectedClassroomStudents] = useState([]);
  const [selectedCourseModules, setSelectedCourseModules] = useState([]);
  const [selectedModuleLessons, setSelectedModuleLessons] = useState([]);
  const [selectedCourseLessons, setSelectedCourseLessons] = useState([]);
  const [lessonFromCourse, setLessonFromCourse] = useState(false);
  const [gradeForm] = Form.useForm();
  const [specialityForm] = Form.useForm();
  const [levelForm] = Form.useForm();
  const [courseForm] = Form.useForm();
  const [moduleForm] = Form.useForm();
  const [lessonForm] = Form.useForm();
  const [classroomForm] = Form.useForm();
  const [classroomModuleForm] = Form.useForm();
  const lessonType = Form.useWatch("type", lessonForm);
  const classroomGradeId = Form.useWatch("gradeId", classroomForm);
  const classroomSpecialityId = Form.useWatch("specialityId", classroomForm);
  const codePreviewRef = useRef(null);

  const gradeOptions = useMemo(
    () => grades.map((g) => ({ value: g.id, label: g.displayName || g.name })),
    [grades]
  );
  const specialityOptions = useMemo(
    () => specialities.map((s) => ({ value: s.id, label: s.displayName || s.name })),
    [specialities]
  );
  const levelOptions = useMemo(
    () => levels.map((l) => ({ value: l.id, label: l.displayName || l.name })),
    [levels]
  );
  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: c.id, label: c.title })),
    [courses]
  );
  const moduleOptions = useMemo(
    () => modules.map((m) => ({ value: m.id, label: m.title })),
    [modules]
  );
  const teacherOptions = useMemo(() => {
    return users
      .filter((user) => user.role === "teacher")
      .map((user) => ({
        value: user.id,
        label: `${user.firstname} ${user.lastname}`.trim(),
      }));
  }, [users]);
  const classroomOptions = useMemo(
    () => classrooms.map((c) => ({ value: c.id, label: c.name })),
    [classrooms]
  );

  const cardPalette = ["#1a73e8", "#34a853", "#8430ce", "#e8710a", "#00897b", "#ea4335", "#d81b60"];

  const getCardColor = (index = 0) => cardPalette[index % cardPalette.length];

  const getTeacherName = (teacherId) => {
    const teacher = users.find((u) => u.id === teacherId);
    if (!teacher) {
      return "Unknown teacher";
    }
    const fullName = `${teacher.firstname || ""} ${teacher.lastname || ""}`.trim();
    return fullName || teacher.email || "Unknown teacher";
  };

  const getLessonTypeTagColor = (type) => {
    switch (type) {
      case "pdf":
        return "blue";
      case "video":
        return "green";
      case "code":
        return "purple";
      case "quiz":
        return "gold";
      default:
        return "default";
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [
        gradesData,
        specialitiesData,
        levelsData,
        coursesData,
        modulesData,
        lessonsData,
        classroomsData,
      ] = await Promise.all([
        fetchGrades(),
        fetchSpecialities(),
        fetchLevels(),
        fetchCourses(),
        fetchModules(),
        fetchLessons(),
        fetchClassrooms(),
      ]);
      setGrades(gradesData);
      setSpecialities(specialitiesData);
      setLevels(levelsData);
      setCourses(coursesData);
      setModules(modulesData);
      setLessons(lessonsData);
      setClassrooms(classroomsData);
      if (currentRole === "admin") {
        const usersData = await fetchUsers();
        setUsers(usersData);
      }
    } catch (err) {
      message.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleClassroomCourses = async (classroomId) => {
    if (classroomCourses[classroomId]) {
      setClassroomCourses((prev) => {
        const next = { ...prev };
        delete next[classroomId];
        return next;
      });
      return;
    }
    try {
      const coursesData = await fetchClassroomCourses(classroomId);
      setClassroomCourses((prev) => ({ ...prev, [classroomId]: coursesData }));
    } catch (err) {
      message.error(err.message || "Failed to load courses");
    }
  };

  const toggleClassroomModules = async (classroomId) => {
    if (classroomModules[classroomId]) {
      setClassroomModules((prev) => {
        const next = { ...prev };
        delete next[classroomId];
        return next;
      });
      return;
    }
    try {
      const modulesData = await fetchClassroomModules(classroomId);
      setClassroomModules((prev) => ({ ...prev, [classroomId]: modulesData }));
    } catch (err) {
      message.error(err.message || "Failed to load modules");
    }
  };

  const resetForm = (form, closeModal = false) => {
    form.resetFields();
    setEditingId(null);
    if (closeModal) {
      setCourseFromClassroom(false);
      setLessonFromCourse(false);
      setEntityModal({ open: false, section: null });
    }
  };

  const openEntityModal = (section) => {
    setEntityModal({ open: true, section });
  };

  const getFormBySection = (section) => {
    switch (section) {
      case "grades":
        return gradeForm;
      case "specialities":
        return specialityForm;
      case "levels":
        return levelForm;
      case "courses":
        return courseForm;
      case "modules":
        return moduleForm;
      case "lessons":
        return lessonForm;
      case "classrooms":
        return classroomForm;
      default:
        return null;
    }
  };

  const closeEntityModal = () => {
    const activeForm = getFormBySection(entityModal.section);
    if (activeForm) {
      activeForm.resetFields();
    }
    setEditingId(null);
    setCourseFromClassroom(false);
    setLessonFromCourse(false);
    setEntityModal({ open: false, section: null });
  };

  const handleCreateClick = (section) => {
    const targetForm = getFormBySection(section);
    if (targetForm) {
      targetForm.resetFields();
    }
    if (section === "lessons") {
      lessonForm.setFieldsValue({ type: "pdf" });
    }
    setEditingId(null);
    openEntityModal(section);
  };

  // Grades Section
  const handleGradeSubmit = async (values) => {
    try {
      if (editingId) {
        await updateGrade(editingId, values);
        message.success("Grade updated");
      } else {
        await createGrade(values);
        message.success("Grade created");
      }
      resetForm(gradeForm, true);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleGradeEdit = (record) => {
    setEditingId(record.id);
    gradeForm.setFieldsValue(record);
    openEntityModal("grades");
  };

  const handleGradeDelete = async (id) => {
    try {
      await deleteGrade(id);
      message.success("Grade deleted");
      loadAll();
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  // Specialities Section
  const handleSpecialitySubmit = async (values) => {
    try {
      if (editingId) {
        await updateSpeciality(editingId, values);
        message.success("Speciality updated");
      } else {
        await createSpeciality(values);
        message.success("Speciality created");
      }
      resetForm(specialityForm, true);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleSpecialityEdit = (record) => {
    setEditingId(record.id);
    specialityForm.setFieldsValue(record);
    openEntityModal("specialities");
  };

  const handleSpecialityDelete = async (id) => {
    try {
      await deleteSpeciality(id);
      message.success("Speciality deleted");
      loadAll();
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  // Levels Section
  const handleLevelSubmit = async (values) => {
    try {
      if (editingId) {
        await updateLevel(editingId, values);
        message.success("Level updated");
      } else {
        await createLevel(values);
        message.success("Level created");
      }
      resetForm(levelForm, true);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleLevelEdit = (record) => {
    setEditingId(record.id);
    levelForm.setFieldsValue(record);
    openEntityModal("levels");
  };

  const handleLevelDelete = async (id) => {
    try {
      await deleteLevel(id);
      message.success("Level deleted");
      loadAll();
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  // Courses Section
  const handleCourseSubmit = async (values) => {
    try {
      if (currentRole === "teacher") {
        values.teacherId = getCurrentUser()?.id;
      }
      if (editingId) {
        await updateCourse(editingId, values);
        message.success("Course updated");
      } else {
        await createCourse(values);
        message.success("Course created");
      }
      resetForm(courseForm, true);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleCourseEdit = (record) => {
    setEditingId(record.id);
    courseForm.setFieldsValue(record);
    openEntityModal("courses");
  };

  const handleCourseDelete = async (id) => {
    try {
      await deleteCourse(id);
      message.success("Course deleted");
      loadAll();
      setSelectedClassroomCourses((prev) => prev.filter((c) => c.id !== id));
      if (selectedCourse?.id === id) { setSelectedCourse(null); setSelectedCourseModules([]); setSelectedCourseLessons([]); }
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  // Modules Section
  const handleModuleSubmit = async (values) => {
    try {
      if (editingId) {
        await updateModule(editingId, values);
        message.success("Module updated");
      } else {
        await createModule(values);
        message.success("Module created");
      }
      resetForm(moduleForm, true);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleModuleEdit = (record) => {
    setEditingId(record.id);
    moduleForm.setFieldsValue(record);
    openEntityModal("modules");
  };

  const handleModuleDelete = async (id) => {
    try {
      await deleteModule(id);
      message.success("Module deleted");
      loadAll();
      setSelectedCourseModules((prev) => prev.filter((m) => m.id !== id));
      if (selectedModule?.id === id) { setSelectedModule(null); setSelectedModuleLessons([]); }
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  // Lessons Section
  const handleLessonSubmit = async (values) => {
    const payload = {
      ...values,
      contentUrl: values.contentUrl || values.file_url || "",
    };
    delete payload.file_url;

    try {
      if (editingId) {
        await updateLesson(editingId, payload);
        message.success("Lesson updated");
      } else {
        await createLesson(payload);
        message.success("Lesson created");
      }
      resetForm(lessonForm, true);
      loadAll();
      const freshLessons = await fetchLessons();
      if (selectedModule) {
        setSelectedModuleLessons((freshLessons || []).filter((l) => l.moduleId === selectedModule.id));
      }
      if (selectedCourse) {
        setSelectedCourseLessons((freshLessons || []).filter((l) => l.courseId === selectedCourse.id && !l.moduleId));
      }
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleLessonEdit = (record) => {
    setEditingId(record.id);
    lessonForm.setFieldsValue(record);
    if (record.type === "code") {
      setCodeContent(record.contentUrl || "");
    }
    openEntityModal("lessons");
  };

  const handleLessonDelete = async (id) => {
    try {
      await deleteLesson(id);
      message.success("Lesson deleted");
      loadAll();
      const freshLessons = await fetchLessons();
      if (selectedModule) {
        setSelectedModuleLessons((freshLessons || []).filter((l) => l.moduleId === selectedModule.id));
      }
      if (selectedCourse) {
        setSelectedCourseLessons((freshLessons || []).filter((l) => l.courseId === selectedCourse.id && !l.moduleId));
      }
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  const handleLessonUpload = async ({ file, onSuccess, onError }) => {
    try {
      setLessonUploading(true);
      if (lessonType === "pdf" && file.type !== "application/pdf") {
        message.error("Please upload a PDF file");
        onError?.(new Error("Invalid file type"));
        return;
      }

      const result = await uploadLessonFile(file);
      const fileUrl = result?.fileUrl || "";
      lessonForm.setFieldsValue({ contentUrl: fileUrl, file_url: fileUrl });
      message.success("File uploaded");
      onSuccess?.(result);
    } catch (err) {
      message.error(err.message || "Upload failed");
      onError?.(err);
    } finally {
      setLessonUploading(false);
    }
  };

  const highlightCode = (code) =>
    Prism.highlight(code || "", Prism.languages.javascript, "javascript");

  const handleLessonTypeChange = (value) => {
    if (value === "code") {
      const existingCode = lessonForm.getFieldValue("contentUrl");
      setCodeContent(existingCode || "");
      setCodeModalOpen(true);
    }
  };

  const saveCodeToLesson = () => {
    if (!codeContent.trim()) {
      message.error("Please paste some JavaScript code first");
      return;
    }

    lessonForm.setFieldsValue({ contentUrl: codeContent, file_url: codeContent });
    setCodeModalOpen(false);
    message.success("Code saved in lesson");
  };

  // Classrooms Section
  const handleClassroomSubmit = async (values) => {
    try {
      if (currentRole === "teacher") {
        values.teacherId = getCurrentUser()?.id;
      }
      if (editingId) {
        await updateClassroom(editingId, values);
        message.success("Classroom updated");
        resetForm(classroomForm, true);
        loadAll();
      } else {
        const newClassroom = await createClassroom(values);
        message.success("Classroom created");
        resetForm(classroomForm, true);
        loadAll();
        const students = await fetchAvailableStudents(newClassroom.id);
        setAvailableStudents(students || []);
        setSelectedStudentsToInvite([]);
        setCreatedClassroom(newClassroom);
        setInviteModalOpen(true);
      }
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleInviteStudents = async () => {
    if (selectedStudentsToInvite.length === 0) {
      setInviteModalOpen(false);
      return;
    }
    try {
      await assignStudentsToClassroom(createdClassroom.id, selectedStudentsToInvite);
      message.success(`${selectedStudentsToInvite.length} student(s) invited`);
    } catch (err) {
      message.error(err.message || "Failed to invite students");
    }
    setInviteModalOpen(false);
  };

  const openStudentsDrawer = async () => {
    const available = await fetchAvailableStudents(selectedClassroom?.id);
    setDrawerAvailableStudents(available || []);
    setStudentsToAdd([]);
    setStudentsDrawerOpen(true);
  };

  const handleAddStudents = async () => {
    if (studentsToAdd.length === 0) return;
    try {
      await assignStudentsToClassroom(selectedClassroom.id, studentsToAdd);
      const updated = await fetchClassroomStudents(selectedClassroom.id);
      setSelectedClassroomStudents(updated || []);
      const available = await fetchAvailableStudents(selectedClassroom.id);
      setDrawerAvailableStudents(available || []);
      setStudentsToAdd([]);
      message.success(`${studentsToAdd.length} student(s) added`);
    } catch (err) {
      message.error(err.message || "Failed to add students");
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      await removeStudentFromClassroom(selectedClassroom.id, studentId);
      setSelectedClassroomStudents((prev) => prev.filter((s) => s.id !== studentId));
      const available = await fetchAvailableStudents(selectedClassroom.id);
      setDrawerAvailableStudents(available || []);
      message.success("Student removed");
    } catch (err) {
      message.error(err.message || "Failed to remove student");
    }
  };

  const handleClassroomEdit = (record) => {
    setEditingId(record.id);
    classroomForm.setFieldsValue(record);
    openEntityModal("classrooms");
  };

  const handleClassroomDelete = async (id) => {
    try {
      await deleteClassroom(id);
      message.success("Classroom deleted");
      loadAll();
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  const handleClassroomModuleAssign = async (values) => {
    try {
      await addClassroomModule(values.classId, values.moduleId);
      message.success("Module assigned");
      const modulesData = await fetchClassroomModules(values.classId);
      setClassroomModules((prev) => ({ ...prev, [values.classId]: modulesData }));
      classroomModuleForm.resetFields();
      setClassroomModuleModalOpen(false);
    } catch (err) {
      message.error(err.message || "Assignment failed");
    }
  };

  const openClassroomModuleModal = () => {
    classroomModuleForm.resetFields();
    setClassroomModuleModalOpen(true);
  };

  const closeClassroomModuleModal = () => {
    classroomModuleForm.resetFields();
    setClassroomModuleModalOpen(false);
  };

  const handleClassroomModuleRemove = async (classId, moduleId) => {
    try {
      await removeClassroomModule(classId, moduleId);
      const modulesData = await fetchClassroomModules(classId);
      setClassroomModules((prev) => ({ ...prev, [classId]: modulesData }));
    } catch (err) {
      message.error(err.message || "Remove failed");
    }
  };

  const handleSelectClassroom = async (record) => {
    try {
      const [coursesData, studentsData] = await Promise.all([
        fetchClassroomCourses(record.id),
        fetchClassroomStudents(record.id),
      ]);
      setSelectedClassroom(record);
      setSelectedCourse(null);
      setSelectedModule(null);
      setSelectedClassroomCourses(coursesData || []);
      setSelectedClassroomStudents(studentsData || []);
      setSelectedCourseModules([]);
      setSelectedModuleLessons([]);
    } catch (err) {
      message.error(err.message || "Failed to load classroom");
    }
  };

  const handleSelectCourse = async (record) => {
    try {
      const [modulesData, lessonsData] = await Promise.all([fetchModules(), fetchLessons()]);
      const filteredModules = (modulesData || []).filter((module) => module.courseId === record.id);
      const directLessons = (lessonsData || []).filter((lesson) => lesson.courseId === record.id && !lesson.moduleId);
      setSelectedCourse(record);
      setSelectedModule(null);
      setSelectedCourseModules(filteredModules);
      setSelectedModuleLessons([]);
      setSelectedCourseLessons(directLessons);
    } catch (err) {
      message.error(err.message || "Failed to load course content");
    }
  };

  const handleSelectModule = async (record) => {
    try {
      const lessonsData = await fetchLessons();
      const filteredLessons = (lessonsData || []).filter((lesson) => lesson.moduleId === record.id);
      setSelectedModule(record);
      setSelectedModuleLessons(filteredLessons);
    } catch (err) {
      message.error(err.message || "Failed to load lessons");
    }
  };

  const handleBackToClassrooms = () => {
    setSelectedClassroom(null);
    setSelectedCourse(null);
    setSelectedModule(null);
    setSelectedClassroomCourses([]);
    setSelectedCourseModules([]);
    setSelectedModuleLessons([]);
  };

  const handleBackToClassroomView = () => {
    setSelectedCourse(null);
    setSelectedModule(null);
    setSelectedCourseModules([]);
    setSelectedModuleLessons([]);
  };

  const handleBackToCourseView = () => {
    setSelectedModule(null);
    setSelectedModuleLessons([]);
  };

  const openCourseModalFromClassroom = () => {
    courseForm.resetFields();
    courseForm.setFieldsValue({ classId: selectedClassroom?.id, levelId: selectedClassroom?.levelId });
    setEditingId(null);
    setCourseFromClassroom(true);
    openEntityModal("courses");
  };

  const openModuleModalFromCourse = () => {
    moduleForm.resetFields();
    moduleForm.setFieldsValue({ courseId: selectedCourse?.id });
    setEditingId(null);
    openEntityModal("modules");
  };

  const openLessonModalFromCourse = () => {
    lessonForm.resetFields();
    lessonForm.setFieldsValue({ courseId: selectedCourse?.id, type: "pdf" });
    setEditingId(null);
    setLessonFromCourse(true);
    openEntityModal("lessons");
  };

  const openLessonModalFromModule = () => {
    lessonForm.resetFields();
    lessonForm.setFieldsValue({ moduleId: selectedModule?.id, type: "pdf" });
    setEditingId(null);
    openEntityModal("lessons");
  };

  const gradeColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Display Name", dataIndex: "displayName", key: "displayName" },
    { title: "Order", dataIndex: "order", key: "order", width: 80 },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleGradeEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleGradeDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const specialityColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Display Name", dataIndex: "displayName", key: "displayName" },
    {
      title: "Grade",
      dataIndex: "gradeId",
      key: "gradeId",
      render: (id) => gradeOptions.find((g) => g.value === id)?.label || "-",
    },
    { title: "Order", dataIndex: "order", key: "order", width: 80 },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleSpecialityEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleSpecialityDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const levelColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Display Name", dataIndex: "displayName", key: "displayName" },
    {
      title: "Speciality",
      dataIndex: "specialityId",
      key: "specialityId",
      render: (id) => specialityOptions.find((s) => s.value === id)?.label || "-",
    },
    { title: "Order", dataIndex: "order", key: "order", width: 80 },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleLevelEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleLevelDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const courseColumns = [
    { title: "Title", dataIndex: "title", key: "title" },
    {
      title: "Level",
      dataIndex: "levelId",
      key: "levelId",
      render: (id) => levelOptions.find((l) => l.value === id)?.label || "-",
    },
    {
      title: "Teacher",
      dataIndex: "teacherId",
      key: "teacherId",
      render: (id) => teacherOptions.find((t) => t.value === id)?.label || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleCourseEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleCourseDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const moduleColumns = [
    { title: "Title", dataIndex: "title", key: "title" },
    {
      title: "Course",
      dataIndex: "courseId",
      key: "courseId",
      render: (id) => courseOptions.find((c) => c.value === id)?.label || "-",
    },
    { title: "Order", dataIndex: "order", key: "order", width: 80 },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleModuleEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleModuleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const lessonColumns = [
    { title: "Title", dataIndex: "title", key: "title" },
    {
      title: "Module",
      dataIndex: "moduleId",
      key: "moduleId",
      render: (id) => moduleOptions.find((m) => m.value === id)?.label || "-",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 90,
      render: (type) => <Tag className="lesson-type-tag">{type?.toUpperCase()}</Tag>,
    },
    { title: "Order", dataIndex: "order", key: "order", width: 80 },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleLessonEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleLessonDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const classroomColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Grade",
      dataIndex: "gradeId",
      key: "gradeId",
      render: (id) => gradeOptions.find((g) => g.value === id)?.label || "-",
    },
    {
      title: "Speciality",
      dataIndex: "specialityId",
      key: "specialityId",
      render: (id) => specialityOptions.find((s) => s.value === id)?.label || "-",
    },
    {
      title: "Level",
      dataIndex: "levelId",
      key: "levelId",
      render: (id) => levelOptions.find((l) => l.value === id)?.label || "-",
    },
    {
      title: "Teacher",
      dataIndex: "teacherId",
      key: "teacherId",
      render: (id) => teacherOptions.find((t) => t.value === id)?.label || "-",
    },
    { title: "Year", dataIndex: "academicYear", key: "academicYear", width: 90 },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={classroomCourses[record.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => toggleClassroomCourses(record.id)}
          />
          <Button
            size="small"
            icon={<AppstoreOutlined />}
            onClick={() => toggleClassroomModules(record.id)}
          />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleClassroomEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleClassroomDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getSectionLabel = (section) => {
    switch (section) {
      case "grades":
        return "Grade";
      case "specialities":
        return "Speciality";
      case "levels":
        return "Level";
      case "courses":
        return "Course";
      case "modules":
        return "Module";
      case "lessons":
        return "Lesson";
      case "classrooms":
        return "Classroom";
      default:
        return "Item";
    }
  };

  const renderEntityModalForm = () => {
    switch (entityModal.section) {
      case "grades":
        return (
          <Form form={gradeForm} layout="vertical" onFinish={handleGradeSubmit} className="admin-form">
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. grade_1" />
            </Form.Item>
            <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. Grade 1" />
            </Form.Item>
            <Form.Item name="order" label="Order">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        );

      case "specialities":
        return (
          <Form form={specialityForm} layout="vertical" onFinish={handleSpecialitySubmit} className="admin-form">
            <Form.Item name="gradeId" label="Grade" rules={[{ required: true }]}>
              <Select placeholder="Select grade" options={gradeOptions} />
            </Form.Item>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. science" />
            </Form.Item>
            <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. Science" />
            </Form.Item>
            <Form.Item name="order" label="Order">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        );

      case "levels":
        return (
          <Form form={levelForm} layout="vertical" onFinish={handleLevelSubmit} className="admin-form">
            <Form.Item name="specialityId" label="Speciality" rules={[{ required: true }]}>
              <Select placeholder="Select speciality" options={specialityOptions} />
            </Form.Item>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. level_1" />
            </Form.Item>
            <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. Level 1" />
            </Form.Item>
            <Form.Item name="order" label="Order">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        );

      case "courses":
        return (
          <Form form={courseForm} layout="vertical" onFinish={handleCourseSubmit} className="admin-form">
            <Form.Item name="classId" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="levelId" label="Level" hidden={courseFromClassroom} rules={courseFromClassroom ? [] : [{ required: true }]}>
              <Select placeholder="Select level" options={levelOptions} />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input placeholder="Course title" />
            </Form.Item>
            {currentRole !== "teacher" && (
              <Form.Item name="teacherId" label="Teacher" rules={[{ required: true }]}>
                <Select placeholder="Select teacher" options={teacherOptions} />
              </Form.Item>
            )}
            <Form.Item name="description" label="Description">
              <Input placeholder="Optional" />
            </Form.Item>
          </Form>
        );

      case "modules":
        return (
          <Form form={moduleForm} layout="vertical" onFinish={handleModuleSubmit} className="admin-form">
            <Form.Item name="courseId" label="Course" rules={[{ required: true }]}>
              <Select placeholder="Select course" options={courseOptions} />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input placeholder="Module title" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input placeholder="Optional" />
            </Form.Item>
            <Form.Item name="order" label="Order">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        );

      case "lessons":
        return (
          <Form form={lessonForm} layout="vertical" onFinish={handleLessonSubmit} className="admin-form">
            <Form.Item name="courseId" hidden><Input /></Form.Item>
            <Form.Item name="file_url" hidden><Input /></Form.Item>
            <Form.Item name="moduleId" label="Module" hidden={lessonFromCourse} rules={lessonFromCourse ? [] : [{ required: true }]}>
              <Select placeholder="Select module" options={moduleOptions} />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input placeholder="Lesson title" />
            </Form.Item>
            <Form.Item name="type" label="Type" initialValue="pdf">
              <Select
                onChange={handleLessonTypeChange}
                options={[
                  { value: "pdf", label: "PDF" },
                  { value: "video", label: "Video" },
                  { value: "code", label: "Code" },
                  { value: "quiz", label: "Quiz" },
                ]}
              />
            </Form.Item>
            {lessonType === "pdf" || lessonType === "code" ? (
              <>
                <Form.Item name="contentUrl" label="File URL">
                  <Input placeholder="Uploaded file URL" readOnly />
                </Form.Item>
                {lessonType === "pdf" ? (
                  <Form.Item label="Upload File">
                    <Upload
                      showUploadList={false}
                      customRequest={handleLessonUpload}
                      accept="application/pdf"
                    >
                      <Button icon={<UploadOutlined />} loading={lessonUploading} style={{ width: "100%" }}>
                        Upload
                      </Button>
                    </Upload>
                  </Form.Item>
                ) : (
                  <Form.Item label="Code">
                    <Button type="primary" style={{ width: "100%" }} onClick={() => setCodeModalOpen(true)}>
                      Open Code Editor
                    </Button>
                  </Form.Item>
                )}
              </>
            ) : (
              <Form.Item name="contentUrl" label="Content URL">
                <Input placeholder="https://..." />
              </Form.Item>
            )}
            <Form.Item name="order" label="Order">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Form>
        );

      case "classrooms": {
        const filteredSpecialityOptions = classroomGradeId
          ? specialities.filter((s) => s.gradeId === classroomGradeId).map((s) => ({ value: s.id, label: s.displayName || s.name }))
          : specialityOptions;
        const filteredLevelOptions = classroomSpecialityId
          ? levels.filter((l) => l.specialityId === classroomSpecialityId).map((l) => ({ value: l.id, label: l.displayName || l.name }))
          : levelOptions;
        return (
          <Form form={classroomForm} layout="vertical" onFinish={handleClassroomSubmit} className="admin-form">
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. 3A" />
            </Form.Item>
            <Form.Item name="gradeId" label="Grade">
              <Select
                placeholder="Select grade"
                options={gradeOptions}
                allowClear
                onChange={() => classroomForm.setFieldsValue({ specialityId: undefined, levelId: undefined })}
              />
            </Form.Item>
            <Form.Item name="specialityId" label="Speciality">
              <Select
                placeholder="Select speciality"
                options={filteredSpecialityOptions}
                allowClear
                onChange={() => classroomForm.setFieldsValue({ levelId: undefined })}
              />
            </Form.Item>
            <Form.Item name="levelId" label="Level">
              <Select
                placeholder="Select level"
                options={filteredLevelOptions}
                allowClear
              />
            </Form.Item>
            <Form.Item name="academicYear" label="Year">
              <Input placeholder="2024" />
            </Form.Item>
            {currentRole !== "teacher" && (
              <Form.Item name="teacherId" label="Teacher">
                <Select placeholder="Teacher" options={teacherOptions} allowClear />
              </Form.Item>
            )}
          </Form>
        );
      }

      default:
        return null;
    }
  };

  const SectionHeader = ({ title, count, hint }) => (
    <div className="section-form-header">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hint ? 3 : 0 }}>
        <Title level={5} className="section-form-title" style={{ margin: 0 }}>
          {title}
        </Title>
        {count != null && (
          <span style={{
            background: "#1a73e8",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 20,
            padding: "1px 9px",
            letterSpacing: "0.3px",
          }}>
            {count}
          </span>
        )}
      </div>
      {hint && <Text type="secondary" className="admin-hint">{hint}</Text>}
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div>
            <div className="overview-welcome">
              <Title level={4} style={{ margin: 0, color: "#202124", fontSize: 22 }}>
                Welcome to OmniLearn Admin
              </Title>
              <Text style={{ color: "#5f6368", fontSize: 14 }}>
                Manage your classrooms, courses, and learning content.
              </Text>
            </div>

            <Row gutter={[16, 16]} style={{ marginTop: 28 }}>
              {[
                { label: "Classrooms", value: classrooms.length, color: "#1a73e8", section: "classrooms" },
                { label: "Courses", value: courses.length, color: "#34a853", section: "courses" },
                { label: "Teachers", value: users.filter((u) => u.role === "teacher").length, color: "#8430ce", section: "courses" },
                { label: "Lessons", value: lessons.length, color: "#e8710a", section: "lessons" },
              ].map((stat) => (
                <Col xs={12} sm={6} key={stat.label}>
                  <Card
                    className="stat-card"
                    style={{ borderTop: `4px solid ${stat.color}` }}
                    onClick={() => setActiveSection(stat.section)}
                  >
                    <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </Card>
                </Col>
              ))}
            </Row>

            <div style={{ marginTop: 36, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Title level={5} style={{ margin: 0, color: "#202124" }}>Your Classrooms</Title>
              <Button type="link" onClick={() => setActiveSection("classrooms")} style={{ padding: 0, color: "#1a73e8", fontWeight: 500 }}>
                View all
              </Button>
            </div>

            {classrooms.length === 0 ? (
              <Card className="admin-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                <TeamOutlined style={{ fontSize: 48, color: "#dadce0", marginBottom: 16, display: "block" }} />
                <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>No classrooms yet</Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setActiveSection("classrooms"); handleCreateClick("classrooms"); }}>
                  Create Classroom
                </Button>
              </Card>
            ) : (
              <Row gutter={[16, 16]}>
                {classrooms.slice(0, 6).map((record, index) => (
                  <Col key={record.id} xs={24} sm={12} lg={8}>
                    <Card className="classroom-drill-card" styles={{ body: { padding: 0 } }}>
                      <div
                        className="classroom-card-banner"
                        style={{ background: getCardColor(index) }}
                        onClick={() => { setActiveSection("classrooms"); handleSelectClassroom(record); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveSection("classrooms");
                            handleSelectClassroom(record);
                          }
                        }}
                      >
                        <div>
                          <div className="classroom-card-title">{record.name || "Classroom"}</div>
                          <div className="classroom-card-meta">
                            {gradeOptions.find((g) => g.value === record.gradeId)?.label || ""}
                            {gradeOptions.find((g) => g.value === record.gradeId)?.label && levelOptions.find((l) => l.value === record.levelId)?.label ? " • " : ""}
                            {levelOptions.find((l) => l.value === record.levelId)?.label || ""}
                          </div>
                        </div>
                        <Avatar className="classroom-card-avatar">
                          {getTeacherName(record.teacherId).charAt(0).toUpperCase()}
                        </Avatar>
                      </div>
                      <div className="classroom-card-footer">
                        <span className="classroom-card-teacher-name">{getTeacherName(record.teacherId)}</span>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        );

      case "grades":
        return (
          <Card className="admin-card">
            <SectionHeader
              title="Grades"
              count={grades.length}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateClick("grades")}>
              Add Grade
            </Button>
            <Divider className="section-divider" />
            <Table
              columns={gradeColumns}
              dataSource={grades}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 10, showTotal: (total) => `${total} records` }}
            />
          </Card>
        );

      case "specialities":
        return (
          <Card className="admin-card">
            <SectionHeader
              title="Specialities"
              count={specialities.length}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateClick("specialities")}>
              Add Speciality
            </Button>
            <Divider className="section-divider" />
            <Table
              columns={specialityColumns}
              dataSource={specialities}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 10, showTotal: (total) => `${total} records` }}
            />
          </Card>
        );

      case "levels":
        return (
          <Card className="admin-card">
            <SectionHeader
              title="Levels"
              count={levels.length}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateClick("levels")}>
              Add Level
            </Button>
            <Divider className="section-divider" />
            <Table
              columns={levelColumns}
              dataSource={levels}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 10, showTotal: (total) => `${total} records` }}
            />
          </Card>
        );

      case "courses":
        return (
          <Card className="admin-card">
            <SectionHeader
              title="Courses"
              count={courses.length}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateClick("courses")}>
              Add Course
            </Button>
            <Divider className="section-divider" />
            <Table
              columns={courseColumns}
              dataSource={courses}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 10, showTotal: (total) => `${total} records` }}
            />
          </Card>
        );

      case "modules":
        return (
          <Card className="admin-card">
            <SectionHeader
              title="Modules"
              count={modules.length}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateClick("modules")}>
              Add Module
            </Button>
            <Divider className="section-divider" />
            <Table
              columns={moduleColumns}
              dataSource={modules}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 10, showTotal: (total) => `${total} records` }}
            />
          </Card>
        );

      case "lessons":
        return (
          <Card className="admin-card">
            <SectionHeader
              title="Lessons"
              count={lessons.length}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateClick("lessons")}>
              Add Lesson
            </Button>
            <Divider className="section-divider" />
            <Table
              columns={lessonColumns}
              dataSource={lessons}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 10, showTotal: (total) => `${total} records` }}
            />
          </Card>
        );

      case "classrooms":
        return (
          <Card className="admin-card">
            <SectionHeader
              title="Classrooms"
              count={classrooms.length}
              hint="Courses are inherited from the classroom level."
            />

            {!selectedClassroom && (
              <>
                <Row gutter={[16, 16]}>
                  {classrooms.map((record, index) => {
                    const bannerColor = getCardColor(index);
                    return (
                      <Col key={record.id} xs={24} sm={12} lg={8}>
                        <Card className="classroom-drill-card" styles={{ body: { padding: 0 } }}>
                          <div
                            className="classroom-card-banner"
                            style={{ background: bannerColor }}
                            onClick={() => handleSelectClassroom(record)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleSelectClassroom(record);
                              }
                            }}
                          >
                            <div>
                              <div className="classroom-card-title">{record.name || "Classroom"}</div>
                              <div className="classroom-card-meta">
                                {gradeOptions.find((g) => g.value === record.gradeId)?.label || "No grade"}
                                {" • "}
                                {levelOptions.find((l) => l.value === record.levelId)?.label || "No level"}
                              </div>
                            </div>
                            <Avatar className="classroom-card-avatar">
                              {getTeacherName(record.teacherId).charAt(0).toUpperCase()}
                            </Avatar>
                          </div>
                          <div className="classroom-card-footer">
                            <span className="classroom-card-teacher-name">
                              {getTeacherName(record.teacherId)}
                            </span>
                            <div className="classroom-card-footer-actions">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={(e) => { e.stopPropagation(); handleClassroomEdit(record); }}
                              />
                              <Popconfirm title="Delete this classroom?" onConfirm={() => handleClassroomDelete(record.id)}>
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </Popconfirm>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                  <Col xs={24} sm={12} lg={8}>
                    <Card
                      className="classroom-drill-card classroom-add-card"
                      onClick={() => handleCreateClick("classrooms")}
                      styles={{ body: { minHeight: 196, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 0 } }}
                    >
                      <PlusOutlined style={{ fontSize: 32 }} />
                      <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>New Classroom</div>
                    </Card>
                  </Col>
                </Row>
             
              </>
            )}

            {selectedClassroom && !selectedCourse && (
              <>
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  <Button type="link" icon={<LeftOutlined />} onClick={handleBackToClassrooms} className="classroom-back-button">
                    All Classrooms
                  </Button>
                  <Breadcrumb
                    items={[
                      { title: "Classrooms" },
                      { title: selectedClassroom.name || "Classroom" },
                    ]}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button icon={<TeamOutlined />} onClick={openStudentsDrawer}>
                      Students ({selectedClassroomStudents.length})
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCourseModalFromClassroom}>
                      Add Course
                    </Button>
                  </div>
                </Space>

                <Divider className="section-divider" />

                <Row gutter={[16, 16]}>
                  {selectedClassroomCourses.map((record, index) => (
                    <Col key={record.id} xs={24} sm={12} lg={8}>
                      <Card
                        className="classroom-drill-card"
                        styles={{ body: { padding: 0 } }}
                        hoverable
                        onClick={() => handleSelectCourse(record)}
                      >
                        <div className="classroom-card-banner" style={{ background: getCardColor(index) }}>
                          <div className="classroom-card-title">{record.title || "Course"}</div>
                        </div>
                        <div className="classroom-card-footer">
                          <span className="classroom-card-teacher-name">{getTeacherName(record.teacherId)}</span>
                          <div className="classroom-card-footer-actions">
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleCourseEdit(record); }} />
                            <Popconfirm title="Delete this course?" onConfirm={(e) => { handleCourseDelete(record.id); }}>
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                            </Popconfirm>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>

                {selectedClassroomCourses.length === 0 && (
                  <Text type="secondary">No courses found for this classroom.</Text>
                )}
              </>
            )}

            {selectedCourse && !selectedModule && (
              <>
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  <Button type="link" icon={<LeftOutlined />} onClick={handleBackToClassroomView} className="classroom-back-button">
                    Back to Classroom
                  </Button>
                  <Breadcrumb
                    items={[
                      { title: "Classrooms" },
                      { title: selectedClassroom?.name || "Classroom" },
                      { title: selectedCourse.title || "Course" },
                    ]}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button icon={<PlusOutlined />} onClick={openLessonModalFromCourse}>
                      Add Lesson
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openModuleModalFromCourse}>
                      Add Module
                    </Button>
                  </div>
                </Space>

                <Divider className="section-divider" />

                {selectedCourseModules.length > 0 && (
                  <>
                    <Text strong style={{ fontSize: 15 }}>Modules</Text>
                    <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                      {selectedCourseModules.map((record, index) => (
                        <Col key={record.id} xs={24} sm={12} lg={8}>
                          <Card
                            className="classroom-drill-card"
                            styles={{ body: { padding: 0 } }}
                            hoverable
                            onClick={() => handleSelectModule(record)}
                          >
                            <div className="classroom-card-banner" style={{ background: getCardColor(index) }}>
                              <div className="classroom-card-title">{record.title || "Module"}</div>
                              <div className="classroom-card-meta">Order: {record.order ?? 0}</div>
                            </div>
                            <div className="classroom-card-footer">
                              <span className="classroom-card-teacher-name">{record.description || "No description"}</span>
                              <div className="classroom-card-footer-actions">
                                <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleModuleEdit(record); }} />
                                <Popconfirm title="Delete this module?" onConfirm={() => handleModuleDelete(record.id)}>
                                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                                </Popconfirm>
                              </div>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </>
                )}

                {selectedCourseLessons.length > 0 && (
                  <>
                    {selectedCourseModules.length > 0 && <Divider />}
                    <Text strong style={{ fontSize: 15, display: "block", marginBottom: 12 }}>Direct Lessons</Text>
                    <LessonPdfViewer lessons={selectedCourseLessons} onDelete={handleLessonDelete} onEdit={handleLessonEdit} />
                  </>
                )}

                {selectedCourseModules.length === 0 && selectedCourseLessons.length === 0 && (
                  <Text type="secondary">No content yet. Add a module to group lessons, or add a lesson directly.</Text>
                )}
              </>
            )}

            {selectedModule && (
              <>
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  <Button type="link" icon={<LeftOutlined />} onClick={handleBackToCourseView} className="classroom-back-button">
                    Back to Course
                  </Button>
                  <Breadcrumb
                    items={[
                      { title: "Classrooms" },
                      { title: selectedClassroom?.name || "Classroom" },
                      { title: selectedCourse?.title || "Course" },
                      { title: selectedModule.title || "Module" },
                    ]}
                  />
                </Space>

                <Divider className="section-divider" />

                <Tabs
                  defaultActiveKey="lessons"
                  items={[
                    {
                      key: "lessons",
                      label: "Lessons",
                      children: (
                        <>
                          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openLessonModalFromModule}>
                              Add Lesson
                            </Button>
                          </div>
                          <LessonPdfViewer lessons={selectedModuleLessons} onDelete={handleLessonDelete} onEdit={handleLessonEdit} />
                        </>
                      ),
                    },
                    {
                      key: "assignments",
                      label: "Assignments",
                      children: <ModuleAssignmentsTab moduleId={selectedModule.id} />,
                    },
                  ]}
                />
              </>
            )}
          </Card>
        );

      case "problems":
        return <ProblemBankSection />;

      // ÉTAPE 1 : sélection des problèmes free-tier (gérée par l'admin).
      case "free-tier":
        return <FreeTierTab />;

      // Sélection des problèmes pro-tier.
      case "pro-tier":
        return <ProTierTab />;

      // ÉTAPE 2 : super-admin → vue de tous les utilisateurs par plan.
      case "users-plan":
        return <UsersByPlanTab />;

      // ÉTAPE 3 : institution_admin → liens d'invitation et membres.
      case "institution":
        return <InstitutionTab />;

      default:
        return null;
    }
  };

  return (
    <ConfigProvider theme={blackWhiteTheme}>
      <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        <Spin spinning={loading}>
          <div className="admin-dashboard">{renderSection()}</div>
        </Spin>
        <Modal
          title={`${editingId ? "Edit" : "Create"} ${getSectionLabel(entityModal.section)}`}
          open={entityModal.open}
          onCancel={closeEntityModal}
          onOk={() => getFormBySection(entityModal.section)?.submit()}
          okText={editingId ? "Update" : "Create"}
          destroyOnClose
        >
          {renderEntityModalForm()}
        </Modal>
        <Modal
          title="Save Code"
          open={codeModalOpen}
          onCancel={() => setCodeModalOpen(false)}
          onOk={saveCodeToLesson}
          okText="Save Code"
          width={900}
          destroyOnClose
        >
          <div className="code-pdf-modal-grid">
            <div className="code-panel">
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                JavaScript Editor
              </Text>
              <div className="code-editor-shell">
                <Editor
                  value={codeContent}
                  onValueChange={setCodeContent}
                  highlight={highlightCode}
                  padding={14}
                  textareaId="lesson-code-editor"
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    fontSize: 13,
                    minHeight: 320,
                  }}
                />
              </div>
            </div>

            <div className="code-panel">
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Live Preview
              </Text>
              <div ref={codePreviewRef} className="code-preview-shell">
                <pre className="code-preview-block language-javascript">
                  <code dangerouslySetInnerHTML={{ __html: highlightCode(codeContent) }} />
                </pre>
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          title="Assign Module to Classroom"
          open={classroomModuleModalOpen}
          onCancel={closeClassroomModuleModal}
          onOk={() => classroomModuleForm.submit()}
          okText="Assign"
          destroyOnClose
        >
          <Form
            form={classroomModuleForm}
            layout="vertical"
            onFinish={handleClassroomModuleAssign}
            className="admin-form admin-form-secondary"
          >
            <Form.Item name="classId" label="Classroom" rules={[{ required: true }]}>
              <Select placeholder="Select classroom" options={classroomOptions} />
            </Form.Item>
            <Form.Item name="moduleId" label="Module" rules={[{ required: true }]}>
              <Select placeholder="Select module" options={moduleOptions} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Classroom Invite Modal */}
        <Modal
          title="Classroom Created"
          open={inviteModalOpen}
          onCancel={() => setInviteModalOpen(false)}
          onOk={handleInviteStudents}
          okText={selectedStudentsToInvite.length > 0 ? "Invite & Close" : "Done"}
          width={480}
          destroyOnClose
        >
          {createdClassroom && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ textAlign: "center", background: "#f8f9fa", borderRadius: 8, padding: "20px 16px" }}>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>INVITE CODE</Text>
                <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 8, color: "#1a73e8", fontFamily: "monospace" }}>
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
                      navigator.clipboard.writeText(`${window.location.origin}/join/${createdClassroom.inviteCode}`);
                      message.success("Link copied!");
                    }}
                  />
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>INVITE STUDENTS DIRECTLY (optional)</Text>
                <Select
                  mode="multiple"
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder="Select students to add now"
                  value={selectedStudentsToInvite}
                  onChange={setSelectedStudentsToInvite}
                  options={availableStudents.map((s) => ({
                    value: s.id,
                    label: `${s.firstname} ${s.lastname} (${s.email})`,
                  }))}
                />
              </div>
            </div>
          )}
        </Modal>

        {/* Students Sidebar Drawer */}
        <Drawer
          title={`Students — ${selectedClassroom?.name || ""}`}
          placement="right"
          styles={{ wrapper: { width: 360 } }}
          open={studentsDrawerOpen}
          onClose={() => setStudentsDrawerOpen(false)}
        >
          {/* Add students */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: "block", marginBottom: 8 }}>Add Students</Text>
            <Select
              mode="multiple"
              style={{ width: "100%", marginBottom: 8 }}
              placeholder="Search and select students…"
              value={studentsToAdd}
              onChange={setStudentsToAdd}
              options={drawerAvailableStudents.map((s) => ({
                value: s.id,
                label: `${s.firstname} ${s.lastname} (${s.email})`,
              }))}
            />
            <Button
              type="primary"
              block
              disabled={studentsToAdd.length === 0}
              onClick={handleAddStudents}
            >
              Add Selected
            </Button>
          </div>

          <Divider />

          {/* Enrolled list */}
          <Text strong style={{ display: "block", marginBottom: 12 }}>
            Enrolled ({selectedClassroomStudents.length})
          </Text>

          {selectedClassroomStudents.length === 0 ? (
            <Text type="secondary">No students enrolled yet.</Text>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedClassroomStudents.map((student) => (
                <div
                  key={student.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    border: "1px solid #e8eaed",
                    borderRadius: 8,
                    background: "#f8f9fa",
                  }}
                >
                  <Avatar style={{ background: "#1a73e8", flexShrink: 0 }} size={36}>
                    {(student.firstname?.[0] || "?").toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#202124", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {student.firstname} {student.lastname}
                    </div>
                    <div style={{ fontSize: 12, color: "#5f6368", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {student.email}
                    </div>
                  </div>
                  <Popconfirm
                    title="Remove this student?"
                    onConfirm={() => handleRemoveStudent(student.id)}
                    okText="Remove"
                    cancelText="Cancel"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                    />
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}
        </Drawer>
      </AdminLayout>
    </ConfigProvider>
  );
};

export default AdminDashboard;
