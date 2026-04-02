import "@/App.css";
import { useState, useEffect } from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { join } from "@tauri-apps/api/path";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import {
  ConfigProvider,
  ChatsProvider,
} from "@/components/providers/ConfigProvider";
import { ProjectSetup } from "@/components/ProjectSetup";
import { Workspace } from "@/pages/Workspace";
import About from "@/pages/About";
import Welcome from "@/pages/Welcome";
import Settings from "@/components/Settings";
import KnowledgeStore from "@/components/KnowledgeStore";

// ─── Protected layout ─────────────────────────────────────────────────────────

function ProtectedRoutes({ projectPath }: { projectPath: string | null }) {
  const [configPath, setConfigPath] = useState<string | null>(null);
  const [chatsPath, setChatsPath] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) return;
    (async () => {
      const [cfg, cht] = await Promise.all([
        join(projectPath, "config.json"),
        join(projectPath, "chats.json"),
      ]);
      setConfigPath(cfg);
      setChatsPath(cht);
    })();
  }, [projectPath]);

  if (!projectPath) return <Navigate to="/project-setup" replace />;
  if (!configPath || !chatsPath) return null; // or a loading spinner

  return (
    <ConfigProvider config_path={configPath}>
      <ChatsProvider chats_path={chatsPath}>
        <Outlet />
      </ChatsProvider>
    </ConfigProvider>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(() =>
    localStorage.getItem("projectPath"),
  );

  const handleProjectPathSet = (path: string) => {
    setProjectPath(path);
    localStorage.setItem("projectPath", path);
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="h-full w-full overflow-hidden">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/project-setup"
            element={<ProjectSetup onProjectPathSet={handleProjectPathSet} />}
          />
          <Route element={<ProtectedRoutes projectPath={projectPath} />}>
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/knowledge-store" element={<KnowledgeStore />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
