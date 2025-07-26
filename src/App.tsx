import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ConfigProvider } from "@/components/providers/ConfigProvider";
import "@/App.css";
import Welcome from "@/pages/Welcome";
import { ProjectSetup } from "@/components/ProjectSetup";
import { Workspace } from "@/pages/Workspace";
import About from "@/pages/About";
import Settings from "@/components/Settings";
import KnowledgeStore from "@/components/KnowledgeStore";

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(null);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {projectPath ? (
        <ConfigProvider configPath={`${projectPath}/config.json`}>
          <div className="h-full w-full overflow-hidden">
            <Routes>
              <Route path="/" element={<Workspace />} />
              <Route path="/About" element={<About />} />

              <Route path="/Settings" element={<Settings />} />
              <Route path="/KnowledgeStore" element={<KnowledgeStore />} />
            </Routes>
          </div>
        </ConfigProvider>
      ) : (
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/Workspace" element={<Workspace />} />
          <Route path="/project-setup" element={<ProjectSetup />} />
          <Route path="*" element={<Welcome />} />
        </Routes>
      )}
    </ThemeProvider>
  );
}

export default App;
