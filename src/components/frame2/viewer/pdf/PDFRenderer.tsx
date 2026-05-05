import PDFViewer from "./PDFView";

export default function PdfRenderer({
  activeTab,
  filePath,
}: {
  activeTab: string;
  filePath: string;
}) {
  switch (activeTab) {
    case "view":
      return <PDFViewer file={filePath} />;
    default:
      return null;
  }
}
