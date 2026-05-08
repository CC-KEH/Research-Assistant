import { useState, useEffect } from "react";
import type { FileInfo, KnowledgeFile, Tab } from "@/lib/types";
import { useConfig } from "@/components/providers/ConfigProvider";
import { markdownViewerTabs, pdfViewerTabs } from "@/lib/tabs";
import Viewer from "@/components/frame2/viewer/Viewer";
import { ViewerContextMenu } from "@/components/frame2/viewer/ViewerContextMenu";
import FrameTabs from "@/components/frame2/FrameTabs";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabGroup = "paper" | "markdown" | "pdf";

interface Frame2Props {
  fileInfo: FileInfo | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFirstEnabledTabId(
  group: TabGroup,
  configTabs: Tab[] | null | undefined,
): string | null {
  switch (group) {
    case "markdown":
      return markdownViewerTabs[0]?.id ?? null;
    case "pdf":
      return pdfViewerTabs[0]?.id ?? null;
    case "paper":
      return configTabs?.find((t: Tab) => t.enabled)?.id ?? null;
    default:
      return null;
  }
}

function resolveTabGroup(
  fileInfo: FileInfo,
  knowledgeFiles: KnowledgeFile[] | undefined,
): TabGroup {
  switch (fileInfo.file_type) {
    case "md":
      return "markdown";
    case "pdf": {
      const isFeedLlm = knowledgeFiles?.some(
        (file) => file.filePath === fileInfo.file_path && file.feedLlm === true,
      );
      return isFeedLlm ? "paper" : "pdf";
    }
    default:
      return "pdf";
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center flex-col p-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 w-full">
        {/* Dashed drop zone */}
        <div className="flex flex-col items-center justify-center gap-4 w-full max-w-[260px] rounded-xl border border-border/60 px-6 py-10 ">
          {/* Stacked pages illustration */}
          <div className="relative h-14 w-10">
            {/* Back page */}
            <div className="absolute left-2 top-1 h-11 w-9 rounded-sm border border-border/40 bg-muted/30 rotate-3" />
            {/* Middle page */}
            <div className="absolute left-1 top-0.5 h-11 w-9 rounded-sm border border-border/50 bg-muted/50 -rotate-1" />
            {/* Front page */}
            <div className="absolute left-0 top-0 h-11 w-9 rounded-sm border border-border bg-background">
              <div className="mt-2 mx-1.5 space-y-1.5">
                <div className="h-px w-5 bg-muted-foreground/25 rounded" />
                <div className="h-px w-6 bg-muted-foreground/20 rounded" />
                <div className="h-px w-4 bg-muted-foreground/20 rounded" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium text-foreground/60">
              No file open
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Select a file from the Library
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Frame2({ fileInfo }: Frame2Props) {
  const { config } = useConfig();
  const [activeTabGroup, setActiveTabGroup] = useState<TabGroup | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (!fileInfo?.file_path) return;

    const knowledgeFiles = config?.knowledgeStoreConfig?.files;
    const configTabs = config?.tabsConfig?.tabs;

    const group = resolveTabGroup(fileInfo, knowledgeFiles);
    const firstTabId = getFirstEnabledTabId(group, configTabs);

    setActiveTabGroup(group);
    setActiveTab(firstTabId);
  }, [fileInfo, config]);

  if (!activeTabGroup || !activeTab || !fileInfo) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex h-[724px] w-full flex-col overflow-hidden my-4">
      <div className="shrink-0">
        <FrameTabs
          activeTabGroup={activeTabGroup}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
      <ViewerContextMenu>
        <Viewer
          activeTabGroup={activeTabGroup}
          activeTab={activeTab}
          filePath={fileInfo.file_path}
          fileName={fileInfo.file_name}
          fileType={fileInfo.file_type}
        />
      </ViewerContextMenu>
    </div>
  );
}
