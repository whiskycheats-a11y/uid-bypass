"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Info, CheckCircle2, AlertTriangle, ShieldAlert, XCircle, Megaphone, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  type: string;
  message: string;
  startsAt: Date | null;
  endsAt: Date | null;
}

export function GlobalAlertsClient({ alerts }: { alerts: Alert[] }) {
  const [openAlerts, setOpenAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check localStorage to see if user has already dismissed these alerts
    const dismissed = JSON.parse(localStorage.getItem("dismissedAlerts") || "{}");
    const initialOpenState: Record<string, boolean> = {};
    
    alerts.forEach(alert => {
      // Only open if not dismissed previously
      if (!dismissed[alert.id]) {
        initialOpenState[alert.id] = true;
      }
    });
    setOpenAlerts(initialOpenState);
  }, [alerts]);

  const handleClose = (id: string) => {
    setOpenAlerts(prev => ({ ...prev, [id]: false }));
    // Save to localStorage so it doesn't pop up again on every refresh
    const dismissed = JSON.parse(localStorage.getItem("dismissedAlerts") || "{}");
    dismissed[id] = true;
    localStorage.setItem("dismissedAlerts", JSON.stringify(dismissed));
  };

  if (alerts.length === 0) return null;

  const getTypeStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case "info":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-200",
          icon: <Info className="w-5 h-5 text-blue-400" />,
          glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
        };
      case "success":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          text: "text-emerald-200",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
        };
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          text: "text-amber-200",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
        };
      case "danger":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          text: "text-red-200",
          icon: <AlertCircle className="w-5 h-5 text-red-400" />,
          glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
        };
      case "disabled":
        return {
          bg: "bg-slate-500/10",
          border: "border-slate-500/20",
          text: "text-slate-300",
          icon: <XCircle className="w-5 h-5 text-slate-400" />,
          glow: "shadow-[0_0_20px_rgba(148,163,184,0.3)]",
        };
      case "announcement":
        return {
          bg: "bg-violet-500/10",
          border: "border-violet-500/30",
          text: "text-violet-200",
          icon: <Megaphone className="w-6 h-6 text-violet-400" />,
          glow: "shadow-[0_0_30px_rgba(139,92,246,0.4)]",
        };
      default:
        return {
          bg: "bg-slate-500/10",
          border: "border-white/10",
          text: "text-white",
          icon: <BellRing className="w-5 h-5" />,
          glow: "shadow-lg",
        };
    }
  };

  const popupAlerts = alerts.filter(a => ["announcement", "danger", "warning"].includes(a.type.toLowerCase()));
  const inlineAlerts = alerts.filter(a => !["announcement", "danger", "warning"].includes(a.type.toLowerCase()));

  return (
    <>
      {/* Inline Alerts */}
      {inlineAlerts.length > 0 && (
        <div className="space-y-3 mb-6">
          {inlineAlerts.map((alert) => {
            const styles = getTypeStyles(alert.type);
            // Hide inline if dismissed
            if (!openAlerts[alert.id] && openAlerts[alert.id] !== undefined) return null;
            
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border backdrop-blur-md relative overflow-hidden group",
                  styles.bg,
                  styles.border,
                  styles.glow
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="mt-0.5 relative z-10">{styles.icon}</div>
                <div className="flex-1 relative z-10">
                  <h4 className={cn("text-sm font-bold tracking-wide uppercase mb-1 opacity-90", styles.text)}>
                    {alert.type}
                  </h4>
                  <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                    {alert.message}
                  </p>
                </div>
                <button 
                  onClick={() => handleClose(alert.id)}
                  className="relative z-10 p-1.5 rounded-md hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Popup Alerts */}
      {popupAlerts.map((alert) => {
        const styles = getTypeStyles(alert.type);
        return (
          <Modal
            key={alert.id}
            isOpen={openAlerts[alert.id] || false}
            onClose={() => handleClose(alert.id)}
            title={""}
          >
            <div className="flex flex-col items-center text-center space-y-6 py-4">
              <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center animate-bounce", styles.bg, styles.border, styles.glow)}>
                {styles.icon}
              </div>
              
              <div className="space-y-2">
                <h2 className={cn("text-2xl font-black tracking-widest uppercase", styles.text)}>
                  {alert.type}
                </h2>
                <div className="w-12 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto rounded-full" />
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-5 w-full">
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                  {alert.message}
                </p>
              </div>

              <Button 
                onClick={() => handleClose(alert.id)}
                className="w-full h-12 bg-white text-black hover:bg-slate-200 font-bold text-sm tracking-wide transition-all duration-300 hover:scale-[1.02]"
              >
                I Understand
              </Button>
            </div>
          </Modal>
        );
      })}
    </>
  );
}
