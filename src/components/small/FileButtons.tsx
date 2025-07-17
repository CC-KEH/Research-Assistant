import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  HighlighterIcon,
  Pen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FileButtons() {
  return (
    <div className="grid grid-cols-3 items-center my-[5px] px-4">
      <h4 className="justify-self-start">File 2</h4>
      <div className="flex flex-row gap-3 justify-center items-center justify-self-center">
        <Button variant="ghost" size="icon" className="size-6">
          <ChevronLeft />
        </Button>
        <h4>22</h4>
        <Button variant="ghost" size="icon" className="size-6">
          <ChevronRight />
        </Button>
      </div>

      <div className="flex flex-row gap-2 justify-self-end">
        <Bookmark
          size={20}
          strokeWidth={1.5}
          className="text-gray-500 hover:text-blue-600 cursor-pointer"
        />
        <Pen
          size={20}
          strokeWidth={1.5}
          className="text-gray-500 hover:text-green-600 cursor-pointer"
        />
        <HighlighterIcon
          size={20}
          strokeWidth={1.5}
          className="text-gray-500 hover:text-yellow-500 cursor-pointer"
        />
      </div>
    </div>
  );
}

// TODO: Page Navigations: Back, Page 3 of 21, Next

// TODO: Highlight
// TODO: Bookmark
// TODO: Pen Tool
