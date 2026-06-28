import { Loader2 } from "lucide-react";

export default function UsersLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 w-16 h-16 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin relative z-10" />
      </div>
      <h2 className="text-xl font-bold text-white tracking-widest uppercase">Fetching Users</h2>
      <p className="text-sm text-slate-400">Loading your massive database...</p>
    </div>
  );
}
