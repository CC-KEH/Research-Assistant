import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { BugIcon, MoonIcon, Settings } from "lucide-react";

import { ReactNode } from "react";

interface ViewerContextMenuProps {
  children: ReactNode;
}

export const ViewerContextMenu = ({ children }: ViewerContextMenuProps) => {
  const handleAction = (action: string) => {
    console.log(`Action selected: ${action}`);
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
      <ContextMenuTrigger className="w-full h-full">
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
