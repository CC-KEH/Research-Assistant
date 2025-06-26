//TODO Use this style: https://21st.dev/aceternity/sidebar/default

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import FileManager from "@/components/FileManager";
import FileViewer from "@/components/FileViewer";
import Assistant from "@/components/Assistant";
import Navbar from "@/components/small/Navbar";

export function Workspace() {
  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        <ResizablePanel defaultSize={25}>
          <div className="flex h-full w-full items-center justify-center flex-col p-4">
            <FileManager />
            <Navbar />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={45}>
          <div className="flex h-full w-full items-center justify-center p-4">
            <FileViewer />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30}>
          <div className="flex h-full w-full items-center justify-center p-4">
            <Assistant />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
