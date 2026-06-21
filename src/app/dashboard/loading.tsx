export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="h-4 w-72 bg-white/[0.03] rounded" />
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
        ))}
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 h-80 bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
        <div className="h-80 bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
      </div>
    </div>
  );
}
