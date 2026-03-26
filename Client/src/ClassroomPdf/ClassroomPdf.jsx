import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BookOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  EyeOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  FileOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import "./ClassroomPdf.css";

const API_URL = "http://localhost:5000/api/pdf";
const SERVER_URL = "http://localhost:5000";

// Course categories for demo purposes
const CATEGORIES = ["Mathematics", "Physics", "Computer Science", "Biology", "Chemistry", "Literature", "History", "Economics"];

// Helper to get random category for demo
const getRandomCategory = (index) => CATEGORIES[index % CATEGORIES.length];

// Helper to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return "N/A";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ClassroomPdf() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchQuery, categoryFilter]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/list`);
      const items = Array.isArray(res.data.items) ? res.data.items : [];
      const normalized = items
        .map((item, index) => ({
          id: item.pdfId,
          name: item.filename || "Untitled Document",
          fileUrl: item.fileUrl ? `${SERVER_URL}${item.fileUrl}` : "",
          category: getRandomCategory(index),
          pages: item.pages || Math.floor(Math.random() * 50) + 5,
          size: item.size || Math.floor(Math.random() * 5000000) + 100000,
          uploadedAt: item.uploadedAt || new Date().toISOString(),
          description: item.description || "Course material uploaded for interactive learning with AI-assisted comprehension.",
        }))
        .filter((item) => item.id && item.fileUrl);
      setCourses(normalized);
    } catch (error) {
      console.error("Error loading courses:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let result = [...courses];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (course) =>
          course.name.toLowerCase().includes(query) ||
          course.category.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((course) => course.category === categoryFilter);
    }

    setFilteredCourses(result);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file");
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
        category: getRandomCategory(courses.length),
        pages: res.data.pages || Math.floor(Math.random() * 50) + 5,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        description: "Newly uploaded course material ready for AI-assisted learning.",
      };
      setCourses((prev) => [newCourse, ...prev]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  const openPreview = (course) => {
    if (course?.fileUrl) {
      window.open(course.fileUrl, "_blank");
    }
  };

  const uniqueCategories = [...new Set(courses.map((c) => c.category))];

  // Stats calculations
  const totalCourses = courses.length;
  const totalPages = courses.reduce((sum, c) => sum + (c.pages || 0), 0);
  const recentlyAdded = courses.filter((c) => {
    const uploadDate = new Date(c.uploadedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return uploadDate > weekAgo;
  }).length;
  const categoriesCount = uniqueCategories.length;

  return (
    <div className="classroom-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Course Library</h1>
        <p>Access your learning materials and interact with AI-powered assistance</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <BookOutlined />
          </div>
          <div className="stat-content">
            <h3>{totalCourses}</h3>
            <p>Total Courses</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <FileTextOutlined />
          </div>
          <div className="stat-content">
            <h3>{totalPages}</h3>
            <p>Total Pages</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <ClockCircleOutlined />
          </div>
          <div className="stat-content">
            <h3>{recentlyAdded}</h3>
            <p>Added This Week</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FolderOpenOutlined />
          </div>
          <div className="stat-content">
            <h3>{categoriesCount}</h3>
            <p>Categories</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="search-filter-group">
          <div className="search-box">
            <SearchOutlined className="search-icon" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-dropdown">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="view-toggle">
            <button
              className={viewMode === "grid" ? "active" : ""}
              onClick={() => setViewMode("grid")}
            >
              <AppstoreOutlined />
            </button>
            <button
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              <UnorderedListOutlined />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            className="hidden-input"
          />
          <button
            className={`upload-btn ${uploading ? "uploading" : ""}`}
            onClick={handleUploadClick}
            disabled={uploading}
          >
            <CloudUploadOutlined />
            {uploading ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
      </div>

      {/* Courses Section */}
      <div className="courses-section-header">
        <h2>Your Courses</h2>
        <span className="course-count">
          {filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-header" />
              <div className="skeleton-body">
                <div className="skeleton-title" />
                <div className="skeleton-meta">
                  <div className="skeleton-tag" />
                  <div className="skeleton-tag" />
                </div>
                <div className="skeleton-text" />
                <div className="skeleton-text" />
                <div className="skeleton-btn" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredCourses.length === 0 && (
        <div className="empty-state">
          <FileOutlined className="icon" />
          <h3>No courses found</h3>
          <p>
            {searchQuery || categoryFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Upload your first PDF to get started with AI-powered learning"}
          </p>
          {!searchQuery && categoryFilter === "all" && (
            <button className="upload-btn" onClick={handleUploadClick}>
              <CloudUploadOutlined />
              Upload Your First PDF
            </button>
          )}
        </div>
      )}

      {/* Course Grid */}
      {!loading && filteredCourses.length > 0 && (
        <div className="courses-grid">
          {filteredCourses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-card-header">
                <BookOutlined className="icon" />
              </div>

              <div className="course-card-body">
                <h3>{course.name}</h3>

                <div className="course-meta">
                  <span className="meta-tag category">{course.category}</span>
                  <span className="meta-tag pages">{course.pages} pages</span>
                  <span className="meta-tag size">{formatFileSize(course.size)}</span>
                  <span className="meta-tag date">{formatDate(course.uploadedAt)}</span>
                </div>

                <p className="course-description">{course.description}</p>

                <div className="course-card-footer">
                  <button className="btn-primary" onClick={() => openAssistant(course)}>
                    <RobotOutlined />
                    AI Assistant
                  </button>
                  <button className="btn-secondary" onClick={() => openPreview(course)}>
                    <EyeOutlined />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
