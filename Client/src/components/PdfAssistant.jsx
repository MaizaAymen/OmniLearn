import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import axios from "axios";
import Cookies from "js-cookie";
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
  Badge,
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
  HistoryOutlined,
  TrophyOutlined,
  RedoOutlined,
} from "@ant-design/icons";

const { Sider, Content } = Layout;
const { Text } = Typography;
const { TextArea } = Input;

const API_URL = "http://localhost:5000/api/pdf";
const WORKSPACE_API = "http://localhost:5000/api/workspace";
const SERVER_URL = "http://localhost:5000";

// Axios instance that auto-attaches the auth token for every request to /api/pdf.
// The PDF routes are gated behind authenticate + requirePro on the server.
const api = axios.create();
api.interceptors.request.use((config) => {
  const token =
    Cookies.get("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Plain axios instance with NO interceptors — used for downloading PDF blobs
// from external URLs (Cloudinary) or static /uploads where adding the global
// Authorization header can interfere or cause stale-token redirects.
const plainAxios = axios.create();

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
  // Refs for code viewer scroll-to-highlight ("Go" button in code mode).
  const codeViewerRef = useRef(null);
  const codePreRef = useRef(null);

  

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

  // Study History — stored on the server via /api/workspace/history
  const [studyHistory, setStudyHistory] = useState([]);

  const fetchStudyHistory = async () => {
    try {
      const res = await api.get(`${WORKSPACE_API}/history`);
      setStudyHistory(res.data.history || []);
    } catch (err) {
      // Silent — history is non-critical.
    }
  };

  const saveToHistory = async (entry) => {
    try {
      const res = await api.post(`${WORKSPACE_API}/history`, entry);
      setStudyHistory((prev) => [res.data, ...prev]);
    } catch (err) {
      message.warning("Couldn't save to history");
    }
  };

  const deleteHistoryEntry = async (id) => {
    try {
      await api.delete(`${WORKSPACE_API}/history/${id}`);
      setStudyHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      message.error("Failed to delete entry");
    }
  };

  const clearAllHistory = async () => {
    try {
      await api.delete(`${WORKSPACE_API}/history`);
      setStudyHistory([]);
    } catch (err) {
      message.error("Failed to clear history");
    }
  };

  useEffect(() => {
    fetchStudyHistory();
  }, []);

  // Sidebar tab
  const [activeTab, setActiveTab] = useState("chat");

  // ─── Code mode (when navigated from My Workspace with a code snippet) ───
  // When set, the left panel shows the code instead of the PDF viewer, and
  // the chat is routed through /api/workspace/code/analyze.
  const [codeMode, setCodeMode] = useState(false);
  const [codeContent, setCodeContent] = useState("");
  const [codeName, setCodeName] = useState("");
  const [codeId, setCodeId] = useState(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load CODE from navigation state (My Workspace → AI Assistant on a code file).
  // The user runs Summarize/Chat manually — no auto-analyze on load.
  useEffect(() => {
    const state = location.state;
    if (!state?.codeContent) return;

    setCodeMode(true);
    setCodeContent(state.codeContent);
    setCodeName(state.codeName || "snippet");
    setCodeId(state.codeId || null);
    setMessages([{ role: "system", content: `Code loaded: ${state.codeName || "snippet"}` }]);
  }, [location.state]);

  // Load PDF from navigation state (e.g., Classroom PDFs)
  useEffect(() => {
    const state = location.state;
    if (!state?.pdfFile) return;

    // Local paths (/uploads/...) must be prefixed with the backend origin —
    // both for the viewer below and for the AI prep fetch.
    const resolvedUrl = state.pdfFile.startsWith("/")
      ? `${SERVER_URL}${state.pdfFile}`
      : state.pdfFile;

    setPdfFile(resolvedUrl);
    setViewerKey((k) => k + 1);
    setMessages([{ role: "system", content: `PDF loaded: ${state.filename || "Selected PDF"}` }]);

    // The pdfId from classroom navigation isn't registered with the PDF backend.
    // Upload it via /upload so summarize/chat/quiz work.
    setUploading(true);
    (async () => {
      const fetchUrl = resolvedUrl;

      // Use plainAxios (no auth interceptor) — sending Bearer to Cloudinary or
      // letting the global 401 interceptor fire on a stale token would break this.
      const resp = await plainAxios.get(fetchUrl, { responseType: "blob" });
      const blob = resp.data;

      if (!blob || blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }
      // The blob's mime can be wrong if the URL returned an HTML error page;
      // guard against it by checking the magic bytes before sending upstream.
      const head = await blob.slice(0, 4).text();
      if (head !== "%PDF") {
        throw new Error("Source URL did not return a PDF (got " + (blob.type || "unknown") + ")");
      }

      const file = new File([blob], state.filename || "document.pdf", { type: "application/pdf" });
      const fd = new FormData();
      fd.append("pdf", file);
      const { data } = await api.post(`${API_URL}/upload`, fd, { timeout: 90000 });
      setPdfId(data.pdfId);
      if (data.warning) {
        message.warning(
          `PDF loaded, but text extraction failed (${data.warning}). You can view it, but Chat / Summarize / Quiz won't work.`,
          8
        );
      } else {
        message.success("Ready for AI features");
      }
    })()
      .catch((e) => message.error(`AI prep failed: ${e?.response?.data?.error || e.message}`))
      .finally(() => setUploading(false));
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
      const response = await api.post(`${API_URL}/upload`, formData, { timeout: 90000 });
      setPdfId(response.data.pdfId);
      setPdfFile(file);
      setInitialPage(0);
      setViewerKey((k) => k + 1);
      if (response.data.warning) {
        message.warning(
          `PDF uploaded, but text extraction failed (${response.data.warning}). You can view it, but Chat / Summarize / Quiz won't work for this file.`,
          8
        );
      } else {
        message.success(`${response.data.filename} uploaded successfully!`);
      }
      setMessages([
        {
          role: "system",
          content: response.data.warning
            ? `PDF loaded: ${response.data.filename} — text extraction unavailable for this file.`
            : `PDF loaded: ${response.data.filename} (${response.data.totalPages} pages)`,
        },
      ]);
    } catch (error) {
      const detail = error?.response?.data?.error || error?.message || "Failed to upload PDF";
      message.error(`Upload failed: ${detail}`);
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

  // Explain selected text — uses workspace /code/analyze in code mode (since the
  // PDF /explain endpoint is requirePro), otherwise the original PDF endpoint.
  const explainText = async () => {
    if (!selectedText) {
      message.warning("Select some text first");
      return;
    }

    try {
      setLoading(true);
      let explanationText;
      if (codeMode) {
        const response = await api.post(`${WORKSPACE_API}/code/analyze`, {
          itemId: codeId,
          content: codeContent,
          name: codeName,
          question: `Explain this snippet from the file in simple terms:\n\n${selectedText}`,
        });
        explanationText = response.data.answer;
      } else {
        const response = await api.post(`${API_URL}/explain`, { text: selectedText });
        explanationText = response.data.explanation;
      }
      setExplanation(explanationText);
      saveToHistory({
        type: "explanation",
        documentName: codeMode ? codeName : (pdfFile?.name || "PDF"),
        selectedText: selectedText.slice(0, 120),
        explanation: explanationText,
      });
      setSelectedText("");
    } catch (error) {
      message.error("Failed to explain text");
    } finally {
      setLoading(false);
    }
  };

  // Chat Q&A — routes to workspace endpoint in code mode, PDF endpoint otherwise.
  const askQuestion = async () => {
    if (!question.trim()) return;
    if (!codeMode && !pdfId) return;

    const userMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    try {
      setLoading(true);
      let answer;
      if (codeMode) {
        // Replay only user/assistant turns as history (skip the system intro line).
        const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
        const response = await api.post(`${WORKSPACE_API}/code/analyze`, {
          itemId: codeId,
          content: codeContent,
          name: codeName,
          question: userMessage.content,
          history,
        });
        answer = response.data.answer;
      } else {
        const response = await api.post(`${API_URL}/chat`, {
          pdfId,
          question: userMessage.content,
        });
        answer = response.data.answer;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't answer that." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Summarize — routes to the right endpoint based on mode.
  const summarizePdf = async () => {
    if (!codeMode && !pdfId) return;

    try {
      setLoading(true);
      let summary;
      if (codeMode) {
        const response = await api.post(`${WORKSPACE_API}/code/summarize`, {
          itemId: codeId,
          content: codeContent,
          name: codeName,
        });
        summary = response.data.summary;
      } else {
        const response = await api.post(`${API_URL}/summarize`, { pdfId });
        summary = response.data.summary;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: summary }]);
    } catch (error) {
      const detail = error?.response?.data?.error || error?.message || "Failed to summarize";
      message.error(`Failed to summarize: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Highlights + Notes ───────────────────────────────────────────
  // In code mode we persist to localStorage (no pages, no Pro gate).
  const codeHighlightsKey = (id) => `code-highlights-${id}`;

  const fetchHighlights = async () => {
    if (codeMode) {
      if (!codeId) return;
      try {
        const saved = JSON.parse(localStorage.getItem(codeHighlightsKey(codeId)) || "[]");
        setHighlights(Array.isArray(saved) ? saved : []);
      } catch { setHighlights([]); }
      return;
    }
    if (!pdfId) return;
    const res = await api.get(`${API_URL}/highlights/${pdfId}`);
    setHighlights(res.data.highlights);
  };

  const saveHighlight = async () => {
    if (!selectedText) return;

    if (codeMode) {
      if (!codeId) return;
      const item = {
        id: String(Date.now()),
        text: selectedText,
        note: currentNote,
        createdAt: new Date().toISOString(),
      };
      const next = [item, ...(highlights || [])];
      setHighlights(next);
      localStorage.setItem(codeHighlightsKey(codeId), JSON.stringify(next));
    } else {
      if (!pdfId) return;
      await api.post(`${API_URL}/highlights`, {
        pdfId,
        text: selectedText,
        note: currentNote,
        page: pageNumber,
      });
      fetchHighlights();
    }

    message.success("Highlight saved!");
    setSelectedText("");
    setCurrentNote("");
    setNoteModalOpen(false);
  };

  const deleteHighlight = async (id) => {
    if (codeMode) {
      if (!codeId) return;
      const next = (highlights || []).filter((h) => h.id !== id);
      setHighlights(next);
      localStorage.setItem(codeHighlightsKey(codeId), JSON.stringify(next));
      return;
    }
    await api.delete(`${API_URL}/highlights/${pdfId}/${id}`);
    fetchHighlights();
  };

  // ─── Bookmarks ────────────────────────────────────────────────────
  const fetchBookmarks = async () => {
    if (!pdfId) return;
    const res = await api.get(`${API_URL}/bookmarks/${pdfId}`);
    setBookmarks(res.data.bookmarks);
  };

  const addBookmark = async () => {
    if (!pdfId) return;
    await api.post(`${API_URL}/bookmarks`, {
      pdfId,
      page: pageNumber,
      title: `Page ${pageNumber}`,
    });
    message.success("Bookmark added!");
    fetchBookmarks();
  };

  const deleteBookmark = async (id) => {
    await api.delete(`${API_URL}/bookmarks/${pdfId}/${id}`);
    fetchBookmarks();
  };

  const goToPage = (page) => {
    setInitialPage(page - 1); // Viewer uses 0-indexed
    setViewerKey((k) => k + 1);
    setPageNumber(page);
  };

  // "Go" for code highlights: finds the snippet in the rendered <pre>, scrolls
  // it into view and selects it briefly so the user can see exactly where it lives.
  const goToCodeHighlight = (text) => {
    if (!text || !codePreRef.current || !codeViewerRef.current) return;
    const idx = (codeContent || "").indexOf(text);
    if (idx === -1) {
      message.warning("Couldn't find this snippet in the code");
      return;
    }
    const textNode = codePreRef.current.firstChild;
    if (!textNode || textNode.nodeType !== 3) return;

    try {
      const range = document.createRange();
      range.setStart(textNode, idx);
      range.setEnd(textNode, idx + text.length);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // Scroll the viewer so the snippet lands ~60px from the top.
      const rangeRect = range.getBoundingClientRect();
      const containerRect = codeViewerRef.current.getBoundingClientRect();
      codeViewerRef.current.scrollTop += rangeRect.top - containerRect.top - 60;
    } catch (err) {
      // Range API can throw if indices fall outside the text node — fail quietly.
    }
  };

  // ─── Smart Search ─────────────────────────────────────────────────
  const smartSearch = async () => {
    if (!searchQuery.trim() || !pdfId) return;
    setSearching(true);
    try {
      const res = await api.post(`${API_URL}/smart-search`, {
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
    if (codeMode) {
      if (!codeContent) {
        message.warning("No code loaded");
        return;
      }
    } else {
      if (!pdfId) {
        message.warning("Upload a PDF first");
        return;
      }
      if (Number(quizPageTo) < Number(quizPageFrom)) {
        message.warning("'To page' must be greater than or equal to 'From page'");
        return;
      }
    }

    setQuizCount(count);
    setQuizLoading(true);
    try {
      let questions;
      if (codeMode) {
        const res = await api.post(`${WORKSPACE_API}/code/quiz`, {
          itemId: codeId,
          content: codeContent,
          name: codeName,
          count,
        });
        questions = res.data.questions || [];
      } else {
        const res = await api.post(`${API_URL}/quiz`, {
          pdfId,
          count,
          pageFrom: Number(quizPageFrom) || 1,
          pageTo: Number(quizPageTo) || Number(quizPageFrom) || 1,
        });
        questions = res.data.questions || [];
      }
      setQuizQuestions(questions);
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
    saveToHistory({
      type: "quiz",
      documentName: codeMode ? codeName : (pdfFile?.name || "PDF"),
      score,
      total: quizQuestions.length,
      questions: quizQuestions,
    });
  };

  // Load highlights & bookmarks when PDF loads — or highlights from localStorage
  // when entering code mode.
  useEffect(() => {
    if (codeMode && codeId) {
      fetchHighlights();
      return;
    }
    if (pdfId) {
      fetchHighlights();
      fetchBookmarks();
    }
  }, [pdfId, codeMode, codeId]);

  return (
    <Layout style={{ height: "100vh", background: "#f0f2f5" }}>
      {/* PDF Viewer */}
      <Content ref={pdfContainerRef} style={{ padding: 24, overflow: "hidden" }}>
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>{codeMode ? `Code — ${codeName}` : "PDF Viewer"}</span>
            </Space>
          }
          extra={
            codeMode ? null : (
              <Upload
                beforeUpload={handleUpload}
                showUploadList={false}
                accept=".pdf"
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  Upload PDF
                </Button>
              </Upload>
            )
          }
          style={{ height: "100%", borderRadius: 12 }}
          bodyStyle={{ height: "calc(100% - 57px)", overflow: "hidden", padding: 0 }}
        >
          {codeMode ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div
                ref={codeViewerRef}
                onMouseUp={handleTextSelection}
                style={{ flex: 1, overflow: "auto", background: "#0d1117", padding: 16 }}
              >
                <pre
                  ref={codePreRef}
                  style={{
                    margin: 0,
                    color: "#c9d1d9",
                    fontFamily: "Menlo, Consolas, monospace",
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {codeContent}
                </pre>
              </div>

              {/* Explanation card — pinned at the bottom, same look as PDF flow. */}
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
                    <Button size="small" onClick={() => setExplanation("")}>Close</Button>
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
          ) : !pdfFile ? (
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
            items={([
              {
                key: "chat",
                label: <span><RobotOutlined /> Chat</span>,
                children: (
                  <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
                    <div style={{ padding: 12 }}>
                      <Button
                        block
                        icon={<ReadOutlined />}
                        onClick={summarizePdf}
                        loading={!codeMode && uploading}
                        disabled={(!codeMode && (!pdfId || uploading)) || loading}
                      >
                        {codeMode ? "Summarize Code" : (uploading ? "Preparing PDF for AI…" : "Summarize PDF")}
                      </Button>
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fafafa" }}>
                      {messages.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={codeMode ? "Ask anything about your code" : "Ask anything about your PDF"} />
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
                          placeholder={codeMode ? "Ask about the code..." : "Ask about the PDF..."}
                          disabled={(!codeMode && !pdfId) || loading}
                          autoSize={{ minRows: 1, maxRows: 3 }}
                        />
                        <Button type="primary" icon={<SendOutlined />} onClick={askQuestion} disabled={(!codeMode && !pdfId) || loading || !question.trim()} />
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
                      locale={{
                        emptyText: codeMode
                          ? "Select code and save highlights with notes"
                          : "Select text and save highlights with notes",
                      }}
                      renderItem={(item) => (
                        <List.Item
                          actions={
                            codeMode
                              ? [
                                  <Button size="small" onClick={() => goToCodeHighlight(item.text)}>Go</Button>,
                                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteHighlight(item.id)} />,
                                ]
                              : [
                                  <Button size="small" onClick={() => goToPage(item.page)}>Go</Button>,
                                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteHighlight(item.id)} />,
                                ]
                          }
                        >
                          <List.Item.Meta
                            title={
                              codeMode ? (
                                <Text code style={{ fontSize: 12 }}>{(item.text || "").slice(0, 60)}{(item.text || "").length > 60 ? "..." : ""}</Text>
                              ) : (
                                <><Tag color="gold">P{item.page}</Tag> {item.text.slice(0, 50)}...</>
                              )
                            }
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
                    {!codeMode && (
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
                    )}

                    <Space style={{ width: "100%", marginBottom: 16 }}>
                      <Button
                        type={quizCount === 10 ? "primary" : "default"}
                        onClick={() => generateQuiz(10)}
                        loading={quizLoading && quizCount === 10}
                        disabled={(!codeMode && !pdfId) || quizLoading}
                      >
                        10 Questions
                      </Button>
                      <Button
                        type={quizCount === 20 ? "primary" : "default"}
                        onClick={() => generateQuiz(20)}
                        loading={quizLoading && quizCount === 20}
                        disabled={(!codeMode && !pdfId) || quizLoading}
                      >
                        20 Questions
                      </Button>
                    </Space>

                    <List
                      dataSource={quizQuestions}
                      loading={quizLoading}
                      locale={{ emptyText: codeMode ? "Generate a quiz from your code" : "Generate a quiz from your PDF" }}
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
              {
                key: "history",
                label: (
                  <span>
                    <HistoryOutlined />
                    {" History"}
                    {studyHistory.length > 0 && (
                      <Badge count={studyHistory.length} size="small" style={{ marginLeft: 4 }} />
                    )}
                  </span>
                ),
                children: (
                  <div style={{ padding: 16, height: "calc(100vh - 120px)", overflowY: "auto" }}>
                    {studyHistory.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No study sessions yet. Explain text or take a quiz to start tracking."
                      />
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                          <Button
                            size="small"
                            danger
                            onClick={clearAllHistory}
                          >
                            Clear All
                          </Button>
                        </div>
                        <List
                          dataSource={studyHistory}
                          renderItem={(item) => (
                            <List.Item style={{ padding: "8px 0" }}>
                              <Card
                                size="small"
                                style={{ width: "100%", borderRadius: 8 }}
                                bodyStyle={{ padding: "10px 12px" }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                  <Tag color={item.type === "quiz" ? "blue" : "orange"}>
                                    {item.type === "quiz" ? <><TrophyOutlined /> Quiz</> : <><BulbOutlined /> Explanation</>}
                                  </Tag>
                                  <Space size={6}>
                                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                      {new Date(item.date).toLocaleString()}
                                    </Typography.Text>
                                    <Button
                                      size="small"
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => deleteHistoryEntry(item.id)}
                                    />
                                  </Space>
                                </div>

                                <Typography.Text strong style={{ fontSize: 13 }}>
                                  {item.documentName}
                                </Typography.Text>

                                {item.type === "quiz" && (
                                  <div style={{ marginTop: 6 }}>
                                    <Tag color={item.score / item.total >= 0.7 ? "green" : item.score / item.total >= 0.4 ? "gold" : "red"}>
                                      {item.score} / {item.total}
                                      {" "}({Math.round((item.score / item.total) * 100)}%)
                                    </Tag>
                                    <Button
                                      size="small"
                                      icon={<RedoOutlined />}
                                      style={{ marginLeft: 6 }}
                                      onClick={() => {
                                        setQuizQuestions(item.questions);
                                        setQuizAnswers({});
                                        setQuizSubmitted(false);
                                        setQuizScore(0);
                                        setActiveTab("quiz");
                                      }}
                                    >
                                      Retake
                                    </Button>
                                  </div>
                                )}

                                {item.type === "explanation" && (
                                  <div style={{ marginTop: 6 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                      "{item.selectedText}{item.selectedText?.length >= 120 ? "..." : ""}"
                                    </Typography.Text>
                                  </div>
                                )}
                              </Card>
                            </List.Item>
                          )}
                        />
                      </>
                    )}
                  </div>
                ),
              },
            ]).filter((tab) => !codeMode || ["chat", "quiz", "highlights", "history"].includes(tab.key))}
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
