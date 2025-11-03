import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import KnowledgeStore from "@/components/KnowledgeStore";

export function KnowledgeStoreButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="group h-auto w-full gap-4 py-3 text-left"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <div className="space-y-1 mr-24">
          Knowledge Store
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="min-w-2xl h-3/4 overflow-y-hidden scrollbar-thin">
          <KnowledgeStore />
        </DialogContent>
      </Dialog>
    </>
  );
}
