import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import FileManager from "@/components/FileManager";
import FrameTabs from "@/components/FrameTabs";
import FileViewer from "@/components/FileViewer";
import Assistant from "@/components/Assistant";
import ControlBar from "@/components/small/ControlBar";
import { LibraryContextMenu } from "@/components/small/context-menus/LibraryContextMenu";
import { FileViewerContextMenu } from "@/components/small/context-menus/FileViewerContextMenu";
import { AssistantContextMenu } from "@/components/small/context-menus/AssistantContextMenu";

import { tabType } from "@/lib/types";
import Suggestions from "@/components/Suggestions";
export function Workspace() {
  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        <ResizablePanel defaultSize={25}>
          <div className="flex h-full w-full items-center justify-center flex-col p-4">
            <LibraryContextMenu>
              <FrameTabs activeTab={tabType.libraryTab} />
              {/* <FileManager /> */}
              <Suggestions />
            </LibraryContextMenu>
            <ControlBar />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={45}>
          <div className="flex h-full w-full items-center justify-center flex-col p-4">
            <FrameTabs activeTab={tabType.fileViewerTab} />
            <FileViewerContextMenu>
              <FileViewer />
            </FileViewerContextMenu>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30}>
          <div className="flex h-full w-full items-center justify-center flex-col p-4">
            <FrameTabs activeTab={tabType.assistantTab} />
            <AssistantContextMenu>
              <Assistant />
            </AssistantContextMenu>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
