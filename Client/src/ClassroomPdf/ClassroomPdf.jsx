import { useEffect, useMemo, useState } from "react";
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
  DeleteOutlined, InboxOutlined, SearchOutlined, EditOutlined, TagsOutlined,
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

  // Search + filter
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | pdf | code | recent | tag:<name>

  // Rename + tags modal
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

  // Read a code file client-side and fill the name + content fields.
  // Returning false prevents Upload from actually POSTing — we use the existing
  // /code endpoint when the user hits Save.
  function handleCodeFilePick(file) {
    const MAX_BYTES = 2 * 1024 * 1024; // 2MB — keeps us well under server JSON limit
    if (file.size > MAX_BYTES) {
      message.error("File too large (max 2MB)");
      return false;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCodeContent(String(e.target?.result || ""));
      if (!codeName.trim()) setCodeName(file.name);
      message.success(`Loaded ${file.name}`);
    };
    reader.onerror = () => message.error("Could not read file");
    reader.readAsText(file);
    return false;
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

  // Open the AI Assistant page in "code mode" with this snippet pre-loaded.
  function openCodeAssistant() {
    if (!selected || selected.type !== "code") return;
    navigate("/pdf-assistant", {
      state: {
        codeId: selected.id,
        codeContent: selected.content,
        codeName: selected.name,
      },
    });
  }

  function openEdit(it) {
    setEditItem(it);
    setEditName(it.name);
    setEditTags(Array.isArray(it.tags) ? it.tags : []);
    setTagInput("");
    setEditOpen(true);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (!editTags.includes(t)) setEditTags([...editTags, t]);
    setTagInput("");
  }

  function removeTag(t) {
    setEditTags(editTags.filter((x) => x !== t));
  }

  async function saveEdit() {
    if (!editItem) return;
    if (!editName.trim()) {
      message.error("Name cannot be empty");
      return;
    }
    try {
      setSavingEdit(true);
      const res = await axios.patch(`${API}/item/${editItem.id}`, {
        name: editName.trim(),
        tags: editTags,
      });
      setItems((prev) => prev.map((i) => (i.id === editItem.id ? res.data : i)));
      if (selected && selected.id === editItem.id) setSelected(res.data);
      setEditOpen(false);
      message.success("Saved");
    } catch {
      message.error("Could not save");
    } finally {
      setSavingEdit(false);
    }
  }

  // Build the unique tag list for chip filters.
  const allTags = useMemo(() => {
    const s = new Set();
    items.forEach((i) => (i.tags || []).forEach((t) => s.add(t)));
    return Array.from(s);
  }, [items]);

  // Apply search + filter chip.
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return items.filter((it) => {
      if (filter === "pdf" && it.type !== "pdf") return false;
      if (filter === "code" && it.type !== "code") return false;
      if (filter === "recent") {
        const t = new Date(it.createdAt || 0).getTime();
        if (!t || t < weekAgo) return false;
      }
      if (filter.startsWith("tag:")) {
        const wanted = filter.slice(4);
        if (!(it.tags || []).includes(wanted)) return false;
      }
      if (q) {
        const hay = (it.name + " " + (it.tags || []).join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, filter]);

  const menuItems = visibleItems.map((it) => ({
    key: it.id,
    icon: it.type === "pdf" ? <FileTextOutlined /> : <CodeOutlined />,
    label: (
      <div className="item-row">
        <div className="item-row-main">
          <span className="item-name">{it.name}</span>
          {(it.tags || []).length > 0 && (
            <div className="item-tags">
              {(it.tags || []).slice(0, 3).map((t) => (
                <Tag key={t} className="item-tag-pill">{t}</Tag>
              ))}
            </div>
          )}
        </div>
        <div className="item-row-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(it);
            }}
          />
          <Popconfirm
            title="Delete file?"
            description="This cannot be undone."
            onConfirm={(e) => {
              e.stopPropagation();
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
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={openCodeAssistant}
                className="primary-btn"
              >
                AI Assistant
              </Button>
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

        {!collapsed && items.length > 0 && (
          <div className="sidebar-search">
            <Input
              placeholder="Search files..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              size="small"
            />
            <div className="filter-chips">
              <Tag.CheckableTag
                checked={filter === "all"}
                onChange={() => setFilter("all")}
              >
                All
              </Tag.CheckableTag>
              <Tag.CheckableTag
                checked={filter === "pdf"}
                onChange={() => setFilter("pdf")}
              >
                PDF
              </Tag.CheckableTag>
              <Tag.CheckableTag
                checked={filter === "code"}
                onChange={() => setFilter("code")}
              >
                Code
              </Tag.CheckableTag>
              <Tag.CheckableTag
                checked={filter === "recent"}
                onChange={() => setFilter("recent")}
              >
                Recent
              </Tag.CheckableTag>
            </div>
            {allTags.length > 0 && (
              <div className="filter-chips tag-chips">
                <TagsOutlined className="tag-chips-icon" />
                {allTags.map((t) => (
                  <Tag.CheckableTag
                    key={t}
                    checked={filter === `tag:${t}`}
                    onChange={() => setFilter(filter === `tag:${t}` ? "all" : `tag:${t}`)}
                  >
                    {t}
                  </Tag.CheckableTag>
                ))}
              </div>
            )}
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
        ) : visibleItems.length === 0 ? (
          !collapsed && (
            <div className="sidebar-empty">
              <Text type="secondary">No files match your search</Text>
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
          <Upload.Dragger
            beforeUpload={handleCodeFilePick}
            showUploadList={false}
            multiple={false}
            accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.h,.cpp,.hpp,.cs,.go,.rs,.rb,.php,.html,.css,.scss,.json,.xml,.yml,.yaml,.sh,.bat,.ps1,.sql,.md,.txt,.kt,.swift,.dart,.lua,.r,.pl,.vue,.svelte"
            style={{ padding: "8px 0" }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
              <InboxOutlined style={{ fontSize: 28, color: "#1677ff" }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 14, marginBottom: 2 }}>
              Drop a code file here, or click to browse
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>
              Up to 2MB — .js, .py, .java, .cpp, .ts, and more
            </p>
          </Upload.Dragger>

          <div style={{ textAlign: "center", color: "#999", fontSize: 12 }}>
            — or paste below —
          </div>

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

      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>Rename & Tags</span>
          </Space>
        }
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={saveEdit}
        okText="Save"
        confirmLoading={savingEdit}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <Text strong>Name</Text>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onPressEnter={saveEdit}
              placeholder="File name"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text strong>Tags</Text>
            <div className="edit-tags-row" style={{ marginTop: 4 }}>
              {editTags.map((t) => (
                <Tag key={t} closable onClose={() => removeTag(t)}>
                  {t}
                </Tag>
              ))}
            </div>
            <Space.Compact style={{ width: "100%", marginTop: 8 }}>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={addTag}
                placeholder="e.g. math, dsa, week-1"
              />
              <Button onClick={addTag} icon={<PlusOutlined />}>Add</Button>
            </Space.Compact>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Press Enter to add a tag. Tags help group files by subject.
            </Text>
          </div>
        </Space>
      </Modal>
    </Layout>
  );
}
