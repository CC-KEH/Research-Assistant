import { Tabs } from "@/components/ui/Tabs";
import { markdownViewerTabs, paperViewerTabs } from "@/lib/tabs";
import { Tab } from "@/lib/types";

interface FrameTabsProps {
  activeTabGroup: Tab[];
  onTabChange: (tab: string) => void;
}

export default function FrameTabs({
  activeTabGroup,
  onTabChange,
}: FrameTabsProps) {
  let tabsData: any = [];

  switch (activeTabGroup) {
    case paperViewerTabs:
      tabsData = paperViewerTabs;
      break;
    case markdownViewerTabs:
      tabsData = markdownViewerTabs;
      break;
    default:
      tabsData = [];
  }

  return (
    <div className="mt-[2px] w-full flex justify-center">
      <Tabs
        tabs={tabsData}
        onTabChange={(tabId: any) => onTabChange(tabId)}
        className="mb-3"
      />
    </div>
  );
}
