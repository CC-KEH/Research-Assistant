import { useState, useEffect } from "react";
import PDFView from "@/components/small/PDFView";
import { Tab } from "@/lib/types";
import {
  fileViewerTabs,
  markdownViewerTabs,
  paperViewerTabs,
} from "@/lib/tabs";

interface ViewerProps {
  activeTabGroup: Tab[];
  activeTab: string;
  filePath: string;
  fileName?: string;
  fileType?: string;
  fileId?: string;
}

export default function Viewer({
  activeTabGroup,
  activeTab,
  filePath,
  fileName,
  fileType,
  fileId,
}: ViewerProps) {
  // Determine group type from first tab (assuming all tabs in group have same type)
  // Inner active tab state
  const [innerActiveTab, setInnerActiveTab] = useState(activeTabGroup[0]?.id);

  // Reset innerActiveTab when group changes
  useEffect(() => {
    setInnerActiveTab(activeTabGroup[0]?.id);
  }, [activeTabGroup]);

  // Sync with parent activeTab when changed
  useEffect(() => {
    setInnerActiveTab(activeTab);
  }, [activeTab]);

  const renderInnerContent = () => {
    switch (activeTabGroup) {
      case paperViewerTabs:
        switch (innerActiveTab) {
          case "view":
            return <PDFView file={filePath} />;
          case "summary":
            return (
              <div className="p-4 text-sm text-muted-foreground">
                🧠 Summary of the paper will go here.
              </div>
            );
          case "contributions":
            return (
              <div className="p-4 text-sm text-muted-foreground">
                🧩 Key contributions section.
              </div>
            );
          case "critical-analysis":
            return (
              <div className="p-4 text-sm text-muted-foreground">
                🔍 Critical analysis or reflection view.
              </div>
            );
          case "future-work":
            return (
              <div className="p-4 text-sm text-muted-foreground">
                🚀 Future work suggestions here.
              </div>
            );
          case "arxiv":
            return (
              <div className="p-4 text-sm text-muted-foreground">
                🔗 Arxiv link, metadata, etc.
              </div>
            );
          default:
            return null;
        }

      case markdownViewerTabs:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            📝 Markdown editor or canvas view here.
          </div>
        );

      case fileViewerTabs:
        switch (innerActiveTab) {
          case "view":
            return (
              <div className="p-4 text-sm text-muted-foreground">
                👁 File preview here.
              </div>
            );
          case "edit":
            return (
              <div className="p-4 text-sm text-muted-foreground">
                ✏️ File editing tools here.
              </div>
            );
          default:
            return null;
        }

      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Select a viewer tab above.
          </div>
        );
    }
  };

  return (
    <div className="h-[630px] w-full flex flex-col items-center mt-[11px]">
      <div className="flex-1 w-full flex justify-center items-center">
        {renderInnerContent()}
      </div>
    </div>
  );
}
