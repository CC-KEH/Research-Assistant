export default function LibraryLoader() {
  const rows = [
    { depth: 0, width: "45%", isFolder: true },
    { depth: 1, width: "58%", isFolder: false },
    { depth: 1, width: "40%", isFolder: false },
    { depth: 1, width: "65%", isFolder: false },
    { depth: 0, width: "35%", isFolder: true },
    { depth: 1, width: "72%", isFolder: false },
    { depth: 1, width: "50%", isFolder: false },
    { depth: 0, width: "52%", isFolder: true },
    { depth: 1, width: "44%", isFolder: false },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-1.5 p-3">
      <div className="h-8 w-full rounded-lg animate-shimmer mb-1.5" />
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-[5px]"
          style={{ paddingLeft: row.depth === 1 ? "22px" : "4px" }}
        >
          <div
            className="animate-shimmer flex-shrink-0"
            style={{
              width: row.isFolder ? "14px" : "12px",
              height: row.isFolder ? "14px" : "12px",
              borderRadius: "3px",
            }}
          />
          <div
            className="animate-shimmer rounded"
            style={{
              height: row.isFolder ? "11px" : "10px",
              width: row.width,
            }}
          />
        </div>
      ))}
    </div>
  );
}
