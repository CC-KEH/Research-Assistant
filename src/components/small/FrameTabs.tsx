import { Tab } from "@/lib/types";
import { Tabs } from "@/components/ui/Tabs";
import { markdownViewerTabs, pdfViewerTabs } from "@/lib/tabs";
import { useConfig } from "@/components/providers/ConfigProvider";
import { info } from "@/lib/logger";

interface FrameTabsProps {
  activeTabGroup: "paper" | "markdown" | "pdf";
  onTabChange: (tab: string) => void;
}

export default function FrameTabs({
  activeTabGroup,
  onTabChange,
}: FrameTabsProps) {
  const { getActiveTabsConfig } = useConfig();

  const paperViewerTabs = getActiveTabsConfig()?.filter(
    (tab: Tab) => tab.enabled === true,
  );

  let tabsData: any = [];
  info(`paper viewer tabs: ${paperViewerTabs}`);
  switch (activeTabGroup) {
    case "paper":
      info("Using paper viewer tabs from config");
      tabsData = paperViewerTabs;
      break;
    case "markdown":
      info("Using markdown viewer tabs");
      tabsData = markdownViewerTabs;
      break;
    case "pdf":
      info("Using pdf viewer tabs");
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
