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
      if (isLoadingPaperTab) return <Loading />;

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
