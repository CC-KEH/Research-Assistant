import { Tabs } from "@/components/ui/Tabs";
import { tabType } from "@/lib/types";
import { assistantTabs, fileViewerTabs, libraryTabs } from "@/lib/tabs";

const tabsMap = {
  [tabType.libraryTab]: libraryTabs,
  [tabType.fileViewerTab]: fileViewerTabs,
  [tabType.assistantTab]: assistantTabs,
};

interface FrameTabsProps {
  activeTab: tabType;
}

export default function FrameTabs({ activeTab }: FrameTabsProps) {
  const tabsData = tabsMap[activeTab] || [];

  return (
    <div className="w-full flex justify-center">
      <Tabs
        tabs={tabsData}
        onTabChange={(tabId) => console.log(`Tab changed to: ${tabId}`)}
        className="mb-3"
      />
    </div>
  );
}
