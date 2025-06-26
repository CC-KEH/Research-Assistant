import { Bell, Home, HelpCircle, Settings, Shield } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";

export default function Navbar() {
  return (
    <div className="flex flex-col gap-4">
      <ExpandableTabs
        tabs={[
          { title: "Dashboard", icon: Home },
          { title: "Notifications", icon: Bell },
          { type: "separator" },
          { title: "Settings", icon: Settings },
          { title: "Support", icon: HelpCircle },
          { title: "Security", icon: Shield },
        ]}
      />
    </div>
  );
}
