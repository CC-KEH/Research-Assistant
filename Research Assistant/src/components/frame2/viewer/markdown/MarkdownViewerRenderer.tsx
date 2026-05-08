import Loading from "@/components/common/Loader";
import MarkdownRenderer from "./MarkdownRenderer";
import MarkdownEditor from "./MarkdownEditor";
import { writeFile } from "@/lib/backend";

interface MarkdownRendererProps {
  activeTab: string;
  filePath: string;
  markdownContent: string;
  isLoadingMarkdown: boolean;
  showControlPanel: boolean;
  onContentChange: (content: string) => void;
}

export default function MarkdownViewerRenderer({
  activeTab,
  filePath,
  markdownContent,
  showControlPanel,
  isLoadingMarkdown,
  onContentChange,
}: MarkdownRendererProps) {
  if (isLoadingMarkdown) return <Loading />;

  switch (activeTab) {
    case "view":
      return (
        <MarkdownRenderer
          content={markdownContent || "Go to Edit tab to start editing."}
          showControlPanel={showControlPanel}
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
