import { error } from "@/lib/logger";
import { useState, useEffect } from "react";
import { getContent, readFile } from "@/lib/backend";
import { useConfig } from "../../providers/ConfigProvider";

import PdfRenderer from "./pdf/PDFRenderer";
import PaperRenderer from "./paper/PaperRenderer";
import MarkdownViewerRenderer from "./markdown/MarkdownViewerRenderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabGroup = "paper" | "markdown" | "pdf";

interface ViewerProps {
  activeTabGroup: TabGroup;
  activeTab: string;
  filePath: string;
  fileName?: string;
  fileType?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Viewer({
  activeTabGroup,
  activeTab,
  filePath,
  fileType,
  fileName,
}: ViewerProps) {
  const { config } = useConfig();

  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(false);

  const [paperTabContent, setPaperTabContent] = useState<string>("");
  const [isLoadingPaperTab, setIsLoadingPaperTab] = useState(false);

  const projectPath = config?.basicConfig?.projectPath;

  // ── Load markdown file ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!filePath || fileType !== "md") {
      setMarkdownContent("");
      return;
    }

    let isCurrent = true;
    setIsLoadingMarkdown(true);

    readFile(filePath)
      .then((content) => {
        if (isCurrent) setMarkdownContent(content);
      })
      .catch((err) => {
        error(`Failed to load markdown: ${err}`);
        if (isCurrent) setMarkdownContent("");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingMarkdown(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [filePath, fileType]);

  // ── Load paper tab content ─────────────────────────────────────────────────

  useEffect(() => {
    const shouldLoad =
      activeTabGroup === "paper" &&
      fileName != null &&
      fileName !== "" &&
      projectPath &&
      activeTab !== "view";

    if (!shouldLoad) {
      setPaperTabContent("");
      setIsLoadingPaperTab(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingPaperTab(true);

    getContent(activeTab, fileName, projectPath)
      .then((content) => {
        if (isCurrent) setPaperTabContent(content);
      })
      .catch((err) => {
        error(`Failed to load paper tab content: ${err}`);
        if (isCurrent) {
          const message =
            err instanceof Error ? err.message : "Failed to fetch content";
          setPaperTabContent(`Error: ${message}`);
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingPaperTab(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeTabGroup, activeTab, fileName, projectPath]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTabGroup) {
      case "paper":
        return (
          <PaperRenderer
            activeTab={activeTab}
            filePath={filePath}
            paperTabContent={paperTabContent}
            isLoadingPaperTab={isLoadingPaperTab}
          />
        );
      case "markdown":
        return (
          <MarkdownViewerRenderer
            activeTab={activeTab}
            filePath={filePath}
            markdownContent={markdownContent}
            isLoadingMarkdown={isLoadingMarkdown}
            onContentChange={setMarkdownContent}
          />
        );
      case "pdf":
        return <PdfRenderer activeTab={activeTab} filePath={filePath} />;
      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Select a viewer tab group above.
          </div>
        );
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col items-center overflow-auto">
      {renderContent()}
    </div>
  );
}
