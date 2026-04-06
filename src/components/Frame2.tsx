import { useState, useEffect } from "react";
import type { FileInfo, KnowledgeFile, Tab } from "@/lib/types";
import { useConfig } from "./providers/ConfigProvider";
import { markdownViewerTabs, pdfViewerTabs } from "@/lib/tabs";
import Viewer from "@/components/Viewer";
import { ViewerContextMenu } from "@/components/small/context-menus/ViewerContextMenu";
import FrameTabs from "@/components/small/FrameTabs";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabGroup = "paper" | "markdown" | "pdf";

interface Frame2Props {
  fileInfo: FileInfo | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFirstEnabledTabId(
  group: TabGroup,
  configTabs: Tab[] | null | undefined,
): string | null {
  switch (group) {
    case "markdown":
      return markdownViewerTabs[0]?.id ?? null;
    case "pdf":
      return pdfViewerTabs[0]?.id ?? null;
    case "paper":
      return configTabs?.find((t: Tab) => t.enabled)?.id ?? null;
    default:
      return null;
  }
}

function resolveTabGroup(
  fileInfo: FileInfo,
  knowledgeFiles: KnowledgeFile[] | undefined,
): TabGroup {
  switch (fileInfo.file_type) {
    case "md":
      return "markdown";
    case "pdf": {
      const isFeedLlm = knowledgeFiles?.some(
        (file) => file.filePath === fileInfo.file_path && file.feedLlm === true,
      );
      return isFeedLlm ? "paper" : "pdf";
    }
    default:
      return "pdf";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Frame2({ fileInfo }: Frame2Props) {
  const { config } = useConfig();
  const [activeTabGroup, setActiveTabGroup] = useState<TabGroup | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (!fileInfo?.file_path) return;

    const knowledgeFiles = config?.knowledgeStoreConfig?.files;
    const configTabs = config?.tabsConfig?.tabs;

    const group = resolveTabGroup(fileInfo, knowledgeFiles);
    const firstTabId = getFirstEnabledTabId(group, configTabs);

    setActiveTabGroup(group);
    setActiveTab(firstTabId);
  }, [fileInfo, config]);

  if (!activeTabGroup || !activeTab || !fileInfo) return null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden my-4">
      <div className="shrink-0">
        <FrameTabs
          activeTabGroup={activeTabGroup}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
      <ViewerContextMenu>
        <Viewer
          activeTabGroup={activeTabGroup}
          activeTab={activeTab}
          filePath={fileInfo.file_path}
          fileName={fileInfo.file_name}
          fileType={fileInfo.file_type}
        />
      </ViewerContextMenu>
    </div>
  );
}
