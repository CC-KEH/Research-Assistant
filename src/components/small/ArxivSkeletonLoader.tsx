export default function ArxivSkeletonLoader() {
  return (
    <div className="w-full p-4 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-lg border border-border space-y-3">
          <div className="h-3.5 w-[65%] rounded animate-shimmer" />
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded animate-shimmer" />
            <div className="h-2.5 w-4/5 rounded animate-shimmer" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-5 w-16 rounded-full animate-shimmer" />
            <div className="h-5 w-20 rounded-full animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
