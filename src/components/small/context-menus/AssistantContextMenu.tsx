import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ResetIcon } from "@radix-ui/react-icons";
import { Bug, Plus, Settings } from "lucide-react";

import { ReactNode } from "react";

interface AssistantContextMenuProps {
  children: ReactNode;
}

export const AssistantContextMenu = ({
  children,
}: AssistantContextMenuProps) => {
  const handleAction = (action: string) => {
    console.log(`Action selected: ${action}`);
    switch (action) {
      case "new-session":
        // createNewSession();
        break;
      case "model-settings":
        // modelSettings();
        break;
      case "reset-session":
        // resetSession();
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
          onClick={() => handleAction("new-session")}
          className="flex flex-row justify-between gap-6"
        >
          New Session
          <Plus />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction("model-settings")}
          className="flex flex-row justify-between gap-6"
        >
          Model Settings
          <Settings />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction("reset-session")}
          className="flex flex-row justify-between gap-6"
        >
          Reset Chat
          <ResetIcon />
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
