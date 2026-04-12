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
  Trash2,
  Zap,
  Users,
  Monitor,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Activity,
} from "lucide-react";
import { useState } from "react";

const addUidSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  days: z.coerce.number().min(1).default(30),
  bluestack: z.boolean().default(true),
});
type AddUidValues = z.infer<typeof addUidSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 22 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
  exit: { opacity: 0, x: 20, scale: 0.97, transition: { duration: 0.2 } },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className="glass rounded-2xl p-5 relative overflow-hidden group cursor-default"
    >
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${color}`}
        style={{ filter: "blur(40px)" }}
      />
      <div className="relative z-10">
        <div className={`inline-flex p-2 rounded-xl mb-3 ${color.replace("bg-", "bg-").replace("/5", "/15")}`}>
          <Icon className="w-4 h-4" style={{ color: "inherit" }} />
        </div>
        <div className="text-3xl font-bold font-mono mb-1 text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{label}</div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [removingUid, setRemovingUid] = useState<string | null>(null);

  const { data: listResponse, isLoading } = useListUids({
    query: { queryKey: getListUidsQueryKey() },
  });

  const addMutation = useAddUid();
  const removeMutation = useRemoveUid();

  const form = useForm<AddUidValues>({
    resolver: zodResolver(addUidSchema),
    defaultValues: { uid: "", days: 30, bluestack: true },
  });

  const onSubmit = (values: AddUidValues) => {
    addMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast({ title: "Access Granted", description: `UID ${values.uid} whitelisted.` });
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

  const uids = listResponse?.success ? listResponse.data : [];
  const bsCount = uids.filter((u) => u.bluestack).length;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute animate-float-orb rounded-full opacity-20"
          style={{
            width: 600,
            height: 600,
            background: "radial-gradient(circle, hsl(262 83% 68% / 0.4) 0%, transparent 70%)",
            top: "-150px",
            left: "-100px",
          }}
        />
        <div
          className="absolute animate-float-orb-delay rounded-full opacity-15"
          style={{
            width: 500,
            height: 500,
            background: "radial-gradient(circle, hsl(192 100% 55% / 0.35) 0%, transparent 70%)",
            bottom: "-100px",
            right: "-80px",
          }}
        />
        <div
          className="absolute rounded-full opacity-10 animate-pulse-glow"
          style={{
            width: 300,
            height: 300,
            background: "radial-gradient(circle, hsl(320 80% 60% / 0.4) 0%, transparent 70%)",
            top: "50%",
            left: "60%",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 glass-strong border-b border-white/5 sticky top-0"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(262 83% 68%), hsl(192 100% 55%))" }}
            >
              <Shield className="w-4 h-4 text-white" />
            </motion.div>
            <div>
              <div className="font-bold text-sm tracking-tight">UID Manager</div>
              <div className="text-[10px] text-muted-foreground font-mono">Bypass Whitelist System</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-3 h-3 text-accent" />
              <span className="font-mono">{uids.length} active</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative flex h-2 w-2"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </motion.span>
              <span className="text-xs font-semibold text-accent tracking-wide">LIVE</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total UIDs" value={isLoading ? "—" : uids.length} color="bg-violet-500/5" delay={0} />
          <StatCard icon={Monitor} label="BlueStack" value={isLoading ? "—" : bsCount} color="bg-cyan-500/5" delay={0.05} />
          <StatCard icon={CheckCircle2} label="Standard" value={isLoading ? "—" : uids.length - bsCount} color="bg-emerald-500/5" delay={0.1} />
          <StatCard icon={Clock} label="Avg Days" value={isLoading ? "—" : 30} color="bg-pink-500/5" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* Add UID Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 150 }}
          >
            <div className="glass-strong rounded-2xl p-6 glow-primary relative overflow-hidden">
              {/* Shimmer overlay */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Plus className="w-4 h-4 text-violet-400" />
                  <h2 className="font-semibold text-sm text-foreground">Add New UID</h2>
                </div>
                <p className="text-xs text-muted-foreground">Register a player to the bypass whitelist</p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* UID Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    Player UID
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="Enter UID number..."
                      className="font-mono bg-white/[0.03] border-white/10 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 input-glow text-sm h-11 rounded-xl transition-all"
                      {...form.register("uid")}
                    />
                    {form.formState.errors.uid && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-destructive mt-1"
                      >
                        {form.formState.errors.uid.message}
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* Days Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    Duration (Days)
                  </label>
                  <Input
                    type="number"
                    className="font-mono bg-white/[0.03] border-white/10 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 input-glow text-sm h-11 rounded-xl"
                    {...form.register("days")}
                  />
                </div>

                {/* BlueStack Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] group hover:border-violet-500/20 transition-all">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                      BlueStack Mode
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Emulator compatibility</div>
                  </div>
                  <Switch
                    checked={form.watch("bluestack")}
                    onCheckedChange={(v) => form.setValue("bluestack", v)}
                    className="data-[state=checked]:bg-violet-600"
                  />
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={addMutation.isPending}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full btn-gradient text-white font-semibold text-sm h-12 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {/* shine sweep */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                  />
                  <AnimatePresence mode="wait">
                    {addMutation.isPending ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Authorize Access
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* UID Table */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25, type: "spring", stiffness: 150 }}
          >
            <div className="glass-strong rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />

              {/* Table Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-400" />
                  <h2 className="font-semibold text-sm">Active Authorizations</h2>
                </div>
                {!isLoading && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2.5 py-1 rounded-full text-xs font-mono font-bold"
                    style={{ background: "rgba(139,92,246,0.15)", color: "hsl(262 83% 75%)" }}
                  >
                    {uids.length} registered
                  </motion.div>
                )}
              </div>

              {/* Table Content */}
              <div className="overflow-x-auto">
                {isLoading ? (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={i}
                        variants={itemVariants}
                        className="h-14 rounded-xl bg-white/[0.02] animate-shimmer"
                      />
                    ))}
                  </motion.div>
                ) : uids.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-20 flex flex-col items-center gap-3 text-muted-foreground"
                  >
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-2">
                      <Shield className="w-8 h-8 opacity-30" />
                    </div>
                    <p className="text-sm font-medium">No UIDs registered</p>
                    <p className="text-xs opacity-50">Add a UID to get started</p>
                  </motion.div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        {["UID", "Status", "Expiry", "Operator", ""].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <AnimatePresence>
                      <tbody>
                        {uids.map((entry, i) => (
                          <motion.tr
                            key={entry.uid}
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ delay: i * 0.04 }}
                            className="border-b border-white/[0.03] row-glow group transition-all"
                          >
                            <td className="px-5 py-4">
                              <span className="font-mono font-bold text-foreground tracking-wider">
                                {entry.uid}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {entry.bluestack ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wide"
                                  style={{
                                    background: "rgba(0,212,255,0.12)",
                                    color: "hsl(192 100% 65%)",
                                    border: "1px solid rgba(0,212,255,0.2)",
                                  }}
                                >
                                  <Monitor className="w-2.5 h-2.5" />
                                  BLUESTACK
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wide"
                                  style={{
                                    background: "rgba(139,92,246,0.12)",
                                    color: "hsl(262 83% 75%)",
                                    border: "1px solid rgba(139,92,246,0.2)",
                                  }}
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  STANDARD
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs text-muted-foreground font-mono">
                                {entry.expiry_date}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs text-muted-foreground">{entry.adder_name}</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onRemove(entry.uid)}
                                disabled={removingUid === entry.uid}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 disabled:opacity-40"
                              >
                                {removingUid === entry.uid ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
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
