import Codeeditor from "./Codeeditor/Codeeditor";
import { Toaster } from "react-hot-toast";
import ProblemPage from "./Problems/ProblemPage";
import ProblemsPage from "./Problems/ProblemsPage";
import Auth from "./Auth/Auth";
import { Route, Routes } from "react-router-dom";

function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Codeeditor />} />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route path="/problems/:id" element={<ProblemPage />} />
      </Routes>
      <Toaster toastOptions={{ duration: 3000 }} />
    </>
  );
}

export default App;  