import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Button, Typography, Empty, Space, Tag, Popconfirm } from "antd";
import { SERVER_URL } from "../config";
import {
  FileTextOutlined,
  RobotOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
import { useNavigate } from "react-router-dom";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function LessonPdfViewer({ lessons = [], onDelete, onEdit }) {
  const navigate = useNavigate();
  const displayLessons = useMemo(
    () => lessons.filter((l) => (l.type === "pdf" || l.type === "code") && l.contentUrl),
    [lessons]
  );
  const [selected, setSelected] = useState(displayLessons[0] || null);
  const [collapsed, setCollapsed] = useState(false);

  const defaultLayoutPluginInstance = defaultLayoutPlugin({ sidebarTabs: () => [] });

  useEffect(() => {
    if (!displayLessons.length) {
      setSelected(null);
      return;
    }

    setSelected((prev) => {
      if (prev && displayLessons.some((lesson) => lesson.id === prev.id)) {
        return displayLessons.find((lesson) => lesson.id === prev.id) || displayLessons[0];
      }
      return displayLessons[0];
    });
  }, [displayLessons]);

  const getPdfUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `${SERVER_URL}${url}`;
  };

  const highlightCode = (code) =>
    Prism.highlight(code || "", Prism.languages.javascript, "javascript");

  const openAssistant = (lesson) => {
    if (!lesson?.contentUrl || lesson.type !== "pdf") return;
    navigate("/pdf-assistant", {
      state: {
        pdfFile: getPdfUrl(lesson.contentUrl),
        filename: lesson.title,
      },
    });
  };

  const menuItems = displayLessons.map((lesson) => ({
    key: lesson.id,
    icon: <FileTextOutlined />,
    label: (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <Space size={4} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lesson.title.length > 16 ? lesson.title.slice(0, 16) + "..." : lesson.title}
          </span>
          <Tag color={lesson.type === "pdf" ? "blue" : "purple"} style={{ marginInlineEnd: 0 }}>
            {lesson.type?.toUpperCase()}
          </Tag>
        </Space>
        {(onEdit || onDelete) && (
          <Space size={2} onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(lesson); }} />
            )}
            {onDelete && (
              <Popconfirm title="Delete this lesson?" onConfirm={() => onDelete(lesson.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
              </Popconfirm>
            )}
          </Space>
        )}
      </div>
    ),
  }));

  if (displayLessons.length === 0) {
    return (
      <Empty
        image={<BookOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />}
        description={<Text type="secondary">No PDF or Code lessons available</Text>}
      />
    );
  }

  return (
    <Layout style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 8, overflow: "hidden", height: "calc(100vh - 180px)", minHeight: 800 }}>
      <Content style={{ padding: 24, background: "#fff", display: "flex", flexDirection: "column" }}>
        {selected ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
              <Space size={8}>
                <Title level={5} style={{ margin: 0 }}>{selected.title}</Title>
                <Tag color={selected.type === "pdf" ? "blue" : "purple"}>
                  {selected.type?.toUpperCase()}
                </Tag>
              </Space>
              {selected.type === "pdf" && (
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={() => openAssistant(selected)}
                  style={{ background: "#000", borderColor: "#000" }}
                >
                  AI Assistant
                </Button>
              )}
            </div>
            {selected.type === "pdf" ? (
              <div style={{ flex: 1, border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" }}>
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                  <Viewer
                    fileUrl={getPdfUrl(selected.contentUrl)}
                    plugins={[defaultLayoutPluginInstance]}
                  />
                </Worker>
              </div>
            ) : (
              <div style={{ flex: 1, border: "1px solid #2a2f3a", borderRadius: 8, overflow: "auto", background: "#0f1117" }}>
                <pre
                  style={{
                    margin: 0,
                    padding: 16,
                    color: "#e6edf3",
                    fontSize: 13,
                    minHeight: "100%",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                  }}
                  className="language-javascript"
                >
                  <code dangerouslySetInnerHTML={{ __html: highlightCode(selected.contentUrl) }} />
                </pre>
              </div>
            )}
          </>
        ) : (
          <Empty description={<Text type="secondary">Select a lesson from the sidebar</Text>} />
        )}
      </Content>

      <Sider
        width={260}
        collapsedWidth={52}
        collapsed={collapsed}
        theme="light"
        style={{ background: "#fafafa", borderLeft: "1px solid #f0f0f0" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
          {!collapsed && <Text strong style={{ fontSize: 13 }}>Lessons</Text>}
          <Button
            type="text"
            size="small"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>

        <Menu
          mode="inline"
          selectedKeys={selected ? [selected.id] : []}
          items={menuItems}
          onClick={({ key }) => {
            const lesson = displayLessons.find((l) => l.id === key);
            if (lesson) setSelected(lesson);
          }}
          style={{ background: "transparent", borderRight: "none" }}
        />
      </Sider>
    </Layout>
  );
}
