import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { BugIcon, MoonIcon, Settings } from "lucide-react";
import { info } from "@/lib/logger";
import { ReactNode } from "react";

interface ViewerContextMenuProps {
  children: ReactNode;
}

export const ViewerContextMenu = ({ children }: ViewerContextMenuProps) => {
  const handleAction = (action: string) => {
    info(`Action selected: ${action}`);
    switch (action) {
      case "dark-mode":
        // togglePDFDarkMode();
        break;
      case "tabs-settings":
        // tabsSettings();
        break;
      case "report-bug":
        // reportBug();
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
