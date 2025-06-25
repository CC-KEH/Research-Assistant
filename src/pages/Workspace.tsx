import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import FileManager from "@/components/FileManager";
import FileViewer from "@/components/FileViewer";
import Assistant from "@/components/Assistant";
import { Navbar } from "@/components/Navbar";

export function Workspace() {
  return (
    <>
      <Navbar />
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={25}>
          <div className="flex h-full w-full items-center justify-center p-6">
            <FileManager />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={45}>
          <div className="flex h-full w-full items-center justify-center p-6">
            <FileViewer />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30}>
          <div className="flex h-full w-full items-center justify-center p-6">
            <Assistant />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
