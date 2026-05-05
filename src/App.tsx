import "@/App.css";
import { useState, useEffect } from "react";
import { join } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";

import {
  ConfigProvider,
  ChatsProvider,
} from "@/components/providers/ConfigProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

import About from "@/components/frame1/controls/About";
import Welcome from "@/pages/Welcome";
import { Workspace } from "@/pages/Workspace";

import Settings from "@/components/common/settings/Settings";
import KnowledgeStore from "@/components/frame1/library/KnowledgeStore";

import { TitleBar } from "@/components/common/TitleBar";
import { ProjectSetup } from "@/components/ProjectSetup";

// ─── Protected layout ─────────────────────────────────────────────────────────

interface PathsState {
  configPath: string;
  chatsPath: string;
}

function ProtectedRoutes({ projectPath }: { projectPath: string | null }) {
  const [paths, setPaths] = useState<PathsState | null>(null);

  useEffect(() => {
    if (!projectPath) {
      setPaths(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [cfg, cht] = await Promise.all([
        join(projectPath, "config.json"),
        join(projectPath, "chats.json"),
      ]);
      if (!cancelled) setPaths({ configPath: cfg, chatsPath: cht });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  if (!projectPath) return <Navigate to="/project-setup" replace />;

  if (!paths) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <ConfigProvider config_path={paths.configPath}>
      <ChatsProvider chats_path={paths.chatsPath}>
        <Outlet />
      </ChatsProvider>
    </ConfigProvider>
  );
}

// ─── Root redirect ─────────────────────────────────────────────────────────────

function RootRedirect({ projectPath }: { projectPath: string | null }) {
  if (projectPath) return <Navigate to="/workspace" replace />;
  return <Welcome />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(() =>
    localStorage.getItem("projectPath"),
  );

  // Show window once React has mounted
  useEffect(() => {
    getCurrentWindow().show().catch(console.error);
  }, []);

  const handleProjectPathSet = (path: string) => {
    localStorage.setItem("projectPath", path);
    setProjectPath(path);
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      {/* Outer shell: full viewport, column layout */}
      <div className="flex flex-col h-screen w-screen">
        {/* Title bar always on top, outside the router so it never unmounts */}
        <TitleBar title="My App" />

        {/* Page content fills the rest */}
        <div className="flex-1">
          <Routes>
            <Route
              path="/"
              element={<RootRedirect projectPath={projectPath} />}
            />
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
          </Routes>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
