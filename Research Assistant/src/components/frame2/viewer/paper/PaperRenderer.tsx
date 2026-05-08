import Loading from "@/components/common/Loader";
import PDFViewer from "../pdf/PDFView";
import Suggestions from "../recommendation/Suggestions";
import MarkdownRenderer from "../markdown/MarkdownRenderer";
import { ArxivItem } from "@/lib/types";
import { error } from "@/lib/logger";

interface PaperRendererProps {
  activeTab: string;
  filePath: string;
  paperTabContent: string;
  isLoadingPaperTab: boolean;
}

export default function PaperRenderer({
  activeTab,
  filePath,
  paperTabContent,
  isLoadingPaperTab,
}: PaperRendererProps) {
  switch (activeTab) {
    case "view":
      return <PDFViewer file={filePath} />;

    case "arxiv": {
      if (isLoadingPaperTab) return <Suggestions isLoading={true} />;

      let suggestions: ArxivItem[] = [];
      let parseError: string | null = null;

      try {
        if (paperTabContent.trim()) {
          const parsed = JSON.parse(paperTabContent);

          if (parsed?.detail) {
            parseError =
              "Something went wrong. Please try refreshing the page. If the issue persists, contact support.";
          } else if (Array.isArray(parsed)) {
            suggestions = parsed;
          } else {
            parseError =
              "Something went wrong. Please try refreshing the page. If the issue persists, contact support.";
          }
        }
      } catch (e) {
        parseError =
          "Something went wrong. Please try refreshing the page. If the issue persists, contact support.";
        error(`arXiv JSON parse error: ${e} — raw content: ${paperTabContent}`);
      }

      return (
        <Suggestions
          suggestions={suggestions}
          isLoading={false}
          error={parseError}
        />
      );
    }
    default: {
      if (isLoadingPaperTab) return <Loading />;

      try {
        const parsed = paperTabContent?.trim().startsWith("{")
          ? JSON.parse(paperTabContent)
          : null;

        if (parsed?.detail) {
          return (
            <MarkdownRenderer
              content=""
              showControlPanel={false}
              filePath={filePath}
              tabId={activeTab}
            />
          );
        }
      } catch {
        // Ignore JSON parse errors and render markdown normally
      }

      return (
        <MarkdownRenderer
          content={paperTabContent}
          showControlPanel={true}
          filePath={filePath}
          tabId={activeTab}
        />
      );
    }
  }
}
