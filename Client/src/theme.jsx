import { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import { Moon, Sun } from "lucide-react";

const ThemeContext = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

const lightTheme = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: "#4F46E5",
    colorInfo: "#4F46E5",
    borderRadius: 8,
  },
};

const darkTheme = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: "#818cf8",
    colorInfo: "#818cf8",
    borderRadius: 8,
    colorBgLayout: "#0f0f12",
    colorBgContainer: "#18181b",
    colorBgElevated: "#1f1f23",
    colorBorderSecondary: "#2a2a30",
  },
};

const DARK_OVERRIDES = `
/* ── Common inline style overrides ── */
.dark [style*="background: #f0f2f5"],
.dark [style*="background: #f5f5f5"] { background: #0f0f12 !important; }
.dark [style*="background: #fff"],
.dark [style*="background: #ffffff"],
.dark [style*="background: #FFFFFF"] { background: #18181b !important; }
.dark [style*="background: #FAFAF7"],
.dark [style*="background: #FAFAFB"],
.dark [style*="background: #fafafa"] { background: #0f0f12 !important; }
.dark [style*="background: #EEF2FF"] { background: rgba(129,140,248,0.1) !important; }
.dark [style*="background: #f6ffed"] { background: rgba(82,196,26,0.1) !important; }
.dark [style*="background: #fffbe6"] { background: rgba(250,173,20,0.1) !important; }
.dark [style*="background: #fafaff"] { background: rgba(129,140,248,0.08) !important; }
.dark [style*="background: #F5F3FF"] { background: rgba(129,140,248,0.1) !important; }
.dark [style*="background: #FEF2F2"] { background: rgba(239,68,68,0.1) !important; }
.dark [style*="background: #FFF7ED"] { background: rgba(249,115,22,0.1) !important; }
.dark [style*="background: #FEE2E2"] { background: rgba(239,68,68,0.1) !important; }
.dark [style*="background: #f0f0f0"] { background: #2a2a30 !important; }
.dark [style*="background: #f8f9fa"],
.dark [style*="background: #f1f3f4"] { background: #141417 !important; }
.dark [style*="background: #ffffff"] { background: #18181b !important; }
.dark [style*="background: #1a73e8"] { background: #818cf8 !important; }
.dark [style*="background: #e8eaed"] { background: #2a2a30 !important; }

.dark [style*="border: 1px solid #f0f0f0"],
.dark [style*="border: 1px solid #ECECE8"],
.dark [style*="border: 1px solid #F0F0F0"],
.dark [style*="border: 1px solid #ECECF6"],
.dark [style*="border: 1px solid #eef0f3"],
.dark [style*="border: 1px solid #e8eaed"],
.dark [style*="border: 1px solid #dadce0"],
.dark [style*="border: 1px solid #e8e8e8"] { border-color: #2a2a30 !important; }
.dark [style*="border: 1px dashed #E5E7EB"],
.dark [style*="border: 1px dashed #e8e8e8"] { border-color: #2a2a30 !important; }
.dark [style*="border-bottom: 1px solid #f0f0f0"] { border-color: #2a2a30 !important; }

.dark [style*="color: #1F2937"],
.dark [style*="color: #262626"],
.dark [style*="color: #202124"] { color: #e4e4e7 !important; }
.dark [style*="color: #595959"],
.dark [style*="color: #6B7280"],
.dark [style*="color: #5f6368"] { color: #a1a1aa !important; }
.dark [style*="color: #bfbfbf"],
.dark [style*="color: #999"],
.dark [style*="color: #666"],
.dark [style*="color: #9CA3AF"] { color: #71717a !important; }
.dark [style*="color: #d9d9d9"] { color: #52525b !important; }
.dark [style*="color: #1a73e8"] { color: #818cf8 !important; }
.dark [style*="color: #1677ff"] { color: #818cf8 !important; }

.dark [style*="background: #111827"] { background: #818cf8 !important; }
.dark [style*="background: rgba(22,119,255,0.10)"] { background: rgba(129,140,248,0.1) !important; }
.dark [style*="background: linear-gradient(135deg, rgba(79,70,229,0.08)"] {
  background: linear-gradient(135deg, rgba(129,140,248,0.12), rgba(34,197,94,0.08)) !important;
}

/* ── ClassroomPdf CSS class overrides ── */
.dark .classroom-layout,
.dark .classroom-content { background: #0f0f12 !important; }
.dark .loading-text { color: #a1a1aa !important; }
.dark .empty-icon { color: #52525b !important; }
.dark .course-header { border-bottom-color: #2a2a30 !important; }
.dark .course-title { color: #e4e4e7 !important; }
.dark .pdf-viewer-container { background: #18181b !important; border-color: #2a2a30 !important; }
.dark .rpv-default-layout__toolbar { background: #18181b !important; border-bottom-color: #2a2a30 !important; }
.dark .rpv-core__minimal-button { color: #e4e4e7 !important; }
.dark .rpv-core__minimal-button:hover { background: #2a2a30 !important; }
.dark .rpv-default-layout__body { background: #0f0f12 !important; }
.dark .classroom-sidebar { background: #18181b !important; border-left-color: #2a2a30 !important; }
.dark .sidebar-header { border-bottom-color: #2a2a30 !important; }
.dark .sidebar-header h5 { color: #e4e4e7 !important; }
.dark .collapse-btn { color: #a1a1aa !important; }
.dark .collapse-btn:hover { color: #e4e4e7 !important; }
.dark .sidebar-upload { border-bottom-color: #2a2a30 !important; }
.dark .sidebar-upload .ant-btn { border-color: #3a3a45 !important; color: #e4e4e7 !important; }
.dark .sidebar-upload .ant-btn:hover { border-color: #818cf8 !important; color: #818cf8 !important; }
.dark .sidebar-search { border-bottom-color: #2a2a30 !important; }
.dark .filter-chips .ant-tag-checkable { background: #18181b !important; border-color: #3a3a45 !important; color: #a1a1aa !important; }
.dark .filter-chips .ant-tag-checkable:hover { color: #e4e4e7 !important; border-color: #818cf8 !important; }
.dark .filter-chips .ant-tag-checkable-checked { background: #818cf8 !important; color: #fff !important; border-color: #818cf8 !important; }
.dark .tag-chips { border-top-color: #2a2a30 !important; }
.dark .tag-chips-icon { color: #71717a !important; }
.dark .item-tag-pill { background: #2a2a30 !important; border-color: #3a3a45 !important; color: #a1a1aa !important; }
.dark .courses-menu .ant-menu-item { color: #a1a1aa !important; }
.dark .courses-menu .ant-menu-item:hover { background: #2a2a30 !important; color: #e4e4e7 !important; }
.dark .courses-menu .ant-menu-item-selected { background: #818cf8 !important; color: #fff !important; }
.dark .courses-menu .ant-menu-item-selected:hover { background: #6366f1 !important; }
.dark .courses-menu .ant-menu-item-selected .anticon { color: #fff !important; }
.dark .edit-tags-row { background: #141417 !important; border-color: #3a3a45 !important; }
.dark .code-input { background: #141417 !important; border-color: #3a3a45 !important; color: #e4e4e7 !important; }
.dark .sidebar-notes { background: rgba(250,173,20,0.08) !important; border-color: rgba(250,173,20,0.2) !important; }
.dark .notes-header { border-bottom-color: rgba(250,173,20,0.15) !important; }
.dark .notes-icon { color: #eab308 !important; }
.dark .notes-title { color: #fbbf24 !important; }
.dark .notes-saved { color: #eab308 !important; background: rgba(0,0,0,0.2) !important; }
.dark .notes-textarea { color: #e4e4e7 !important; }
.dark .notes-textarea::placeholder { color: #71717a !important; }

/* ── AdminLayout CSS class overrides ── */
.dark .admin-shell { background: #0f0f12 !important; }
.dark .admin-sider { background: #18181b !important; border-right: 1px solid #2a2a30 !important; }
.dark .admin-brand { border-bottom-color: #2a2a30 !important; }
.dark .admin-title { color: #e4e4e7 !important; }
.dark .admin-subtitle { color: #71717a !important; }
.dark .admin-menu { background: #18181b !important; }
.dark .admin-menu .ant-menu-item { color: #a1a1aa !important; }
.dark .admin-menu .ant-menu-item .ant-menu-item-icon { color: #71717a !important; }
.dark .admin-menu .ant-menu-item:hover { background: #2a2a30 !important; color: #e4e4e7 !important; }
.dark .admin-menu .ant-menu-item:hover .ant-menu-item-icon { color: #818cf8 !important; }
.dark .admin-menu .ant-menu-item-selected { background: rgba(129,140,248,0.12) !important; color: #818cf8 !important; }
.dark .admin-menu .ant-menu-item-selected .ant-menu-item-icon { color: #818cf8 !important; }
.dark .admin-header { background: #18181b !important; border-bottom-color: #2a2a30 !important; }
.dark .admin-collapse-button { color: #a1a1aa !important; }
.dark .admin-collapse-button:hover { background: #2a2a30 !important; border-color: #2a2a30 !important; color: #e4e4e7 !important; }
.dark .admin-header-title { color: #e4e4e7 !important; }
.dark .admin-header-text { color: #71717a !important; }
.dark .admin-content { background: #0f0f12 !important; }

/* ── Ant Design global overrides for nested ConfigProviders ── */
.dark .ant-menu-light:not(.ant-menu-root) { background: transparent !important; }
.dark .ant-btn-primary:not(.admin-collapse-button) { background: #818cf8 !important; border-color: #818cf8 !important; }
.dark .ant-btn-primary:not(.admin-collapse-button):hover { background: #6366f1 !important; border-color: #6366f1 !important; }
.dark .ant-spin-dot-item { background: #818cf8 !important; }
.dark .ant-menu-light .ant-menu-item-selected { background: rgba(129,140,248,0.15) !important; color: #818cf8 !important; }
`;

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");

    let styleEl = document.getElementById("dark-overrides");
    if (dark) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "dark-overrides";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = DARK_OVERRIDES;
    } else {
      if (styleEl) styleEl.remove();
    }
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      <ConfigProvider theme={dark ? darkTheme : lightTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "none",
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
