import { useMemo } from "react";
import type { Tab } from "@/lib/types";
import { Tabs } from "@/components/ui/Tabs";
import { markdownViewerTabs, pdfViewerTabs } from "@/lib/tabs";
import { useConfig } from "@/components/providers/ConfigProvider";

interface FrameTabsProps {
  activeTabGroup: "paper" | "markdown" | "pdf";
  onTabChange: (tab: string) => void;
}

export default function FrameTabs({
  activeTabGroup,
  onTabChange,
}: FrameTabsProps) {
  const { config } = useConfig();

  const paperViewerTabs = useMemo<Tab[]>(
    () => config?.tabsConfig?.tabs.filter((tab) => tab.enabled) ?? [],
    [config],
  );

  const tabsData = useMemo<Tab[]>(() => {
    switch (activeTabGroup) {
      case "paper":
        return paperViewerTabs;
      case "markdown":
        return markdownViewerTabs;
      case "pdf":
        return pdfViewerTabs;
      default:
        return [];
    }
  }, [activeTabGroup, paperViewerTabs]);

  return (
    <div className="mt-[2px] w-full flex justify-center">
      <Tabs tabs={tabsData} onTabChange={onTabChange} className="mb-3" />
    </div>
  );
}
