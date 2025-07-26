import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Bug, File, FileBox, Folder, Trash } from "lucide-react";

import { ReactNode } from "react";

interface LibraryContextMenuProps {
  children: ReactNode;
}

export const LibraryContextMenu = ({ children }: LibraryContextMenuProps) => {
  const handleAction = (action: string) => {
    console.log(`Action selected: ${action}`);
    switch (action) {
      case "new-file":
        // createNewFile();
        break;
      case "new-folder":
        // createNewFolder();
        break;
      case "delete":
        // delete();
        break;
      case "new-project":
        // newProjeect();
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
          onClick={() => handleAction("new-file")}
          className="flex flex-row justify-between gap-6"
        >
          New File
          <File />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction("new-folder")}
          className="flex flex-row justify-between gap-6"
        >
          New Folder
          <Folder />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction("delete")}
          className="flex flex-row justify-between gap-6"
        >
          Delete
          <Trash />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction("new-project")}
          className="flex flex-row justify-between gap-6"
        >
          New Project
          <FileBox />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction("report-bug")}
          className="flex flex-row justify-between gap-6"
        >
          Report Bug
          <Bug />
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
