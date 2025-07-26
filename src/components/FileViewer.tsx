import PDFView from "@/components/small/PDFView";
// TODO: Add Search in File Functionality: ctrl + f
export default function FileViewer() {
  return (
    <div className="h-[98.5%] w-full items-center justify-center mt-[10px]">
      <PDFView />
    </div>
  );
}
