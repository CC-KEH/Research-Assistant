import { Tab } from "@/lib/types";
import { Tabs } from "@/components/ui/Tabs";
import { markdownViewerTabs, pdfViewerTabs } from "@/lib/tabs";
import { useConfig } from "@/components/providers/ConfigProvider";

interface FrameTabsProps {
  activeTabGroup: Tab[];
  onTabChange: (tab: string) => void;
}

export default function FrameTabs({
  activeTabGroup,
  onTabChange,
}: FrameTabsProps) {
  const { getTabsConfig } = useConfig();
  const paperViewerTabs = getTabsConfig()?.tabs;

  let tabsData: any = [];

  switch (activeTabGroup) {
    case paperViewerTabs:
      tabsData = paperViewerTabs;
      break;
    case markdownViewerTabs:
      tabsData = markdownViewerTabs;
      break;
    case pdfViewerTabs:
      tabsData = pdfViewerTabs;
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
