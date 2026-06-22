import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Activity, ShieldCheck, KeyRound, User, Info, ArrowRightLeft, Settings, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  userId: string;
  limit?: number;
}

export async function ActivityFeed({ userId, limit = 5 }: ActivityFeedProps) {
  const logs = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "add_uid":
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case "extend_uid":
        return <Activity className="w-4 h-4 text-amber-400" />;
      case "replace_uid":
        return <ArrowRightLeft className="w-4 h-4 text-blue-400" />;
      case "remove_uid":
        return <KeyRound className="w-4 h-4 text-red-400" />;
      case "login":
        return <User className="w-4 h-4 text-blue-400" />;
      case "info_uid":
        return <Info className="w-4 h-4 text-slate-400" />;
      case "create_portal":
        return <Globe className="w-4 h-4 text-cyan-400" />;
      default:
        return <Settings className="w-4 h-4 text-slate-400" />;
    }
  };

  if (logs.length === 0) {
    return (
      <div className="text-center p-6 bg-white/[0.02] rounded-xl border border-white/[0.05]">
        <p className="text-slate-400 text-sm">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-4 items-start relative group">
          <div className="w-px h-full bg-white/[0.08] absolute left-4 top-8 group-last:hidden" />
          <div className="flex-none">
            <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shadow-lg relative z-10">
              {getActionIcon(log.action)}
            </div>
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm text-white/90 font-medium">
              {log.action.replace("_", " ").toUpperCase()}
            </p>
            <p className="text-xs text-slate-400 mt-1">{log.description}</p>
            <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-widest">
              {formatDistanceToNow(log.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
