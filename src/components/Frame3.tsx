import { AssistantContextMenu } from "@/components/small/context-menus/AssistantContextMenu";
import Assistant from "@/components/Assistant";
import type { FileInfo } from "@/lib/types";

interface Frame3Props {
  fileInfo: FileInfo | null;
}

export default function Frame3({ fileInfo }: Frame3Props) {
  return (
    <div className="flex h-full w-full items-center justify-center flex-col p-4">
      <h1 className="text-sm border-b pb-2 mb-3">Assistant</h1>
      <AssistantContextMenu>
        <Assistant fileInfo={fileInfo} />
      </AssistantContextMenu>
    </div>
  );
}
