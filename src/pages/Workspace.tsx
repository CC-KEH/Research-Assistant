import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Frame1 from "@/components/Frame1";
import Frame2 from "@/components/Frame2";
import Frame3 from "@/components/Frame3";
export function Workspace() {
  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        <ResizablePanel defaultSize={25}>
          <Frame1 />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={45}>
          <Frame2 />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30}>
          <Frame3 />
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
