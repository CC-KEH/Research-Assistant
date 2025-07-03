import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export function KnowledgeStoreButton() {
  return (
    <Button
      className="group h-auto w-full gap-4 py-3 text-left"
      variant="outline"
    >
      <div className="space-y-1 mr-24">
        <h3>Knowledge Store</h3>
        <p className="whitespace-break-spaces font-normal text-muted-foreground">
          All your resources, in one place.
        </p>
      </div>
      <ChevronRight
        className="opacity-60 transition-transform group-hover:translate-x-0.5"
        size={16}
        strokeWidth={2}
        aria-hidden="true"
      />
    </Button>
  );
}
