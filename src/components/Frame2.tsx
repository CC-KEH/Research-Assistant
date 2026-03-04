import Viewer from "@/components/Viewer";
import { ViewerContextMenu } from "@/components/small/context-menus/ViewerContextMenu";
import FrameTabs from "@/components/small/FrameTabs";
import { useState, useEffect } from "react";
import { useConfig } from "./providers/ConfigProvider";
import type { FileInfo, KnowledgeFile } from "@/lib/types";

type TabGroup = "paper" | "markdown" | "pdf"; // ← string discriminator

interface Frame2Props {
  fileInfo: FileInfo | null;
}
import { markdownViewerTabs, pdfViewerTabs } from "@/lib/tabs";

function getFirstTabId(
  group: TabGroup,
  getTabsConfig: () => any,
): string | null {
  switch (group) {
    case "markdown":
      return markdownViewerTabs[0]?.id ?? null;
    case "pdf":
      return pdfViewerTabs[0]?.id ?? null;
    case "paper":
      return getTabsConfig()?.tabs.find((t: any) => t.enabled)?.id ?? null;
    default:
      return null;
  }
}
export default function Frame2({ fileInfo }: Frame2Props) {
  const { getKnowledgeStoreConfig, getTabsConfig } = useConfig();
  const [activeTabGroup, setActiveTabGroup] = useState<TabGroup | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string>("");

  useEffect(() => {
    if (!fileInfo?.path) return;

    setFilePath(fileInfo.path);

    let group: TabGroup | null = null;

    switch (fileInfo.type) {
      case "md":
        group = "markdown";
        break;

      case "pdf": {
        const knowledgeStoreConfig = getKnowledgeStoreConfig();
        const isFeedLLM = knowledgeStoreConfig?.files.find(
          (file: KnowledgeFile) =>
            file.filePath === fileInfo.path && file.feedLlm === true,
        );
        group = isFeedLLM ? "paper" : "pdf";
        break;
      }

      default:
        break;
    }

    if (group) {
      setActiveTabGroup(group);
      const firstTabId = getFirstTabId(group, getTabsConfig);
      setActiveTab(firstTabId);
    }
  }, [fileInfo]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden my-4">
      {activeTabGroup && (
        <>
          <FrameTabs
            activeTabGroup={activeTabGroup}
            onTabChange={setActiveTab}
          />
          <ViewerContextMenu>
            <Viewer
              activeTabGroup={activeTabGroup}
              activeTab={activeTab!}
              filePath={filePath}
              fileType={fileInfo?.type}
            />
          </ViewerContextMenu>
        </>
      )}
    </div>
  );
}
