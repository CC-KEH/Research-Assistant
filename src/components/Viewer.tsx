import { useState, useEffect } from "react";
import PDFView from "@/components/small/PDFView";
import { Tab } from "@/lib/types";
import { pdfViewerTabs, markdownViewerTabs } from "@/lib/tabs";
import Suggestions from "./Suggestions";
import MarkdownRenderer from "./small/MarkdownRenderer";
import { getContent, readFile, writeFile } from "@/lib/backend";
import { error, info } from "@/lib/logger";
import MarkdownEditor from "./small/MarkdownEditor";
import { useConfig } from "./providers/ConfigProvider";

interface ViewerProps {
  activeTabGroup: Tab[];
  activeTab: string;
  filePath: string;
  fileName?: string;
  fileType?: string;
}

export default function Viewer({
  activeTabGroup,
  activeTab,
  filePath,
  fileType,
}: ViewerProps) {
  const [innerActiveTab, setInnerActiveTab] = useState(activeTab);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const { getTabsConfig } = useConfig();
  const paperViewerTabs = getTabsConfig()?.tabs;

  useEffect(() => {
    if (!filePath) return;
    const loadMarkdownContent = async () => {
      if (fileType === "md") {
        try {
          setIsLoadingContent(true);
          const content = await readFile(filePath);
          setMarkdownContent(content);
        } catch (err) {
          error(`Failed to load markdown: ${err}`);
          setMarkdownContent("");
        } finally {
          setIsLoadingContent(false);
        }
      }
    };

    loadMarkdownContent();
  }, [filePath]);

  // Reset innerActiveTab when group changes
  useEffect(() => {
    if (activeTabGroup && activeTabGroup.length > 0) {
      setInnerActiveTab(activeTabGroup[0].id);
    }
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
            return <MarkdownRenderer content={getContent("customTab")} />;
        }

      case markdownViewerTabs:
        switch (innerActiveTab) {
          case "view":
            return isLoadingContent ? (
              <div>Loading...</div>
            ) : (
              <MarkdownRenderer
                content={
                  markdownContent ? markdownContent : "Go to Edit tab to edit."
                }
              />
            );
          case "edit":
            return isLoadingContent ? (
              <div>Loading...</div>
            ) : (
              <MarkdownEditor
                value={markdownContent}
                onChange={setMarkdownContent}
                onSave={(content) => writeFile(filePath, content)}
              />
            );
          default:
            return null;
        }

      case pdfViewerTabs:
        switch (innerActiveTab) {
          case "view":
            info(filePath);
            return <PDFView file={filePath} />;
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
