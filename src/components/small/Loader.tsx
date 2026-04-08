export default function Loader() {
  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 animate-pulse">
      {/* Simulate KnowledgeStoreButton */}
      <div className="h-8 rounded-md bg-muted w-full" />

      {/* Simulate tree rows */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted flex-shrink-0" />
          <div
            className="h-4 rounded bg-muted"
            style={{ width: `${60 + Math.random() * 30}%` }}
          />
        </div>
      ))}
    </div>
  );
}
