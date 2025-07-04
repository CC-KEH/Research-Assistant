import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { ReactNode } from "react";

interface AssistantContextMenuProps {
  children: ReactNode;
}

export const AssistantContextMenu = ({
  children,
}: AssistantContextMenuProps) => {
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
        <ContextMenuItem onClick={() => handleAction("new-session")}>
          New Session
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("Model Settings")}>
          Model Settings
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("reset-session")}>
          Reset Chat
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("reset-session")}>
          Report Bug
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
