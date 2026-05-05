import { useRef } from "react";
import type { FileInfo } from "@/lib/types";
import Assistant from "@/components/frame3/assistant/Assistant";
import type { AssistantHandle } from "@/components/frame3/assistant/Assistant";
import { AssistantContextMenu } from "@/components/frame3/assistant/AssistantContextMenu";

interface Frame3Props {
  fileInfo: FileInfo | null;
}

export default function Frame3({ fileInfo }: Frame3Props) {
  const assistantRef = useRef<AssistantHandle>(null);

  return (
    <div className="flex h-full w-full items-center justify-center flex-col p-4">
      <h1 className="text-sm border-b pb-2 mb-3">Assistant</h1>
      <AssistantContextMenu
        onNewSession={() => assistantRef.current?.createSession()}
        onResetChat={() => assistantRef.current?.resetChat()}
        onOpenSettings={() => assistantRef.current?.openSettings()}
      >
        <Assistant ref={assistantRef} fileInfo={fileInfo} />
      </AssistantContextMenu>
    </div>
  );
}
