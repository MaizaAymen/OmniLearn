import Codeeditor from "./Codeeditor/Codeeditor";
import { Toaster } from "react-hot-toast";
import ProblemPage from "./Problems/ProblemPage";
import ProblemsPage from "./Problems/ProblemsPage";
import Auth from "./Auth/Auth";
import { Route, Routes } from "react-router-dom";
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

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");
  const isMeetingPage = location.pathname.startsWith("/meeting");

  const appRoutes = (
    <Routes>
      <Route path="/" element={<Codeeditor />} />
      <Route path="/problems" element={<ProblemsPage />} />
      <Route path="/problems/:id" element={<ProblemPage />} />
      <Route path="/users" element={<User />} />
      <Route path="/pdf-assistant" element={<PdfAssistant />} />
      <Route path="/classroom-pdf" element={<ClassroomPdf />} />
      <Route path="/live-sessions" element={<LiveSessionsPage />} />
      <Route path="/video-call" element={<VideoCall />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/uml" element={<UMLEditor />} />
      <Route path="/uml/problems" element={<UmlProblems />} />
      <Route path="/uml/problems/:id" element={<UMLEditor />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );

  return (
    <TooltipProvider>
      {isAuthPage || isMeetingPage ? (
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/meeting/:roomId" element={<MeetingRoom />} />
        </Routes>
      ) : (
        <Sidebar>{appRoutes}</Sidebar>
      )}
      <Toaster toastOptions={{ duration: 3000 }} />
    </TooltipProvider>
  );
}

export default App;  