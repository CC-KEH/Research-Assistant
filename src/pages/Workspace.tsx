import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import FileManager from "@/components/FileManager";
import FileViewer from "@/components/FileViewer";
import Assistant from "@/components/Assistant";
import ControlBar from "@/components/small/ControlBar";
import { LibraryContextMenu } from "@/components/small/context-menus/LibraryContextMenu";
import { FileViewerContextMenu } from "@/components/small/context-menus/FileViewerContextMenu";
import { AssistantContextMenu } from "@/components/small/context-menus/AssistantContextMenu";
export function Workspace() {
  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        <ResizablePanel defaultSize={25}>
          <div className="flex h-full w-full items-center justify-center flex-col p-4">
            <h1 className="text-sm  border-b pb-2 mb-3">Library</h1>
            <LibraryContextMenu>
              <FileManager />
              <ControlBar />
            </LibraryContextMenu>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={45}>
          <div className="flex h-full w-full items-center justify-center flex-col p-4">
            {/* <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2 mb-3">
              Preview
            </h1> */}
            <FileViewerContextMenu>
              <FileViewer />
            </FileViewerContextMenu>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30}>
          <div className="flex h-full w-full items-center justify-center flex-col p-4">
            <h1 className="text-sm  border-b pb-2 mb-3">Assistant</h1>

            <AssistantContextMenu>
              <Assistant />
            </AssistantContextMenu>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
