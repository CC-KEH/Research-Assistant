import { Tabs } from "@/components/ui/Tabs";
import PDFView from "@/components/small/PDFView";

const tabs = [
  { id: "view", label: "View" },
  { id: "summary", label: "Summary" },
  { id: "contributions", label: "Contributions" },
  { id: "critical-analysis", label: "Analysis" },
  { id: "dictionary", label: "Dictionary" },
  { id: "future-work", label: "Future Work" },
];

export default function FileViewer() {
  return (
    <div className="flex justify-center w-full h-full flex-col self-center gap-3">
      <Tabs
        tabs={tabs}
        onTabChange={(tabId) => console.log(`Tab changed to: ${tabId}`)}
        className="mb-3"
      />
      <PDFView />
    </div>
  );
}
