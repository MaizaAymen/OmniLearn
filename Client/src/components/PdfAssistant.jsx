import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import axios from "axios";
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
  Divider,
  FloatButton,
  Tabs,
  List,
  Modal,
  Tag,
  Radio,
  InputNumber,
} from "antd";
import {
  UploadOutlined,
  SendOutlined,
  FileTextOutlined,
  RobotOutlined,
  BulbOutlined,
  ReadOutlined,
  UserOutlined,
  BookOutlined,
  SearchOutlined,
  PushpinOutlined,
  DeleteOutlined,
  HighlightOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

const { Sider, Content } = Layout;
const { Text } = Typography;
const { TextArea } = Input;

const API_URL = "http://localhost:5000/api/pdf";

export default function PdfAssistant() {
  const location = useLocation();
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewerKey, setViewerKey] = useState(0);
  const [initialPage, setInitialPage] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const pdfContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  

  const defaultLayoutPluginInstance = defaultLayoutPlugin({ sidebarTabs: () => [] });

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

  // Quiz state
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizCount, setQuizCount] = useState(10);
  const [quizPageFrom, setQuizPageFrom] = useState(1);
  const [quizPageTo, setQuizPageTo] = useState(3);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Sidebar tab
  const [activeTab, setActiveTab] = useState("chat");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load PDF from navigation state (e.g., Classroom PDFs)
  useEffect(() => {
    const state = location.state;
    if (state?.pdfId && state?.pdfFile) {
      setPdfId(state.pdfId);
      setPdfFile(state.pdfFile);
      setPageNumber(1);
      setInitialPage(0);
      setViewerKey((k) => k + 1);
      setSelectedText("");
      setExplanation("");
      setMessages([
        {
          role: "system",
          content: `PDF loaded: ${state.filename || "Selected PDF"}`,
        },
      ]);
    }
  }, [location.state]);

  // Resize sidebar functionality
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.min(600, Math.max(280, newWidth)));
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

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
      setInitialPage(0);
      setViewerKey((k) => k + 1);
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

  const goToPage = (page) => {
    setInitialPage(page - 1); // Viewer uses 0-indexed
    setViewerKey((k) => k + 1);
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

  // ─── Quiz Generation ─────────────────────────────────────────────
  const generateQuiz = async (count) => {
    if (!pdfId) {
      message.warning("Upload a PDF first");
      return;
    }

    if (Number(quizPageTo) < Number(quizPageFrom)) {
      message.warning("'To page' must be greater than or equal to 'From page'");
      return;
    }

    setQuizCount(count);
    setQuizLoading(true);
    try {
      const res = await axios.post(`${API_URL}/quiz`, {
        pdfId,
        count,
        pageFrom: Number(quizPageFrom) || 1,
        pageTo: Number(quizPageTo) || Number(quizPageFrom) || 1,
      });
      setQuizQuestions(res.data.questions || []);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(0);
      message.success(`Generated ${count} questions`);
    } catch (error) {
      message.error(error?.response?.data?.error || "Failed to generate quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  const normalizeAnswer = (value) => String(value || "").trim().toLowerCase();

  const getCorrectIndex = (item) => {
    const answer = normalizeAnswer(item?.answer);
    if (!answer || !Array.isArray(item?.options)) return -1;

    if (/^[a-d]$/.test(answer)) return answer.charCodeAt(0) - 97;

    const letterMatch = answer.match(/\b([a-d])\b/);
    if (letterMatch) return letterMatch[1].charCodeAt(0) - 97;

    return item.options.findIndex((option) => normalizeAnswer(option) === answer);
  };

  const submitQuiz = () => {
    if (!quizQuestions.length) return;

    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      message.warning("Please answer all questions first");
      return;
    }

    let score = 0;
    quizQuestions.forEach((item, index) => {
      const selectedIndex = quizAnswers[index];
      const correctIndex = getCorrectIndex(item);
      if (selectedIndex === correctIndex) score += 1;
    });

    setQuizScore(score);
    setQuizSubmitted(true);
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
      <Content ref={pdfContainerRef} style={{ padding: 24, overflow: "hidden" }}>
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
          bodyStyle={{ height: "calc(100% - 57px)", overflow: "hidden", padding: 0 }}
        >
          {!pdfFile ? (
            <Empty
              image={<FileTextOutlined style={{ fontSize: 64, color: "#bfbfbf" }} />}
              description="Upload a PDF to get started"
              style={{ marginTop: 100 }}
            />
          ) : (
            <div
              onMouseUp={handleTextSelection}
              style={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <div style={{ flex: 1, overflow: "hidden" }}>
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                  <Viewer
                    key={viewerKey}
                    fileUrl={pdfFile}
                    initialPage={initialPage}
                    plugins={[defaultLayoutPluginInstance]}
                    onPageChange={({ currentPage }) => setPageNumber(currentPage + 1)}
                    renderLoader={() => (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <Spin size="large" />
                      </div>
                    )}
                  />
                </Worker>
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
                    margin: 12,
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
                            <Button size="small" onClick={() => goToPage(item.page)}>Go</Button>,
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
                            <Button size="small" type="primary" onClick={() => goToPage(item.page)}>Go</Button>,
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
              {
                key: "quiz",
                label: <span><QuestionCircleOutlined /> Quiz</span>,
                children: (
                  <div style={{ padding: 16, height: "calc(100vh - 120px)", overflowY: "auto" }}>
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary">Pages to use</Text>
                      <Space style={{ width: "100%", marginTop: 6 }}>
                        <InputNumber
                          min={1}
                          value={quizPageFrom}
                          onChange={(value) => setQuizPageFrom(value || 1)}
                          disabled={!pdfId || quizLoading}
                          style={{ width: "100%" }}
                          placeholder="From"
                        />
                        <InputNumber
                          min={1}
                          value={quizPageTo}
                          onChange={(value) => setQuizPageTo(value || 1)}
                          disabled={!pdfId || quizLoading}
                          style={{ width: "100%" }}
                          placeholder="To"
                        />
                      </Space>
                    </div>

                    <Space style={{ width: "100%", marginBottom: 16 }}>
                      <Button
                        type={quizCount === 10 ? "primary" : "default"}
                        onClick={() => generateQuiz(10)}
                        loading={quizLoading && quizCount === 10}
                        disabled={!pdfId || quizLoading}
                      >
                        10 Questions
                      </Button>
                      <Button
                        type={quizCount === 20 ? "primary" : "default"}
                        onClick={() => generateQuiz(20)}
                        loading={quizLoading && quizCount === 20}
                        disabled={!pdfId || quizLoading}
                      >
                        20 Questions
                      </Button>
                    </Space>

                    <List
                      dataSource={quizQuestions}
                      loading={quizLoading}
                      locale={{ emptyText: "Generate a quiz from your PDF" }}
                      renderItem={(item, index) => (
                        <List.Item>
                          <Card size="small" style={{ width: "100%" }}>
                            <Text strong>{`Q${index + 1}. ${item.question || "Question"}`}</Text>
                            {Array.isArray(item.options) && item.options.length > 0 && (
                              <Radio.Group
                                style={{ marginTop: 10, width: "100%" }}
                                value={quizAnswers[index]}
                                onChange={(e) =>
                                  setQuizAnswers((prev) => ({ ...prev, [index]: e.target.value }))
                                }
                                disabled={quizSubmitted}
                              >
                                <Space direction="vertical" style={{ width: "100%" }}>
                                  {item.options.map((option, optionIndex) => (
                                    <Radio key={`${index}-${optionIndex}`} value={optionIndex}>
                                      {`${String.fromCharCode(65 + optionIndex)}. ${option}`}
                                    </Radio>
                                  ))}
                                </Space>
                              </Radio.Group>
                            )}

                            {quizSubmitted && (
                              <div style={{ marginTop: 10 }}>
                                {quizAnswers[index] === getCorrectIndex(item) ? (
                                  <Tag color="green">Correct</Tag>
                                ) : (
                                  <Tag color="red">Wrong</Tag>
                                )}
                                <Text type="secondary" style={{ marginLeft: 8 }}>
                                  Correct answer: {item.answer || "Not provided"}
                                </Text>
                              </div>
                            )}
                          </Card>
                        </List.Item>
                      )}
                    />

                    {quizQuestions.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        {!quizSubmitted ? (
                          <Button
                            type="primary"
                            block
                            onClick={submitQuiz}
                            disabled={quizLoading}
                          >
                            Submit Quiz
                          </Button>
                        ) : (
                          <Card size="small" style={{ textAlign: "center" }}>
                            <Text strong style={{ fontSize: 16 }}>
                              Your result: {quizScore} / {quizQuestions.length}
                            </Text>
                            <div style={{ marginTop: 10 }}>
                              <Button onClick={() => setQuizSubmitted(false)}>Review Answers</Button>
                              <Button
                                type="primary"
                                style={{ marginLeft: 8 }}
                                onClick={() => {
                                  setQuizAnswers({});
                                  setQuizSubmitted(false);
                                  setQuizScore(0);
                                }}
                              >
                                Retry Quiz
                              </Button>
                            </div>
                          </Card>
                        )}
                      </div>
                    )}
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
