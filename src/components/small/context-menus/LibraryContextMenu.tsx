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
  onNewFile?: () => void;
  onNewDrawing?: () => void;
  onDelete?: () => void;
  onNewProject?: () => void;
  onReportBug?: () => void;
}

export const LibraryContextMenu = ({
  children,
  onNewFile,
  onNewDrawing,
  onDelete,
  onNewProject,
  onReportBug,
}: LibraryContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="w-full h-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={onNewFile}
          className="flex flex-row justify-between gap-6"
        >
          New File
          <File />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onNewDrawing}
          className="flex flex-row justify-between gap-6"
        >
          New Drawing
          <Folder />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDelete}
          className="flex flex-row justify-between gap-6"
        >
          Delete
          <Trash />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onNewProject}
          className="flex flex-row justify-between gap-6"
        >
          New Project
          <FileBox />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onReportBug}
          className="flex flex-row justify-between gap-6"
        >
          Report Bug
          <Bug />
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
