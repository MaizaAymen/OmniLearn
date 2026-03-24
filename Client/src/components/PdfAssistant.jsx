import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import axios from "axios";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PdfAssistant.css";
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
  ColorPicker,
  Slider,
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
  UndoOutlined,
  DeleteOutlined,
  BgColorsOutlined,
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

  // Drawing state
  const [drawingMode, setDrawingMode] = useState(null); // null, 'pen', 'highlighter', 'eraser'
  const [drawingColor, setDrawingColor] = useState("#ff0000");
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState({}); // Store annotations per page
  const [highlightColor, setHighlightColor] = useState("#ffff00");
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Color presets
  const colorPresets = [
    "#ff0000", "#ff6b00", "#ffff00", "#00ff00",
    "#00ffff", "#0066ff", "#9900ff", "#ff00ff",
    "#000000", "#666666", "#999999", "#ffffff"
  ];

  const highlightPresets = [
    "#ffff00", "#00ff00", "#00ffff", "#ff00ff",
    "#ff9900", "#ff6b6b", "#a0d8ef", "#c9f0c9"
  ];

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

  // Setup canvas when PDF page loads
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      contextRef.current = ctx;

      // Restore annotations for current page
      if (annotations[pageNumber]) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = annotations[pageNumber];
      }
    }
  }, [pageNumber, pdfContainerWidth, numPages]);

  // Save current canvas to annotations before changing page
  const saveCurrentAnnotations = useCallback(() => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      setAnnotations((prev) => ({
        ...prev,
        [pageNumber]: dataUrl,
      }));
    }
  }, [pageNumber]);

  // Drawing functions
  const startDrawing = useCallback((e) => {
    if (!drawingMode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    lastPosRef.current = { x, y };

    const ctx = contextRef.current;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [drawingMode]);

  const draw = useCallback((e) => {
    if (!isDrawing || !drawingMode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = contextRef.current;

    if (drawingMode === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = brushSize * 3;
    } else if (drawingMode === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = brushSize * 5;
      ctx.globalAlpha = 0.3;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    lastPosRef.current = { x, y };
  }, [isDrawing, drawingMode, drawingColor, highlightColor, brushSize]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      const ctx = contextRef.current;
      if (ctx) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      saveCurrentAnnotations();
    }
  }, [isDrawing, saveCurrentAnnotations]);

  // Clear current page annotations
  const clearAnnotations = useCallback(() => {
    if (canvasRef.current) {
      const ctx = contextRef.current;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setAnnotations((prev) => {
        const newAnnotations = { ...prev };
        delete newAnnotations[pageNumber];
        return newAnnotations;
      });
    }
  }, [pageNumber]);

  // Clear all annotations
  const clearAllAnnotations = useCallback(() => {
    if (canvasRef.current) {
      const ctx = contextRef.current;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setAnnotations({});
    message.success("All annotations cleared");
  }, []);

  // Highlight selected text
  const highlightSelectedText = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();

    if (rects.length === 0) {
      message.warning("Select some text to highlight");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const ctx = contextRef.current;
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    ctx.fillStyle = highlightColor;
    ctx.globalAlpha = 0.4;

    for (const rect of rects) {
      const x = (rect.left - canvasRect.left) * scaleX;
      const y = (rect.top - canvasRect.top) * scaleY;
      const width = rect.width * scaleX;
      const height = rect.height * scaleY;
      ctx.fillRect(x, y, width, height);
    }

    ctx.globalAlpha = 1;
    selection.removeAllRanges();
    saveCurrentAnnotations();
    message.success("Text highlighted");
  }, [highlightColor, saveCurrentAnnotations]);

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
            <div onMouseUp={handleTextSelection} className="pdf-viewer-area">
              {/* tldraw-style Floating Toolbar */}
              <div className="tldraw-toolbar">
                {/* Main Tools */}
                <div className="tldraw-toolbar-group">
                  <Tooltip title="Select" placement="top">
                    <button
                      className={`tldraw-tool-btn ${!drawingMode ? "active" : ""}`}
                      onClick={() => setDrawingMode(null)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                        <path d="M13 13l6 6"/>
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip title="Pen" placement="top">
                    <button
                      className={`tldraw-tool-btn ${drawingMode === "pen" ? "active" : ""}`}
                      onClick={() => setDrawingMode("pen")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                        <path d="M2 2l7.586 7.586"/>
                        <circle cx="11" cy="11" r="2"/>
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip title="Highlighter" placement="top">
                    <button
                      className={`tldraw-tool-btn ${drawingMode === "highlighter" ? "active" : ""}`}
                      onClick={() => setDrawingMode("highlighter")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l-6 6v3h9l3-3"/>
                        <path d="M22 12l-4.6 4.6a2 2 0 01-2.8 0l-5.2-5.2a2 2 0 010-2.8L14 4"/>
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip title="Eraser" placement="top">
                    <button
                      className={`tldraw-tool-btn ${drawingMode === "eraser" ? "active" : ""}`}
                      onClick={() => setDrawingMode("eraser")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l10-10c.6-.6 1.5-.6 2.1 0l6 6c.6.6.6 1.5 0 2.1L13 20"/>
                        <path d="M6 11l8 8"/>
                      </svg>
                    </button>
                  </Tooltip>
                </div>

                <div className="tldraw-divider" />

                {/* Color Picker */}
                <div className="tldraw-toolbar-group">
                  <Tooltip title="Color" placement="top">
                    <div className="tldraw-color-wrapper">
                      <ColorPicker
                        value={drawingMode === "highlighter" ? highlightColor : drawingColor}
                        onChange={(color) => {
                          if (drawingMode === "highlighter") {
                            setHighlightColor(color.toHexString());
                          } else {
                            setDrawingColor(color.toHexString());
                          }
                        }}
                        presets={[
                          { label: "Colors", colors: colorPresets },
                          { label: "Highlights", colors: highlightPresets }
                        ]}
                        size="small"
                      >
                        <button className="tldraw-color-btn">
                          <div
                            className="tldraw-color-dot"
                            style={{
                              backgroundColor: drawingMode === "highlighter" ? highlightColor : drawingColor,
                            }}
                          />
                        </button>
                      </ColorPicker>
                    </div>
                  </Tooltip>

                  {/* Brush Size */}
                  <Tooltip title="Brush Size" placement="top">
                    <div className="tldraw-size-wrapper">
                      <button className="tldraw-tool-btn tldraw-size-btn">
                        <div
                          className="tldraw-size-dot"
                          style={{
                            width: Math.max(4, brushSize * 1.2),
                            height: Math.max(4, brushSize * 1.2),
                          }}
                        />
                      </button>
                      <div className="tldraw-size-popup">
                        <Slider
                          value={brushSize}
                          onChange={setBrushSize}
                          min={1}
                          max={20}
                          vertical
                          style={{ height: 100 }}
                        />
                      </div>
                    </div>
                  </Tooltip>
                </div>

                <div className="tldraw-divider" />

                {/* Text Highlight */}
                <div className="tldraw-toolbar-group">
                  <Tooltip title="Highlight Selected Text" placement="top">
                    <button
                      className="tldraw-tool-btn"
                      onClick={highlightSelectedText}
                    >
                      <BgColorsOutlined style={{ fontSize: 18 }} />
                    </button>
                  </Tooltip>
                </div>

                <div className="tldraw-divider" />

                {/* Clear Actions */}
                <div className="tldraw-toolbar-group">
                  <Tooltip title="Clear Page" placement="top">
                    <button
                      className="tldraw-tool-btn tldraw-danger"
                      onClick={clearAnnotations}
                    >
                      <UndoOutlined style={{ fontSize: 16 }} />
                    </button>
                  </Tooltip>
                  <Tooltip title="Clear All" placement="top">
                    <button
                      className="tldraw-tool-btn tldraw-danger"
                      onClick={clearAllAnnotations}
                    >
                      <DeleteOutlined style={{ fontSize: 16 }} />
                    </button>
                  </Tooltip>
                </div>
              </div>

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

              {/* PDF Document with Canvas Overlay */}
              <div
                className="pdf-canvas-container"
                style={{ display: "flex", justifyContent: "center", position: "relative" }}
              >
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
                    onRenderSuccess={() => {
                      // Setup canvas dimensions after PDF page renders
                      if (canvasRef.current) {
                        const pdfPage = canvasRef.current.parentElement.querySelector(".react-pdf__Page");
                        if (pdfPage) {
                          canvasRef.current.width = pdfPage.offsetWidth;
                          canvasRef.current.height = pdfPage.offsetHeight;
                          // Restore annotations
                          if (annotations[pageNumber]) {
                            const ctx = canvasRef.current.getContext("2d");
                            const img = new Image();
                            img.onload = () => ctx.drawImage(img, 0, 0);
                            img.src = annotations[pageNumber];
                          }
                        }
                      }
                    }}
                  />
                </Document>
                {/* Drawing Canvas Overlay */}
                <canvas
                  ref={canvasRef}
                  className={`drawing-canvas ${drawingMode ? "active" : ""}`}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    pointerEvents: drawingMode ? "auto" : "none",
                    cursor: drawingMode === "eraser" ? "crosshair" : drawingMode ? "crosshair" : "default",
                    zIndex: 10,
                  }}
                />
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
          <FloatButton
            icon={<BulbOutlined />}
            tooltip="Explain with AI"
            onClick={explainText}
            style={{ right: sidebarWidth + 40 }}
          />
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div style={{ padding: 16, flexShrink: 0 }}>
            <Title level={4} style={{ margin: 0 }}>
              <Space>
                <RobotOutlined />
                Chat with PDF
              </Space>
            </Title>
          </div>

          <Divider style={{ margin: 0, flexShrink: 0 }} />

          {/* Actions */}
          <div style={{ padding: 12, flexShrink: 0 }}>
            <Button
              block
              icon={<ReadOutlined />}
              onClick={summarizePdf}
              disabled={!pdfId || loading}
            >
              Summarize PDF
            </Button>
          </div>

          <Divider style={{ margin: 0, flexShrink: 0 }} />

          {/* Messages - Scrollable Chat Box */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: 16,
              background: "#fafafa",
              minHeight: 0,
            }}
          >
            {messages.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Ask anything about your PDF"
              />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <Card
                      size="small"
                      style={{
                        maxWidth: "85%",
                        background:
                          msg.role === "user"
                            ? "#1890ff"
                            : msg.role === "system"
                            ? "#f6ffed"
                            : "#fff",
                        border:
                          msg.role === "system"
                            ? "1px solid #b7eb8f"
                            : "1px solid #f0f0f0",
                      }}
                      bodyStyle={{ padding: "8px 12px" }}
                    >
                      <Space align="start">
                        {msg.role !== "user" && (
                          <RobotOutlined
                            style={{
                              color: msg.role === "system" ? "#52c41a" : "#1890ff",
                            }}
                          />
                        )}
                        <Text
                          style={{
                            color: msg.role === "user" ? "#fff" : "#000",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg.content}
                        </Text>
                        {msg.role === "user" && (
                          <UserOutlined style={{ color: "#fff" }} />
                        )}
                      </Space>
                    </Card>
                  </div>
                ))}
                {loading && (
                  <div style={{ textAlign: "center" }}>
                    <Spin size="small" />
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      AI is thinking...
                    </Text>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </Space>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: 16, borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
            <Space.Compact style={{ width: "100%" }}>
              <TextArea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    askQuestion();
                  }
                }}
                placeholder="Ask about the PDF..."
                disabled={!pdfId || loading}
                autoSize={{ minRows: 1, maxRows: 3 }}
                style={{ borderRadius: "6px 0 0 6px" }}
              />
              <Tooltip title="Send">
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={askQuestion}
                  disabled={!pdfId || loading || !question.trim()}
                  style={{ height: "auto" }}
                />
              </Tooltip>
            </Space.Compact>
          </div>
        </div>
      </Sider>
    </Layout>
  );
}
