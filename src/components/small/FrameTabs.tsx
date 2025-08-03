import { Tabs } from "@/components/ui/Tabs";
import { tabType } from "@/lib/types";
import {
  assistantTabs,
  libraryTabs,
  paperViewerTabs,
  canvasViewerTabs,
  fileViewerTabs,
} from "@/lib/tabs";

// TODO: Select Tabs Type based on the state of File Selected. paperViewerTabs, canvasViewerTabs, fileViewerTabs.

const tabsMap = {
  [tabType.libraryTab]: libraryTabs,
  [tabType.fileManagerTab]: paperViewerTabs,
  [tabType.assistantTab]: assistantTabs,
};

interface FrameTabsProps {
  activeTab: tabType;
}

export default function FrameTabs({ activeTab }: FrameTabsProps) {
  const tabsData = tabsMap[activeTab] || [];

  return (
    <div className="mt-[2px] w-full flex justify-center">
      <Tabs
        tabs={tabsData}
        onTabChange={(tabId) => console.log(`Tab changed to: ${tabId}`)}
        className="mb-3"
      />
    </div>
  );
}
