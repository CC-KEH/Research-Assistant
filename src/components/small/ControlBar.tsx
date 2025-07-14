import { Bell, Home, HelpCircle, Settings, Sun, Moon } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";

export default function ControlBar() {
  return (
    <div className="flex flex-col gap-4">
      <ExpandableTabs
        tabs={[
          { title: "Home", icon: Home },
          { title: "News", icon: Bell },
          { type: "separator" },
          { title: "Config", icon: Settings },
          { type: "toggle", icon: Sun, toggledIcon: Moon },
          { title: "Help", icon: HelpCircle },
        ]}
      />
    </div>
  );
}
