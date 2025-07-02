import { Tabs } from "@/components/ui/Tabs";
import PDFView from "@/components/small/PDFView";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "integrations", label: "Integrations" },
  { id: "activity", label: "Activity" },
  { id: "domains", label: "Domains" },
  { id: "usage", label: "Usage" },
  { id: "monitoring", label: "Monitoring" },
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
