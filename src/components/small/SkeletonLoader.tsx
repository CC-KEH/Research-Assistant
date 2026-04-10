export default function SkeletonLoader() {
  return (
    <div className="w-full p-6 space-y-4">
      <div className="h-4 w-2/5 rounded animate-shimmer" />
      <div className="space-y-2.5">
        <div className="h-3 w-full rounded animate-shimmer" />
        <div className="h-3 w-[85%] rounded animate-shimmer" />
        <div className="h-3 w-[92%] rounded animate-shimmer" />
        <div className="h-3 w-3/5 rounded animate-shimmer" />
      </div>
      <div className="space-y-2.5 pt-2">
        <div className="h-3 w-full rounded animate-shimmer" />
        <div className="h-3 w-[75%] rounded animate-shimmer" />
        <div className="h-3 w-[88%] rounded animate-shimmer" />
      </div>
    </div>
  );
}
