import Viewer from "@/components/Viewer";
import { ViewerContextMenu } from "@/components/small/context-menus/ViewerContextMenu";
import FrameTabs from "@/components/small/FrameTabs";
import { useState } from "react";
import { paperViewerTabs } from "@/lib/tabs";

export default function Frame2() {
  const [activeTabGroup, setActiveTabGroup] = useState(paperViewerTabs);
  const [activeTab, setActiveTab] = useState(activeTabGroup[0]?.id);

  return (
    <div className="flex h-full w-full items-center justify-center flex-col p-4">
      <FrameTabs activeTabGroup={activeTabGroup} onTabChange={setActiveTab} />
      <ViewerContextMenu>
        <Viewer
          activeTabGroup={activeTabGroup}
          activeTab={activeTab}
          filePath={"/assets/sample.pdf"}
        />
      </ViewerContextMenu>
    </div>
  );
}
