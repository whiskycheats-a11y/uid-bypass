import { prisma } from "@/lib/prisma";
import { AlertCircle, Info, CheckCircle2, AlertTriangle, ShieldAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export async function GlobalAlerts() {
  const now = new Date();
  
  const allAlerts = await prisma.systemAlert.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  const alerts = allAlerts.filter(alert => {
    if (alert.startsAt && alert.startsAt > now) return false;
    if (alert.endsAt && alert.endsAt < now) return false;
    return true;
  });

  if (alerts.length === 0) return null;

  const getTypeStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case "info":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-200",
          icon: <Info className="w-5 h-5 text-blue-400" />,
        };
      case "success":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          text: "text-emerald-200",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        };
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          text: "text-amber-200",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        };
      case "danger":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          text: "text-red-200",
          icon: <AlertCircle className="w-5 h-5 text-red-400" />,
        };
      case "disabled":
        return {
          bg: "bg-slate-500/10",
          border: "border-slate-500/20",
          text: "text-slate-300",
          icon: <XCircle className="w-5 h-5 text-slate-400" />,
        };
      case "announcement":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-violet-200",
          icon: <ShieldAlert className="w-5 h-5 text-blue-400" />,
        };
      default:
        return {
          bg: "bg-slate-500/10",
          border: "border-white/10",
          text: "text-white",
          icon: <Info className="w-5 h-5" />,
        };
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert) => {
        const styles = getTypeStyles(alert.type);
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-4 p-4 rounded-xl border backdrop-blur-md shadow-lg",
              styles.bg,
              styles.border
            )}
          >
            <div className="mt-0.5">{styles.icon}</div>
            <div className="flex-1">
              <h4 className={cn("text-sm font-bold tracking-wide uppercase mb-1 opacity-90", styles.text)}>
                {alert.type}
              </h4>
              <p className="text-sm text-white/90 leading-relaxed">
                {alert.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
