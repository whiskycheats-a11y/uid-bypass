import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListUids,
  getListUidsQueryKey,
  useAddUid,
  useRemoveUid,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Zap,
  Users,
  Monitor,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Activity,
  LogOut,
  CalendarDays,
  User,
  Lock,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

const addUidSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  days: z.coerce.number().min(1).default(30),
  bluestack: z.boolean().default(true),
});
type AddUidValues = z.infer<typeof addUidSchema>;

function StatCard({
  icon: Icon,
  label,
  value,
  gradFrom,
  gradTo,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  gradFrom: string;
  gradTo: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 22 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="glass-strong rounded-2xl p-5 relative overflow-hidden cursor-default group"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${gradFrom}18, ${gradTo}10)` }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${gradFrom}, transparent)` }}
      />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
            style={{ background: `linear-gradient(135deg, ${gradFrom}25, ${gradTo}15)`, border: `1px solid ${gradFrom}30` }}
          >
            <Icon className="w-4 h-4" style={{ color: gradFrom }} />
          </div>
          <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
          <div className="text-xs font-medium text-muted-foreground mt-1 tracking-wide">{label}</div>
        </div>
        <motion.div
          className="w-12 h-12 rounded-full opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"
          style={{ background: gradFrom }}
        />
      </div>
    </motion.div>
  );
}

interface DashboardProps {
  username?: string;
  defaultDays?: number;
  isTrial?: boolean;
  onLogout?: () => void;
}

