import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
  Popconfirm,
  Spin,
  Tag,
  ConfigProvider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
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
  fetchModules,
  createModule,
  updateModule,
  deleteModule,
  fetchLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  fetchClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  fetchClassroomCourses,
} from "./api";

const { Title, Text } = Typography;

const blackWhiteTheme = {
  token: {
    colorPrimary: "#000000",
    colorBgContainer: "#ffffff",
    colorBorder: "#e0e0e0",
    borderRadius: 6,
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

  const [editingId, setEditingId] = useState(null);
  const [classroomCourses, setClassroomCourses] = useState({});

  const [gradeForm] = Form.useForm();
  const [specialityForm] = Form.useForm();
  const [levelForm] = Form.useForm();
  const [courseForm] = Form.useForm();
  const [moduleForm] = Form.useForm();
  const [lessonForm] = Form.useForm();
  const [classroomForm] = Form.useForm();

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

  const resetForm = (form) => {
    form.resetFields();
    setEditingId(null);
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
      resetForm(gradeForm);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleGradeEdit = (record) => {
    setEditingId(record.id);
    gradeForm.setFieldsValue(record);
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
      resetForm(specialityForm);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleSpecialityEdit = (record) => {
    setEditingId(record.id);
    specialityForm.setFieldsValue(record);
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
      resetForm(levelForm);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleLevelEdit = (record) => {
    setEditingId(record.id);
    levelForm.setFieldsValue(record);
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
      resetForm(courseForm);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleCourseEdit = (record) => {
    setEditingId(record.id);
    courseForm.setFieldsValue(record);
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
      resetForm(moduleForm);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleModuleEdit = (record) => {
    setEditingId(record.id);
    moduleForm.setFieldsValue(record);
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
      resetForm(lessonForm);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleLessonEdit = (record) => {
    setEditingId(record.id);
    lessonForm.setFieldsValue(record);
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
      resetForm(classroomForm);
      loadAll();
    } catch (err) {
      message.error(err.message || "Operation failed");
    }
  };

  const handleClassroomEdit = (record) => {
    setEditingId(record.id);
    classroomForm.setFieldsValue(record);
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

  const gradeColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Display Name", dataIndex: "displayName", key: "displayName" },
    { title: "Order", dataIndex: "order", key: "order", width: 80 },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
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
      width: 120,
      render: (_, record) => (
        <Space>
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
      width: 120,
      render: (_, record) => (
        <Space>
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
    { title: "Teacher ID", dataIndex: "teacherId", key: "teacherId" },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
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
      width: 120,
      render: (_, record) => (
        <Space>
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
      render: (type) => <Tag>{type?.toUpperCase()}</Tag>,
    },
    { title: "Order", dataIndex: "order", key: "order", width: 80 },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
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
    { title: "Year", dataIndex: "academicYear", key: "academicYear" },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={classroomCourses[record.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => toggleClassroomCourses(record.id)}
          />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleClassroomEdit(record)} />
          <Popconfirm title="Delete?" onConfirm={() => handleClassroomDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "grades":
        return (
          <Card title="Grades" className="admin-card">
            <Form form={gradeForm} layout="inline" onFinish={handleGradeSubmit} className="admin-form">
              <Form.Item name="name" rules={[{ required: true }]}>
                <Input placeholder="Name" />
              </Form.Item>
              <Form.Item name="displayName" rules={[{ required: true }]}>
                <Input placeholder="Display Name" />
              </Form.Item>
              <Form.Item name="order">
                <InputNumber placeholder="Order" min={0} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    {editingId ? "Update" : "Create"}
                  </Button>
                  {editingId && <Button onClick={() => resetForm(gradeForm)}>Cancel</Button>}
                </Space>
              </Form.Item>
            </Form>
            <Table
              columns={gradeColumns}
              dataSource={grades}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );

      case "specialities":
        return (
          <Card title="Specialities" className="admin-card">
            <Form form={specialityForm} layout="inline" onFinish={handleSpecialitySubmit} className="admin-form">
              <Form.Item name="gradeId" rules={[{ required: true }]}>
                <Select placeholder="Select Grade" options={gradeOptions} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="name" rules={[{ required: true }]}>
                <Input placeholder="Name" />
              </Form.Item>
              <Form.Item name="displayName" rules={[{ required: true }]}>
                <Input placeholder="Display Name" />
              </Form.Item>
              <Form.Item name="order">
                <InputNumber placeholder="Order" min={0} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    {editingId ? "Update" : "Create"}
                  </Button>
                  {editingId && <Button onClick={() => resetForm(specialityForm)}>Cancel</Button>}
                </Space>
              </Form.Item>
            </Form>
            <Table
              columns={specialityColumns}
              dataSource={specialities}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );

      case "levels":
        return (
          <Card title="Levels" className="admin-card">
            <Form form={levelForm} layout="inline" onFinish={handleLevelSubmit} className="admin-form">
              <Form.Item name="specialityId" rules={[{ required: true }]}>
                <Select placeholder="Select Speciality" options={specialityOptions} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="name" rules={[{ required: true }]}>
                <Input placeholder="Name" />
              </Form.Item>
              <Form.Item name="displayName" rules={[{ required: true }]}>
                <Input placeholder="Display Name" />
              </Form.Item>
              <Form.Item name="order">
                <InputNumber placeholder="Order" min={0} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    {editingId ? "Update" : "Create"}
                  </Button>
                  {editingId && <Button onClick={() => resetForm(levelForm)}>Cancel</Button>}
                </Space>
              </Form.Item>
            </Form>
            <Table
              columns={levelColumns}
              dataSource={levels}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );

      case "courses":
        return (
          <Card title="Courses" className="admin-card">
            <Form form={courseForm} layout="inline" onFinish={handleCourseSubmit} className="admin-form">
              <Form.Item name="levelId" rules={[{ required: true }]}>
                <Select placeholder="Select Level" options={levelOptions} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="title" rules={[{ required: true }]}>
                <Input placeholder="Title" />
              </Form.Item>
              <Form.Item name="teacherId" rules={[{ required: true }]}>
                <Input placeholder="Teacher ID" />
              </Form.Item>
              <Form.Item name="description">
                <Input placeholder="Description" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    {editingId ? "Update" : "Create"}
                  </Button>
                  {editingId && <Button onClick={() => resetForm(courseForm)}>Cancel</Button>}
                </Space>
              </Form.Item>
            </Form>
            <Table
              columns={courseColumns}
              dataSource={courses}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );

      case "modules":
        return (
          <Card title="Modules" className="admin-card">
            <Form form={moduleForm} layout="inline" onFinish={handleModuleSubmit} className="admin-form">
              <Form.Item name="courseId" rules={[{ required: true }]}>
                <Select placeholder="Select Course" options={courseOptions} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="title" rules={[{ required: true }]}>
                <Input placeholder="Title" />
              </Form.Item>
              <Form.Item name="description">
                <Input placeholder="Description" />
              </Form.Item>
              <Form.Item name="order">
                <InputNumber placeholder="Order" min={0} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    {editingId ? "Update" : "Create"}
                  </Button>
                  {editingId && <Button onClick={() => resetForm(moduleForm)}>Cancel</Button>}
                </Space>
              </Form.Item>
            </Form>
            <Table
              columns={moduleColumns}
              dataSource={modules}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );

      case "lessons":
        return (
          <Card title="Lessons" className="admin-card">
            <Form form={lessonForm} layout="inline" onFinish={handleLessonSubmit} className="admin-form">
              <Form.Item name="moduleId" rules={[{ required: true }]}>
                <Select placeholder="Select Module" options={moduleOptions} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="title" rules={[{ required: true }]}>
                <Input placeholder="Title" />
              </Form.Item>
              <Form.Item name="type" initialValue="pdf">
                <Select
                  style={{ width: 100 }}
                  options={[
                    { value: "pdf", label: "PDF" },
                    { value: "video", label: "Video" },
                    { value: "code", label: "Code" },
                    { value: "quiz", label: "Quiz" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="contentUrl">
                <Input placeholder="Content URL" />
              </Form.Item>
              <Form.Item name="order">
                <InputNumber placeholder="Order" min={0} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    {editingId ? "Update" : "Create"}
                  </Button>
                  {editingId && <Button onClick={() => resetForm(lessonForm)}>Cancel</Button>}
                </Space>
              </Form.Item>
            </Form>
            <Table
              columns={lessonColumns}
              dataSource={lessons}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );

      case "classrooms":
        return (
          <Card title="Classrooms" className="admin-card">
            <Text type="secondary" className="admin-hint">
              Courses are inherited from the classroom level.
            </Text>
            <Form form={classroomForm} layout="inline" onFinish={handleClassroomSubmit} className="admin-form">
              <Form.Item name="name" rules={[{ required: true }]}>
                <Input placeholder="Name" />
              </Form.Item>
              <Form.Item name="gradeId">
                <Select placeholder="Grade" options={gradeOptions} style={{ width: 120 }} allowClear />
              </Form.Item>
              <Form.Item name="specialityId">
                <Select placeholder="Speciality" options={specialityOptions} style={{ width: 120 }} allowClear />
              </Form.Item>
              <Form.Item name="levelId">
                <Select placeholder="Level" options={levelOptions} style={{ width: 120 }} allowClear />
              </Form.Item>
              <Form.Item name="academicYear">
                <Input placeholder="Year" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="teacherId">
                <Input placeholder="Teacher ID" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                    {editingId ? "Update" : "Create"}
                  </Button>
                  {editingId && <Button onClick={() => resetForm(classroomForm)}>Cancel</Button>}
                </Space>
              </Form.Item>
            </Form>
            <Table
              columns={classroomColumns}
              dataSource={classrooms}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              expandable={{
                expandedRowRender: (record) =>
                  classroomCourses[record.id] ? (
                    <div className="classroom-courses">
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
                  ) : null,
                rowExpandable: (record) => !!classroomCourses[record.id],
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
      </AdminLayout>
    </ConfigProvider>
  );
};

export default AdminDashboard;
