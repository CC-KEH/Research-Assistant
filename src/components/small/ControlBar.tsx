import { Bell, Home, HelpCircle, Settings, Sun, Moon } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";

export default function ControlBar() {
  return (
    <div className="flex flex-col gap-4">
      <ExpandableTabs
        tabs={[
          { title: "Dashboard", icon: Home },
          { title: "Notifications", icon: Bell },
          { type: "separator" },
          { title: "Settings", icon: Settings },
          { type: "toggle", icon: Sun, toggledIcon: Moon },
          { title: "Support", icon: HelpCircle },
        ]}
      />
    </div>
  );
}
