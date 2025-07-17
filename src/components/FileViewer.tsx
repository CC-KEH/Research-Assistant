import PDFView from "@/components/small/PDFView";
import FileButtons from "./small/FileButtons";
// TODO: Add Search in File Functionality: ctrl + f
export default function FileViewer() {
  return (
    <div className="h-[97%] w-full items-center justify-center">
      <PDFView />
      <FileButtons />
    </div>
  );
}
