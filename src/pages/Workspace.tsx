import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Frame1 from "@/components/Frame1";
import Frame2 from "@/components/Frame2";
import Frame3 from "@/components/Frame3";
import type { FileInfo } from "@/lib/types";

export function Workspace() {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      <ResizablePanel defaultSize={25}>
        <Frame1 onFileSelect={setSelectedFile} />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={45}>
        <Frame2 fileInfo={selectedFile} />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={30}>
        <Frame3 fileInfo={selectedFile} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
