import { useState, useEffect } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CameraOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  GithubOutlined,
  LinkedinOutlined,
  LockOutlined,
  MailOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  StopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import ImgCrop from "antd-img-crop";
import Cookies from "js-cookie";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { BellOutlined, TeamOutlined, CheckOutlined } from "@ant-design/icons";
import { Badge } from "antd";
import CodingDashboard from "./CodingDashboard";
import PlanSection from "./PlanSection";
import Certificate from "./Certificate";
import LearningDashboard from "../Dashbord/LearningDashboard";
import RoadmapTab from "./RoadmapTab";
import { api as msgApi, getSocket } from "../Messaging/api";

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const API_BASE = "http://localhost:5000/api";

const roleColor = { admin: "red", teacher: "blue", student: "green" };

const svgProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const ProfileSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  </span>
);

const SecuritySvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  </span>
);

const NotificationsSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  </span>
);

const ClassroomSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  </span>
);

const PlanSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  </span>
);

const IntegrationsSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="12" r="3" />
      <path d="M9 12h6" />
    </svg>
  </span>
);

const PreferencesSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
    </svg>
  </span>
);

const ProblemsSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  </span>
);

const LearningSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 6-6" />
    </svg>
  </span>
);

const RoadmapSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center" }}>
    <svg {...svgProps}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <circle cx="6" cy="13" r="2" />
      <circle cx="18" cy="13" r="2" />
      <path d="M12 11l-4 2M12 11l4 2" />
      <path d="M6 15v2M18 15v2" />
    </svg>
  </span>
);

