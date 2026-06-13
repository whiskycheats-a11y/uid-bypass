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
  XCircle,
  Loader2,
  Plus,
  Activity,
  LogOut,
  Clock,
  CalendarDays,
  User,
  Gift,
  RefreshCw,
  Copy,
  CheckCheck,
  Timer,
  Coins,
  LayoutDashboard,
  BarChart2,
  Trash2,
  Users2,
  Globe,
  MessageSquare,
  UserCircle,
  Camera,
  Edit2,
  Check,
  Trophy,
  Crown,
  Medal,
  KeyRound,
  Lock,
  Send,
  X,
  Terminal,
  Code2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

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
  name: z.string().min(1, "Name is required").default(""),
});
type AddUidValues = z.infer<typeof addUidSchema>;

function OverviewStatCard({
  label,
  value,
  icon: Icon,
  delay,
  sparklinePoints = [30, 28, 25, 20, 23, 18, 15, 12, 16, 10]
}: {
  label: string;
  value: number | string;
  icon: any;
  delay: number;
  sparklinePoints?: number[];
}) {
  const pathD = sparklinePoints
    .map((p, i) => {
      const x = (i / (sparklinePoints.length - 1)) * 100;
      const y = p;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 22 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="neo-glass glow-border rounded-[2rem] p-6 sm:p-7 relative overflow-hidden cursor-default group flex items-center justify-between shadow-xl"
    >
      <div className="scanline" />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[2rem] pointer-events-none"
        style={{ background: "radial-gradient(circle at top right, rgba(124,58,237,0.1), transparent 70%)" }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none glow-pulse"
        style={{ background: "linear-gradient(90deg, transparent, #00d4ff, transparent)" }}
      />

      <div className="flex flex-col justify-between h-full relative z-10">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-slate-400 transition-colors">{label}</div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-3.5 drop-shadow-md">{value}</div>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between h-full relative z-10 gap-3">
        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors shadow-[0_0_10px_rgba(0,212,255,0.1)] group-hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]">
          <Icon className="w-4 h-4 text-cyan-400/80 group-hover:text-cyan-300 transition-colors" />
        </div>
        <div className="w-24 sm:w-28 h-10 mt-2">
          <svg viewBox="0 0 100 30" className="w-full h-full text-cyan-500/50 group-hover:text-cyan-400 transition-colors filter drop-shadow-[0_0_4px_rgba(0,212,255,0.3)]">
            <motion.path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

function getDaysLeft(addedAtStr: string, days: number): string {
  try {
    const addedAt = new Date(addedAtStr).getTime();
    const expiresAt = addedAt + days * 24 * 60 * 60 * 1000;
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return "Expired";
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return `${diffDays}d left`;
  } catch {
    return `${days}d left`;
  }
}

interface DashboardProps {
  username?: string;
  defaultDays?: number;
  isTrial?: boolean;
  canResell?: boolean;
  onLogout?: () => void;
}

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

// Secure fetch wrapper — always sends HttpOnly auth_token cookie
function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> || {}),
    },
  });
}

function userHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
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
        className="w-full h-11 pl-10 pr-4 rounded-xl text-sm font-semibold transition-all outline-none flex items-center justify-between group bg-black/40 backdrop-blur-md"
        style={{
          border: isOpen ? "1px solid rgba(0,212,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
          boxShadow: isOpen ? "0 0 15px rgba(0,212,255,0.2)" : "none",
          color: "white",
        }}
      >
        <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
        <span className="truncate">{selected.label}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-500 group-hover:text-white shrink-0 ml-2"
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
            className="absolute z-50 w-full rounded-2xl overflow-hidden p-1.5 space-y-1 bg-black/40 backdrop-blur-xl border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.9)]"
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
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all hover:bg-white/[0.05]"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.15))"
                      : "transparent",
                    color: active ? "#00d4ff" : "rgba(255,255,255,0.7)",
                    border: active ? "1px solid rgba(0,212,255,0.3)" : "1px solid transparent",
                  }}
                >
                  <span className="font-bold">{opt.label}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                      style={{
                        background: active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.05)",
                        color: active ? "#00d4ff" : "rgba(255,255,255,0.5)",
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

function SuccessAnimation({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (active) {
      timer = setTimeout(() => {
        onComplete();
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md rounded-[2rem]"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="flex flex-col items-center"
          >
            <div className="relative w-24 h-24 flex items-center justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)] z-10"
              >
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </motion.div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-10px] border-2 border-emerald-500/30 border-t-emerald-400 rounded-full z-0"
              />
            </div>
            <motion.h3
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-black text-white tracking-widest drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            >
              ACCESS GRANTED
            </motion.h3>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 text-center"
            >
              UID Successfully Whitelisted
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TiltWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    const tiltX = dy * -6;
    const tiltY = dx * 6;

    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (ref.current) {
      ref.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    }
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.25s ease-out",
        willChange: "transform"
      }}
    >
      {children}
    </div>
  );
}

function ResellerTrialPanel({ username }: { username: string }) {
  const { toast } = useToast();
  const PRESETS = [1, 3, 7, 14, 30];
  const [days, setDays] = useState(1);
  const [serverName, setServerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkData, setLinkData] = useState<{ token: string; link: string; days: number; serverName?: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);
  
  const [tokens, setTokens] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  const fetchTokens = async () => {
    setLoadingTokens(true);
    try {
      const res = await apiFetch(`${BASE}/api/reseller/trial-tokens`);
      const data = await res.json();
      if (data.success) {
        setTokens(data.tokens);
      }
    } catch (err) {
      console.error("Failed to fetch trial tokens", err);
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);

  const executeDelete = async (token: string) => {
    try {
      const res = await apiFetch(`${BASE}/api/reseller/trial-token/${token}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchTokens();
      } else {
        toast({ title: "Failed", description: data.message || "Failed to delete", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to delete token", err);
      toast({ title: "Error", description: "Failed to delete token", variant: "destructive" });
    }
  };

  const refresh = () => {
    setLinkData(null);
    setError("");
    setServerName("");
  };

  const copyField = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyCard = (c: { token: string; link: string; days: number; serverName?: string }) => {
    const sName = c.serverName ? c.serverName.trim() : "Velocira Cheats";
    const msg =
`✨「 ${sName.toUpperCase()} BYPASS MODULE 」✨
🔓 FREE TRIAL ACCESS GRANTED 🔓
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔

💠 YOUR FREE ACTIVATION LINK 💠

   ⏳  Valid  ➜  ${c.days} Day${c.days > 1 ? "s" : ""} Free Trial
   🔗  Link   ➜  ${c.link}

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
🎯  HOW TO ACTIVATE

   ▸ Open the activation link above
   ▸ Enter your Player UID
   ▸ Select Bluestack if playing on simulator
   ▸ Access granted instantly ✅

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
💎  ${sName} Developer Zone
🔥  Premium Bypass Service
━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    navigator.clipboard.writeText(msg);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch(`${BASE}/api/reseller/trial-token`, {
        method: "POST",
        body: JSON.stringify({
          days,
          serverName: serverName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const portalUrl = `${window.location.origin}/free-portal?token=${data.token}`;
        setLinkData({ token: data.token, link: portalUrl, days, serverName: serverName.trim() });
        fetchTokens();
      } else {
        setError(data.error ?? "Failed");
      }
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="panel rounded-[2rem] overflow-hidden argus-glass text-left border border-white/5">
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #fbbf24, #ef4444, transparent)" }} />
        <div className="px-6 py-5 border-b border-white/[0.04] flex items-center gap-3 bg-black/20">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Gift className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-black text-base text-white tracking-wide">Free Trial Link Generator</h2>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Generate trial links to share with clients</p>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {linkData ? (
              <motion.div key="creds" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-black text-emerald-400">Trial Link Created!</p>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Valid for 24h to activate — share the activation link</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Activation Link", value: linkData.link, key: "link" },
                    { label: "Token Key", value: linkData.token, key: "token" },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                      <div className="flex-grow min-w-0 pr-4">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{f.label}</div>
                        <div className="font-mono font-bold text-sm text-white truncate">{f.value}</div>
                      </div>
                      <button onClick={() => copyField(f.value, f.key)} className="p-2 rounded-lg transition-all hover:bg-white/[0.06] text-slate-500 hover:text-white shrink-0">
                        {copiedField === f.key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Timer className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">{linkData.days} Day{linkData.days > 1 ? "s" : ""} Trial Access</span>
                  </div>
                </div>

                <motion.button
                  onClick={() => copyCard(linkData)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] relative overflow-hidden transition-all cursor-pointer"
                  style={{
                    background: copiedCard
                      ? "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.15))"
                      : "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.15))",
                    border: copiedCard ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(245,158,11,0.3)",
                    color: copiedCard ? "#34d399" : "#f59e0b",
                    boxShadow: copiedCard ? "0 0 18px rgba(16,185,129,0.2)" : "0 0 18px rgba(245,158,11,0.15)",
                  }}
                >
                  {copiedCard ? (
                    <><Check className="w-4 h-4" /> Copied to Clipboard!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Message for Client</>
                  )}
                </motion.button>

                <button
                  onClick={refresh}
                  className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-white border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5" />
                  Generate Another Link
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleGenerate} className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Server Name (Prefix)</label>
                  <div className="flex items-center gap-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl px-5 py-4 focus-within:border-amber-500/50 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all">
                    <input
                      type="text"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      placeholder="e.g. Velocira Cheats"
                      className="bg-transparent border-0 outline-0 text-white placeholder-slate-600 text-sm w-full font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Duration</label>
                  <div className="flex gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDays(preset)}
                        className="flex-1 py-3 px-2 rounded-xl text-xs font-black tracking-wide border transition-all cursor-pointer"
                        style={{
                          background: days === preset 
                            ? "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.1))" 
                            : "rgba(255,255,255,0.02)",
                          color: days === preset ? "#fbbf24" : "rgba(255,255,255,0.5)",
                          borderColor: days === preset ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)",
                        }}
                      >
                        {preset} Day{preset > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 font-bold">
                    <XCircle className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full h-14 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                    boxShadow: "0 0 20px rgba(245,158,11,0.3)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 translate-x-[-150%] animate-[shimmer_2s_infinite]" />
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Gift className="w-5 h-5" />Generate Free Trial Link</>}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Generated Tokens List */}
      <div className="panel rounded-[2rem] overflow-hidden argus-glass text-left border border-white/5">
        <div className="px-6 py-5 border-b border-white/[0.04] bg-black/20">
          <h2 className="font-black text-base text-white tracking-wide flex items-center justify-between">
            <span>Generated Trial Links</span>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-lg text-slate-300">{tokens.length} Links</span>
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {loadingTokens ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-bold uppercase tracking-widest">No trial links generated yet</div>
          ) : (
            <div className="space-y-3">
              {tokens.map((t) => (
                <div key={t.token} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono font-bold text-sm text-amber-400 truncate">{t.token}</span>
                      {t.used ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-[9px] font-black text-red-400 uppercase tracking-widest">Used</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>{t.days} Day{t.days > 1 ? "s" : ""}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => {
                        const url = `${window.location.origin}/free-portal?token=${t.token}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Link Copied", description: "Trial activation link copied to clipboard." });
                      }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors" title="Copy Link">
                      <Copy className="w-4 h-4" />
                    </button>
                    {tokenToDelete === t.token ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-red-400 font-bold uppercase">Confirm?</span>
                        <button onClick={() => { setTokenToDelete(null); executeDelete(t.token); }} className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors">Yes</button>
                        <button onClick={() => setTokenToDelete(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setTokenToDelete(t.token)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors" title="Revoke & Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeveloperApiPanel({ apiKey }: { apiKey?: string }) {
  const [copied, setCopied] = useState(false);
  
  const copyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Terminal className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Developer API</h1>
          <p className="text-sm text-emerald-400 font-medium">Automate your workflows programmatically</p>
        </div>
      </div>
      
      <div className="panel rounded-3xl overflow-hidden bg-black/30 backdrop-blur-xl border border-white/5 p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-400" /> Your API Key
        </h2>
        <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-xl p-4">
          <code className="text-emerald-300 font-mono text-sm tracking-wider flex-1 break-all">
            {apiKey || "API Key not generated yet. Please contact admin."}
          </code>
          {apiKey && (
            <button onClick={copyKey} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Keep this key secret. Do not share it or commit it to your source code.
        </p>
      </div>

      <div className="panel rounded-3xl overflow-hidden bg-black/30 backdrop-blur-xl border border-white/5 p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <Code2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold">API Documentation</h2>
        </div>
        
                <div className="space-y-4">
          <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-emerald-400">Add UID</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">POST</span>
            </div>
            <p className="text-sm text-slate-400">Endpoint: <span className="text-cyan-400 font-mono">/api/uid/add</span></p>
            
            <div className="bg-black/60 rounded-lg p-4 font-mono text-[11px] sm:text-xs text-slate-300 overflow-x-auto whitespace-pre border border-white/5">
{`curl -X POST https://uid-api-server.onrender.com/api/uid/add \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "uid": "123456789",
    "days": 30
  }'`}
            </div>
            
            <div className="mt-4 bg-black/60 rounded-lg p-4 font-mono text-[11px] sm:text-xs text-slate-300 whitespace-pre border border-white/5">
{`// Success Response
{
  "success": true,
  "message": "UID whitelisted successfully for 30 days"
}`}
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-red-400">Remove UID</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/30">POST</span>
            </div>
            <p className="text-sm text-slate-400">Endpoint: <span className="text-cyan-400 font-mono">/api/uid/remove</span></p>
            
            <div className="bg-black/60 rounded-lg p-4 font-mono text-[11px] sm:text-xs text-slate-300 overflow-x-auto whitespace-pre border border-white/5">
{`curl -X POST https://uid-api-server.onrender.com/api/uid/remove \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "uid": "123456789"
  }'`}
            </div>
            
            <div className="mt-4 bg-black/60 rounded-lg p-4 font-mono text-[11px] sm:text-xs text-slate-300 whitespace-pre border border-white/5">
{`// Success Response
{
  "success": true,
  "message": "UID removed successfully"
}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserProfilePanel({ 
  username, 
  isTrial, 
  balance,
  displayName,
  avatarBase64,
  onUpdate
}: { 
  username: string, 
  isTrial: boolean, 
  balance: number | null,
  displayName: string,
  avatarBase64: string,
  onUpdate: (name: string, avatar: string) => void
}) {
  const { toast } = useToast();
  const [tempName, setTempName] = useState(displayName);
  const [tempAvatar, setTempAvatar] = useState(avatarBase64);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingKey, setUpdatingKey] = useState(false);

  useEffect(() => {
    setTempName(displayName);
    setTempAvatar(avatarBase64);
  }, [displayName, avatarBase64]);

  const handleSaveIdentity = async () => {
    setSavingIdentity(true);
    try {
      try {
        localStorage.setItem(`display_name_${username}`, tempName);
        localStorage.setItem(`avatar_${username}`, tempAvatar);
      } catch (e) {
        console.warn("Local storage quota exceeded or unavailable:", e);
      }
      await onUpdate(tempName, tempAvatar);
      toast({ title: "Profile Saved", description: "Identity settings updated successfully." });
    } catch {
      toast({ title: "Failed", description: "Could not update profile.", variant: "destructive" });
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleUpdateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast({ title: "Required Fields", description: "Please enter both current and new passwords.", variant: "destructive" });
      return;
    }
    setUpdatingKey(true);
    try {
      const res = await apiFetch(`${BASE}/api/auth/update-key`, {
        method: "POST",
        body: JSON.stringify({ username, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Key Updated", description: "Security password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        toast({ title: "Verification Failed", description: data.error || "Could not change key.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Could not contact security servers.", variant: "destructive" });
    } finally {
      setUpdatingKey(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > 128) {
              height = Math.round((height * 128) / width);
              width = 128;
            }
          } else {
            if (height > 128) {
              width = Math.round((width * 128) / height);
              height = 128;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          setTempAvatar(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* Page Title */}
      <div className="mb-8 text-left">
        <div className="flex items-center gap-3">
          <User className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Account Profile</h1>
        </div>
        <p className="text-slate-400 font-semibold text-sm mt-2">Personalize your identity for the team chat and dashboard.</p>
      </div>

      {/* Identity Settings Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="argus-glass rounded-[2rem] p-8 sm:p-10 relative overflow-hidden shadow-2xl border border-white/5 text-left"
      >
        {/* Card Header */}
        <div className="flex items-center gap-3.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="font-black text-base text-white tracking-wide">Identity Settings</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mt-0.5">HOW OTHERS SEE YOU IN CHAT</p>
          </div>
        </div>

        {/* Identity Form (Layout matches screenshot) */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          {/* Circular DP preview on left */}
          <div className="relative shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-full bg-black/40 border-2 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden flex items-center justify-center relative hover:border-cyan-500/50 group/preview transition-all">
              {tempAvatar ? (
                <img src={tempAvatar} alt="DP Preview" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-16 h-16 text-slate-600" />
              )}
              {/* Camera Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          {/* Form Fields on right */}
          <div className="flex-grow w-full space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">DISPLAY NAME</label>
              <input 
                type="text" 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all text-sm"
                placeholder="Enter display name..."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">AVATAR URL</label>
              <input 
                type="text" 
                value={tempAvatar} 
                onChange={(e) => setTempAvatar(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all text-sm"
                placeholder="https://image-link.com/photo.jpg or Base64..."
              />
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Use a direct link to an image file.</p>
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="mt-8 pt-4 border-t border-white/5">
          <button 
            onClick={handleSaveIdentity}
            disabled={savingIdentity}
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {savingIdentity ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </motion.div>

      {/* Security Key Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="argus-glass rounded-[2rem] p-8 sm:p-10 relative overflow-hidden shadow-2xl border border-white/5 text-left"
      >
        {/* Card Header */}
        <div className="flex items-center gap-3.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="font-black text-base text-white tracking-wide">Security Key</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mt-0.5">UPDATE YOUR ACCESS CREDENTIALS</p>
          </div>
        </div>

        {/* Security Form */}
        <form onSubmit={handleUpdateKey} className="space-y-5 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">CURRENT PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:shadow-[0_0_15px_rgba(124,58,237,0.15)] transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">NEW PASSWORD</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:shadow-[0_0_15px_rgba(124,58,237,0.15)] transition-all text-sm"
                placeholder="Enter new password"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={updatingKey || !currentPassword || !newPassword}
              className="w-full h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {updatingKey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 text-slate-400" />
              )}
              Update Key
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

interface LeaderboardEntry {
  username: string;
  displayName: string;
  avatar: string;
  total: number;
  today: number;
  active: number;
  expired: number;
  role: string;
}

function LeaderboardView() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiFetch(`${BASE}/api/uid/leaderboard`);
      const json = await res.json();
      if (json.success) {
        setData(json.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-60">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Leaderboard...</p>
      </div>
    );
  }

  // Split into Top 3 and Rest
  const top1 = data[0];
  const top2 = data[1];
  const top3 = data[2];
  return (
    <div className="space-y-10">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Leaderboard</h1>
            <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-[9px] font-black tracking-widest text-white mt-1">REAL-TIME RANKINGS</span>
          </div>
          <p className="text-slate-400 font-semibold text-sm mt-2">Ranked by UIDs added on the global authorization mesh</p>
        </div>
        
        <button 
          onClick={() => fetchLeaderboard(true)}
          disabled={refreshing}
          className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
        </button>
      </div>

      {/* Podium for Top 3 */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10">
          
          {/* Rank 2 */}
          {top2 ? (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              className="md:order-1"
            >
              <TiltWrapper>
                <div className="argus-glass rounded-[2rem] p-6 text-center border border-white/5 relative overflow-hidden shadow-xl md:h-[280px] flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-200" />
                  <div className="flex justify-center -mt-12 relative">
                    <div className="w-20 h-20 rounded-full bg-slate-800/80 border-4 border-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.3)] overflow-hidden flex items-center justify-center relative">
                      {top2.avatar ? (
                        <img src={top2.avatar} alt="Rank 2" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-12 h-12 text-slate-400" />
                      )}
                      <div className="absolute -bottom-2 right-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-slate-400 text-black text-xs font-black flex items-center justify-center shadow-lg border-2 border-slate-800">
                        2
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="font-black text-white text-lg tracking-wide truncate max-w-full">{top2.displayName}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      @{top2.username} <span className="opacity-40">·</span> <span className={top2.role === "admin" ? "text-red-400" : "text-violet-400"}>{top2.role === "admin" ? "Admin" : "Operator"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 py-2.5 px-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-bold text-slate-400">
                    <div>
                      <div className="text-emerald-400 font-extrabold">{top2.today}</div>
                      <div>TODAY</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 font-extrabold">{top2.active}</div>
                      <div>ACTIVE</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-extrabold">{top2.expired}</div>
                      <div>EXPIRED</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TOTAL UIDs</span>
                    <span className="text-xl font-black text-slate-200 tracking-tight">{top2.total}</span>
                  </div>
                </div>
              </TiltWrapper>
            </motion.div>
          ) : (
            <div className="md:order-1 hidden md:block" />
          )}

          {/* Rank 1 */}
          {top1 && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }}
              className="md:order-2 z-10"
            >
              <TiltWrapper>
                <div className="argus-glass rounded-[2rem] p-8 text-center border border-yellow-500/30 relative overflow-hidden shadow-2xl md:h-[320px] flex flex-col justify-between" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.05), rgba(124,58,237,0.05))" }}>
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                  
                  <div className="flex justify-center -mt-16 relative">
                    <div className="w-24 h-24 rounded-full bg-slate-900/90 border-4 border-yellow-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] overflow-hidden flex items-center justify-center relative">
                      {top1.avatar ? (
                        <img src={top1.avatar} alt="Rank 1" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-14 h-14 text-yellow-500" />
                      )}
                      
                      {/* Crown */}
                      <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full animate-bounce" />

                      <div className="absolute -bottom-2 right-1/2 translate-x-1/2 w-7 h-7 rounded-full bg-yellow-500 text-black text-sm font-black flex items-center justify-center shadow-lg border-2 border-yellow-800">
                        1
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <h3 className="font-black text-white text-xl tracking-wide truncate max-w-full">{top1.displayName}</h3>
                      <Trophy className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)] shrink-0" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      @{top1.username} <span className="opacity-40">·</span> <span className={top1.role === "admin" ? "text-red-400 font-extrabold" : "text-violet-400 font-extrabold"}>{top1.role === "admin" ? "Admin" : "Operator"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 py-2.5 px-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-bold text-slate-400">
                    <div>
                      <div className="text-emerald-400 font-extrabold">{top1.today}</div>
                      <div>TODAY</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 font-extrabold">{top1.active}</div>
                      <div>ACTIVE</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-extrabold">{top1.expired}</div>
                      <div>EXPIRED</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL UIDs</span>
                    <span className="text-2xl font-black text-yellow-400 tracking-tight drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">{top1.total}</span>
                  </div>
                </div>
              </TiltWrapper>
            </motion.div>
          )}

          {/* Rank 3 */}
          {top3 ? (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:order-3"
            >
              <TiltWrapper>
                <div className="argus-glass rounded-[2rem] p-6 text-center border border-white/5 relative overflow-hidden shadow-xl md:h-[280px] flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-400" />
                  <div className="flex justify-center -mt-12 relative">
                    <div className="w-20 h-20 rounded-full bg-slate-800/80 border-4 border-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.3)] overflow-hidden flex items-center justify-center relative">
                      {top3.avatar ? (
                        <img src={top3.avatar} alt="Rank 3" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-12 h-12 text-amber-600" />
                      )}
                      <div className="absolute -bottom-2 right-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-amber-600 text-black text-xs font-black flex items-center justify-center shadow-lg border-2 border-amber-950">
                        3
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-black text-white text-lg tracking-wide truncate max-w-full">{top3.displayName}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      @{top3.username} <span className="opacity-40">·</span> <span className={top3.role === "admin" ? "text-red-400" : "text-violet-400"}>{top3.role === "admin" ? "Admin" : "Operator"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 py-2.5 px-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-bold text-slate-400">
                    <div>
                      <div className="text-emerald-400 font-extrabold">{top3.today}</div>
                      <div>TODAY</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 font-extrabold">{top3.active}</div>
                      <div>ACTIVE</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-extrabold">{top3.expired}</div>
                      <div>EXPIRED</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TOTAL UIDs</span>
                    <span className="text-xl font-black text-slate-200 tracking-tight">{top3.total}</span>
                  </div>
                </div>
              </TiltWrapper>
            </motion.div>
          ) : (
            <div className="md:order-3 hidden md:block" />
          )}

        </div>
      )}

      {/* Leaderboard Table / Rest of the List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="argus-glass rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/5"
      >
        <div className="flex items-center gap-3 px-6 sm:px-8 py-6 border-b border-white/[0.05] bg-black/20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.2)] border border-cyan-500/20" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(124,58,237,0.05))" }}>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-black text-lg text-white tracking-wide">Rankings</h2>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Performance of all distributor nodes</div>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center opacity-60">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-300 font-bold mb-2">No Leaderboard Data</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Operators will appear here as they register UIDs</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Operator</div>
              <div className="col-span-2 text-center text-emerald-500">Today</div>
              <div className="col-span-2 text-center text-cyan-400">Active</div>
              <div className="col-span-2 text-center text-red-400">Expired</div>
              <div className="col-span-1 text-right text-slate-300">Total</div>
            </div>

            <AnimatePresence>
              {data.map((user, idx) => (
                <motion.div
                  key={user.username}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 items-center gap-4 transition-all hover:bg-white/[0.03] hover:border-white/20 overflow-hidden"
                >
                  {/* Rank Badge */}
                  <div className="col-span-1 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center border shadow-inner ${
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                      idx === 1 ? "bg-slate-400/20 text-slate-300 border-slate-400/30" :
                      idx === 2 ? "bg-amber-600/20 text-amber-500 border-amber-600/30" :
                      "bg-black/50 text-slate-400 border-white/5"
                    }`}>
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Profile info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-sm text-white tracking-wide">{user.displayName}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        @{user.username} <span className="opacity-40">·</span> <span className={user.role === "admin" ? "text-red-400 font-extrabold" : "text-violet-400 font-extrabold"}>{user.role === "admin" ? "Admin" : "Operator"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid for Mobile / Columns for Desktop */}
                  <div className="col-span-1 sm:col-span-7 grid grid-cols-2 sm:contents gap-x-4 gap-y-1 mt-3 sm:mt-0">
                    {/* Today Count */}
                    <div className="col-span-1 sm:col-span-2 text-left sm:text-center flex sm:block justify-between items-center sm:border-0 border-b border-white/5 py-1.5 sm:py-0">
                      <span className="sm:hidden text-[9px] font-black uppercase text-slate-500 tracking-wider">Today</span>
                    <span className="text-emerald-400 font-extrabold text-sm sm:bg-emerald-500/10 sm:border sm:border-emerald-500/20 px-2.5 py-1 rounded-lg">{user.today}</span>
                  </div>

                    {/* Active Count */}
                    <div className="col-span-1 sm:col-span-2 text-left sm:text-center flex sm:block justify-between items-center sm:border-0 border-b border-white/5 py-1.5 sm:py-0">
                      <span className="sm:hidden text-[9px] font-black uppercase text-slate-500 tracking-wider">Active</span>
                    <span className="text-cyan-400 font-extrabold text-sm sm:bg-cyan-500/10 sm:border sm:border-cyan-500/20 px-2.5 py-1 rounded-lg">{user.active}</span>
                  </div>

                    {/* Expired Count */}
                    <div className="col-span-1 sm:col-span-2 text-left sm:text-center flex sm:block justify-between items-center sm:border-0 border-b border-white/5 py-1.5 sm:py-0">
                      <span className="sm:hidden text-[9px] font-black uppercase text-slate-500 tracking-wider">Expired</span>
                    <span className="text-red-400 font-extrabold text-sm sm:bg-red-500/10 sm:border sm:border-red-500/20 px-2.5 py-1 rounded-lg">{user.expired}</span>
                  </div>

                    {/* Total UIDs */}
                    <div className="col-span-1 sm:col-span-1 text-right flex sm:block justify-between items-center py-1.5 sm:py-0">
                      <span className="sm:hidden text-[9px] font-black uppercase text-slate-500 tracking-wider">Total</span>
                      <span className="text-white font-black text-base tracking-tight">{user.total}</span>
                    </div>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

interface ChatMessageData {
  _id?: string;
  username: string;
  displayName: string;
  avatar: string;
  message: string;
  createdAt: string;
}

function TeamChatView({ currentUsername }: { currentUsername: string }) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const fetchMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await apiFetch(`${BASE}/api/chat`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat messages:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      if (!document.hidden) fetchMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const payloadText = text.trim();
    setText("");
    setSending(true);

    try {
      const res = await apiFetch(`${BASE}/api/chat`, {
        method: "POST",
        body: JSON.stringify({ message: payloadText }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.some((m) => m._id === data.chat._id) ? prev : [...prev, data.chat]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-60">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Secure Channel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[75vh] argus-glass rounded-[2rem] overflow-hidden border border-white/5 relative">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05] bg-black/25">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.2)]">
            <MessageSquare className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-left">
            <h2 className="font-black text-base text-white tracking-wide">Team Cryptochat</h2>
            <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              Secured aes-256 node
            </div>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/30 border border-white/5 px-3 py-1 rounded-md">
          {messages.length} packets
        </div>
      </div>

      {/* Messages Stream */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <MessageSquare className="w-12 h-12 text-slate-500 mb-4" />
            <p className="text-slate-300 font-bold text-sm">No transmissions yet</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Start chatting with the team below</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.username === currentUsername;
            const isAdminMsg = msg.username === "admin" || msg.displayName === "ADMIN";
            
            return (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto text-left"}`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                  {msg.avatar ? (
                    <img src={msg.avatar} alt={msg.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className={`w-6 h-6 ${isAdminMsg ? "text-red-400" : "text-slate-500"}`} />
                  )}
                </div>

                {/* Msg Content */}
                <div>
                  {/* Sender Display Name */}
                  <div className={`text-[10px] font-black tracking-wide uppercase mb-1 ${isMe ? "text-right text-cyan-400" : isAdminMsg ? "text-red-400" : "text-violet-400"}`}>
                    {msg.displayName}
                    {isAdminMsg && <span className="ml-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-black border border-red-500/30 tracking-widest">ADMIN</span>}
                  </div>
                  
                  {/* Bubble */}
                  <div className={`p-4 rounded-2xl text-sm font-semibold leading-relaxed shadow-lg border ${
                    isMe 
                      ? "bg-cyan-500/10 border-cyan-500/30 text-white rounded-tr-none" 
                      : isAdminMsg
                        ? "bg-red-500/10 border-red-500/20 text-white rounded-tl-none"
                        : "bg-white/[0.03] border-white/10 text-slate-200 rounded-tl-none"
                  }`}>
                    {msg.message}
                  </div>

                  {/* Timestamp */}
                  <div className={`text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest ${isMe ? "text-right" : ""}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        {/* removed messagesEndRef */}
      </div>

      {/* Input Tray */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/[0.05] bg-black/25 flex items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Transmit encrypted message to team..."
          className="flex-1 h-12 px-5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 text-sm font-bold focus:outline-none focus:border-violet-500/50 focus:shadow-[0_0_15px_rgba(124,58,237,0.15)] transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="h-12 w-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-4.5 h-4.5" />
          )}
        </button>
      </form>
    </div>
  );
}

// Side Navigation Items
const getSidebarNav = (canResell: boolean, apiAccessEnabled: boolean) => [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analyze", label: "Analyze", icon: BarChart2 },
  { id: "create", label: "Create UID", icon: Plus },
  { id: "all", label: "All UIDs", icon: Users2 },
  { id: "delete", label: "Delete UID", icon: Trash2 },
  ...(canResell ? [{ id: "free", label: "Reseller Portal", icon: Globe }] : []),
  ...(apiAccessEnabled ? [{ id: "api", label: "Developer API", icon: Terminal }] : []),
  { id: "history", label: "Login History", icon: Clock },
  { id: "chat", label: "Team Chat", icon: MessageSquare },
  { id: "profile", label: "My Profile", icon: UserCircle },
];

function SidebarContent({ activeSidebarTab, setActiveSidebarTab, canResell, apiAccessEnabled, onLogout, onCloseMobile }: { activeSidebarTab: string, setActiveSidebarTab: (id: string) => void, canResell: boolean, apiAccessEnabled: boolean, onLogout: () => void, onCloseMobile?: () => void }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        {getSidebarNav(canResell, apiAccessEnabled).map((nav) => {
          const Icon = nav.icon;
          const active = activeSidebarTab === nav.id;
          if (nav.id === "free" && !canResell) return null;
          return (
            <button
              key={nav.id}
              onClick={() => { setActiveSidebarTab(nav.id); onCloseMobile?.(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-sm font-semibold
                ${active 
                  ? "bg-white/[0.05] border border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)] relative" 
                  : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"}
              `}
            >
              <Icon className={`w-4.5 h-4.5 ${active ? "text-cyan-400" : "text-slate-500"}`} />
              <span>{nav.label}</span>
              {active && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />}
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-semibold text-sm"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}

export default function Dashboard({ username, defaultDays = 30, isTrial = false, canResell = false, onLogout }: DashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSidebarTab, setActiveSidebarTab] = useState("dashboard");
  const [uidSearchQuery, setUidSearchQuery] = useState("");
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [showSuccessBlast, setShowSuccessBlast] = useState(false);
  const [profileData, setProfileData] = useState({ displayName: username || "Guest", avatarBase64: "", apiAccessEnabled: false, apiKey: "", uidLimit: -1 });
  const [activeNotice, setActiveNotice] = useState("");
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    apiFetch(`${BASE}/api/settings/notice`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.noticeText) {
          setActiveNotice(d.noticeText);
          const dismissed = localStorage.getItem("dismissedNotice");
          if (dismissed !== d.noticeText) {
            setShowAnnouncement(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (username) {
      // 1. Initial load from local storage (fast fallback)
      setProfileData({
        displayName: localStorage.getItem(`display_name_${username}`) || username,
        avatarBase64: localStorage.getItem(`avatar_${username}`) || "",
        apiAccessEnabled: localStorage.getItem(`apiAccess_${username}`) === "true",
        apiKey: localStorage.getItem(`apiKey_${username}`) || "",
        uidLimit: parseInt(localStorage.getItem(`uidLimit_${username}`) || "-1", 10)
      });

      // 2. Fetch fresh details from MongoDB database
      apiFetch(`${BASE}/api/auth/profile/${encodeURIComponent(username)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setProfileData({
              displayName: d.displayName,
              avatarBase64: d.avatar,
              apiAccessEnabled: d.apiAccessEnabled || false,
              apiKey: d.apiKey || "",
              uidLimit: d.uidLimit ?? -1
            });
            try {
              localStorage.setItem(`display_name_${username}`, d.displayName);
              if (d.apiAccessEnabled) localStorage.setItem(`apiAccess_${username}`, "true");
              if (d.apiKey) localStorage.setItem(`apiKey_${username}`, d.apiKey);
              localStorage.setItem(`avatar_${username}`, d.avatar);
              localStorage.setItem(`uidLimit_${username}`, (d.uidLimit ?? -1).toString());
            } catch (e) {
              console.warn("Local storage write failed (likely quota exceeded):", e);
            }
          }
        })
        .catch((err) => console.error("Error fetching user profile:", err));
    }
  }, [username]);

  useEffect(() => {
    if (isTrial || !username) return;
    apiFetch(`${BASE}/api/credits/me`)
      .then(r => r.json())
      .then(d => { if (d.success) setBalance(d.balance); })
      .catch(() => { });
  }, [username, isTrial]);

  const { data: listResponse, isLoading } = useListUids({
    query: { queryKey: getListUidsQueryKey() },
    request: { headers: userHeaders() },
  });

  const addMutation = useAddUid({
    request: { headers: userHeaders() },
  });
  const removeMutation = useRemoveUid({
    request: { headers: userHeaders() },
  });

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

  const handleUpdateProfile = (name: string, avatar: string) => {
    setProfileData(p => ({ ...p, displayName: name, avatarBase64: avatar }));
    apiFetch(`${BASE}/api/auth/profile`, {
      method: "POST",
      body: JSON.stringify({ username, displayName: name, avatar }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          console.error("Sync failed:", d.error);
        }
      })
      .catch((err) => console.error("Error syncing profile:", err));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uids: { uid: string; days: number; bluestack: boolean; addedBy: string; addedAt: string; name?: string }[] = listResponse?.success ? ((listResponse as any).uids ?? []) : [];
  const bsCount = uids.filter((u) => u.bluestack).length;

  const activeCount = uids.filter((u) => {
    const addedAt = new Date(u.addedAt).getTime();
    const expiresAt = addedAt + u.days * 24 * 60 * 60 * 1000;
    return expiresAt > Date.now();
  }).length;
  const expiredCount = uids.length - activeCount;
  const freeTrialCount = uids.filter((u) => u.name && u.name.startsWith("Trial-")).length;

  const DISCORD_URL = "https://discord.gg/QTwupjcKre";
  const TRIAL_USED_KEY = `trial_uid_used_${username}`;
  const [trialUsed, setTrialUsed] = useState(() => isTrial && sessionStorage.getItem(TRIAL_USED_KEY) === "true");
  const trialLimitReached = isTrial && trialUsed;

  const triggerTrialBlock = () => {
    
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
    
    // Check custom UID Limit
    if (profileData.uidLimit !== -1 && uids.length >= profileData.uidLimit) {
      toast({ title: "Account Limit Reached", description: "yours account limit reached messgae zytrone to buy", variant: "destructive" });
      return;
    }
    if (!isTrial && balance !== null && balance < tokenCost) {
      toast({ title: "Insufficient Tokens", description: `You need ${tokenCost} tokens but only have ${balance}.`, variant: "destructive" });
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
          if ((data as any).message === "TRIAL_IP_LIMIT_REACHED") {
            toast({ title: "IP Limit Reached", description: "This IP address has already whitelisted a free trial UID. Only 1 free trial is allowed per IP.", variant: "destructive" });
            return;
          }
          if ((data as any).message === "INSUFFICIENT_BALANCE") {
            toast({ title: "Insufficient Tokens", description: "Not enough tokens.", variant: "destructive" });
            return;
          }
          if (data.success) {
            if (isTrial) {
              sessionStorage.setItem(TRIAL_USED_KEY, "true");
              setTrialUsed(true);
            }
            if (!isTrial && balance !== null) setBalance(b => b !== null ? Math.max(0, b - tokenCost) : null);
            setShowSuccessBlast(true);
            toast({ title: "Access Granted", description: `UID ${values.uid} whitelisted successfully.` });
            form.reset();
            queryClient.invalidateQueries({ queryKey: getListUidsQueryKey() });
          } else {
            toast({ title: "Failed", description: (data as any).message, variant: "destructive" });
          }
        },
        onError: (error) => {
          let msg = "Could not reach server.";
          if (error && (error as any).data?.message) {
            msg = (error as any).data.message;
          }
          toast({ title: "Error", description: msg, variant: "destructive" });
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

  const renderUidTable = (showFull = false, highlightDelete = false) => {
    const filteredUids = uidSearchQuery.trim() === "" 
      ? uids 
      : uids.filter((u: any) => u.uid.toLowerCase().includes(uidSearchQuery.toLowerCase()) || (u.name && u.name.toLowerCase().includes(uidSearchQuery.toLowerCase())));
    const displayedUids = [...filteredUids].reverse();
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`neo-glass rounded-[2.5rem] overflow-hidden relative shadow-2xl ${showFull ? 'h-full' : ''}`}
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-white/[0.05] bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)] border border-cyan-500/30" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.1))" }}>
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-black text-lg text-white tracking-wide">{showFull ? "Global Endpoints" : "Recent UIDs"}</h2>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{showFull ? "All authorized connections" : "History of recently created UIDs"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {showFull && (
              <div className="w-64 relative hidden sm:block">
                <Input 
                  placeholder="Search UID or Name..." 
                  value={uidSearchQuery}
                  onChange={(e) => setUidSearchQuery(e.target.value)}
                  className="pl-4 pr-4 h-10 rounded-xl bg-black/40 border-white/10 text-white font-bold transition-all focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
                />
              </div>
            )}
            {!showFull && (
            <button
              onClick={() => setActiveSidebarTab("delete")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <span>View All Records</span>
              <span className="text-xs">↗</span>
            </button>
          )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 opacity-50">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing with Auth Mesh...</p>
          </div>
        ) : uids.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center opacity-60">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Monitor className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-300 font-bold mb-2">No Active UIDs</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Register an endpoint to begin routing</p>
          </div>
        ) : (
          <div className={`p-4 sm:p-6 overflow-y-auto custom-scrollbar ${showFull ? 'max-h-[70vh]' : 'max-h-[800px]'}`}>
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {displayedUids.map((uidObj) => (
                  <motion.div
                    key={uidObj.uid}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onHoverStart={() => setHoveredRow(uidObj.uid)}
                    onHoverEnd={() => setHoveredRow(null)}
                    className={`group flex items-center justify-between p-3.5 sm:p-4 bg-black/40 border ${highlightDelete ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/5'} rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm relative overflow-hidden ${uidObj.bluestack ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        <div className="absolute inset-0 bg-white/5 animate-pulse" />
                        {uidObj.bluestack ? <Monitor className="w-5 h-5 animate-pulse" /> : <Shield className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-base sm:text-lg font-bold text-white tracking-widest font-mono drop-shadow-sm">{uidObj.uid}</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[150px] sm:max-w-[200px]">
                          {uidObj.name || `NODE_${uidObj.uid.slice(0, 8)}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="hidden sm:block text-right">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">OPERATOR</div>
                        <div className="text-xs font-bold text-slate-300 uppercase truncate max-w-[120px]">{uidObj.addedBy || "UNKNOWN"}</div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">STATUS</div>
                        <div className={`text-xs font-black uppercase tracking-wider ${getDaysLeft(uidObj.addedAt, uidObj.days) === "Expired" ? 'text-red-400' : 'text-emerald-400'}`}>
                          {getDaysLeft(uidObj.addedAt, uidObj.days)}
                        </div>
                      </div>

                      <div className="pl-2 border-l border-white/5 flex items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemove(uidObj.uid); }}
                          disabled={removingUid === uidObj.uid}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            hoveredRow === uidObj.uid || highlightDelete 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white' 
                              : 'bg-transparent text-slate-600 border border-transparent'
                          }`}
                        >
                          {removingUid === uidObj.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderCreateUid = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto"
    >
      <TiltWrapper>
        <div className="neo-glass rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl glow-border">
          <SuccessAnimation active={showSuccessBlast} onComplete={() => setShowSuccessBlast(false)} />
          
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)] border border-violet-500/30" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,212,255,0.1))" }}>
              <Plus className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="font-black text-lg text-white tracking-wide">Register UID</h2>
          </div>
          <p className="text-xs font-semibold text-slate-400 mb-8 relative z-10">Add a new endpoint to the global authorization mesh.</p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Friendly Name</label>
              <div className="relative group">
                <Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
                <Input
                  placeholder="Enter your name"
                  className="pl-12 h-14 rounded-2xl bg-black/40 border-white/10 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 text-white font-bold transition-all shadow-inner"
                  {...form.register("name")}
                />
              </div>
              {form.formState.errors.name && (
                <p className="text-[10px] font-bold text-red-400 px-2 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Player UID</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
                <Input
                  placeholder="Enter UID number..."
                  className="pl-12 h-14 rounded-2xl bg-black/40 border-white/10 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 text-white font-bold transition-all shadow-inner"
                  {...form.register("uid")}
                />
              </div>
              {form.formState.errors.uid && (
                <p className="text-[10px] font-bold text-red-400 px-2 mt-1">{form.formState.errors.uid.message}</p>
              )}
            </div>

            <div className="space-y-2 relative z-50">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Duration</label>
                {isTrial ? (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: "rgba(255,0,110,0.15)", color: "#ff006e", border: "1px solid rgba(255,0,110,0.3)" }}>
                    1 DAY TRIAL
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: hasEnoughBalance ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: hasEnoughBalance ? "#10b981" : "#ef4444", border: `1px solid ${hasEnoughBalance ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                    <Coins className="w-3 h-3" />
                    {tokenCost} token{tokenCost !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {isTrial ? (
                <div className="flex items-center gap-3 h-14 px-5 rounded-2xl text-sm font-bold opacity-50 cursor-not-allowed bg-black/40 border border-white/10 shadow-inner">
                  <CalendarDays className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">24 Hours — Free Trial</span>
                </div>
              ) : (
                <CustomDurationSelect
                  value={form.watch("days")}
                  onChange={(val) => form.setValue("days", val)}
                  options={DURATION_OPTIONS}
                />
              )}
            </div>

            <div className="flex items-center justify-between p-5 rounded-2xl bg-black/30 border border-white/10 group hover:border-violet-500/30 hover:bg-black/50 transition-all shadow-inner">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-white">
                  <Monitor className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,212,255,0.5)]" />
                  BlueStack Protocol
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Emulator Routing</div>
              </div>
              <Switch
                checked={form.watch("bluestack")}
                onCheckedChange={(v) => form.setValue("bluestack", v)}
                className="data-[state=checked]:bg-cyan-500 data-[state=checked]:shadow-[0_0_15px_rgba(0,212,255,0.5)]"
              />
            </div>

            {!isTrial && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider backdrop-blur-md" style={{ background: hasEnoughBalance ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.1)", border: `1px solid ${hasEnoughBalance ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.3)"}` }}>
                <div className="flex items-center gap-2" style={{ color: hasEnoughBalance ? "#10b981" : "#ef4444" }}>
                  <Coins className="w-4 h-4" />
                  <span>Cost: {tokenCost} token{tokenCost !== 1 ? "s" : ""}</span>
                </div>
                {balance !== null && (
                  <span style={{ color: hasEnoughBalance ? "#94a3b8" : "#ef4444" }}>
                    {hasEnoughBalance ? `${balance} in vault` : `Need ${tokenCost} (Have ${balance})`}
                  </span>
                )}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={addMutation.isPending || !hasEnoughBalance}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="argus-btn w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              <AnimatePresence mode="wait">
                {addMutation.isPending ? (
                  <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transmitting...
                  </motion.span>
                ) : (
                  <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Authorize Endpoint
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>
        </div>
      </TiltWrapper>
    </motion.div>
  );

  return (
    <div className="flex h-[100dvh] bg-transparent text-white font-sans overflow-hidden relative">
      
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — hidden on mobile, slide-in on mobile when open */}
      <AnimatePresence>
        {(mobileSidebarOpen) && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-black/40 backdrop-blur-xl border-r border-white/5 flex flex-col z-[70] shadow-[10px_0_30px_rgba(0,0,0,0.8)] lg:hidden"
          >
        {/* Sidebar Logo Area */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,0,110,0.4)]" style={{ background: "linear-gradient(135deg, #ff006e, #7c3aed)" }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-[11px] uppercase tracking-[0.1em] text-white">UID BYPASS PANEL</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SM</div>
            </div>
          </div>
          <button onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <SidebarContent 
          activeSidebarTab={activeSidebarTab} 
          setActiveSidebarTab={(t) => { setActiveSidebarTab(t); setMobileSidebarOpen(false); }} 
          canResell={canResell} 
          apiAccessEnabled={profileData.apiAccessEnabled} 
          onLogout={handleLogout} 
          onCloseMobile={() => setMobileSidebarOpen(false)} 
        />
      </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar — visible only on lg+ screens */}
      <aside className="hidden lg:flex w-64 bg-black/20 backdrop-blur-xl border-r border-white/5 flex-col z-50 shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        {/* Sidebar Logo Area */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,0,110,0.4)]" style={{ background: "linear-gradient(135deg, #ff006e, #7c3aed)" }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-black text-[11px] uppercase tracking-[0.1em] text-white">UID BYPASS PANEL</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SM</div>
          </div>
        </div>

        <SidebarContent 
          activeSidebarTab={activeSidebarTab} 
          setActiveSidebarTab={setActiveSidebarTab} 
          canResell={canResell} 
          apiAccessEnabled={profileData.apiAccessEnabled} 
          onLogout={handleLogout} 
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden h-full min-w-0">
        {/* Background Effects for Main Content */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Removed static background to allow 3D water wave to show */}
        </div>

        {/* Main Content Header */}
        <header className="h-16 lg:h-20 shrink-0 border-b border-white/5 px-4 lg:px-8 flex items-center justify-between relative z-20 neo-glass-panel rounded-b-3xl mx-2 lg:mx-4 mt-2 mb-4">
          <div className="flex items-center gap-3">
            {/* Hamburger button — only on mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-white transition-all shadow-md active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              <span className="hidden sm:block">USER TERMINAL</span>
              <span className="text-slate-600 hidden sm:block">/</span>
              <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] uppercase">
                {getSidebarNav(canResell, profileData.apiAccessEnabled).find(n => n.id === activeSidebarTab)?.label || "DASHBOARD"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {username && (
              <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10 bg-white/[0.03] text-xs text-slate-300 font-bold shadow-inner">
                {profileData.avatarBase64 ? (
                  <img src={profileData.avatarBase64} alt="Avatar" className="w-5 h-5 rounded-full object-cover shadow-[0_0_10px_rgba(0,212,255,0.3)]" />
                ) : (
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span className="hidden sm:inline uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">{profileData.displayName}</span>
                {isTrial && (
                  <span className="hidden sm:inline-block ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest" style={{ background: "rgba(255,0,110,0.15)", color: "#ff006e", border: "1px solid rgba(255,0,110,0.3)" }}>
                    TRIAL
                  </span>
                )}
              </div>
            )}
            {!isTrial && balance !== null && (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.1)] border" style={{ background: balance > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: balance > 0 ? "#10b981" : "#ef4444", borderColor: balance > 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)" }}>
                <Coins className="w-3.5 h-3.5" />
                <span>{balance} tokens</span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-12 relative z-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 h-full">
            
            <AnimatePresence mode="wait">
              {activeSidebarTab === "dashboard" && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                  {/* Title */}
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Overview</h1>
                      <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-[9px] font-black tracking-widest text-white mt-1">v5.0-STABLE</span>
                    </div>
                    <p className="text-slate-400 font-semibold text-sm mt-2">Real-time status of all active UIDs</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <OverviewStatCard
                      icon={Activity}
                      label="Total UIDs"
                      value={isLoading ? "—" : uids.length}
                      delay={0}
                      sparklinePoints={[28, 25, 27, 22, 20, 18, 19, 15, 12, 10]}
                    />
                    <OverviewStatCard
                      icon={Zap}
                      label="Active UIDs"
                      value={isLoading ? "—" : activeCount}
                      delay={0.1}
                      sparklinePoints={[26, 24, 25, 21, 19, 17, 18, 14, 13, 11]}
                    />
                    <OverviewStatCard
                      icon={XCircle}
                      label="Expired"
                      value={isLoading ? "—" : expiredCount}
                      delay={0.2}
                      sparklinePoints={[25, 24, 25, 24, 25, 24, 25, 24, 25, 24]}
                    />
                    <OverviewStatCard
                      icon={Gift}
                      label="Free Trials"
                      value={isLoading ? "—" : freeTrialCount}
                      delay={0.3}
                      sparklinePoints={[10, 12, 14, 13, 16, 18, 20, 22, 24, 25]}
                    />
                  </div>

                  <div className="w-full">
                    {renderUidTable(false, false)}
                  </div>
                </motion.div>
              )}

              {activeSidebarTab === "create" && (
                <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {renderCreateUid()}
                </motion.div>
              )}

              {activeSidebarTab === "all" && (
                <motion.div key="all" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                  {renderUidTable(true, false)}
                </motion.div>
              )}

              {activeSidebarTab === "delete" && (
                <motion.div key="delete" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                  {renderUidTable(true, true)}
                </motion.div>
              )}

              {activeSidebarTab === "free" && canResell && (
                <motion.div key="free" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <ResellerTrialPanel username={username ?? ""} />
                </motion.div>
              )}

              {activeSidebarTab === "analyze" && (
                <motion.div key="analyze" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <LeaderboardView />
                </motion.div>
              )}

              {activeSidebarTab === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <TeamChatView currentUsername={username ?? ""} />
                </motion.div>
              )}

              {activeSidebarTab === "profile" && (
                <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <UserProfilePanel 
                    username={username ?? ""} 
                    isTrial={isTrial} 
                    balance={balance} 
                    displayName={profileData.displayName}
                    avatarBase64={profileData.avatarBase64}
                    onUpdate={handleUpdateProfile}
                  />
                </motion.div>
              )}

              {activeSidebarTab === "history" && (
                <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <LoginHistoryPanel />
                </motion.div>
              )}

              {activeSidebarTab === "api" && profileData.apiAccessEnabled && (
                <motion.div key="api" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <DeveloperApiPanel apiKey={profileData.apiKey} />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main>

      {/* Announcement Popup Modal */}
      <AnimatePresence>
        {showAnnouncement && activeNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-lg bg-black/40 backdrop-blur-xl border border-violet-500/30 rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(124,58,237,0.15)] relative text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent pointer-events-none" />
              
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                    <Medal className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-wide">System Announcement</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 mt-0.5">Important Update</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 mb-8">
                  <p className="text-sm font-semibold text-slate-300 leading-relaxed whitespace-pre-wrap">{activeNotice}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      localStorage.setItem("dismissedNotice", activeNotice);
                      setShowAnnouncement(false);
                    }}
                    className="h-12 px-8 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-2"
                  >
                    <CheckCheck className="w-4 h-4" />
                    I Agree
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Team Chat Button */}
      <button
        onClick={() => setActiveSidebarTab("chat")}
        className="fixed bottom-6 right-6 z-[100] group flex items-center justify-center w-14 h-14 rounded-full bg-black/50 border border-violet-500/50 shadow-[0_0_20px_rgba(124,58,237,0.3)] backdrop-blur-xl hover:bg-violet-600/40 hover:scale-110 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-95 transition-all duration-300"
      >
        <MessageSquare className="w-6 h-6 text-violet-300 group-hover:text-cyan-300 transition-colors" />
        <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] border-2 border-black/50"></span>
        </span>
      </button>

      {/* Add custom CSS for scrollbar if not in global css */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

function LoginHistoryPanel() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await apiFetch(`${BASE}/api/users/login-history`);
        const data = await res.json();
        if (data.success) {
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to fetch login history", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="neo-glass rounded-3xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.6)] glow-border">
      <div className="px-6 py-6 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <Clock className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-wider text-white uppercase">Login History</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Network Access Logs</p>
          </div>
        </div>
      </div>
      <div className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Clock className="w-12 h-12 mb-4 opacity-20" />
            <span className="text-sm font-bold uppercase tracking-widest">No Logs Found</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-black">User</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-black">Status</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-black">IP Address</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-black">Time</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-black">Device/Agent</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.05] transition-all group">
                    <td className="py-4 px-6 font-black text-sm text-white group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{record.username}</td>
                    <td className="py-4 px-6">
                      {record.success ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          SUCCESS
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                          </span>
                          FAILED
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-300 group-hover:text-white transition-colors">{record.ip}</td>
                    <td className="py-4 px-6 text-xs font-medium text-slate-400 group-hover:text-slate-300">{new Date(record.timestamp).toLocaleString()}</td>
                    <td className="py-4 px-6 text-[10px] text-slate-500 truncate max-w-[200px]" title={record.userAgent}>{record.userAgent || "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
