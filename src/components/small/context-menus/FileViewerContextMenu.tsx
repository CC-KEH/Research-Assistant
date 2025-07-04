import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { ReactNode } from "react";

interface FileViewerContextMenuProps {
  children: ReactNode;
}

export const FileViewerContextMenu = ({
  children,
}: FileViewerContextMenuProps) => {
  const handleAction = (action: string) => {
    console.log(`Action selected: ${action}`);
    // TODO: Add your custom logic here (copy, paste, etc.)
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger className="w-full h-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleAction("dark-mode")}>
          Dark Mode
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("download-file")}>
          Download File
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("read-file")}>
          Read File
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("open-wite")}>
          Open With
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("prompt-settings")}>
          Prompt Settings
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("report-bug")}>
          Report Bug
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
