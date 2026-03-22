import Codeeditor from "./Codeeditor/Codeeditor";
import { Toaster } from "react-hot-toast";
import ProblemPage from "./Problems/ProblemPage";
import ProblemsPage from "./Problems/ProblemsPage";
import Auth from "./Auth/Auth";
import { Route, Routes } from "react-router-dom";
import User from "./Dashbord/User";
import { TooltipProvider } from "@/components/ui/tooltip";

import Sidebar from "./Navbars/Sidebar";
import { useLocation } from "react-router-dom";


function App() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  const appRoutes = (
    <Routes>
      <Route path="/" element={<Codeeditor />} />
      <Route path="/problems" element={<ProblemsPage />} />
      <Route path="/problems/:id" element={<ProblemPage />} />
      <Route path="/users" element={<User />} />
   

    </Routes>
  );

  return (
    <TooltipProvider>
      {isAuthPage ? (
        <Routes>
          <Route path="/auth" element={<Auth />} />
          
        </Routes>
      ) : (
        <Sidebar>{appRoutes}</Sidebar>
      )}
      <Toaster toastOptions={{ duration: 3000 }} />
    </TooltipProvider>
  );
}

export default App;  