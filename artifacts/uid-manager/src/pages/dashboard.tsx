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
  Gift,
  RefreshCw,
  Copy,
  CheckCheck,
  Timer,
  Coins,
  Wallet,
  QrCode,
  SendHorizonal,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

function rand(len: number, chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789") {
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function getResellerKey(): string {
  try {
    const raw = sessionStorage.getItem("uid_auth");
    if (!raw) return "";
    return JSON.parse(raw).adminKey ?? "";
  } catch { return ""; }
}

const DURATION_OPTIONS = [
  { label: "24 Hours", days: 1, price: "$0.50", tokens: 10 },
  { label: "3 Days", days: 3, price: "$1.30", tokens: 30 },
  { label: "7 Days", days: 7, price: "$2.33", tokens: 70 },
  { label: "14 Days", days: 14, price: "$3.50", tokens: 150 },
  { label: "30 Days", days: 30, price: "$5.20", tokens: 300 },
];

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
      className="glass-3d-strong stat-card-3d rounded-2xl p-5 relative overflow-hidden cursor-default group"
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
  canResell?: boolean;
  onLogout?: () => void;
}

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

function userHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("uid_auth");
    if (!raw) return {};
    const { username, adminKey } = JSON.parse(raw);
    return { "x-username": username ?? "", "x-password": adminKey ?? "" };
  } catch { return {}; }
}

