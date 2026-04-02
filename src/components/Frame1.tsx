import Library from "@/components/Library";
import ControlBar from "@/components/small/ControlBar";
import { FileInfo } from "@/lib/types";

interface Frame1Props {
  onFileSelect: (info: FileInfo) => void;
}

export default function Frame1({ onFileSelect }: Frame1Props) {
  return (
    <div className="flex h-full w-full items-center justify-center flex-col p-4">
      <h1 className="text-sm border-b pb-2 mb-3">Library</h1>
      <div className="flex-1 min-h-0">
        <Library onFileSelect={onFileSelect} />
      </div>
      <div className="shrink-0 mt-4">
        <ControlBar />
      </div>
    </div>
  );
}
