import "@/App.css";
import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ConfigProvider } from "@/components/providers/ConfigProvider";
import { ProjectSetup } from "@/components/ProjectSetup";
import { Workspace } from "@/pages/Workspace";
import Welcome from "@/pages/Welcome";
import About from "@/pages/About";
import Settings from "@/components/Settings";
import KnowledgeStore from "@/components/KnowledgeStore";

// Wrapper that provides config only to routes that need it
function ConfiguredRoutes({ projectPath }: { projectPath: string }) {
  return (
    <ConfigProvider
      config_path={`${projectPath}\\config.json`}
      chats_path={`${projectPath}\\chats.json`}
    >
      <Routes>
        <Route path="/Workspace" element={<Workspace />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/KnowledgeStore" element={<KnowledgeStore />} />
      </Routes>
    </ConfigProvider>
  );
}

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(
    localStorage.getItem("projectPath"),
  );

  useEffect(() => {
    if (projectPath) {
      localStorage.setItem("projectPath", projectPath);
    } else {
      localStorage.removeItem("projectPath");
    }
  }, [projectPath]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="h-screen w-screen overflow-hidden">
        <Routes>
          {/* Routes that don't need config */}
          <Route path="/" element={<Welcome />} />
          <Route path="/About" element={<About />} />
          <Route
            path="/project-setup"
            element={<ProjectSetup onProjectPathSet={setProjectPath} />}
          />

          {/* Routes that need config — only rendered once projectPath exists */}
          {projectPath ? (
            <Route
              path="/*"
              element={<ConfiguredRoutes projectPath={projectPath} />}
            />
          ) : (
            // Redirect to setup if no project loaded yet
            <Route path="/*" element={<Welcome />} />
          )}
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
