import FileManager from "@/components/FileManager";
import ControlBar from "@/components/small/ControlBar";

export default function Frame1() {
  return (
    <div className="flex h-full w-full items-center justify-center flex-col p-4">
      <h1 className="text-sm border-b pb-2 mb-3">Library</h1>
      <FileManager />
      <ControlBar />
    </div>
  );
}
