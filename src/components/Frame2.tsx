import Viewer from "@/components/Viewer";
import { ViewerContextMenu } from "@/components/small/context-menus/ViewerContextMenu";
import FrameTabs from "@/components/small/FrameTabs";
import { useState, useEffect } from "react";
import { useConfig } from "./providers/ConfigProvider";
import type { FileInfo } from "@/lib/types";
import { markdownViewerTabs, pdfViewerTabs } from "@/lib/tabs";

interface Frame2Props {
  fileInfo: FileInfo | null;
}

export default function Frame2({ fileInfo }: Frame2Props) {
  const { getKnowledgeStoreConfig, getTabsConfig } = useConfig();
  const paperViewerTabs = getTabsConfig()?.tabs;
  const [activeTabGroup, setActiveTabGroup] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string>("");

  useEffect(() => {
    if (fileInfo?.path) {
      setFilePath(fileInfo.path);
      switch (fileInfo.type) {
        case "md":
          setActiveTabGroup(markdownViewerTabs);
          break;
        case "pdf":
          const knowledgeStoreConfig = getKnowledgeStoreConfig();
          if (
            knowledgeStoreConfig?.files.find(
              (file: any) => file.path === fileInfo.path,
            )
          ) {
            setActiveTabGroup(paperViewerTabs);
          } else {
            setActiveTabGroup(pdfViewerTabs);
          }
          break;
        default:
          break;
      }
      setActiveTab(activeTabGroup?.[0]?.id);
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
              fileName={fileInfo?.name}
              fileType={fileInfo?.type}
            />
          </ViewerContextMenu>
        </>
      )}
    </div>
  );
}
