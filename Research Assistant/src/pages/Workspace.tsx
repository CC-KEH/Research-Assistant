import { useState } from "react";
import {
  ResizablePanel,
  ResizableHandle,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Frame1 from "@/components/frame1/library/Frame1";
import Frame2 from "@/components/frame2/Frame2";
import Frame3 from "@/components/frame3/Frame3";

import type { FileInfo } from "@/lib/types";

export function Workspace() {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  return (
    <ResizablePanelGroup direction="horizontal" className="h-[90%]">
      <ResizablePanel defaultSize={25} minSize={25}>
        <Frame1 onFileSelect={setSelectedFile} />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={45} minSize={45}>
        <Frame2 fileInfo={selectedFile} />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={30} minSize={25}>
        <Frame3 fileInfo={selectedFile} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
