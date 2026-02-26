import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { Bell, HelpCircle, Settings, Sun, Moon, List } from "lucide-react";

export default function ControlBar() {
  return (
    <div className="flex flex-col gap-4">
      <ExpandableTabs
        tabs={[
          { type: "tab", title: "Todos", icon: List, route: "/Todos" },
          { type: "tab", title: "News", icon: Bell, route: "/News" },
          { type: "separator" },
          { type: "tab", title: "Config", icon: Settings, route: "/Settings" },
          { type: "toggle", icon: Sun, toggledIcon: Moon },
          { type: "tab", title: "About", icon: HelpCircle, route: "/About" },
        ]}
      />
    </div>
  );
}