const DangerSvg = (
  <span role="img" style={{ display: "inline-flex", alignItems: "center", color: "#ff4d4f" }}>
    <svg {...svgProps} stroke="#ff4d4f">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  </span>
);

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedKey, setSelectedKey] = useState(() => {
    // Au retour de Stripe, on ouvre directement l'onglet "plan".
    const p = new URLSearchParams(window.location.search);
    return p.get("stripe_session") || p.get("stripe_cancelled") ? "plan" : "profile";
  });
  const [classrooms, setClassrooms] = useState([]);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionStats, setSubmissionStats] = useState({ solved: 0, attempted: 0, total: 0 });
  const [activity, setActivity] = useState({});
  const [languageBreakdown, setLanguageBreakdown] = useState({});
  const [difficultyBreakdown, setDifficultyBreakdown] = useState({ Easy: 0, Medium: 0, Hard: 0 });
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  // ── 2FA state ─────────────────────────────────────────────────────────────
  // Controls whether the "scan QR code" setup modal is visible
  const [twoFASetupModal, setTwoFASetupModal] = useState(false);
  // Controls whether the "confirm OTP to disable" modal is visible
  const [twoFADisableModal, setTwoFADisableModal] = useState(false);
  // Holds the base64 QR-code image returned by the server after /2fa/setup
  const [twoFAQrCode, setTwoFAQrCode] = useState(null);
  // Tracks what the user types into the 6-digit OTP input field
  const [twoFAOtp, setTwoFAOtp] = useState("");
  // Generic loading flag used while any 2FA API call is in-flight
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const navigate = useNavigate();

  const storedUser = (() => {
    try {
      return JSON.parse(Cookies.get("user") || "{}");
    } catch {
      return {};
    }
  })();
  const token = Cookies.get("token");
  const userId = storedUser?.id;

  useEffect(() => {
    if (selectedKey === "problems" && userId) fetchSubmissions();
    if (selectedKey === "notifications" && userId) fetchNotifications();
  }, [selectedKey]);

  // Live updates: append new notifications as they arrive over socket.
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    if (!socket) return;
    const onNew = (n) => setNotifications((prev) => [n, ...prev]);
    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
  }, [userId]);

  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const data = await msgApi.listNotifications();
      setNotifications(data);
    } catch {
      message.error("Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationRead = async (n) => {
    if (n.isRead) return;
    try {
      await msgApi.markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    } catch {}
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => msgApi.markNotificationRead(n.id)));
      setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    } catch {
      message.error("Failed to update notifications");
    }
  };

  const acceptInvite = async (n) => {
    const conversationId = n.data?.conversationId;
    if (!conversationId) return;
    try {
      await msgApi.acceptInvite(conversationId);
      await msgApi.markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true, _resolved: "accepted" } : x))
      );
      message.success("Joined the group");
    } catch (err) {
      message.error(err?.response?.data?.error || "Could not accept invite");
    }
  };

  const rejectInvite = async (n) => {
    const conversationId = n.data?.conversationId;
    if (!conversationId) return;
    try {
      await msgApi.rejectInvite(conversationId);
      await msgApi.markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true, _resolved: "rejected" } : x))
      );
    } catch (err) {
      message.error(err?.response?.data?.error || "Could not reject invite");
    }
  };

  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/submissions/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load submissions");
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setSubmissionStats(data.stats || { solved: 0, attempted: 0, total: 0 });

      const localActivity = {};
      for (const s of data.yearSubmissions || []) {
        const d = new Date(s.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        localActivity[key] = (localActivity[key] || 0) + 1;
      }
      setActivity(localActivity);

      setLanguageBreakdown(data.languageBreakdown || {});
      setDifficultyBreakdown(data.difficultyBreakdown || { Easy: 0, Medium: 0, Hard: 0 });
    } catch (err) {
      message.error(err.message || "Failed to load submissions");
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchProfile();
    fetchClassrooms();
  }, [userId]);

  const fetchClassrooms = async () => {
    setClassroomsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/classrooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load classrooms");
      const data = await res.json();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error(err.message || "Failed to load classrooms");
    } finally {
      setClassroomsLoading(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setUser(data);
      if (data.avatar) setAvatarUrl(data.avatar);
      form.setFieldsValue({
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        role: data.role,
        bio: data.bio,
        githubUrl: data.githubUrl,
        linkedinUrl: data.linkedinUrl,
      });
    } catch (err) {
      message.error(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updated = await res.json();
      setUser(updated);
      const roleChanged = updated.role !== storedUser.role;
      Cookies.set("user", JSON.stringify({ ...storedUser, ...updated }), { expires: 7 });
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: updated }));
      message.success("Profile updated successfully");
      setEditing(false);
      setIsDirty(false);
      if (roleChanged) window.location.reload();
    } catch (err) {
      message.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    let values;
    try {
      values = await passwordForm.validateFields();
    } catch {
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: values.newPassword, currentPassword: values.currentPassword }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update password");
      }
      message.success("Password updated successfully");
      setChangingPassword(false);
      passwordForm.resetFields();
    } catch (err) {
      message.error(err.message || "Password update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async ({ file, onSuccess, onError }) => {
    const currentToken = Cookies.get("token");
    if (!currentToken) {
      message.error("Session expired. Please log in again.");
      onError?.(new Error("No token"));
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`${API_BASE}/users/${userId}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAvatarUrl(data.avatar);
      const stored = Cookies.get("user");
      if (stored) {
        Cookies.set("user", JSON.stringify({ ...JSON.parse(stored), avatar: data.avatar }), { expires: 7 });
      }
      window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { avatar: data.avatar } }));
      message.success("Avatar updated");
      onSuccess?.();
    } catch (err) {
      message.error("Failed to upload avatar");
      onError?.(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updateUser = async (patch, successMsg) => {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Update failed");
    const updated = await res.json();
    setUser(updated);
    Cookies.set("user", JSON.stringify({ ...storedUser, ...updated }), { expires: 7 });
    if (successMsg) message.success(successMsg);
    return updated;
  };

  const handleRemoveAvatar = () => {
    Modal.confirm({
      title: "Remove avatar?",
      icon: <ExclamationCircleOutlined />,
      content: "Your initials will be shown instead.",
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await updateUser({ avatar: null }, "Avatar removed");
          setAvatarUrl(null);
          window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { avatar: null } }));
        } catch (err) {
          message.error(err.message || "Failed to remove avatar");
        }
      },
    });
  };

  const handleCancelEdit = () => {
    const reset = () => {
      setEditing(false);
      setIsDirty(false);
      form.setFieldsValue({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        bio: user.bio,
        githubUrl: user.githubUrl,
        linkedinUrl: user.linkedinUrl,
      });
    };
    if (isDirty) {
      Modal.confirm({
        title: "Discard unsaved changes?",
        icon: <ExclamationCircleOutlined />,
        content: "You have unsaved changes. They will be lost.",
        okText: "Discard",
        okButtonProps: { danger: true },
        onOk: reset,
      });
    } else {
      reset();
    }
  };

  const handleDeactivate = () => {
    Modal.confirm({
      title: "Deactivate your account?",
      icon: <ExclamationCircleOutlined />,
      content: "You won't be able to log in until an administrator re-activates your account.",
      okText: "Deactivate",
      okButtonProps: { danger: true },
      onOk: async () => {
        setDangerLoading(true);
        try {
          await updateUser({ isActive: false }, "Account deactivated");
          Cookies.remove("token");
          Cookies.remove("user");
          navigate("/login");
        } catch (err) {
          message.error(err.message || "Could not deactivate");
        } finally {
          setDangerLoading(false);
        }
      },
    });
  };

  const handleDeleteAccount = () => {
    let typed = "";
    Modal.confirm({
      title: "Permanently delete account?",
      icon: <ExclamationCircleOutlined />,
      okText: "Delete forever",
      okButtonProps: { danger: true },
      content: (
        <div>
          <p>This action cannot be undone. To confirm, type your email:</p>
          <Input
            placeholder={user.email}
            onChange={(e) => { typed = e.target.value; }}
          />
        </div>
      ),
      onOk: async () => {
        if (typed.trim().toLowerCase() !== user.email.toLowerCase()) {
          message.error("Email did not match. Account NOT deleted.");
          return Promise.reject();
        }
        setDangerLoading(true);
        try {
          const res = await fetch(`${API_BASE}/users/${userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Delete failed");
          message.success("Account deleted");
          Cookies.remove("token");
          Cookies.remove("user");
          navigate("/login");
        } catch (err) {
          message.error(err.message || "Could not delete");
        } finally {
          setDangerLoading(false);
        }
      },
    });
  };

  const handleExportData = () => {
    const payload = {
      profile: user,
      submissions,
      submissionStats,
      classrooms,
      notifications,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnilearn-${user.email}-${dayjs().format("YYYYMMDD")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success("Data exported");
  };

  const handleSendVerificationEmail = async () => {
    setSendingVerification(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-verification-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      message.success("Verification email sent — check your inbox!");
    } catch (err) {
      message.error(err.message || "Failed to send verification email");
    } finally {
      setSendingVerification(false);
    }
  };

  // ── Step 1 of 3: Start 2FA setup ──────────────────────────────────────────
  // Called when the user clicks "Enable 2FA".
  // The server generates a fresh TOTP secret, stores it against the user
  // (not yet active), and returns a base64 QR-code image the user scans
  // with their authenticator app (Google Authenticator, Authy, etc.).
  const handle2FASetup = async () => {
    setTwoFALoading(true);
    try {
      // POST /api/auth/2fa/setup — auth header required so the server
      // knows which user to attach the secret to.
      const res = await fetch(`${API_BASE}/auth/2fa/setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to start 2FA setup");
      const data = await res.json();

      // Store the QR-code image so the modal can render it.
      setTwoFAQrCode(data.qrCode);
      // Reset any leftover OTP value from a previous attempt.
      setTwoFAOtp("");
      // Open the setup modal so the user can scan the QR code.
      setTwoFASetupModal(true);
    } catch (err) {
      message.error(err.message || "Failed to setup 2FA");
    } finally {
      setTwoFALoading(false);
    }
  };

  // ── Step 2 of 3: Verify the first OTP and permanently enable 2FA ──────────
  // After the user scans the QR code they type the 6-digit code shown by
  // their app. We send that code to the server which verifies it against
  // the TOTP secret stored in Step 1. Only on success does the server set
  // is2FAEnabled = true — this confirms the secret is correctly loaded in
  // the app before locking the account behind 2FA.
  const handle2FAEnable = async () => {
    setTwoFALoading(true);
    try {
      // POST /api/auth/2fa/enable — sends the OTP the user typed.
      // The server checks it with speakeasy.totp.verify() (±30 s window).
      const res = await fetch(`${API_BASE}/auth/2fa/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: twoFAOtp }),
      });
      if (!res.ok) {
        // Surface the server's error message (e.g. "Invalid OTP code")
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Invalid OTP code");
      }

      message.success("2FA enabled successfully");

      // Close the setup modal and clean up temporary state.
      setTwoFASetupModal(false);
      setTwoFAQrCode(null);
      setTwoFAOtp("");

      // Update local user state so the UI immediately shows "Enabled"
      // and switches the button to "Disable 2FA" without a page reload.
      setUser((prev) => ({ ...prev, is2FAEnabled: true }));
    } catch (err) {
      message.error(err.message || "Failed to enable 2FA");
    } finally {
      setTwoFALoading(false);
    }
  };

  // ── Step 3 of 3 (optional): Disable 2FA ───────────────────────────────────
  // Requiring a valid OTP to *disable* 2FA prevents an attacker who has
  // access to an unlocked browser session from silently turning off the
  // protection. The server verifies the code, then clears both the secret
  // and the enabled flag from the database.
  const handle2FADisable = async () => {
    setTwoFALoading(true);
    try {
      // POST /api/auth/2fa/disable — sends the OTP to prove the user still
      // has their authenticator app. The server rejects any invalid code.
      const res = await fetch(`${API_BASE}/auth/2fa/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: twoFAOtp }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Invalid OTP code");
      }

      message.success("2FA disabled successfully");

      // Close the confirmation modal and clear the typed code.
      setTwoFADisableModal(false);
      setTwoFAOtp("");

      // Reflect the change instantly in local state — the badge will
      // switch to "Disabled" and the button back to "Enable 2FA".
      setUser((prev) => ({ ...prev, is2FAEnabled: false }));
    } catch (err) {
      message.error(err.message || "Failed to disable 2FA");
    } finally {
      setTwoFALoading(false);
    }
  };

  const initials = user
    ? `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase()
    : "?";

  const completion = (() => {
    if (!user) return { percent: 0, missing: [] };
    const checks = [
      { key: "avatar", label: "avatar", done: !!(user.avatar || avatarUrl) },
      { key: "bio", label: "a bio", done: !!user.bio?.trim() },
      { key: "githubUrl", label: "GitHub link", done: !!user.githubUrl?.trim() },
      { key: "linkedinUrl", label: "LinkedIn link", done: !!user.linkedinUrl?.trim() },
      { key: "email", label: "verified email", done: !!user.isEmailVerified },
    ];
    const done = checks.filter((c) => c.done).length;
    return {
      percent: Math.round((done / checks.length) * 100),
      missing: checks.filter((c) => !c.done).map((c) => c.label),
    };
  })();

  const menuItems = [
    {
      type: "group",
      label: "ACCOUNT",
      children: [
        { key: "profile", icon: ProfileSvg, label: "Profile" },
        { key: "classroom", icon: ClassroomSvg, label: "Classroom" },
        { key: "problems", icon: ProblemsSvg, label: "Problems" },
        { key: "learning", icon: LearningSvg, label: "Learning" },
        { key: "roadmaps", icon: RoadmapSvg, label: "Roadmaps" },
        { key: "security", icon: SecuritySvg, label: "Security" },
        {
          key: "notifications",
          icon: NotificationsSvg,
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              Notifications
              {notifications.filter((n) => !n.isRead).length > 0 && (
                <Badge
                  count={notifications.filter((n) => !n.isRead).length}
                  size="small"
                  color="#ff4d4f"
                />
              )}
            </span>
          ),
        },
      ],
    },
    { type: "divider" },
    {
      type: "group",
      label: "WORKSPACE",
      children: [
        { key: "plan", icon: PlanSvg, label: "Plan & Usage" },
        { key: "integrations", icon: IntegrationsSvg, label: "Integrations" },
        { key: "preferences", icon: PreferencesSvg, label: "Preferences" },
      ],
    },
    { type: "divider" },
    {
      key: "danger",
      icon: DangerSvg,
      label: "Danger Zone",
      style: { color: "#ff4d4f" },
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80, background: "#f0f2f5", minHeight: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80, background: "#f0f2f5", minHeight: "100vh" }}>
        <Text type="secondary">No profile data found. Please log in.</Text>
      </div>
    );
  }

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", padding: "clamp(12px, 3vw, 24px)" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Settings
        </Title>
        <Text type="secondary">
          Manage your account, preferences, and security options.
        </Text>
      </div>

      <Layout style={{ background: "transparent" }} hasSider>
        <Sider
          width={240}
          collapsedWidth={64}
          theme="light"
          breakpoint="lg"
          style={{
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #f0f0f0",
            marginRight: 16,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ border: "none", padding: "8px 0", background: "transparent" }}
            items={menuItems}
          />
        </Sider>

        <Content>
          <Card
            bordered={false}
            style={{ borderRadius: 10, border: "1px solid #f0f0f0" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {selectedKey === "classroom"
                    ? "My Classrooms"
                    : selectedKey === "problems"
                    ? "Problem Progress"
                    : selectedKey === "learning"
                    ? "Learning Dashboard"
                    : selectedKey === "notifications"
                    ? "Notifications"
                    : selectedKey === "plan"
                    ? "Plan & Usage"
                    : selectedKey === "security"
                    ? "Security"
                    : selectedKey === "roadmaps"
                    ? "Roadmaps & Certifications"
                    : "Profile Information"}
                </Title>
                <Text type="secondary">
                  {selectedKey === "classroom"
                    ? "Classrooms you are currently enrolled in or teaching."
                    : selectedKey === "problems"
                    ? "Your problem-solving history and stats."
                    : selectedKey === "learning"
                    ? "Your study activity, progress, and topic mastery."
                    : selectedKey === "notifications"
                    ? "Messages, group invites, and other activity from your account."
                    : selectedKey === "plan"
                    ? "See what's unlocked on your current plan."
                    : selectedKey === "security"
                    ? "Manage your password and two-factor authentication."
                    : selectedKey === "roadmaps"
                    ? "Track your learning paths and earned certificates."
                    : "Update your personal information and account details."}
                </Text>
              </div>
              {selectedKey === "notifications" && notifications.some((n) => !n.isRead) && (
                <Button icon={<CheckOutlined />} onClick={markAllRead}>
                  Mark all read
                </Button>
              )}
            </div>
            <Divider />

            {/* ─── Onglet "Plan & Usage" ────────────────────────────────────
                Affiche le plan courant et le bouton d'upgrade.
                Tout est géré dans PlanSection pour garder Profile.jsx propre. */}
            {selectedKey === "roadmaps" ? (
              <RoadmapTab />
            ) : selectedKey === "learning" ? (
              <LearningDashboard embedded />
            ) : selectedKey === "plan" ? (
              <PlanSection />
            ) : selectedKey === "danger" ? (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card size="small" style={{ borderColor: "#ffd591" }}>
                  <Row justify="space-between" align="middle" gutter={12}>
                    <Col flex={1}>
                      <Title level={5} style={{ margin: 0 }}>Export my data</Title>
                      <Text type="secondary">
                        Download a JSON file containing your profile, submissions, classrooms, and notifications.
                      </Text>
                    </Col>
                    <Col>
                      <Button icon={<DownloadOutlined />} onClick={handleExportData}>
                        Export
                      </Button>
                    </Col>
                  </Row>
                </Card>

                <Card size="small" style={{ borderColor: "#ffd591" }}>
                  <Row justify="space-between" align="middle" gutter={12}>
                    <Col flex={1}>
                      <Title level={5} style={{ margin: 0 }}>Deactivate account</Title>
                      <Text type="secondary">
                        Disable your account. You won't be able to log in until an administrator reactivates it.
                      </Text>
                    </Col>
                    <Col>
                      <Button
                        icon={<StopOutlined />}
                        loading={dangerLoading}
                        onClick={handleDeactivate}
                      >
                        Deactivate
                      </Button>
                    </Col>
                  </Row>
                </Card>

                <Card size="small" style={{ borderColor: "#ffa39e" }}>
                  <Row justify="space-between" align="middle" gutter={12}>
                    <Col flex={1}>
                      <Title level={5} style={{ margin: 0, color: "#cf1322" }}>
                        Delete account permanently
                      </Title>
                      <Text type="secondary">
                        This will erase your profile, submissions, and notifications. This cannot be undone.
                      </Text>
                    </Col>
                    <Col>
                      <Button
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        loading={dangerLoading}
                        onClick={handleDeleteAccount}
                      >
                        Delete
                      </Button>
                    </Col>
                  </Row>
                </Card>
              </Space>
            ) : selectedKey === "notifications" ? (
              notificationsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                  <Spin />
                </div>
              ) : notifications.length === 0 ? (
                <Empty description="You're all caught up — no notifications yet." />
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={notifications}
                  renderItem={(n) => {
                    const isInvite = n.type === "invite";
                    const isPending = isInvite && !n._resolved;
                    const clickable = !isInvite && (n.link || n.data?.conversationId);
                    return (
                      <List.Item
                        style={{
                          padding: "14px 16px",
                          borderRadius: 12,
                          marginBottom: 8,
                          background: n.isRead ? "#FAFAF7" : "#EEF2FF",
                          border: "1px solid #ECECE8",
                          cursor: clickable ? "pointer" : "default",
                          transition: "background 0.15s",
                        }}
                        onClick={() => {
                          if (!clickable) return;
                          markNotificationRead(n);
                          if (n.link) navigate(n.link);
                        }}
                        actions={[
                          isPending && (
                            <Button
                              key="accept"
                              type="primary"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                acceptInvite(n);
                              }}
                              style={{ background: "#4F46E5", border: "none" }}
                            >
                              Accept
                            </Button>
                          ),
                          isPending && (
                            <Button
                              key="reject"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                rejectInvite(n);
                              }}
                            >
                              Reject
                            </Button>
                          ),
                          !isInvite && !n.isRead && (
                            <Button
                              key="read"
                              size="small"
                              type="text"
                              icon={<CheckOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationRead(n);
                              }}
                            >
                              Mark read
                            </Button>
                          ),
                        ].filter(Boolean)}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              size={42}
                              style={{
                                background: isInvite ? "#EEF2FF" : "#4F46E5",
                                color: isInvite ? "#4F46E5" : "#fff",
                                fontSize: 18,
                              }}
                            >
                              {isInvite ? <TeamOutlined /> : <BellOutlined />}
                            </Avatar>
                          }
                          title={
                            <Space size={8}>
                              <Text strong={!n.isRead} style={{ color: "#1F2937" }}>
                                {n.message}
                              </Text>
                              {!n.isRead && (
                                <Badge color="#4F46E5" />
                              )}
                            </Space>
                          }
                          description={
                            <Space size={8}>
                              <Tag
                                bordered={false}
                                color={isInvite ? "purple" : "blue"}
                                style={{ fontSize: 11, textTransform: "capitalize" }}
                              >
                                {n.type}
                              </Tag>
                              {n._resolved === "accepted" && (
                                <Tag bordered={false} color="success" style={{ fontSize: 11 }}>
                                  Joined
                                </Tag>
                              )}
                              {n._resolved === "rejected" && (
                                <Tag bordered={false} color="default" style={{ fontSize: 11 }}>
                                  Declined
                                </Tag>
                              )}
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(n.createdAt).format("MMM D, YYYY · HH:mm")}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              )
            ) : selectedKey === "problems" ? (
              submissionsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                  <Spin />
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <Certificate
                      user={user}
                      stats={submissionStats}
                      difficulty={difficultyBreakdown}
                      languages={languageBreakdown}
                      submissions={submissions}
                    />
                  </div>
                  <CodingDashboard
                    activity={activity}
                    languageBreakdown={languageBreakdown}
                    difficultyBreakdown={difficultyBreakdown}
                    stats={submissionStats}
                  />
                  <Divider />
                  <Title level={5} style={{ marginTop: 0 }}>Recent submissions</Title>
                  {submissions.length === 0 ? (
                    <Empty description="No submissions yet — go solve some problems!" />
                  ) : (
                    <List
                      dataSource={submissions}
                      renderItem={(s) => (
                        <List.Item>
                          <List.Item.Meta
                            title={<Text strong>{s.exerciseTitle}</Text>}
                            description={`${s.language} · Attempt #${s.attemptNumber} · ${dayjs(s.createdAt).format("MMM D, YYYY HH:mm")}`}
                          />
                          <Tag color={s.isCorrect ? "success" : s.status === "error" ? "error" : "warning"}>
                            {s.isCorrect ? "Passed" : s.status === "error" ? "Error" : "Failed"}
                          </Tag>
                        </List.Item>
                      )}
                    />
                  )}
                </>
              )
            ) : selectedKey === "classroom" ? (
              classroomsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                  <Spin />
                </div>
              ) : classrooms.length === 0 ? (
                <Empty description="No classrooms yet" />
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={classrooms}
                  renderItem={(c) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            size={48}
                            style={{ backgroundColor: "#4f46e5", fontWeight: 700 }}
                          >
                            {(c.name?.[0] || "C").toUpperCase()}
                          </Avatar>
                        }
                        title={
                          <Space>
                            <Text strong>{c.name}</Text>
                            {c.academicYear && (
                              <Tag color="blue">{c.academicYear}</Tag>
                            )}
                            <Tag color={c.isActive ? "success" : "default"}>
                              {c.isActive ? "Active" : "Inactive"}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={2}>
                            {c.description && (
                              <Text type="secondary">{c.description}</Text>
                            )}
                            <Space wrap size={4}>
                              {c.grade?.name && <Tag>{c.grade.name}</Tag>}
                              {c.speciality?.name && <Tag>{c.speciality.name}</Tag>}
                              {c.level?.name && <Tag>{c.level.name}</Tag>}
                            </Space>
                            {c.teacher && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Teacher: {c.teacher.firstname} {c.teacher.lastname}
                              </Text>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )
            ) : selectedKey === "security" ? (
              /*
               * ─── SECURITY TAB ────────────────────────────────────────────────────────
               * Rendered when the user clicks "Security" in the sidebar menu.
               * Contains two independent sections:
               *   1. Change Password  — update the account password
               *   2. Two-Factor Authentication (2FA) — TOTP-based second factor
               *
               * Both sections share state declared at the top of the component
               * (changingPassword / passwordForm for passwords;
               *  twoFA* variables for 2FA).
               */
              <Space direction="vertical" size={24} style={{ width: "100%" }}>

                {/* ── SECTION 1: Change Password ───────────────────────────────────────
                    The header is always visible. The form itself is only mounted when
                    `changingPassword` is true — toggled by "Change password" / "Cancel".
                    handlePasswordChange() is defined earlier in the component and sends
                    the old + new password to PUT /api/users/:id. */}
                <div>
                  <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                    <Col>
                      <Title level={5} style={{ margin: 0 }}>
                        <LockOutlined style={{ marginRight: 8, color: "#1677ff" }} />
                        Change Password
                      </Title>
                      {/* Only show the subtitle when the form is hidden to avoid visual noise */}
                      {!changingPassword && (
                        <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
                          Ensure your account is secure with a strong password.
                        </Text>
                      )}
                    </Col>
                    <Col>
                      {/* Toggle button: "Change password" expands the form;
                          "Cancel" collapses it and resets all field values. */}
                      {!changingPassword ? (
                        <Button onClick={() => setChangingPassword(true)} style={{ borderRadius: 6 }}>
                          Change password
                        </Button>
                      ) : (
                        <Button
                          type="text"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => { setChangingPassword(false); passwordForm.resetFields(); }}
                        >
                          Cancel
                        </Button>
                      )}
                    </Col>
                  </Row>

                  {/* Password form — only mounted when the section is expanded */}
                  {changingPassword && (
                    <Card
                      bordered={false}
                      style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 12, marginTop: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
                    >
                      <Form form={passwordForm} layout="vertical">
                        {/* Field 1: Current password — proves the logged-in user
                            knows the existing password before letting them change it. */}
                        <Form.Item
                          label={<Text strong style={{ color: "#595959" }}>Current Password</Text>}
                          name="currentPassword"
                          rules={[{ required: true, message: "Please enter your current password" }]}
                          style={{ marginBottom: 16 }}
                        >
                          <Input.Password size="large" prefix={<LockOutlined style={{ color: "#bfbfbf", marginRight: 4 }} />} placeholder="Enter your current password" style={{ borderRadius: 8 }} />
                        </Form.Item>

                        {/* Field 2: New password — minimum 6 characters enforced
                            both here (client validation) and on the server. */}
                        <Form.Item
                          label={<Text strong style={{ color: "#595959" }}>New Password</Text>}
                          name="newPassword"
                          rules={[
                            { required: true, message: "Please enter a new password" },
                            { min: 6, message: "Password must be at least 6 characters" },
                          ]}
                          style={{ marginBottom: 16 }}
                          extra={<Text type="secondary" style={{ fontSize: 12 }}>Password must be at least 6 characters long.</Text>}
                        >
                          <Input.Password size="large" prefix={<LockOutlined style={{ color: "#bfbfbf", marginRight: 4 }} />} placeholder="Create a new strong password" style={{ borderRadius: 8 }} />
                        </Form.Item>

                        {/* Field 3: Confirm password — antd `dependencies` makes this
                            field re-validate automatically whenever "newPassword" changes.
                            The custom validator compares both values client-side. */}
                        <Form.Item
                          label={<Text strong style={{ color: "#595959" }}>Confirm New Password</Text>}
                          name="confirmPassword"
                          dependencies={["newPassword"]}
                          rules={[
                            { required: true, message: "Please confirm your new password" },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                                return Promise.reject(new Error("The two passwords do not match!"));
                              },
                            }),
                          ]}
                          style={{ marginBottom: 24 }}
                        >
                          <Input.Password size="large" prefix={<LockOutlined style={{ color: "#bfbfbf", marginRight: 4 }} />} placeholder="Re-enter your new password" style={{ borderRadius: 8 }} />
                        </Form.Item>

                        {/* Submit — calls handlePasswordChange which validates
                            the form then PUTs to the server. */}
                        <Button type="primary" icon={<SaveOutlined />} loading={saving} block onClick={handlePasswordChange} size="large" style={{ borderRadius: 8, fontWeight: 600 }}>
                          Save New Password
                        </Button>
                      </Form>
                    </Card>
                  )}
                </div>

                <Divider />

                {/* ── SECTION 2: Two-Factor Authentication (TOTP) ─────────────────────
                    TOTP = Time-based One-Time Password (RFC 6238).
                    Every 30 seconds the authenticator app derives a 6-digit code from
                    a shared secret using HMAC-SHA1. The server (speakeasy library) does
                    the same derivation and accepts codes within a ±30 s window.

                    Flow:
                      Enable  → handle2FASetup (get QR) → handle2FAEnable (verify code)
                      Disable → handle2FADisable (verify code to confirm)          */}
                <div>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Title level={5} style={{ margin: 0 }}>
                        <SafetyCertificateOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                        Two-Factor Authentication
                      </Title>
                      <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
                        Add an extra layer of security using an authenticator app (TOTP).
                      </Text>
                    </Col>
                    <Col>
                      <Space>
                        {/* Live status badge — reads user.is2FAEnabled which is updated
                            optimistically in state after a successful enable/disable call. */}
                        <Tag color={user.is2FAEnabled ? "success" : "default"}>
                          {user.is2FAEnabled ? "Enabled" : "Disabled"}
                        </Tag>

                        {/* Button switches based on current 2FA status:
                            - Enabled  → show "Disable 2FA" (opens disable confirmation modal)
                            - Disabled → show "Enable 2FA"  (calls handle2FASetup to get QR) */}
                        {user.is2FAEnabled ? (
                          <Button danger onClick={() => { setTwoFAOtp(""); setTwoFADisableModal(true); }}>
                            Disable 2FA
                          </Button>
                        ) : (
                          <Button type="primary" onClick={handle2FASetup} loading={twoFALoading}>
                            Enable 2FA
                          </Button>
                        )}
                      </Space>
                    </Col>
                  </Row>

                  {/* Success banner — only shown when 2FA is already active.
                      Reminds the user which app to open at login. */}
                  {user.is2FAEnabled && (
                    <Card size="small" style={{ marginTop: 12, background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8 }}>
                      <Space>
                        <SafetyCertificateOutlined style={{ color: "#52c41a", fontSize: 18 }} />
                        <Text style={{ color: "#389e0d" }}>
                          Your account is protected with time-based one-time passwords (TOTP). Use an app like Google Authenticator or Authy to generate login codes.
                        </Text>
                      </Space>
                    </Card>
                  )}
                </div>

                {/* ── MODAL 1: Enable 2FA — scan QR + enter first OTP ─────────────────
                    Opened by handle2FASetup after the server returns the QR image.
                    destroyOnClose resets internal React state (inputs) each time
                    the modal is closed so stale values never linger. */}
                <Modal
                  title={<Space><QrcodeOutlined /> Set up Two-Factor Authentication</Space>}
                  open={twoFASetupModal}
                  onCancel={() => setTwoFASetupModal(false)}
                  footer={null}
                  width={420}
                  destroyOnClose
                >
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Text>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</Text>

                    {/* The QR code is a base64 PNG returned by the server.
                        It encodes an otpauth:// URI containing the TOTP secret. */}
                    {twoFAQrCode && (
                      <div style={{ textAlign: "center", padding: "16px 0" }}>
                        <img src={twoFAQrCode} alt="2FA QR Code" style={{ width: 200, height: 200, border: "1px solid #f0f0f0", borderRadius: 8 }} />
                      </div>
                    )}

                    <Text>Then enter the 6-digit code from your app to verify:</Text>

                    {/* OTP input:
                        - replace(/\D/g, "") strips any non-digit characters the user pastes
                        - .slice(0, 6) hard-caps at 6 digits
                        - monospace + letter-spacing makes the code easy to read */}
                    <Input
                      placeholder="000000"
                      value={twoFAOtp}
                      onChange={(e) => setTwoFAOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      size="large"
                      style={{ textAlign: "center", letterSpacing: "0.5em", fontSize: 22, fontFamily: "monospace" }}
                    />

                    {/* Verify button disabled until exactly 6 digits are entered
                        to prevent sending obviously incomplete codes to the server. */}
                    <Button
                      type="primary"
                      block
                      size="large"
                      loading={twoFALoading}
                      disabled={twoFAOtp.length !== 6}
                      onClick={handle2FAEnable}
                    >
                      Verify & Enable 2FA
                    </Button>
                  </Space>
                </Modal>

                {/* ── MODAL 2: Disable 2FA — confirm with OTP ─────────────────────────
                    Requires the user to enter a valid OTP before the server will
                    clear their 2FA secret. This stops an attacker with session
                    access from silently turning off the second factor. */}
                <Modal
                  title="Disable Two-Factor Authentication"
                  open={twoFADisableModal}
                  onCancel={() => setTwoFADisableModal(false)}
                  footer={null}
                  destroyOnClose
                >
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Text>Enter the 6-digit code from your authenticator app to confirm disabling 2FA:</Text>

                    {/* Same digit-only input as the setup modal */}
                    <Input
                      placeholder="000000"
                      value={twoFAOtp}
                      onChange={(e) => setTwoFAOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      size="large"
                      style={{ textAlign: "center", letterSpacing: "0.5em", fontSize: 22, fontFamily: "monospace" }}
                    />

                    {/* Styled red to communicate this is a destructive action */}
                    <Button
                      danger
                      type="primary"
                      block
                      size="large"
                      loading={twoFALoading}
                      disabled={twoFAOtp.length !== 6}
                      onClick={handle2FADisable}
                    >
                      Confirm & Disable 2FA
                    </Button>
                  </Space>
                </Modal>
              </Space>
            ) : (
            <>
            <Row gutter={24} align="middle">
              <Col>
                <ImgCrop rotationSlider quality={0.8} aspectSlider>
                  <Upload
                    showUploadList={false}
                    accept="image/*"
                    customRequest={handleAvatarUpload}
                  >
                    <Tooltip title="Change avatar">
                      <div style={{ position: "relative", display: "inline-block", cursor: "pointer" }}>
                        <Avatar
                          size={96}
                          src={user.avatar || avatarUrl || undefined}
                          style={{ backgroundColor: "#4f46e5", fontSize: 32, fontWeight: 700 }}
                        >
                          {!user.avatar && !avatarUrl && initials}
                        </Avatar>
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            background: "#4f46e5",
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "2px solid #fff",
                          }}
                        >
                          <CameraOutlined style={{ color: "#fff", fontSize: 13 }} />
                        </div>
                        {uploadingAvatar && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,0.4)",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Spin size="small" />
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  </Upload>
                </ImgCrop>
                {(user.avatar || avatarUrl) && (
                  <div style={{ marginTop: 6, textAlign: "center" }}>
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleRemoveAvatar}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </Col>
              <Col flex={1}>
                <Title level={4} style={{ margin: 0 }}>
                  {user.firstname} {user.lastname}
                </Title>
                <Text type="secondary">{user.email}</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color={roleColor[user.role] ?? "default"}>
                      {user.role?.toUpperCase()}
                    </Tag>
                    <Tag color={user.isActive ? "success" : "error"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Tag>
                    {user.githubUrl && (
                      <Tooltip title="GitHub">
                        <a href={user.githubUrl} target="_blank" rel="noreferrer" style={{ color: "#24292f" }}>
                          <GithubOutlined style={{ fontSize: 18 }} />
                        </a>
                      </Tooltip>
                    )}
                    {user.linkedinUrl && (
                      <Tooltip title="LinkedIn">
                        <a href={user.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: "#0a66c2" }}>
                          <LinkedinOutlined style={{ fontSize: 18 }} />
                        </a>
                      </Tooltip>
                    )}
                  </Space>
                </div>
                <div style={{ marginTop: 12, maxWidth: 360 }}>
                  <Progress
                    percent={completion.percent}
                    size="small"
                    status={completion.percent === 100 ? "success" : "active"}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {completion.percent === 100
                      ? "Profile complete — nice work!"
                      : `You're ${completion.percent}% done — add ${completion.missing.slice(0, 2).join(" & ")}.`}
                  </Text>
                </div>
              </Col>
              <Col>
                {!editing ? (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </Col>
            </Row>

            <Divider />

            <Row gutter={24}>
              <Col xs={24} md={14}>
                {!editing ? (
                  <Descriptions column={1} size="middle">
                    <Descriptions.Item label="First Name">{user.firstname}</Descriptions.Item>
                    <Descriptions.Item label="Last Name">{user.lastname}</Descriptions.Item>
                    <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                    <Descriptions.Item label="Role">
                      <Tag color={roleColor[user.role]}>{user.role.toUpperCase()}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Bio">
                      {user.bio ? (
                        <Text>{user.bio}</Text>
                      ) : (
                        <Text type="secondary" italic>No bio yet — click Edit to add one.</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="GitHub">
                      {user.githubUrl ? (
                        <a href={user.githubUrl} target="_blank" rel="noreferrer">
                          <GithubOutlined /> {user.githubUrl}
                        </a>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="LinkedIn">
                      {user.linkedinUrl ? (
                        <a href={user.linkedinUrl} target="_blank" rel="noreferrer">
                          <LinkedinOutlined /> {user.linkedinUrl}
                        </a>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    onValuesChange={() => setIsDirty(true)}
                  >
                    <Row gutter={[12, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="First Name"
                          name="firstname"
                          rules={[{ required: true, message: "Required" }]}
                        >
                          <Input prefix={<UserOutlined />} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="Last Name"
                          name="lastname"
                          rules={[{ required: true, message: "Required" }]}
                        >
                          <Input prefix={<UserOutlined />} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="Email">
                      <Input prefix={<MailOutlined />} value={user.email} disabled />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Email cannot be changed. Contact an administrator if you need a different one.
                      </Text>
                    </Form.Item>
                    <Form.Item label="Bio" name="bio">
                      <Input.TextArea
                        rows={3}
                        maxLength={500}
                        showCount
                        placeholder="Tell others a bit about yourself..."
                      />
                    </Form.Item>
                    <Row gutter={[12, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="GitHub URL"
                          name="githubUrl"
                          hasFeedback
                          rules={[{ type: "url", message: "Must be a valid URL" }]}
                        >
                          <Input prefix={<GithubOutlined />} placeholder="https://github.com/username" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="LinkedIn URL"
                          name="linkedinUrl"
                          hasFeedback
                          rules={[{ type: "url", message: "Must be a valid URL" }]}
                        >
                          <Input prefix={<LinkedinOutlined />} placeholder="https://linkedin.com/in/username" />
                        </Form.Item>
                      </Col>
                    </Row>
                    {storedUser.role === "admin" && storedUser.id !== userId ? (
                      <Form.Item label="Role" name="role">
                        <Select>
                          <Select.Option value="student">Student</Select.Option>
                          <Select.Option value="teacher">Teacher</Select.Option>
                          <Select.Option value="admin">Admin</Select.Option>
                        </Select>
                      </Form.Item>
                    ) : (
                      <Form.Item label="Role">
                        <Tag color={roleColor[user.role]}>{user.role}</Tag>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                          {storedUser.id === userId
                            ? "You can't change your own role."
                            : "Only an administrator can change your role."}
                        </Text>
                      </Form.Item>
                    )}
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      htmlType="submit"
                      loading={saving}
                      disabled={!isDirty}
                      block
                    >
                      {isDirty ? "Save Changes" : "No changes"}
                    </Button>
                  </Form>
                )}

              </Col>

              <Col xs={24} md={10}>
                <Title level={5} style={{ marginTop: 0 }}>
                  Account Details
                </Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="User PLAN">
                    <Text
                      copyable
                      style={{ fontSize: 11, fontFamily: "monospace", color: "#ab04f9" }}
                    >
                      {user.plan.toUpperCase()}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={user.isActive ? "success" : "error"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Email Verified">
                    <Space>
                      <Tag color={user.isEmailVerified ? "success" : "warning"}>
                        {user.isEmailVerified ? "Verified" : "Unverified"}
                      </Tag>
                      {!user.isEmailVerified && (
                        <Button
                          size="small"
                          icon={<MailOutlined />}
                          loading={sendingVerification}
                          onClick={handleSendVerificationEmail}
                        >
                          Send verification email
                        </Button>
                      )}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Login">
                    {user.lastLoginAt
                      ? dayjs(user.lastLoginAt).format("MMM D, YYYY HH:mm")
                      : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Member Since">
                    {user.createdAt
                      ? dayjs(user.createdAt).format("MMM D, YYYY")
                      : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Updated">
                    {user.updatedAt
                      ? dayjs(user.updatedAt).format("MMM D, YYYY HH:mm")
                      : "—"}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
            </>
            )}
          </Card>
        </Content>
      </Layout>

    </div>
  );
}
