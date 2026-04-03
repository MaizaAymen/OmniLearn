import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Col,
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  AppstoreOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import AdminLayout from "./AdminLayout";
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
  uploadLessonPdf,
  fetchClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  fetchClassroomCourses,
  fetchClassroomModules,
  addClassroomModule,
  removeClassroomModule,
} from "./api";

const { Title, Text } = Typography;

const blackWhiteTheme = {
  token: {
    colorPrimary: "#0a0a0a",
    colorBgContainer: "#ffffff",
    colorBorder: "#d4d4d8",
    colorBorderSecondary: "#e4e4e7",
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    colorFillAlter: "#fafafa",
  },
  components: {
    Table: {
      headerBg: "#fafafa",
      rowHoverBg: "#f8f8f8",
      borderColor: "#e4e4e7",
    },
    Button: {
      borderRadius: 8,
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
    },
  },
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("grades");

  const [grades, setGrades] = useState([]);
  const [specialities, setSpecialities] = useState([]);
  const [levels, setLevels] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [users, setUsers] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [entityModal, setEntityModal] = useState({ open: false, section: null });
  const [classroomModuleModalOpen, setClassroomModuleModalOpen] = useState(false);
  const [classroomCourses, setClassroomCourses] = useState({});
  const [classroomModules, setClassroomModules] = useState({});
  const [lessonUploading, setLessonUploading] = useState(false);

  const [gradeForm] = Form.useForm();
  const [specialityForm] = Form.useForm();
  const [levelForm] = Form.useForm();
  const [courseForm] = Form.useForm();
  const [moduleForm] = Form.useForm();
  const [lessonForm] = Form.useForm();
  const [classroomForm] = Form.useForm();
  const [classroomModuleForm] = Form.useForm();
  const lessonType = Form.useWatch("type", lessonForm);

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
        usersData,
      ] = await Promise.all([
        fetchGrades(),
        fetchSpecialities(),
        fetchLevels(),
        fetchCourses(),
        fetchModules(),
        fetchLessons(),
        fetchClassrooms(),
        fetchUsers(),
      ]);
      setGrades(gradesData);
      setSpecialities(specialitiesData);
      setLevels(levelsData);
      setCourses(coursesData);
      setModules(modulesData);
      setLessons(lessonsData);
      setClassrooms(classroomsData);
      setUsers(usersData);
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
    } catch (err) {
      message.error(err.message || "Delete failed");
    }
  };

  // Lessons Section
  const handleLessonSubmit = async (values) => {
    try {
      if (editingId) {
        await updateLesson(editingId, values);
        message.success("Lesson updated");
      } else {
        await createLesson(values);
        message.success("Lesson created");
      }
      resetForm(lessonForm, true);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleLessonEdit = (record) => {
    setEditingId(record.id);
    lessonForm.setFieldsValue(record);
    openEntityModal("lessons");
  };

  const handleLessonDelete = async (id) => {
    try {
      await deleteLesson(id);
      message.success("Lesson deleted");
      loadAll();
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

      const result =
        lessonType === "pdf" ? await uploadLessonPdf(file) : await uploadLessonFile(file);
      const fileUrl = result?.fileUrl || "";
      lessonForm.setFieldsValue({ contentUrl: fileUrl });
      message.success("File uploaded");
      onSuccess?.(result);
    } catch (err) {
      message.error(err.message || "Upload failed");
      onError?.(err);
    } finally {
      setLessonUploading(false);
    }
  };

  // Classrooms Section
  const handleClassroomSubmit = async (values) => {
    try {
      if (editingId) {
        await updateClassroom(editingId, values);
        message.success("Classroom updated");
      } else {
        await createClassroom(values);
        message.success("Classroom created");
      }
      resetForm(classroomForm, true);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
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
            <Form.Item name="levelId" label="Level" rules={[{ required: true }]}>
              <Select placeholder="Select level" options={levelOptions} />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input placeholder="Course title" />
            </Form.Item>
            <Form.Item name="teacherId" label="Teacher" rules={[{ required: true }]}>
              <Select placeholder="Select teacher" options={teacherOptions} />
            </Form.Item>
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
            <Form.Item name="moduleId" label="Module" rules={[{ required: true }]}>
              <Select placeholder="Select module" options={moduleOptions} />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input placeholder="Lesson title" />
            </Form.Item>
            <Form.Item name="type" label="Type" initialValue="pdf">
              <Select
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
                <Form.Item label="Upload File">
                  <Upload
                    showUploadList={false}
                    customRequest={handleLessonUpload}
                    accept={
                      lessonType === "pdf"
                        ? "application/pdf"
                        : ".zip,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs"
                    }
                  >
                    <Button icon={<UploadOutlined />} loading={lessonUploading} style={{ width: "100%" }}>
                      Upload
                    </Button>
                  </Upload>
                </Form.Item>
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

      case "classrooms":
        return (
          <Form form={classroomForm} layout="vertical" onFinish={handleClassroomSubmit} className="admin-form">
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. 3A" />
            </Form.Item>
            <Form.Item name="gradeId" label="Grade">
              <Select placeholder="Grade" options={gradeOptions} allowClear />
            </Form.Item>
            <Form.Item name="specialityId" label="Speciality">
              <Select placeholder="Speciality" options={specialityOptions} allowClear />
            </Form.Item>
            <Form.Item name="levelId" label="Level">
              <Select placeholder="Level" options={levelOptions} allowClear />
            </Form.Item>
            <Form.Item name="academicYear" label="Year">
              <Input placeholder="2024" />
            </Form.Item>
            <Form.Item name="teacherId" label="Teacher">
              <Select placeholder="Teacher" options={teacherOptions} allowClear />
            </Form.Item>
          </Form>
        );

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
            background: "#18181b",
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateClick("classrooms")}>
              Add Classroom
            </Button>

            <Divider className="section-divider">
              <Text type="secondary" style={{ fontSize: 12 }}>Assign Module to Classroom</Text>
            </Divider>
            <Button icon={<PlusOutlined />} onClick={openClassroomModuleModal}>
              Assign Module
            </Button>

            <Divider className="section-divider" />
            <Table
              columns={classroomColumns}
              dataSource={classrooms}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 10, showTotal: (total) => `${total} records` }}
              expandable={{
                expandedRowRender: (record) =>
                  classroomCourses[record.id] || classroomModules[record.id] ? (
                    <div className="classroom-courses">
                      {classroomCourses[record.id] && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Courses</Text>
                          <div style={{ marginTop: 6 }}>
                            {classroomCourses[record.id].length === 0 ? (
                              <Text type="secondary">No courses inherited.</Text>
                            ) : (
                              <Space wrap>
                                {classroomCourses[record.id].map((course) => (
                                  <Tag key={course.id}>{course.title}</Tag>
                                ))}
                              </Space>
                            )}
                          </div>
                        </div>
                      )}
                      {classroomModules[record.id] && (
                        <div style={{ marginTop: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Modules</Text>
                          <div style={{ marginTop: 6 }}>
                            {classroomModules[record.id].length === 0 ? (
                              <Text type="secondary">No modules assigned.</Text>
                            ) : (
                              <Space wrap>
                                {classroomModules[record.id].map((module) => (
                                  <Tag
                                    key={module.id}
                                    closable
                                    onClose={(event) => {
                                      event.preventDefault();
                                      handleClassroomModuleRemove(record.id, module.id);
                                    }}
                                  >
                                    {module.title}
                                  </Tag>
                                ))}
                              </Space>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null,
                rowExpandable: (record) =>
                  !!classroomCourses[record.id] || !!classroomModules[record.id],
              }}
            />
          </Card>
        );

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
      </AdminLayout>
    </ConfigProvider>
  );
};

export default AdminDashboard;
