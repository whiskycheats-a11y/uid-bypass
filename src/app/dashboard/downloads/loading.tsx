export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="h-4 w-72 bg-white/[0.03] rounded" />
      </div>
      <div className="h-96 bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
    </div>
  );
}
