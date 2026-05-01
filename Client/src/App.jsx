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
import ClassroomPdf from "./ClassroomPdf/ClassroomPdf";
import AdminDashboard from "./Admin/AdminDashboard";
import LiveSessionsPage from "./LiveSessions/LiveSessionsPage";
import UMLEditor from "./Uml/UMLEditor";
import UmlProblems from "./Uml/Problem";
import VideoCall from "./components/VideoCall";
import MeetingRoom from "./components/MeetingRoom";
import Profile from "./components/Profile";
import ClassAssignmentsPage from "./Classroom/ClassAssignmentsPage";
import MyClassrooms from "./Classroom/MyClassrooms";
import ClassroomView from "./Classroom/ClassroomView";
import JoinClassroom from "./Classroom/JoinClassroom";
import ProblemCreatePage from "./Problems/ProblemCreatePage";
import Messages from "./Messaging/Messages";
import JoinInstitution from "./Auth/JoinInstitution";
import VerifyEmail from "./Auth/VerifyEmail";

const getRole = () => {
  try {
    const u = Cookies.get("user");
    return u ? JSON.parse(u).role : null;
  } catch { return null; }
};

const Guard = ({ allow, children }) => {
  const role = getRole();
  if (!role) return <Navigate to="/auth" replace />;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
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

  const appRoutes = (
    <Routes>
      <Route path="/" element={<Guard allow={ALL}><Codeeditor /></Guard>} />
      <Route path="/problems" element={<Guard allow={ALL}><ProblemsPage /></Guard>} />
      <Route path="/problems/create" element={<Guard allow={STAFF}><ProblemCreatePage /></Guard>} />
      <Route path="/problems/:id" element={<Guard allow={ALL}><ProblemPage /></Guard>} />
      <Route path="/users" element={<Guard allow={ADMIN}><User /></Guard>} />
      <Route path="/pdf-assistant" element={<Guard allow={ALL}><PdfAssistant /></Guard>} />
      <Route path="/classroom-pdf" element={<Guard allow={ALL}><ClassroomPdf /></Guard>} />
      <Route path="/live-sessions" element={<Guard allow={STAFF}><LiveSessionsPage /></Guard>} />
      <Route path="/video-call" element={<Guard allow={ALL}><VideoCall /></Guard>} />
      <Route path="/education" element={<Guard allow={STAFF}><AdminDashboard /></Guard>} />
      <Route path="/uml" element={<Guard allow={ALL}><UMLEditor /></Guard>} />
      <Route path="/uml/problems" element={<Guard allow={ALL}><UmlProblems /></Guard>} />
      <Route path="/uml/problems/:id" element={<Guard allow={ALL}><UMLEditor /></Guard>} />
      <Route path="/profile" element={<Guard allow={ALL}><Profile /></Guard>} />
      <Route path="/assignments" element={<Guard allow={ALL}><ClassAssignmentsPage /></Guard>} />
      <Route path="/my-classrooms" element={<Guard allow={ALL}><MyClassrooms /></Guard>} />
      <Route path="/my-classrooms/:classId" element={<Guard allow={ALL}><ClassroomView /></Guard>} />
      <Route path="/join/:code" element={<Guard allow={ALL}><JoinClassroom /></Guard>} />
      <Route path="/messages" element={<Guard allow={ALL}><Messages /></Guard>} />
      {/* Page publique : page d'acceptation d'un lien d'invitation. */}
      <Route path="/join-institution/:token" element={<JoinInstitution />} />
    </Routes>
  );

  return (
    <TooltipProvider>
      {isAuthPage || isMeetingPage || isVerifyPage ? (
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/meeting/:roomId" element={<MeetingRoom />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      ) : (
        <Sidebar>{appRoutes}</Sidebar>
      )}
      <Toaster toastOptions={{ duration: 3000 }} />
    </TooltipProvider>
  );
}

export default App;  