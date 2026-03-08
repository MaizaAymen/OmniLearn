import Codeeditor from "./Codeeditor/Codeeditor";
import { Toaster } from "react-hot-toast";
import ProblemPage from "./Problems/ProblemPage";
import ProblemsPage from "./Problems/ProblemsPage";
import Auth from "./Auth/Auth";
import { Route, Routes } from "react-router-dom";
import User from "./Dashbord/User";
import { TooltipProvider } from "@/components/ui/tooltip";
import Roadmaps from "./Roadmaps/Roadmaps";
function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Codeeditor />} />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route path="/problems/:id" element={<ProblemPage />} />
        <Route path="/users" element={<User />} />
        <Route path="/roadmaps" element={<Roadmaps />} />
      </Routes>
      <Toaster toastOptions={{ duration: 3000 }} />
    </TooltipProvider>
  );
}

export default App;  