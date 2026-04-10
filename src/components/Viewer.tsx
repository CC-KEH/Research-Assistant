import { useState, useEffect } from "react";
import type { Arxiv } from "@/lib/types";
import { getContent, readFile, writeFile } from "@/lib/backend";
import { useConfig } from "./providers/ConfigProvider";
import { error } from "@/lib/logger";
import Suggestions from "./Suggestions";
import PDFView from "@/components/small/PDFView";
import MarkdownEditor from "./small/MarkdownEditor";
import MarkdownRenderer from "./small/MarkdownRenderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabGroup = "paper" | "markdown" | "pdf";

interface ViewerProps {
  activeTabGroup: TabGroup;
  activeTab: string;
  filePath: string;
  fileName?: string;
  fileType?: string;
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

function LoadingDiv({ message }: { message: string }) {
  return (
    <div className="p-8 text-center text-muted-foreground animate-pulse">
      {message}
    </div>
  );
}

interface PaperRendererProps {
  activeTab: string;
  filePath: string;
  paperTabContent: string;
  isLoadingPaperTab: boolean;
}

function PaperRenderer({
  activeTab,
  filePath,
  paperTabContent,
  isLoadingPaperTab,
}: PaperRendererProps) {
  switch (activeTab) {
    case "view":
      return <PDFView file={filePath} />;

    case "arxiv": {
      if (isLoadingPaperTab) return <Suggestions isLoading={true} />;

      let suggestions: Arxiv[] = [];
      let parseError: string | null = null;

      try {
        if (paperTabContent.trim()) {
          const parsed = JSON.parse(paperTabContent);

          if (parsed?.detail) {
            parseError = parsed.detail;
          } else if (Array.isArray(parsed)) {
            suggestions = parsed;
          } else {
            parseError = "Unexpected response format from backend.";
          }
        }
      } catch (e) {
        parseError = "Failed to parse related papers data from backend.";
        error(`arXiv JSON parse error: ${e} — raw content: ${paperTabContent}`);
      }

      if (parseError) {
        return (
          <div className="p-6 m-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
            <p className="font-semibold mb-2">Error processing arxiv</p>
            <p>{parseError}</p>
          </div>
        );
      }

      return (
        <Suggestions
          suggestions={suggestions}
          isLoading={false}
          error={parseError}
        />
      );
    }

    default:
      if (isLoadingPaperTab) return <LoadingDiv message="Loading content..." />;

      // Check if content is a JSON error response (e.g. { detail: "..." })
      let displayContent = paperTabContent || "No content available yet.";
      if (paperTabContent?.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(paperTabContent);
          if (parsed?.detail) {
            return (
              <div className="p-6 m-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
                <p className="font-semibold mb-2">
                  Error processing {activeTab}
                </p>
                <p>{parsed.detail}</p>
              </div>
            );
          }
        } catch {
          // Not JSON, fall through to render as markdown
        }
      }

      return <MarkdownRenderer content={displayContent} />;
  }
}

interface MarkdownRendererProps {
  activeTab: string;
  filePath: string;
  markdownContent: string;
  isLoadingMarkdown: boolean;
  onContentChange: (content: string) => void;
}

function MarkdownViewerRenderer({
  activeTab,
  filePath,
  markdownContent,
  isLoadingMarkdown,
  onContentChange,
}: MarkdownRendererProps) {
  if (isLoadingMarkdown) return <LoadingDiv message="Loading markdown..." />;

  switch (activeTab) {
    case "view":
      return (
        <MarkdownRenderer
          content={markdownContent || "Go to Edit tab to start editing."}
        />
      );
    case "edit":
      return (
        <MarkdownEditor
          value={markdownContent}
          onChange={onContentChange}
          onSave={(content) => writeFile(filePath, content)}
        />
      );
    default:
      return null;
  }
}

function PdfRenderer({
  activeTab,
  filePath,
}: {
  activeTab: string;
  filePath: string;
}) {
  switch (activeTab) {
    case "view":
      return <PDFView file={filePath} />;
    default:
      return null;
  }
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
