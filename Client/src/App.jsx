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
import PdfAssistant from "./components/PdfAssistant";
import Sidebar from "./Navbars/Sidebar";
import { useLocation } from "react-router-dom";
import { Spin } from "antd";
import ClassroomPdf from "./ClassroomPdf/ClassroomPdf";
import AdminDashboard from "./Admin/AdminDashboard";
import LiveSessionsPage from "./LiveSessions/LiveSessionsPage";
import UMLEditor from "./Uml/UMLEditor";
import UmlProblems from "./Uml/Problem";
import VideoCall from "./components/VideoCall";
import MeetingRoom from "./components/MeetingRoom";
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
  return user?.plan === "institution" && !user?.institutionId;
};

const Guard = ({ allow, children, allowIncompleteProfile = false, profileStatus, skipInstitutionCheck = false }) => {
  const role = getRole();
  if (!role) return <Navigate to="/auth" replace />;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
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

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");
  const isMeetingPage = location.pathname.startsWith("/meeting");
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
        const res = await fetch(`http://localhost:5000/api/profile/${storedUser.id}`, {
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
      <Route path="/live-sessions" element={<Guard allow={STAFF} profileStatus={profileStatus}><LiveSessionsPage /></Guard>} />
      <Route path="/video-call" element={<Guard allow={ALL} profileStatus={profileStatus}><VideoCall /></Guard>} />
      <Route path="/education" element={<Guard allow={STAFF} profileStatus={profileStatus}><AdminDashboard /></Guard>} />
      <Route path="/uml" element={<Guard allow={ALL} profileStatus={profileStatus}><UMLEditor /></Guard>} />
      <Route path="/uml/problems" element={<Guard allow={ALL} profileStatus={profileStatus}><UmlProblems /></Guard>} />
      <Route path="/uml/problems/:id" element={<Guard allow={ALL} profileStatus={profileStatus}><UMLEditor /></Guard>} />
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
    <TooltipProvider>
      {isAuthPage || isMeetingPage || isVerifyPage || isHomePage ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/meeting/:roomId" element={<MeetingRoom />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      ) : (
        <Sidebar profileStatus={profileStatus}>{appRoutes}</Sidebar>
      )}
      <Toaster toastOptions={{ duration: 3000 }} />
    </TooltipProvider>
  );
}

export default App;  