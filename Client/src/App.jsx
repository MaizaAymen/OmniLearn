import { useEffect, useState } from "react";
import Codeeditor from "./Codeeditor/Codeeditor";
import { Toaster } from "react-hot-toast";
import ProblemPage from "./Problems/ProblemPage";
import ProblemsPage from "./Problems/ProblemsPage";
import Auth from "./Auth/Auth";
import { Route, Routes, Navigate } from "react-router-dom";
import Cookies from "js-cookie";
import User from "./Dashbord/User";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./theme";
import { SERVER_URL } from "./config";
import PdfAssistant from "./components/PdfAssistant";
import Sidebar from "./Navbars/Sidebar";
import { useLocation } from "react-router-dom";
import { Spin } from "antd";
import ClassroomPdf from "./ClassroomPdf/ClassroomPdf";
import AdminDashboard from "./Admin/AdminDashboard";
import Profile from "./components/Profile";
import MyClassrooms from "./Classroom/MyClassrooms";
import ClassroomView from "./Classroom/ClassroomView";
import JoinClassroom from "./Classroom/JoinClassroom";
import ProblemCreatePage from "./Problems/ProblemCreatePage";
import Messages from "./Messaging/Messages";
import JoinInstitution from "./Auth/JoinInstitution";
import OnboardInstitution from "./Auth/OnboardInstitution";
import VerifyEmail from "./Auth/VerifyEmail";
import LearningDashboard from "./Dashbord/LearningDashboard";
import RoadmapPage from "./Roadmap/RoadmapPage";
import Home from "./Home/Home";
import ForgotPassword from "./Auth/ForgotPassword";
import ResetPassword from "./Auth/ResetPassword";

const getStoredUser = () => {
  try {
    const u = Cookies.get("user");
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

const getRole = () => getStoredUser()?.role ?? null;

const isProfileComplete = (user) => {
  if (!user) return false;
  const checks = [
    !!user.avatar,
    !!user.bio?.trim(),
    !!user.githubUrl?.trim(),
    !!user.linkedinUrl?.trim(),
    !!user.isEmailVerified,
  ];
  return checks.every(Boolean);
};

const needsInstitutionOnboarding = () => {
  const user = getStoredUser();
  // Super admin (role === "admin") is platform-wide and never belongs to a
  // single institution, so it must never be routed through institution onboarding.
  if (user?.role === "admin") return false;
  return user?.plan === "institution" && !user?.institutionId;
};

const Guard = ({ allow, children, allowIncompleteProfile = false, profileStatus, skipInstitutionCheck = false }) => {
  const role = getRole();
  if (!role) return <Navigate to="/auth" replace />;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  // Super admin (platform-wide) bypasses institution onboarding AND the
  // profile-completeness gate — these are end-user flows.
  if (role === "admin") return children;
  if (!skipInstitutionCheck && needsInstitutionOnboarding()) return <Navigate to="/onboarding/institution" replace />;
  if (!allowIncompleteProfile) {
    if (profileStatus?.loading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      );
    }
    if (profileStatus && !profileStatus.complete) return <Navigate to="/profile" replace />;
  }
  return children;
};

// On ajoute "institution_admin" partout où "teacher" ou "student" est admis,
// car c'est un membre standard d'une institution.
const ALL = ["admin", "institution_admin", "teacher", "student"];
const STAFF = ["admin", "institution_admin", "teacher"];
const ADMIN = ["admin"];
// /education is the institution control panel — only platform admin and the
// institution's own admin can open it. Teachers manage their content inside
// their classroom view, not here.
const INST_ADMIN = ["admin", "institution_admin"];

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth") || location.pathname.startsWith("/forgot-password") || location.pathname.startsWith("/reset-password");
  const isVerifyPage = location.pathname.startsWith("/verify-email");
  const isHomePage = location.pathname === "/";
  const [profileStatus, setProfileStatus] = useState({ loading: true, complete: true });

  useEffect(() => {
    const storedUser = getStoredUser();
    const token = Cookies.get("token");
    if (!storedUser?.id || !token) {
      setProfileStatus({ loading: false, complete: true });
      return;
    }

    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/profile/${storedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (!cancelled) {
          setProfileStatus({ loading: false, complete: isProfileComplete(data) });
        }
      } catch {
        if (!cancelled) setProfileStatus({ loading: false, complete: true });
      }
    };

    fetchProfile();

    const onProfileUpdated = (e) => {
      const updated = e?.detail;
      setProfileStatus({ loading: false, complete: isProfileComplete(updated) });
    };
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("profile-updated", onProfileUpdated);
    };
  }, [location.pathname]);

  const appRoutes = (
    <Routes>
      <Route path="/editor" element={<Guard allow={ALL} profileStatus={profileStatus}><Codeeditor /></Guard>} />
      <Route path="/problems" element={<Guard allow={ALL} profileStatus={profileStatus}><ProblemsPage /></Guard>} />
      <Route path="/problems/create" element={<Guard allow={STAFF} profileStatus={profileStatus}><ProblemCreatePage /></Guard>} />
      <Route path="/problems/:id" element={<Guard allow={ALL} profileStatus={profileStatus}><ProblemPage /></Guard>} />
      <Route path="/users" element={<Guard allow={ADMIN} profileStatus={profileStatus}><User /></Guard>} />
      <Route path="/pdf-assistant" element={<Guard allow={ALL} profileStatus={profileStatus}><PdfAssistant /></Guard>} />
      <Route path="/classroom-pdf" element={<Guard allow={ALL} profileStatus={profileStatus}><ClassroomPdf /></Guard>} />
      <Route path="/learning-dashboard" element={<Guard allow={ALL} profileStatus={profileStatus}><LearningDashboard /></Guard>} />
      <Route path="/roadmap" element={<Guard allow={ALL} profileStatus={profileStatus}><RoadmapPage /></Guard>} />
      <Route path="/education" element={<Guard allow={INST_ADMIN} profileStatus={profileStatus}><AdminDashboard /></Guard>} />
      <Route path="/profile" element={<Guard allow={ALL} allowIncompleteProfile profileStatus={profileStatus}><Profile /></Guard>} />
      <Route path="/my-classrooms" element={<Guard allow={ALL} profileStatus={profileStatus}><MyClassrooms /></Guard>} />
      <Route path="/my-classrooms/:classId" element={<Guard allow={ALL} profileStatus={profileStatus}><ClassroomView /></Guard>} />
      <Route path="/join/:code" element={<Guard allow={ALL} profileStatus={profileStatus}><JoinClassroom /></Guard>} />
      <Route path="/messages" element={<Guard allow={ALL} profileStatus={profileStatus}><Messages /></Guard>} />
      {/* Page publique : page d'acceptation d'un lien d'invitation. */}
      <Route path="/join-institution/:token" element={<JoinInstitution />} />
      {/* Onboarding après l'upgrade au plan Institution. */}
      <Route path="/onboarding/institution" element={<Guard allow={ALL} profileStatus={profileStatus} skipInstitutionCheck><OnboardInstitution /></Guard>} />
    </Routes>
  );

  return (
    <ThemeProvider>
    <TooltipProvider>
      {isAuthPage || isVerifyPage || isHomePage ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword onBack={() => window.location.href = "/auth"} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      ) : (
        <Sidebar profileStatus={profileStatus}>{appRoutes}</Sidebar>
      )}
      <Toaster toastOptions={{ duration: 3000 }} />
    </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;  