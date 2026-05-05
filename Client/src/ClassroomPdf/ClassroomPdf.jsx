import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Layout, Menu, Button, Upload, Typography, Spin, Empty, Space,
  message, Input, Tag, Modal, Popconfirm,
} from "antd";
import {
  FileTextOutlined, UploadOutlined, BookOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, CodeOutlined,
  PlusOutlined, BulbOutlined, RobotOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "./ClassroomPdf.css";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const API = "http://localhost:5000/api/workspace";
const SERVER_URL = "http://localhost:5000";

// Prefix relative /uploads paths with the backend origin so the PDF viewer
// (and any plain fetch) hits Express instead of Vite's dev server.
const resolvePdfUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SERVER_URL}${url}`;
};

// Pick the current user id from the cookie so notes are per-user.
function getUserId() {
  try {
    const u = Cookies.get("user");
    return u ? JSON.parse(u).id : "guest";
  } catch {
    return "guest";
  }
}

export default function ClassroomPdf() {
  const navigate = useNavigate();
  const userId = getUserId();
  const NOTES_KEY = "ws-notes-" + userId;

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Code modal
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeName, setCodeName] = useState("");
  const [codeContent, setCodeContent] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  // Notes (per-user, saved in localStorage)
  const [notes, setNotes] = useState(() => localStorage.getItem(NOTES_KEY) || "");

  const layoutPlugin = defaultLayoutPlugin({ sidebarTabs: () => [] });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await axios.get(API + "/list");
      const list = res.data.items || [];
      setItems(list);
      if (list.length > 0) setSelected(list[0]);
    } catch (e) {
      message.error("Could not load workspace");
    } finally {
      setLoading(false);
    }
  }

  async function handlePdfUpload({ file }) {
    const isPdf =
      file.type === "application/pdf" ||
      (file.name || "").toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      message.error("PDF files only");
      return;
    }
    const fd = new FormData();
    fd.append("pdf", file);
    try {
      setUploading(true);
      const res = await axios.post(API + "/pdf", fd);
      setItems((prev) => [res.data, ...prev]);
      setSelected(res.data);
      message.success("PDF uploaded to your workspace");
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || "Upload failed";
      message.error(`Upload failed: ${detail}`);
    } finally {
      setUploading(false);
    }
  }

  async function saveCode() {
    if (!codeName.trim() || !codeContent.trim()) {
      message.error("Filename and code are both required");
      return;
    }
    try {
      setSavingCode(true);
      const res = await axios.post(API + "/code", {
        name: codeName.trim(),
        content: codeContent,
      });
      setItems((prev) => [res.data, ...prev]);
      setSelected(res.data);
      setCodeModalOpen(false);
      setCodeName("");
      setCodeContent("");
      message.success("Code saved to your workspace");
    } catch {
      message.error("Could not save code");
    } finally {
      setSavingCode(false);
    }
  }

  async function handleDelete(itemId) {
    try {
      await axios.delete(`${API}/item/${itemId}`);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (selected && selected.id === itemId) {
        const remainingItems = items.filter((item) => item.id !== itemId);
        setSelected(remainingItems.length > 0 ? remainingItems[0] : null);
      }
      message.success("Item deleted successfully");
    } catch (error) {
      message.error("Failed to delete item");
    }
  }

  function updateNotes(value) {
    setNotes(value);
    localStorage.setItem(NOTES_KEY, value);
  }

  const menuItems = items.map((it) => ({
    key: it.id,
    icon: it.type === "pdf" ? <FileTextOutlined /> : <CodeOutlined />,
    label: (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
          {it.name}
        </span>
        <Popconfirm
          title="Delete file?"
          description="This cannot be undone."
          onConfirm={(e) => {
            e.stopPropagation(); // Prevent menu click
            handleDelete(it.id);
          }}
          onCancel={(e) => e.stopPropagation()}
          okText="Delete"
          cancelText="Cancel"
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      </div>
    ),
  }));

  return (
    <Layout className="classroom-layout">
      <Content className="classroom-content">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
            <Text className="loading-text">Loading your workspace...</Text>
          </div>
        ) : !selected ? (
          <div className="empty-container">
            <Empty
              image={<BookOutlined className="empty-icon" />}
              description={
                                <Space direction="vertical" size={4}>
                  <Text strong>Your workspace is empty</Text>
                  <Text type="secondary">Upload a PDF or add code from the sidebar</Text>
                </Space>
              }
            />
          </div>
        ) : selected.type === "pdf" ? (
          <div className="course-detail">
            <div className="course-header">
              <div className="course-header-left">
                <Title level={4} className="course-title">{selected.name}</Title>
                <Tag style={{ marginTop: 4 }}>PDF</Tag>
              </div>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={() => navigate("/pdf-assistant", {
                  state: {
                    pdfId: selected.id,
                    pdfFile: resolvePdfUrl(selected.fileUrl),
                    filename: selected.name,
                  },
                })}
                className="primary-btn"
              >
                AI Assistant
              </Button>
            </div>
            <div className="pdf-viewer-container">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer fileUrl={resolvePdfUrl(selected.fileUrl)} plugins={[layoutPlugin]} />
              </Worker>
            </div>
          </div>
        ) : (
          <div className="course-detail">
            <div className="course-header">
              <div className="course-header-left">
                <Title level={4} className="course-title">{selected.name}</Title>
                <Tag color="blue" style={{ marginTop: 4 }}>Code</Tag>
              </div>
            </div>
            <div className="code-viewer-container">
              <pre className="code-content">{selected.content}</pre>
            </div>
          </div>
        )}
      </Content>

      <Sider
        width={280}
        collapsedWidth={60}
        collapsed={collapsed}
        className="classroom-sidebar"
        theme="light"
      >
        <div className="sidebar-header">
          {!collapsed && <Title level={5}>My Workspace</Title>}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-btn"
          />
        </div>

        {!collapsed && (
          <div className="sidebar-upload">
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              <Upload
                accept="application/pdf"
                showUploadList={false}
                customRequest={handlePdfUpload}
              >
                <Button icon={<UploadOutlined />} loading={uploading} block>
                  Upload PDF
                </Button>
              </Upload>
              <Button
                icon={<PlusOutlined />}
                block
                onClick={() => setCodeModalOpen(true)}
              >
                Add Code
              </Button>
            </Space>
          </div>
        )}

        {loading ? (
          <div className="sidebar-loading"><Spin size="small" /></div>
        ) : items.length === 0 ? (
          !collapsed && (
            <div className="sidebar-empty">
              <Text type="secondary">No files yet</Text>
            </div>
          )
        ) : (
          <Menu
            mode="inline"
            selectedKeys={selected ? [selected.id] : []}
            items={menuItems}
            onClick={({ key }) => {
              const found = items.find((i) => i.id === key);
              if (found) setSelected(found);
            }}
            className="courses-menu"
          />
        )}

        {!collapsed && (
          <div className="sidebar-notes">
            <div className="notes-header">
              <BulbOutlined className="notes-icon" />
              <Text strong className="notes-title">My Notes</Text>
              <span className="notes-saved">auto-saved</span>
            </div>
            <TextArea
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Write a thought, a TODO, a snippet..."
              autoSize={{ minRows: 4, maxRows: 8 }}
              className="notes-textarea"
              variant="borderless"
            />
          </div>
        )}
      </Sider>

      <Modal
        title={
          <Space>
            <CodeOutlined />
            <span>Add Code to Workspace</span>
          </Space>
        }
        open={codeModalOpen}
        onCancel={() => setCodeModalOpen(false)}
        onOk={saveCode}
        okText="Save"
        confirmLoading={savingCode}
        width={720}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Input
            placeholder="Filename (e.g. solution.js)"
            value={codeName}
            onChange={(e) => setCodeName(e.target.value)}
            prefix={<FileTextOutlined />}
            size="large"
          />
          <TextArea
            placeholder="Paste or type your code here..."
            value={codeContent}
            onChange={(e) => setCodeContent(e.target.value)}
            autoSize={{ minRows: 12, maxRows: 20 }}
            className="code-input"
          />
        </Space>
      </Modal>
    </Layout>
  );
}
