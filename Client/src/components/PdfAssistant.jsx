import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import axios from "axios";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Layout,
  Upload,
  Button,
  Card,
  Input,
  Typography,
  Space,
  Spin,
  message,
  Empty,
  Tooltip,
  Divider,
  FloatButton,
  Tabs,
  List,
  Modal,
  Tag,
} from "antd";
import {
  UploadOutlined,
  SendOutlined,
  FileTextOutlined,
  RobotOutlined,
  LeftOutlined,
  RightOutlined,
  BulbOutlined,
  ReadOutlined,
  UserOutlined,
  BookOutlined,
  SearchOutlined,
  PushpinOutlined,
  DeleteOutlined,
  HighlightOutlined,
} from "@ant-design/icons";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

const API_URL = "http://localhost:5000/api/pdf";

export default function PdfAssistant() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedText, setSelectedText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [pdfContainerWidth, setPdfContainerWidth] = useState(800);
  const pdfContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Highlights & Notes state
  const [highlights, setHighlights] = useState([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState("");

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState([]);

  // Smart Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Sidebar tab
  const [activeTab, setActiveTab] = useState("chat");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Resize sidebar functionality
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      // Constrain between 280px and 600px
      setSidebarWidth(Math.min(600, Math.max(280, newWidth)));
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove event listeners for resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Update PDF container width on resize
  useEffect(() => {
    const updatePdfWidth = () => {
      if (pdfContainerRef.current) {
        const containerWidth = pdfContainerRef.current.offsetWidth;
        // Leave some padding, max 900px for readability
        setPdfContainerWidth(Math.min(900, containerWidth - 80));
      }
    };

    updatePdfWidth();
    window.addEventListener("resize", updatePdfWidth);
    return () => window.removeEventListener("resize", updatePdfWidth);
  }, [sidebarWidth]);

  // Upload PDF
  const handleUpload = async (file) => {
    if (file.type !== "application/pdf") {
      message.error("Please upload a PDF file");
      return false;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setUploading(true);
      const response = await axios.post(`${API_URL}/upload`, formData);
      setPdfId(response.data.pdfId);
      setPdfFile(file);
      message.success(`${response.data.filename} uploaded successfully!`);
      setMessages([
        {
          role: "system",
          content: `PDF loaded: ${response.data.filename} (${response.data.totalPages} pages)`,
        },
      ]);
    } catch (error) {
      message.error("Failed to upload PDF");
    } finally {
      setUploading(false);
    }
    return false;
  };

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 10) {
      setSelectedText(text);
    }
  };

  // Explain selected text
  const explainText = async () => {
    if (!selectedText) {
      message.warning("Select some text first");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/explain`, {
        text: selectedText,
      });
      setExplanation(response.data.explanation);
      setSelectedText("");
    } catch (error) {
      message.error("Failed to explain text");
    } finally {
      setLoading(false);
    }
  };

  // Chat Q&A
  const askQuestion = async () => {
    if (!question.trim() || !pdfId) return;

    const userMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/chat`, {
        pdfId,
        question: userMessage.content,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.answer },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't answer that." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Summarize PDF
  const summarizePdf = async () => {
    if (!pdfId) return;

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/summarize`, { pdfId });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.summary },
      ]);
    } catch (error) {
      message.error("Failed to summarize");
    } finally {
      setLoading(false);
    }
  };

  // ─── Highlights + Notes ───────────────────────────────────────────
  const fetchHighlights = async () => {
    if (!pdfId) return;
    const res = await axios.get(`${API_URL}/highlights/${pdfId}`);
    setHighlights(res.data.highlights);
  };

  const saveHighlight = async () => {
    if (!selectedText || !pdfId) return;
    await axios.post(`${API_URL}/highlights`, {
      pdfId,
      text: selectedText,
      note: currentNote,
      page: pageNumber,
    });
    message.success("Highlight saved!");
    setSelectedText("");
    setCurrentNote("");
    setNoteModalOpen(false);
    fetchHighlights();
  };

  const deleteHighlight = async (id) => {
    await axios.delete(`${API_URL}/highlights/${pdfId}/${id}`);
    fetchHighlights();
  };

  // ─── Bookmarks ────────────────────────────────────────────────────
  const fetchBookmarks = async () => {
    if (!pdfId) return;
    const res = await axios.get(`${API_URL}/bookmarks/${pdfId}`);
    setBookmarks(res.data.bookmarks);
  };

  const addBookmark = async () => {
    if (!pdfId) return;
    await axios.post(`${API_URL}/bookmarks`, {
      pdfId,
      page: pageNumber,
      title: `Page ${pageNumber}`,
    });
    message.success("Bookmark added!");
    fetchBookmarks();
  };

  const deleteBookmark = async (id) => {
    await axios.delete(`${API_URL}/bookmarks/${pdfId}/${id}`);
    fetchBookmarks();
  };

  const goToBookmark = (page) => {
    setPageNumber(page);
  };

  // ─── Smart Search ─────────────────────────────────────────────────
  const smartSearch = async () => {
    if (!searchQuery.trim() || !pdfId) return;
    setSearching(true);
    try {
      const res = await axios.post(`${API_URL}/smart-search`, {
        pdfId,
        query: searchQuery,
      });
      setSearchResults(res.data.results);
    } catch (error) {
      message.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  // Load highlights & bookmarks when PDF loads
  useEffect(() => {
    if (pdfId) {
      fetchHighlights();
      fetchBookmarks();
    }
  }, [pdfId]);

  return (
    <Layout style={{ height: "100vh", background: "#f0f2f5" }}>
      {/* PDF Viewer */}
      <Content ref={pdfContainerRef} style={{ padding: 24, overflow: "auto" }}>
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>PDF Viewer</span>
            </Space>
          }
          extra={
            <Upload
              beforeUpload={handleUpload}
              showUploadList={false}
              accept=".pdf"
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                Upload PDF
              </Button>
            </Upload>
          }
          style={{ height: "100%", borderRadius: 12 }}
          bodyStyle={{ height: "calc(100% - 57px)", overflow: "auto" }}
        >
          {!pdfFile ? (
            <Empty
              image={<FileTextOutlined style={{ fontSize: 64, color: "#bfbfbf" }} />}
              description="Upload a PDF to get started"
              style={{ marginTop: 100 }}
            />
          ) : (
            <div onMouseUp={handleTextSelection}>
              {/* Page Navigation */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                  gap: 16,
                }}
              >
                <Button
                  icon={<LeftOutlined />}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                />
                <Text>
                  Page {pageNumber} of {numPages}
                </Text>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                />
              </div>

              {/* PDF Document */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Document
                  file={pdfFile}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={<Spin size="large" />}
                >
                  <Page
                    pageNumber={pageNumber}
                    width={pdfContainerWidth}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              </div>

              {/* Explanation Card */}
              {explanation && (
                <Card
                  size="small"
                  title={
                    <Space>
                      <BulbOutlined style={{ color: "#faad14" }} />
                      <span>AI Explanation</span>
                    </Space>
                  }
                  extra={
                    <Button size="small" onClick={() => setExplanation("")}>
                      Close
                    </Button>
                  }
                  style={{
                    marginTop: 16,
                    background: "#fffbe6",
                    border: "1px solid #ffe58f",
                  }}
                >
                  <Text style={{ whiteSpace: "pre-wrap" }}>{explanation}</Text>
                </Card>
              )}
            </div>
          )}
        </Card>

        {/* Floating Explain Button */}
        {selectedText && (
          <FloatButton.Group shape="square" style={{ right: sidebarWidth + 40 }}>
            <FloatButton
              icon={<BulbOutlined />}
              tooltip="Explain with AI"
              onClick={explainText}
            />
            <FloatButton
              icon={<HighlightOutlined />}
              tooltip="Save Highlight + Note"
              onClick={() => setNoteModalOpen(true)}
            />
          </FloatButton.Group>
        )}
      </Content>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 6,
          cursor: "col-resize",
          background: isResizing ? "#1890ff" : "#e8e8e8",
          transition: "background 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1890ff")}
        onMouseLeave={(e) =>
          !isResizing && (e.currentTarget.style.background = "#e8e8e8")
        }
      >
        <div
          style={{
            width: 2,
            height: 40,
            background: isResizing ? "#fff" : "#bfbfbf",
            borderRadius: 1,
          }}
        />
      </div>

      {/* Chat Sidebar */}
      <Sider
        width={sidebarWidth}
        style={{
          background: "#fff",
          userSelect: isResizing ? "none" : "auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            items={[
              {
                key: "chat",
                label: <span><RobotOutlined /> Chat</span>,
                children: (
                  <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
                    <div style={{ padding: 12 }}>
                      <Button block icon={<ReadOutlined />} onClick={summarizePdf} disabled={!pdfId || loading}>
                        Summarize PDF
                      </Button>
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fafafa" }}>
                      {messages.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ask anything about your PDF" />
                      ) : (
                        <Space direction="vertical" style={{ width: "100%" }} size={12}>
                          {messages.map((msg, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                              <Card
                                size="small"
                                style={{
                                  maxWidth: "85%",
                                  background: msg.role === "user" ? "#1890ff" : msg.role === "system" ? "#f6ffed" : "#fff",
                                  border: msg.role === "system" ? "1px solid #b7eb8f" : "1px solid #f0f0f0",
                                }}
                                bodyStyle={{ padding: "8px 12px" }}
                              >
                                <Space align="start">
                                  {msg.role !== "user" && <RobotOutlined style={{ color: msg.role === "system" ? "#52c41a" : "#1890ff" }} />}
                                  <Text style={{ color: msg.role === "user" ? "#fff" : "#000", whiteSpace: "pre-wrap" }}>{msg.content}</Text>
                                  {msg.role === "user" && <UserOutlined style={{ color: "#fff" }} />}
                                </Space>
                              </Card>
                            </div>
                          ))}
                          {loading && (
                            <div style={{ textAlign: "center" }}>
                              <Spin size="small" />
                              <Text type="secondary" style={{ marginLeft: 8 }}>AI is thinking...</Text>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </Space>
                      )}
                    </div>
                    <div style={{ padding: 16, borderTop: "1px solid #f0f0f0" }}>
                      <Space.Compact style={{ width: "100%" }}>
                        <TextArea
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); askQuestion(); } }}
                          placeholder="Ask about the PDF..."
                          disabled={!pdfId || loading}
                          autoSize={{ minRows: 1, maxRows: 3 }}
                        />
                        <Button type="primary" icon={<SendOutlined />} onClick={askQuestion} disabled={!pdfId || loading || !question.trim()} />
                      </Space.Compact>
                    </div>
                  </div>
                ),
              },
              {
                key: "highlights",
                label: <span><HighlightOutlined /> Notes</span>,
                children: (
                  <div style={{ padding: 16, height: "calc(100vh - 120px)", overflowY: "auto" }}>
                    <List
                      dataSource={highlights}
                      locale={{ emptyText: "Select text and save highlights with notes" }}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            <Button size="small" onClick={() => setPageNumber(item.page)}>Go</Button>,
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteHighlight(item.id)} />,
                          ]}
                        >
                          <List.Item.Meta
                            title={<><Tag color="gold">P{item.page}</Tag> {item.text.slice(0, 50)}...</>}
                            description={item.note || "No note"}
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                ),
              },
              {
                key: "bookmarks",
                label: <span><BookOutlined /> Bookmarks</span>,
                children: (
                  <div style={{ padding: 16, height: "calc(100vh - 120px)", overflowY: "auto" }}>
                    <Button block icon={<PushpinOutlined />} onClick={addBookmark} disabled={!pdfId} style={{ marginBottom: 16 }}>
                      Bookmark This Page
                    </Button>
                    <List
                      dataSource={bookmarks}
                      locale={{ emptyText: "No bookmarks yet" }}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            <Button size="small" type="primary" onClick={() => goToBookmark(item.page)}>Go</Button>,
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteBookmark(item.id)} />,
                          ]}
                        >
                          <List.Item.Meta title={item.title} description={`Page ${item.page}`} />
                        </List.Item>
                      )}
                    />
                  </div>
                ),
              },
              {
                key: "search",
                label: <span><SearchOutlined /> Search</span>,
                children: (
                  <div style={{ padding: 16, height: "calc(100vh - 120px)", overflowY: "auto" }}>
                    <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                      <Input
                        placeholder="Search by concept (e.g. 'machine learning')"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onPressEnter={smartSearch}
                      />
                      <Button type="primary" icon={<SearchOutlined />} onClick={smartSearch} loading={searching} />
                    </Space.Compact>
                    <List
                      dataSource={searchResults}
                      loading={searching}
                      locale={{ emptyText: "Search for concepts in your PDF" }}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            title={<Text ellipsis style={{ maxWidth: 280 }}>{item.excerpt}</Text>}
                            description={<Text type="secondary">{item.relevance}</Text>}
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Sider>

      {/* Note Modal */}
      <Modal
        title="Add Note to Highlight"
        open={noteModalOpen}
        onOk={saveHighlight}
        onCancel={() => setNoteModalOpen(false)}
      >
        <p><strong>Selected:</strong> {selectedText?.slice(0, 100)}...</p>
        <TextArea
          rows={4}
          placeholder="Add your note here..."
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
        />
      </Modal>
    </Layout>
  );
}