function CustomDurationSelect({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (v: number) => void;
  options: typeof DURATION_OPTIONS;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.days === value) || options[0];

  useEffect(() => {
    const handleClose = () => setIsOpen(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 pl-10 pr-4 rounded-xl text-sm font-semibold transition-all outline-none flex items-center justify-between group"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: isOpen ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isOpen ? "0 0 15px rgba(139,92,246,0.15)" : "none",
          color: "var(--foreground)",
        }}
      >
        <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
        <span className="truncate">{selected.label}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground group-hover:text-foreground shrink-0 ml-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 w-full rounded-2xl overflow-hidden p-1.5 space-y-1"
            style={{
              background: "rgba(10, 8, 20, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(139,92,246,0.25)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.1)",
            }}
          >
            {options.map((opt) => {
              const active = opt.days === value;
              return (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => {
                    onChange(opt.days);
                    setIsOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))"
                      : "transparent",
                    color: active ? "#a78bfa" : "rgba(255,255,255,0.7)",
                    border: active ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                  }}
                >
                  <span className="font-bold">{opt.label}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-black"
                      style={{
                        background: active ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)",
                        color: active ? "#c084fc" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {opt.tokens} TOKENS
                    </span>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ParticleExplosion({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = canvas.parentElement?.clientHeight || 500;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
      decay: number;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: Particle[] = [];
    const colors = ["#8b5cf6", "#06b6d4", "#ec4899", "#10b981", "#fbbf24"];

    const startX = canvas.width / 2;
    const startY = canvas.height - 50;

    for (let i = 0; i < 60; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 1.5);
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.015 + Math.random() * 0.02,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    let animationFrameId: number;

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;

      particles.forEach((p) => {
        if (p.alpha <= 0) return;

        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;

        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(0, -p.radius * 2);
          ctx.rotate(Math.PI / 2);
        }
        ctx.closePath();

        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      if (alive) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        onComplete();
      }
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />;
}

function TiltWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTilt({ x: dy * -6, y: dx * 6 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transformStyle: "preserve-3d",
        transition: "transform 0.25s ease-out",
      }}
    >
      {children}
    </div>
  );
}

export default function Dashboard({ username, defaultDays = 30, isTrial = false, canResell = false, onLogout }: DashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showTrialMessage, setShowTrialMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<"uid" | "trial">("uid");
  const [balance, setBalance] = useState<number | null>(null);
  const [showFunds, setShowFunds] = useState(false);
  const [showSuccessBlast, setShowSuccessBlast] = useState(false);

  useEffect(() => {
    if (isTrial || !username) return;
    fetch(`${BASE}/api/credits/me`, { headers: userHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setBalance(d.balance); })
      .catch(() => { });
  }, [username, isTrial]);

  const { data: listResponse, isLoading } = useListUids({
    query: { queryKey: getListUidsQueryKey() },
  });

  const addMutation = useAddUid();
  const removeMutation = useRemoveUid();

  const form = useForm<AddUidValues>({
    resolver: zodResolver(addUidSchema),
    defaultValues: { uid: "", days: isTrial ? 1 : defaultDays, bluestack: true },
  });

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      sessionStorage.removeItem("uid_auth");
      window.location.reload();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uids: { uid: string; days: number; bluestack: boolean; addedBy: string; addedAt: string }[] = listResponse?.success ? ((listResponse as any).uids ?? []) : [];
  const bsCount = uids.filter((u) => u.bluestack).length;

  const DISCORD_URL = "https://discord.gg/QTwupjcKre";
  const TRIAL_USED_KEY = `trial_uid_used_${username}`;
  const [trialUsed, setTrialUsed] = useState(() => isTrial && sessionStorage.getItem(TRIAL_USED_KEY) === "true");
  const trialLimitReached = isTrial && trialUsed;

  const triggerTrialBlock = () => {
    setShowTrialMessage(true);
    window.open(DISCORD_URL, "_blank");
  };

  const watchedDays = form.watch("days");
  const selectedOpt = DURATION_OPTIONS.find((o) => o.days === Number(watchedDays));
  const tokenCost = isTrial ? 0 : (selectedOpt ? selectedOpt.tokens : 0);
  const hasEnoughBalance = isTrial || balance === null || balance >= tokenCost;

  const onSubmit = (values: AddUidValues) => {
    if (trialLimitReached) {
      triggerTrialBlock();
      return;
    }
    if (!isTrial && balance !== null && balance < tokenCost) {
      toast({ title: "Insufficient Tokens", description: `You need ${tokenCost} tokens but only have ${balance}. Contact admin to top up.`, variant: "destructive" });
      return;
    }
    const payload = isTrial ? { ...values, days: 1, username } : { ...values, username };
    addMutation.mutate(
      { data: payload as typeof values },
      {
        onSuccess: (data) => {
          if ((data as any).message === "TRIAL_LIMIT_REACHED") {
            sessionStorage.setItem(TRIAL_USED_KEY, "true");
            setTrialUsed(true);
            triggerTrialBlock();
            return;
          }
          if ((data as any).message === "INSUFFICIENT_BALANCE") {
            toast({ title: "Insufficient Tokens", description: "Not enough tokens. Ask admin to add more.", variant: "destructive" });
            return;
          }
          if (data.success) {
            if (isTrial) {
              sessionStorage.setItem(TRIAL_USED_KEY, "true");
              setTrialUsed(true);
            }
            // Deduct from local balance state
            if (!isTrial && balance !== null) setBalance(b => b !== null ? Math.max(0, b - tokenCost) : null);
            setShowSuccessBlast(true);
            toast({ title: "Access Granted", description: `UID ${values.uid} whitelisted successfully.` });
            form.reset();
            queryClient.invalidateQueries({ queryKey: getListUidsQueryKey() });
          } else {
            toast({ title: "Failed", description: (data as any).message, variant: "destructive" });
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
        <div className="orb-3d orb-1" />
        <div className="orb-3d orb-2" />
        <div className="orb-3d orb-3" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(162,0,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>


      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 glass-3d border-b border-white/[0.05] sticky top-0"
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
              <div className="font-bold text-sm text-gradient-viral">UID Manager</div>
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
            {!isTrial && (
              <div className="hidden sm:flex items-center gap-2">
                {balance !== null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: balance > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: balance > 0 ? "#10b981" : "#ef4444", border: `1px solid ${balance > 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                    <Coins className="w-3 h-3" />
                    <span>{balance} tokens</span>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFunds(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(139,92,246,0.15))", color: "#f472b6", border: "1px solid rgba(236,72,153,0.3)", boxShadow: "0 0 12px rgba(236,72,153,0.15)" }}
                >
                  <Wallet className="w-3 h-3" />
                  Add Funds
                </motion.button>
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
          <StatCard icon={Coins} label="Tokens" value={isTrial ? "FREE" : (balance === null ? "—" : balance)} gradFrom="#ec4899" gradTo="#db2777" delay={0.18} />
        </div>

        {/* Tab switcher — only for resellers with canResell permission */}
        {canResell && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, ease: "easeOut" }}
            className="flex gap-1 p-1 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {([
              { key: "uid", icon: Shield, label: "UID Manager", gold: false },
              { key: "trial", icon: Gift, label: "Give Free Trial", gold: true },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200"
                style={{
                  background: activeTab === t.key
                    ? t.gold ? "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.15))" : "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.15))"
                    : "transparent",
                  color: activeTab === t.key ? (t.gold ? "#f59e0b" : "#a78bfa") : "#6b7280",
                  border: activeTab === t.key ? `1px solid ${t.gold ? "rgba(245,158,11,0.3)" : "rgba(139,92,246,0.3)"}` : "1px solid transparent",
                  boxShadow: activeTab === t.key ? `0 0 20px ${t.gold ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.15)"}` : "none",
                }}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "trial" && canResell ? (
            <motion.div key="trial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <ResellerTrialPanel username={username ?? ""} />
            </motion.div>
          ) : (
            <motion.div key="uid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">

                {/* Add UID Panel */}
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 160, damping: 22 }}
                  className="w-full"
                >
                  <TiltWrapper>
                    <div className="glass-3d-strong rounded-2xl p-6 relative overflow-hidden">
                      <ParticleExplosion active={showSuccessBlast} onComplete={() => setShowSuccessBlast(false)} />
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
                      <p className="text-xs text-muted-foreground mb-6">Register a player to the bypass whitelist</p>

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
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Duration</label>
                            {isTrial ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(236,72,153,0.15)", color: "#f472b6", border: "1px solid rgba(236,72,153,0.25)" }}>
                                1 DAY TRIAL
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: hasEnoughBalance ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: hasEnoughBalance ? "#10b981" : "#ef4444", border: `1px solid ${hasEnoughBalance ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.3)"}` }}>
                                <Coins className="w-2.5 h-2.5" />
                                {tokenCost} token{tokenCost !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {isTrial ? (
                            <div className="flex items-center gap-3 h-11 px-4 rounded-xl text-sm opacity-60 cursor-not-allowed" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <CalendarDays className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">24 Hours — Free Trial</span>
                            </div>
                          ) : (
                            <CustomDurationSelect
                              value={form.watch("days")}
                              onChange={(val) => form.setValue("days", val)}
                              options={DURATION_OPTIONS}
                            />
                          )}
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

                        {/* Token cost preview */}
                        {!isTrial && (
                          <div className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px]" style={{ background: hasEnoughBalance ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.08)", border: `1px solid ${hasEnoughBalance ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.25)"}` }}>
                            <div className="flex items-center gap-1.5" style={{ color: hasEnoughBalance ? "#10b981" : "#ef4444" }}>
                              <Coins className="w-3.5 h-3.5" />
                              <span className="font-bold">Cost: {tokenCost} token{tokenCost !== 1 ? "s" : ""}</span>
                            </div>
                            {balance !== null && (
                              <span style={{ color: hasEnoughBalance ? "#6b7280" : "#ef4444" }} className="font-semibold">
                                {hasEnoughBalance ? `${balance} available` : `Only ${balance} — need ${tokenCost}`}
                              </span>
                            )}
                          </div>
                        )}

                        <motion.button
                          type="submit"
                          disabled={addMutation.isPending || !hasEnoughBalance}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className="w-full h-12 rounded-xl btn-viral-3d text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
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

                        {/* Trial limit message */}
                        <AnimatePresence>
                          {showTrialMessage && (
                            <motion.div
                              initial={{ opacity: 0, y: -8, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -8, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="rounded-xl p-4 text-center space-y-3" style={{ background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.25)" }}>
                                <p className="text-sm font-semibold text-white leading-snug">
                                  Contact to <span style={{ color: "#a78bfa" }}>Zytronexd</span> for purchase
                                  <br />
                                  <span className="text-xs font-normal text-muted-foreground">Its Free Trial — 1 UID only</span>
                                </p>
                                <motion.a
                                  href="https://discord.gg/QTwupjcKre"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white"
                                  style={{ background: "linear-gradient(135deg, #5865F2, #8b5cf6)" }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 127.14 96.36" fill="white">
                                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                                  </svg>
                                  Join Discord
                                </motion.a>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </form>
                    </div>
                  </TiltWrapper>
                </motion.div>

                {/* UID Table */}
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 160, damping: 22 }}
                >
                  <div className="glass-3d-strong rounded-2xl overflow-hidden relative">
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
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {entry.addedAt
                                          ? new Date(new Date(entry.addedAt).getTime() + entry.days * 86400000).toLocaleDateString()
                                          : "—"}
                                      </span>
                                    </td>

                                    <td className="px-5 py-4">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                                        {entry.addedBy || "—"}
                                      </span>
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
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      <AnimatePresence>
        {showFunds && (
          <AddFundsModal
            username={username ?? ""}
            onClose={() => setShowFunds(false)}
            onSuccess={() => {
              fetch(`${BASE}/api/credits/me`, { headers: userHeaders() })
                .then(r => r.json())
                .then(d => { if (d.success) setBalance(d.balance); })
                .catch(() => { });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Token packages ─── */
const TOKEN_PACKAGES = [
  { tokens: 10, price: "$0.50", label: "Starter", color: "#10b981" },
  { tokens: 30, price: "$1.30", label: "Basic", color: "#06b6d4" },
  { tokens: 70, price: "$2.33", label: "Standard", color: "#8b5cf6" },
  { tokens: 150, price: "$3.50", label: "Pro", color: "#f59e0b" },
  { tokens: 300, price: "$5.20", label: "Ultimate", color: "#ec4899" },
];

/* ─── Add Funds Modal ─── */
function AddFundsModal({ username, onClose, onSuccess }: { username: string; onClose: () => void; onSuccess: () => void }) {
  const BASE_M = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { toast } = useToast();
  const [selected, setSelected] = useState<typeof TOKEN_PACKAGES[0] | null>(null);
  const [txNote, setTxNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function userHdrs(): Record<string, string> {
    try {
      const raw = sessionStorage.getItem("uid_auth");
      if (!raw) return { "Content-Type": "application/json" };
      const { username: u, adminKey } = JSON.parse(raw);
      return { "Content-Type": "application/json", "x-username": u ?? "", "x-password": adminKey ?? "" };
    } catch { return { "Content-Type": "application/json" }; }
  }

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/payments/request`, {
        method: "POST",
        headers: userHdrs(),
        body: JSON.stringify({ packageTokens: selected.tokens, packagePrice: selected.price, txNote }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        onSuccess();
      } else {
        toast({ title: "Error", description: data.error ?? "Request failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not reach server", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="glass-strong rounded-2xl w-full max-w-md overflow-hidden relative"
        style={{ border: "1px solid rgba(236,72,153,0.2)", boxShadow: "0 0 60px rgba(236,72,153,0.12)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #ec4899, #8b5cf6, transparent)" }} />

        <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(139,92,246,0.15))", border: "1px solid rgba(236,72,153,0.3)" }}>
              <Wallet className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground">Add Tokens</h2>
              <p className="text-[11px] text-muted-foreground">Purchase tokens to authorize UIDs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-all">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <CheckCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">Request Submitted!</p>
                <p className="text-sm text-muted-foreground mt-1">Your payment request for <span className="text-pink-400 font-bold">{selected?.tokens} tokens ({selected?.price})</span> has been sent to admin.</p>
                <p className="text-xs text-muted-foreground mt-2">Tokens will be added once admin verifies your payment.</p>
              </div>
              <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold text-foreground border border-white/[0.1] hover:bg-white/[0.05] transition-all">
                Close
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" className="p-6 space-y-5">
              {/* QR Section */}
              <div className="flex gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="shrink-0">
                  <img
                    src={`${BASE_M}/qr-payment.png`}
                    alt="Payment QR Code"
                    className="w-24 h-24 rounded-xl object-cover"
                    style={{ border: "2px solid rgba(236,72,153,0.3)" }}
                  />
                </div>
                <div className="flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <QrCode className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs font-bold text-foreground">Scan to Pay</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Scan the QR code to send payment. After paying, select your package and submit your request below.</p>
                  <p className="text-[10px] text-pink-400 font-semibold mt-1">Admin will verify & add tokens within minutes</p>
                </div>
              </div>

              {/* Package selection */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Select Package</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {TOKEN_PACKAGES.map(pkg => (
                    <button
                      key={pkg.tokens}
                      onClick={() => setSelected(pkg)}
                      className="flex flex-col items-center p-2.5 rounded-xl transition-all duration-150"
                      style={{
                        background: selected?.tokens === pkg.tokens ? `${pkg.color}18` : "rgba(255,255,255,0.03)",
                        border: selected?.tokens === pkg.tokens ? `1px solid ${pkg.color}50` : "1px solid rgba(255,255,255,0.07)",
                        boxShadow: selected?.tokens === pkg.tokens ? `0 0 14px ${pkg.color}25` : "none",
                      }}
                    >
                      <span className="text-lg font-black" style={{ color: selected?.tokens === pkg.tokens ? pkg.color : "#9ca3af" }}>{pkg.tokens}</span>
                      <span className="text-[8px] text-muted-foreground uppercase tracking-wide">tokens</span>
                      <span className="text-[8px] text-muted-foreground mt-1">{pkg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tx note */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">Transaction Note (optional)</label>
                <input
                  value={txNote}
                  onChange={e => setTxNote(e.target.value)}
                  placeholder="e.g. last 4 digits, screenshot ID…"
                  className="w-full h-10 px-3 rounded-xl text-sm font-mono text-foreground focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {selected && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: `${selected.color}10`, border: `1px solid ${selected.color}25` }}>
                  <span className="text-xs font-semibold" style={{ color: selected.color }}>Selected: {selected.tokens} tokens</span>
                  <span className="text-xs font-bold" style={{ color: selected.color }}>{selected.price}</span>
                </div>
              )}

              <motion.button
                onClick={handleSubmit}
                disabled={!selected || loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", boxShadow: selected ? "0 0 25px rgba(236,72,153,0.4)" : "none" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><SendHorizonal className="w-4 h-4" />Submit Payment Request</>}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ─── Reseller Free Trial Panel ─── */
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function ResellerTrialPanel({ username }: { username: string }) {
  const PRESETS = [1, 3, 7];
  const [days, setDays] = useState(1);
  const [trialUser, setTrialUser] = useState(() => `trial-${rand(4)}`);
  const [trialPass, setTrialPass] = useState(() => rand(8));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<{ username: string; password: string; days: number } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);

  const refresh = () => {
    setTrialUser(`trial-${rand(4)}`);
    setTrialPass(rand(8));
    setCreds(null);
    setError("");
  };

  const copyField = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyCard = (c: { username: string; password: string; days: number }) => {
    const loginUrl = window.location.origin;
    const msg =
      `✨「 SG71 BYPASS MODULE 」✨
🔓 FREE TRIAL ACCESS GRANTED 🔓
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔

💠 YOUR LOGIN CREDENTIALS 💠

   👤  User   ➜  ${c.username}
   🔑  Pass   ➜  ${c.password}
   ⏳  Valid  ➜  ${c.days} Day${c.days > 1 ? "s" : ""} Free Trial

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
🌐  PORTAL LINK
   ${loginUrl}

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
🎯  HOW TO ACTIVATE

   ▸ Open the portal link
   ▸ Login with your credentials
   ▸ Enter your Player UID
   ▸ Access granted instantly ✅

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
💎  SG71 Developer Zone Velocira Cheats
🔥  Premium Bypass Service
━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    navigator.clipboard.writeText(msg);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialUser || !trialPass) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/reseller/trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resellerUsername: username,
          resellerKey: getResellerKey(),
          trialUsername: trialUser,
          trialPassword: trialPass,
          days,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreds({ username: trialUser, password: trialPass, days });
      } else {
        setError(data.error ?? "Failed to create trial");
      }
    } catch { setError("Server error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="glass-strong rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #f59e0b, #ef4444, transparent)" }} />

        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Gift className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Free Trial Generator</h2>
            <p className="text-[11px] text-muted-foreground">Give your clients instant trial access</p>
          </div>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {creds ? (
              <motion.div key="creds" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.2)" }}>
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Trial Created!</p>
                    <p className="text-[11px] text-muted-foreground">Valid for {creds.days} day{creds.days > 1 ? "s" : ""} — share with your client</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Username", value: creds.username, key: "user" },
                    { label: "Password", value: creds.password, key: "pass" },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{f.label}</div>
                        <div className="font-mono font-bold text-sm text-foreground">{f.value}</div>
                      </div>
                      <button onClick={() => copyField(f.value, f.key)} className="p-2 rounded-lg transition-all hover:bg-white/[0.06]" style={{ color: copiedField === f.key ? "#06b6d4" : "#6b7280" }}>
                        {copiedField === f.key ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <Timer className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-400">{creds.days} day{creds.days > 1 ? "s" : ""} access</span>
                  </div>
                </div>

                <motion.button
                  onClick={() => copyCard(creds)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: copiedCard ? "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.15))" : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))",
                    border: copiedCard ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(245,158,11,0.3)",
                    color: copiedCard ? "#34d399" : "#f59e0b",
                    boxShadow: copiedCard ? "0 0 18px rgba(16,185,129,0.2)" : "0 0 18px rgba(245,158,11,0.15)",
                  }}
                >
                  {copiedCard ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Message for Client</>}
                </motion.button>

                <button onClick={refresh} className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold text-muted-foreground border border-white/[0.07] hover:bg-white/[0.04] hover:text-foreground transition-all">
                  <RefreshCw className="w-4 h-4" />
                  Generate Another
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Trial Duration</label>
                  <div className="flex gap-2">
                    {PRESETS.map((d) => (
                      <button key={d} type="button" onClick={() => setDays(d)}
                        className="flex-1 h-9 rounded-xl text-xs font-bold transition-all duration-150"
                        style={{
                          background: days === d ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "rgba(255,255,255,0.04)",
                          color: days === d ? "#fff" : "#6b7280",
                          border: days === d ? "1px solid rgba(245,158,11,0.5)" : "1px solid rgba(255,255,255,0.07)",
                          boxShadow: days === d ? "0 0 16px rgba(245,158,11,0.35)" : "none",
                        }}
                      >{d}d</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Credentials</label>
                    <button type="button" onClick={refresh} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-violet-400 transition-colors">
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">Username</div>
                      <input value={trialUser} onChange={(e) => setTrialUser(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-foreground focus:outline-none focus:border-amber-500/50 transition-all" />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">Password</div>
                      <input value={trialPass} onChange={(e) => setTrialPass(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-foreground focus:outline-none focus:border-amber-500/50 transition-all" />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    {error}
                  </div>
                )}

                <motion.button type="submit" disabled={loading || !trialUser || !trialPass}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)", boxShadow: "0 0 25px rgba(245,158,11,0.4)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4" />Generate Free Trial Access</>}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
