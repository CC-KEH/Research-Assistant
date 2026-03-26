import { useState, useEffect } from "react";
import PDFView from "@/components/small/PDFView";
import { pdfViewerTabs, markdownViewerTabs } from "@/lib/tabs";
import Suggestions from "./Suggestions";
import MarkdownRenderer from "./small/MarkdownRenderer";
import { getContent, readFile, writeFile } from "@/lib/backend";
import { error } from "@/lib/logger";
import MarkdownEditor from "./small/MarkdownEditor";
import { useConfig } from "./providers/ConfigProvider";
import { Arxiv } from "@/lib/types";

type TabGroup = "paper" | "markdown" | "pdf";

interface ViewerProps {
  activeTabGroup: TabGroup;
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
  fileName = "",
}: ViewerProps) {
  const [innerActiveTab, setInnerActiveTab] = useState(activeTab);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(false);

  // For paper tabs that load generated markdown (summary, contributions, etc.)
  const [paperTabContent, setPaperTabContent] = useState<string>("");
  const [isLoadingPaperTab, setIsLoadingPaperTab] = useState(false);

  const { getBasicConfig, getTabsConfig } = useConfig();
  const basicConfig = getBasicConfig();

  // ── Load markdown file content when it's a .md file ────────────────────────
  useEffect(() => {
    if (!filePath || fileType !== "md") {
      setMarkdownContent("");
      return;
    }

    let isCurrent = true;
    const load = async () => {
      setIsLoadingMarkdown(true);
      try {
        const content = await readFile(filePath);
        if (isCurrent) setMarkdownContent(content);
      } catch (err) {
        error(`Failed to load markdown: ${err}`);
        if (isCurrent) setMarkdownContent("");
      } finally {
        if (isCurrent) setIsLoadingMarkdown(false);
      }
    };

    load();
    return () => {
      isCurrent = false;
    };
  }, [filePath, fileType]);

  // ── Reset inner tab when the tab group changes ─────────────────────────────
  useEffect(() => {
    switch (activeTabGroup) {
      case "paper":
        setInnerActiveTab(
          getTabsConfig()?.tabs.find((t: any) => t.enabled)?.id ?? "view",
        );
        break;
      case "markdown":
        setInnerActiveTab(markdownViewerTabs[0]?.id ?? "view");
        break;
      case "pdf":
        setInnerActiveTab(pdfViewerTabs[0]?.id ?? "view");
        break;
    }
  }, [activeTabGroup, getTabsConfig]);

  // ── Sync inner tab with prop when parent changes it ────────────────────────
  useEffect(() => {
    setInnerActiveTab(activeTab);
  }, [activeTab]);

  // ── Load async content for "paper" tabs ────────────────────────────────────
  useEffect(() => {
    if (activeTabGroup !== "paper") {
      setPaperTabContent("");
      setIsLoadingPaperTab(false);
      return;
    }

    if (!fileName || !basicConfig?.projectPath) {
      setPaperTabContent("");
      setIsLoadingPaperTab(false);
      return;
    }

    // Only skip loading for pure PDF view tab
    if (innerActiveTab === "view") {
      setPaperTabContent("");
      setIsLoadingPaperTab(false);
      return;
    }

    // Now load for ALL other tabs, including "arxiv"
    let isCurrent = true;
    const loadPaperContent = async () => {
      setIsLoadingPaperTab(true);
      try {
        const content = await getContent(
          innerActiveTab,
          fileName,
          basicConfig.projectPath,
        );

        if (isCurrent) {
          setPaperTabContent(content);
        }
      } catch (err: any) {
        error(`Failed to load paper tab content: ${err}`);
        if (isCurrent) {
          setPaperTabContent(
            `Error: ${err.message || "Failed to fetch content"}`,
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoadingPaperTab(false);
        }
      }
    };

    loadPaperContent();

    return () => {
      isCurrent = false;
    };
  }, [activeTabGroup, innerActiveTab, fileName, basicConfig?.projectPath]);

  const renderInnerContent = () => {
    switch (activeTabGroup) {
      // ── PAPER GROUP ───────────────────────────────────────────────────────
      case "paper":
        switch (innerActiveTab) {
          case "view":
            return <PDFView file={filePath} />;

          case "arxiv":
            if (isLoadingPaperTab) {
              return <Suggestions isLoading={true} />;
            }

            let suggestions: Arxiv[] = [];
            let parseError: string | null = null;

            try {
              if (paperTabContent.trim()) {
                suggestions = JSON.parse(paperTabContent);
              }
            } catch (e) {
              parseError = "Failed to parse related papers data from backend.";
              console.error("arXiv JSON parse error:", e, paperTabContent);
            }

            return (
              <Suggestions
                suggestions={suggestions}
                isLoading={false}
                error={parseError}
              />
            );

          default:
            if (isLoadingPaperTab) {
              return (
                <div className="p-8 text-center text-muted-foreground animate-pulse">
                  Loading content...
                </div>
              );
            }
            return (
              <MarkdownRenderer
                content={paperTabContent || "No content available yet."}
              />
            );
        }

      // ── MARKDOWN GROUP ────────────────────────────────────────────────────
      case "markdown":
        switch (innerActiveTab) {
          case "view":
            if (isLoadingMarkdown) {
              return (
                <div className="p-8 text-center text-muted-foreground">
                  Loading markdown...
                </div>
              );
            }
            return (
              <MarkdownRenderer
                content={markdownContent || "Go to Edit tab to start editing."}
              />
            );

          case "edit":
            if (isLoadingMarkdown) {
              return (
                <div className="p-8 text-center text-muted-foreground">
                  Loading markdown...
                </div>
              );
            }
            return (
              <MarkdownEditor
                value={markdownContent}
                onChange={setMarkdownContent}
                onSave={(content) => writeFile(filePath, content)}
              />
            );

          default:
            return null;
        }

      // ── PDF GROUP ─────────────────────────────────────────────────────────
      case "pdf":
        switch (innerActiveTab) {
          case "view":
            return <PDFView file={filePath} />;
          default:
            return null;
        }

      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Select a viewer tab group above.
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col items-center pb-12 overflow-auto">
      {renderInnerContent()}
    </div>
  );
}
