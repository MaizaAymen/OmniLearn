import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Layout,
  Menu,
  Button,
  Upload,
  Typography,
  Spin,
  Empty,
  Space,
  message,
} from "antd";
import {
  FileTextOutlined,
  UploadOutlined,
  RobotOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "./ClassroomPdf.css";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const API_URL = "http://localhost:5000/api/pdf";
const SERVER_URL = "http://localhost:5000";

export default function ClassroomPdf() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/list`);
      const items = Array.isArray(res.data.items) ? res.data.items : [];
      const normalized = items
        .map((item) => ({
          id: item.pdfId,
          name: item.filename || "Untitled Document",
          fileUrl: item.fileUrl ? `${SERVER_URL}${item.fileUrl}` : "",
          pages: item.pages || 0,
          uploadedAt: item.uploadedAt || new Date().toISOString(),
        }))
        .filter((item) => item.id && item.fileUrl);
      setCourses(normalized);
      if (normalized.length > 0 && !selectedCourse) {
        setSelectedCourse(normalized[0]);
      }
    } catch (error) {
      console.error("Error loading courses:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (info) => {
    const file = info.file;
    if (!file) return;

    if (file.type !== "application/pdf") {
      message.error("Please upload a PDF file");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setUploading(true);
      const res = await axios.post(`${API_URL}/upload`, formData);
      const fileUrl = res.data.fileUrl ? `${SERVER_URL}${res.data.fileUrl}` : "";
      const newCourse = {
        id: res.data.pdfId,
        name: res.data.filename || file.name,
        fileUrl: fileUrl,
        pages: res.data.pages || 0,
        uploadedAt: new Date().toISOString(),
      };
      setCourses((prev) => [newCourse, ...prev]);
      setSelectedCourse(newCourse);
      message.success("PDF uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const openAssistant = (course) => {
    if (!course?.id || !course?.fileUrl) return;
    navigate("/pdf-assistant", {
      state: {
        pdfId: course.id,
        pdfFile: course.fileUrl,
        filename: course.name,
      },
    });
  };

  const menuItems = courses.map((course) => ({
    key: course.id,
    icon: <FileTextOutlined />,
    label: (
      <span className="course-menu-label">
        {course.name.length > 25 ? course.name.slice(0, 25) + "..." : course.name}
      </span>
    ),
  }));

  return (
    <Layout className="classroom-layout">
      <Content className="classroom-content">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
            <Text className="loading-text">Loading courses...</Text>
          </div>
        ) : !selectedCourse ? (
          <div className="empty-container">
            <Empty
              image={<BookOutlined className="empty-icon" />}
              description={
                <Space direction="vertical" size={4}>
                  <Text strong>No course selected</Text>
                  <Text type="secondary">
                    Upload a PDF or select a course from the sidebar
                  </Text>
                </Space>
              }
            >
              <Upload
                accept="application/pdf"
                showUploadList={false}
                customRequest={({ file }) => handleUpload({ file })}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  Upload PDF
                </Button>
              </Upload>
            </Empty>
          </div>
        ) : (
          <div className="course-detail">
            <div className="course-header">
              <div className="course-header-left">
                <Title level={4} className="course-title">
                  {selectedCourse.name}
                </Title>
              </div>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={() => openAssistant(selectedCourse)}
                className="primary-btn"
              >
                AI Assistant
              </Button>
            </div>

            <div className="pdf-viewer-container">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={selectedCourse.fileUrl}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </Worker>
            </div>
          </div>
        )}
      </Content>

      <Sider
        width={280}
        collapsedWidth={60}
        collapsed={sidebarCollapsed}
        className="classroom-sidebar"
        theme="light"
      >
        <div className="sidebar-header">
          {!sidebarCollapsed && <Title level={5}>Courses</Title>}
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="collapse-btn"
          />
        </div>

        {!sidebarCollapsed && (
          <div className="sidebar-upload">
            <Upload
              accept="application/pdf"
              showUploadList={false}
              customRequest={({ file }) => handleUpload({ file })}
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploading}
                block
              >
                Upload PDF
              </Button>
            </Upload>
          </div>
        )}

        {loading ? (
          <div className="sidebar-loading">
            <Spin size="small" />
          </div>
        ) : courses.length === 0 ? (
          !sidebarCollapsed && (
            <div className="sidebar-empty">
              <Text type="secondary">No courses yet</Text>
            </div>
          )
        ) : (
          <Menu
            mode="inline"
            selectedKeys={selectedCourse ? [selectedCourse.id] : []}
            items={menuItems}
            onClick={({ key }) => {
              const course = courses.find((c) => c.id === key);
              if (course) setSelectedCourse(course);
            }}
            className="courses-menu"
          />
        )}
      </Sider>
    </Layout>
  );
}