export default function Dashboard({ username, defaultDays = 30, isTrial = false, onLogout }: DashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const { data: listResponse, isLoading } = useListUids({
    query: { queryKey: getListUidsQueryKey() },
  });

  const addMutation = useAddUid();
  const removeMutation = useRemoveUid();

  const form = useForm<AddUidValues>({
    resolver: zodResolver(addUidSchema),
    defaultValues: { uid: "", days: defaultDays, bluestack: true },
  });

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      sessionStorage.removeItem("uid_auth");
      window.location.reload();
    }
  };

  const uids = listResponse?.success ? listResponse.data : [];
  const bsCount = uids.filter((u) => u.bluestack).length;

  const myUids = username ? uids.filter((u) => u.adder_name === username) : uids;
  const trialLimitReached = isTrial && myUids.length >= 1;

  const onSubmit = (values: AddUidValues) => {
    if (trialLimitReached) {
      setShowPurchaseModal(true);
      return;
    }
    addMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast({ title: "Access Granted", description: `UID ${values.uid} whitelisted successfully.` });
            form.reset();
            queryClient.invalidateQueries({ queryKey: getListUidsQueryKey() });
          } else {
            toast({ title: "Failed", description: data.message, variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: "Error", description: "Could not reach authorization server.", variant: "destructive" });
        },
      }
    );
  };

  const onRemove = (uid: string) => {
    setRemovingUid(uid);
    removeMutation.mutate(
      { data: { uid } },
      {
        onSuccess: (data) => {
          setRemovingUid(null);
          if (data.success) {
            toast({ title: "Access Revoked", description: `UID ${uid} removed.` });
            queryClient.invalidateQueries({ queryKey: getListUidsQueryKey() });
          } else {
            toast({ title: "Failed", description: data.message, variant: "destructive" });
          }
        },
        onError: () => {
          setRemovingUid(null);
          toast({ title: "Error", description: "Removal failed.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute animate-float-orb rounded-full" style={{ width: 700, height: 700, background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)", top: "-200px", left: "-150px" }} />
        <div className="absolute animate-float-orb-delay rounded-full" style={{ width: 600, height: 600, background: "radial-gradient(circle, rgba(0,212,255,0.18) 0%, transparent 70%)", bottom: "-150px", right: "-100px" }} />
        <div className="absolute animate-pulse-glow rounded-full" style={{ width: 350, height: 350, background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)", top: "45%", left: "65%" }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchaseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
            onClick={() => setShowPurchaseModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-8 max-w-sm w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/90 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500/70 to-transparent" />
              <div className="absolute -inset-1 rounded-3xl opacity-20 -z-10" style={{ background: "linear-gradient(135deg, #8b5cf6, transparent, #ec4899)", filter: "blur(20px)" }} />

              <div className="flex flex-col items-center text-center gap-4">
                <motion.div
                  animate={{ rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))", border: "1px solid rgba(139,92,246,0.4)" }}
                >
                  <Lock className="w-8 h-8 text-violet-400" />
                </motion.div>

                <div>
                  <h2 className="text-xl font-black text-foreground mb-1">Free Trial Limit Reached</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Free trial allows only <span className="text-violet-400 font-bold">1 UID</span>. To add more UIDs, upgrade your plan.
                  </p>
                </div>

                <motion.a
                  href="https://discord.gg/QTwupjcKre"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm text-white relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #5865F2, #8b5cf6, #ec4899)", boxShadow: "0 0 30px rgba(88,101,242,0.5)" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                  />
                  <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="white">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                  </svg>
                  Go Purchase from Zytronexd
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </motion.a>

                <button
                  onClick={() => setShowPurchaseModal(false)}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 glass-strong border-b border-white/[0.05] sticky top-0"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899, #06b6d4)" }}
            >
              <Shield className="w-4 h-4 text-white" />
            </motion.div>
            <div>
              <div className="font-bold text-sm text-foreground">UID Manager</div>
              <div className="text-[11px] text-muted-foreground">Bypass Whitelist System</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {username && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="font-mono font-semibold">{username}</span>
                {isTrial && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "rgba(236,72,153,0.2)", color: "#f472b6", border: "1px solid rgba(236,72,153,0.3)" }}>
                    TRIAL
                  </span>
                )}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="w-3.5 h-3.5" style={{ color: "#06b6d4" }} />
              <span>{isLoading ? "..." : uids.length} active UIDs</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
              <motion.span
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              />
              <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">LIVE</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-white/[0.05] hover:border-red-500/20 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total UIDs" value={isLoading ? "—" : uids.length} gradFrom="#8b5cf6" gradTo="#6d28d9" delay={0} />
          <StatCard icon={Monitor} label="BlueStack" value={isLoading ? "—" : bsCount} gradFrom="#06b6d4" gradTo="#0891b2" delay={0.06} />
          <StatCard icon={CheckCircle2} label="Standard" value={isLoading ? "—" : uids.length - bsCount} gradFrom="#10b981" gradTo="#059669" delay={0.12} />
          <StatCard icon={CalendarDays} label="Avg Duration" value="30d" gradFrom="#ec4899" gradTo="#db2777" delay={0.18} />
        </div>

        <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">

          {/* Add UID Panel */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 160, damping: 22 }}
          >
            <div className="glass-strong rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                  <Plus className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <h2 className="font-semibold text-base text-foreground">Add New UID</h2>
                {isTrial && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(236,72,153,0.15)", color: "#f472b6", border: "1px solid rgba(236,72,153,0.25)" }}>
                    {trialLimitReached ? "LIMIT REACHED" : `1 UID LEFT`}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                {trialLimitReached
                  ? "Free trial limit reached. Upgrade to add more UIDs."
                  : "Register a player to the bypass whitelist"}
              </p>

              {trialLimitReached ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-5 rounded-xl text-center space-y-3" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(139,92,246,0.15)" }}>
                      <Lock className="w-6 h-6 text-violet-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">You've used your <span className="text-violet-400 font-semibold">free trial UID</span>. Join our Discord to purchase a full plan.</p>
                  </div>
                  <motion.a
                    href="https://discord.gg/QTwupjcKre"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm text-white relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #5865F2, #8b5cf6)", boxShadow: "0 0 24px rgba(88,101,242,0.4)" }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    />
                    <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="white">
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                    </svg>
                    Go Purchase from Zytronexd
                  </motion.a>
                </motion.div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Player UID</label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors pointer-events-none" />
                      <Input
                        placeholder="Enter UID number..."
                        className="pl-10 h-11 rounded-xl bg-white/[0.03] border-white/10 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50 text-sm transition-all"
                        {...form.register("uid")}
                      />
                    </div>
                    {form.formState.errors.uid && (
                      <p className="text-[11px] text-red-400">{form.formState.errors.uid.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Duration (Days)</label>
                    <div className="relative group">
                      <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors pointer-events-none" />
                      <Input
                        type="number"
                        className="pl-10 h-11 rounded-xl bg-white/[0.03] border-white/10 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50 text-sm"
                        {...form.register("days")}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] group hover:border-violet-500/20 hover:bg-white/[0.04] transition-all">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                        BlueStack Mode
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Emulator compatibility layer</div>
                    </div>
                    <Switch
                      checked={form.watch("bluestack")}
                      onCheckedChange={(v) => form.setValue("bluestack", v)}
                      className="data-[state=checked]:bg-violet-600"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={addMutation.isPending}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-12 rounded-xl btn-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    />
                    <AnimatePresence mode="wait">
                      {addMutation.isPending ? (
                        <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </motion.span>
                      ) : (
                        <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Authorize Access
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>

          {/* UID Table */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 160, damping: 22 }}
          >
            <div className="glass-strong rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />

              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-400" />
                  <h2 className="font-semibold text-sm text-foreground">Active Authorizations</h2>
                </div>
                {!isLoading && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-3 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    {uids.length} registered
                  </motion.span>
                )}
              </div>

              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                        className="h-14 rounded-xl bg-white/[0.03]"
                      />
                    ))}
                  </div>
                ) : uids.length === 0 ? (
                  <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
                      <Shield className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">No UIDs registered</p>
                    <p className="text-xs opacity-50">Add a UID using the form</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        {["UID", "Status", "Expiry", "Operator", ""].map((h, i) => (
                          <th key={i} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <AnimatePresence initial={false}>
                      <tbody>
                        {uids.map((entry, i) => {
                          const isHovered = hoveredRow === entry.uid;
                          return (
                            <motion.tr
                              key={entry.uid}
                              initial={{ opacity: 0, x: -16 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 16, height: 0 }}
                              transition={{ delay: i * 0.035, type: "spring", stiffness: 220, damping: 26 }}
                              onMouseEnter={() => setHoveredRow(entry.uid)}
                              onMouseLeave={() => setHoveredRow(null)}
                              className="border-b border-white/[0.03] relative"
                              style={{
                                background: isHovered
                                  ? "linear-gradient(90deg, rgba(139,92,246,0.07), rgba(6,182,212,0.04), transparent)"
                                  : "transparent",
                                transition: "background 0.3s ease",
                              }}
                            >
                              <td className="relative pl-5 pr-3 py-4 w-0">
                                <motion.div
                                  animate={{ scaleY: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                                  style={{ background: "linear-gradient(180deg, #8b5cf6, #06b6d4)", transformOrigin: "top" }}
                                />
                              </td>

                              <td className="px-3 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-foreground tracking-wider text-sm">{entry.uid}</span>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                {entry.bluestack ? (
                                  <motion.span
                                    whileHover={{ scale: 1.05 }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide cursor-default"
                                    style={{ background: "rgba(6,182,212,0.12)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.25)" }}
                                  >
                                    <Monitor className="w-2.5 h-2.5" />
                                    BLUESTACK
                                  </motion.span>
                                ) : (
                                  <motion.span
                                    whileHover={{ scale: 1.05 }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide cursor-default"
                                    style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    STANDARD
                                  </motion.span>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-xs text-muted-foreground font-mono">{entry.expiry_date}</span>
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-xs text-muted-foreground">{entry.adder_name}</span>
                              </td>

                              <td className="px-5 py-4 text-right">
                                <motion.button
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => onRemove(entry.uid)}
                                  disabled={removingUid === entry.uid}
                                  className="p-2 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40"
                                >
                                  {removingUid === entry.uid ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                </motion.button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </AnimatePresence>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
