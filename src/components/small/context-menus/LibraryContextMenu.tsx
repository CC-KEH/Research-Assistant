import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { ReactNode } from "react";

interface LibraryContextMenuProps {
  children: ReactNode;
}

export const LibraryContextMenu = ({ children }: LibraryContextMenuProps) => {
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
        <ContextMenuItem onClick={() => handleAction("new-file")}>
          New File
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("new-folder")}>
          New Folder
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("delete")}>
          Delete
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("new-project")}>
          New Project
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("report-bug")}>
          Report Bug
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
