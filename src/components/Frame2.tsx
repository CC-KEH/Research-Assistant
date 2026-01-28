import Viewer from "@/components/Viewer";
import { ViewerContextMenu } from "@/components/small/context-menus/ViewerContextMenu";
import FrameTabs from "@/components/small/FrameTabs";
import { useState, useEffect } from "react";
import { invalidTab, markdownViewerTabs, paperViewerTabs } from "@/lib/tabs";
import type { FileInfo } from "@/lib/types";

interface Frame2Props {
  fileInfo: FileInfo | null;
}

export default function Frame2({ fileInfo }: Frame2Props) {
  const [activeTabGroup, setActiveTabGroup] = useState(paperViewerTabs);
  const [activeTab, setActiveTab] = useState(activeTabGroup[0]?.id);
  const [filePath, setFilePath] = useState<string>("");

  useEffect(() => {
    if (fileInfo?.path) {
      setFilePath(fileInfo.path);
      switch (fileInfo.type) {
        case "md":
          setActiveTabGroup(markdownViewerTabs);
          break;
        case "pdf": //TODO: If this file is in knowledgeStore then only paperViewerTabs else pdfViewerTabs
          setActiveTabGroup(paperViewerTabs);
          break;
        default:
          break;
      }
      setActiveTab(activeTabGroup[0]?.id);
    }
  }, [fileInfo]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden my-4">
      <FrameTabs activeTabGroup={activeTabGroup} onTabChange={setActiveTab} />
      <ViewerContextMenu>
        <Viewer
          activeTabGroup={activeTabGroup}
          activeTab={activeTab}
          filePath={filePath}
          fileName={fileInfo?.name}
          fileType={fileInfo?.type}
        />
      </ViewerContextMenu>
    </div>
  );
}
