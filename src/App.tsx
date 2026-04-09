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
// HashRouter always starts at /#/ on every app launch / Ctrl+R.
// If a project is already saved in localStorage, skip Welcome and go straight
// to the workspace so the user never sees a blank screen.

function RootRedirect({ projectPath }: { projectPath: string | null }) {
  if (projectPath) return <Navigate to="/workspace" replace />;
  return <Welcome />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(() =>
    localStorage.getItem("projectPath"),
  );

  const handleProjectPathSet = (path: string) => {
    localStorage.setItem("projectPath", path);
    setProjectPath(path);
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="h-full w-full overflow-hidden">
        <Routes>
          {/* / always hits RootRedirect — bounces to /workspace if a project exists */}
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
    </ThemeProvider>
  );
}

export default App;
