import PDFView from "@/components/small/PDFView";

export default function FileViewer({ title, content }: any) {
  return (
    <div className="h-[98.5%] w-full flex flex-col items-center justify-center mt-[10px]">
      {title && content ? (
        <div className="">
          <header>
            <h1>{title}</h1>
          </header>
          <div>{content}</div>
        </div>
      ) : (
        <PDFView file="/assets/sample.pdf" />
      )}
    </div>
  );
}
