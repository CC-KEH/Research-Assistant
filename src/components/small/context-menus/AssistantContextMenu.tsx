import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ResetIcon } from "@radix-ui/react-icons";
import { Bug, Plus, Settings } from "lucide-react";
import { info } from "@/lib/logger";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ReactNode } from "react";

interface AssistantContextMenuProps {
  children: ReactNode;
  onNewSession: () => void;
  onResetChat: () => void;
  onOpenSettings: () => void;
}

export const AssistantContextMenu = ({
  children,
  onNewSession,
  onResetChat,
  onOpenSettings,
}: AssistantContextMenuProps) => {
  const handleAction = async (action: string) => {
    info(`Action selected: ${action}`);
    switch (action) {
      case "new-session":
        onNewSession();
        break;
      case "model-settings":
        onOpenSettings();
        break;
      case "reset-session":
        onResetChat();
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
