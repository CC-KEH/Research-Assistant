import { useState, useEffect } from "react";
import PDFView from "@/components/small/PDFView";
import { Tab } from "@/lib/types";
import {
  fileViewerTabs,
  markdownViewerTabs,
  paperViewerTabs,
} from "@/lib/tabs";
import Suggestions from "./Suggestions";
import MarkdownRenderer from "./small/MarkdownRenderer";
import { getContent } from "@/lib/backend";

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
            return <MarkdownRenderer content={getContent("summary")} />;
          case "contributions":
            return <MarkdownRenderer content={getContent("contributions")} />;
          case "critical-analysis":
            return (
              <MarkdownRenderer content={getContent("critical-analysis")} />
            );
          case "future-work":
            return <MarkdownRenderer content={getContent("future-work")} />;
          case "arxiv":
            return <Suggestions />;
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
    <div className="h-full flex flex-col items-center pb-12">
      {renderInnerContent()}
    </div>
  );
}
