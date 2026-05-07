import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Redo, Settings } from "lucide-react";

const handlePrevDoc = () => {
  // Implement logic to navigate to the previous page
  console.log("Navigate to previous page");
};

const handleCurrentDoc = () => {
  // Implement logic to navigate to the current page
  console.log("Navigate to current page");
};

const generateDoc = () => {
  // Implement logic to generate a new document
  console.log("Generate new document");
};

const changePrompt = () => {
  // Implement logic to change the prompt
  console.log("Change prompt");
};

export default function MarkdownToolbar() {
  return (
    <div className="fixed bottom-6 z-50 flex flex-row items-center gap-0.5 p-1.5 rounded-2xl border">
      <Button
        onClick={handlePrevDoc}
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-xl transition-all duration-150"
      >
        <ChevronLeft className="h-[15px] w-[15px]" />
      </Button>
      <Button
        onClick={handleCurrentDoc}
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-xl transition-all duration-150"
      >
        <ChevronRight className="h-[15px] w-[15px]" />
      </Button>

      <div className="mx-1 h-4 w-px rounded-full" />

      <Button
        onClick={generateDoc}
        variant="outline"
        size="sm"
        className="rounded-xl transition-all duration-150"
      >
        <Redo className="h-[15px] w-[15px]" />
      </Button>
      <Button
        onClick={changePrompt}
        variant="outline"
        size="sm"
        className="rounded-xl transition-all duration-150"
      >
        <Settings className="h-[15px] w-[15px]" />
      </Button>
    </div>
  );
}
