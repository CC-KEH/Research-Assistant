import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { BugIcon, MoonIcon, Settings } from "lucide-react";
import { info } from "@/lib/logger";
import { ReactNode } from "react";
import { useNavigate } from "react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTheme } from "@/components/providers/ThemeProvider";

interface ViewerContextMenuProps {
  children: ReactNode;
}

export const ViewerContextMenu = ({ children }: ViewerContextMenuProps) => {
  const navigate = useNavigate();
  const themeProvider = useTheme();

  const handleAction = async (action: string) => {
    info(`Action selected: ${action}`);
    switch (action) {
      case "dark-mode":
        themeProvider.setTheme(
          themeProvider.theme === "dark" ? "light" : "dark",
        );
        break;
      case "tabs-settings":
        navigate("/settings", { state: { initialTab: "file-viewer" } });
        break;
      case "report-bug":
        await openUrl(
          "https://github.com/ArbashHussain/Research-Assistant/issues",
        );
        break;
      default:
        break;
    }
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => handleAction("dark-mode")}
          className="flex flex-row justify-between gap-6"
        >
          Dark Mode
          <MoonIcon />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction("tabs-settings")}
          className="flex flex-row justify-between gap-6"
        >
          Prompt Settings
          <Settings />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction("report-bug")}
          className="flex flex-row justify-between gap-6"
        >
          Report Bug
          <BugIcon />
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
