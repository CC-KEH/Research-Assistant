import { useState } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ConfigProvider } from "@/components/providers/ConfigProvider";
import { ProjectSetup } from "@/components/ProjectSetup";
import "./App.css";

function App({ children }: { children: React.ReactNode }) {
  const [projectPath, setProjectPath] = useState<string | null>(null);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {/* {projectPath === null ? ( */}
      {/* <ProjectSetup onSelect={setProjectPath} /> */}
      {/* ) : ( */}
      <ConfigProvider configPath={`${projectPath}/config.json`}>
        <div className="h-full w-full overflow-hidden">
          <div className="h-full w-full overflow-hidden">{children}</div>
        </div>
      </ConfigProvider>
      {/* )} */}
    </ThemeProvider>
  );
}

export default App;
