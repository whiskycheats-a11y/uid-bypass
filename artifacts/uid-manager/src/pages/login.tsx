import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  ArrowRight,
  Cpu,
  Eye,
  EyeOff,
  Fingerprint,
  Gauge,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Globe,
  Terminal,
  Coins,
  ArrowUpRight,
  HelpCircle,
  Check,
  X,
  Zap,
  Gift,
  Copy,
  RefreshCw,
  Timer,
} from "lucide-react";
import heroShield from "@assets/hero_3d_shield.png";

interface LoginProps {
  onLogin: (role: "admin" | "user", username: string) => void;
}

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

/* ─── Staggered Word Reveal Component ─── */
function WordReveal({
  text,
  className = "",
  delay = 0,
  once = true,
}: {
  text: string;
  className?: string;
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: "-80px" });
  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: 0.6,
            delay: delay + i * 0.08,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Animated Counter Component ─── */
function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 2,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

/* ─── Scroll-Reveal Wrapper ─── */
function ScrollReveal({
  children,
  delay = 0,
  y = 60,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const statusCards = [
  { icon: ShieldCheck, label: "Core Integrity", target: 99, suffix: ".98%", desc: "Cryptographic validation" },
  { icon: Gauge, label: "Sync Latency", target: 8, suffix: " ms", desc: "Global edge replication" },
  { icon: Cpu, label: "Active Nodes", target: 2840, suffix: "", desc: "Distributed proxy mesh" },
];

const features = [
  {
    icon: Shield,
    title: "Cryptographic Authorization",
    description: "Every whitelist entry is hashed via high-entropy key pairs, completely preventing database bypass vectors.",
    badge: "Active",
  },
  {
    icon: Globe,
    title: "Ultra-Low Latency Sync",
    description: "Changes push to all edge nodes globally in under 10ms, maintaining constant zero-lag protection.",
    badge: "10ms",
  },
  {
    icon: Terminal,
    title: "Developer API Console",
    description: "Integrate deep security hooks into your project with high-capacity WebSocket and REST interfaces.",
    badge: "API",
  },
  {
    icon: Coins,
    title: "Token-Gated Automation",
    description: "Create and manage license tokens with customized active days, reseller margins, and trial bounds.",
    badge: "Smart",
  },
];

const faqItems = [
  {
    question: "How does real-time sync safeguard connections?",
    answer: "Our system performs an automated 8ms edge audit on every connection. Updates push globally in real-time, locking out unauthorized UIDs in milliseconds.",
  },
  {
    question: "Is there dual-session sharing protection?",
    answer: "Our engine performs constant concurrency audits. If a token is detected concurrently on separate endpoints, it triggers an instant block.",
  },
  {
    question: "How do reseller trial periods function?",
    answer: "Resellers configure trial limits, assign token balances, customize active durations, and monitor earnings directly from their modular dashboard.",
  },
];

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showTrial, setShowTrial] = useState(false);
  const [trialToken, setTrialToken] = useState("");
  const [playerUid, setPlayerUid] = useState("");
  const [bluestack, setBluestack] = useState(true);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimDays, setClaimDays] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isYearly, setIsYearly] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [headerBlur, setHeaderBlur] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll-driven parallax
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const shieldY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const shieldScale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // Header blur
  useEffect(() => {
    const handler = () => setHeaderBlur(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Terminal feed
  useEffect(() => {
    if (showLogin) return;
    setTerminalLogs([
      "SYSTEM // Initializing secure kernel sync...",
      "SECURITY // Dynamic handshakes initialized.",
      "CLUSTERS // Listening for auth packets...",
      "DATABASE // Cryptographic store loaded.",
    ]);
    const interval = setInterval(() => {
      const uids = ["104829", "992810", "304829", "884021", "229104"];
      const locs = ["NODE_US_EAST", "NODE_EU_WEST", "NODE_AP_SOUTH"];
      const uid = uids[Math.floor(Math.random() * uids.length)];
      const loc = locs[Math.floor(Math.random() * locs.length)];
      const time = new Date().toLocaleTimeString();
      setTerminalLogs((prev) => [...prev.slice(-5), `[${time}] ${loc} // UID #${uid} validated (8ms)`]);
    }, 4500);
    return () => clearInterval(interval);
  }, [showLogin]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTilt({ x: dy * -8, y: dx * 8 });
  };
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let clientHwid = localStorage.getItem("sg71_hwid");
      if (!clientHwid) {
        clientHwid = typeof crypto !== "undefined" && crypto.randomUUID 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        localStorage.setItem("sg71_hwid", clientHwid);
      }

      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, hwid: clientHwid }),
      });
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error("Invalid server response.");
      }
      if (!res.ok) throw new Error(data?.message ?? data?.error ?? "Login failed.");
      if (data.success) {
        if (data.displayName) {
          localStorage.setItem(`display_name_${data.username}`, data.displayName);
        }
        if (data.avatar) {
          localStorage.setItem(`avatar_${data.username}`, data.avatar);
        }
        sessionStorage.setItem(
          "uid_auth",
          JSON.stringify({
            role: data.role,
            username: data.username,
            adminKey: password,
            defaultDays: data.defaultDays ?? 30,
            isTrial: data.isTrial ?? false,
            canResell: data.canResell ?? false,
          })
        );
        onLogin(data.role, data.username);
      } else {
        throw new Error(data.message ?? data.error ?? "Invalid credentials.");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Authorization failed.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleClaimTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialToken.trim()) {
      setError("Please enter a Trial Token.");
      return;
    }
    if (!playerUid.trim()) {
      setError("Please enter your Player UID.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/uid/free-whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trialToken.trim(), uid: playerUid.trim(), bluestack }),
      });
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error("Invalid server response.");
      }
      if (data.success) {
        setClaimSuccess(true);
        setClaimDays(data.days || 1);
      } else {
        if (data.message === "TRIAL_IP_LIMIT_REACHED") {
          throw new Error("IP Limit Reached! Your device/IP has already whitelisted a free trial. Only 1 free trial is allowed per IP.");
        } else if (data.message === "TOKEN_ALREADY_USED") {
          throw new Error("This trial token was already consumed.");
        } else if (data.message === "TOKEN_EXPIRED") {
          throw new Error("This trial token has expired.");
        } else if (data.message === "UID_ALREADY_WHITELISTED") {
          throw new Error("This UID is already active in the system.");
        } else if (data.message === "INVALID_TOKEN") {
          throw new Error("The trial token you entered is invalid.");
        } else {
          throw new Error(data.message || "Activation failed. Please contact your reseller.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to claim free trial.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={mainRef} className="min-h-screen relative flex flex-col font-sans overflow-x-hidden selection:bg-violet-500/30 selection:text-white">
      {/* ── Argus VPN Style Background ── */}
      <div className="argus-bg" />
      <div className="argus-mesh" />

      {/* ── Fixed Navigation ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          headerBlur ? "border-b border-white/[0.05] bg-[#030014]/60 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]" : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-24 w-full max-w-7xl items-center justify-between px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 shadow-[0_0_30px_rgba(124,58,237,0.3)] group-hover:shadow-[0_0_40px_rgba(0,212,255,0.4)] transition-all">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-black tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">UID BYPASS</p>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-400/80">ACCESS PROTOCOL</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center gap-6"
          >
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)] sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Network Live
            </div>
            <button
              onClick={() => { setError(""); setShowLogin(false); setTrialToken(""); setPlayerUid(""); setClaimSuccess(false); setUsername(""); setPassword(""); setShowTrial(!showTrial); }}
              className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] px-6 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-500/[0.1] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:border-amber-500/30 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
            >
              {showTrial ? "← Return" : "Free Trial"}
            </button>
            <button
              onClick={() => { setError(""); setShowTrial(false); setTrialToken(""); setPlayerUid(""); setClaimSuccess(false); setUsername(""); setPassword(""); setShowLogin(!showLogin); }}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-white/[0.1] hover:shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:border-violet-500/30 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
            >
              {showLogin ? "← Return" : "Portal"}
            </button>
          </motion.div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-grow pt-24 z-10 relative">
        <AnimatePresence mode="wait">
          {!showLogin && !showTrial ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              {/* ═══════ HERO ═══════ */}
              <section ref={heroRef} className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 py-24 sm:py-32 flex flex-col items-center justify-center min-h-[85vh] text-center">
                <motion.div style={{ y: heroTextY, opacity: heroOpacity }} className="w-full max-w-4xl space-y-8 z-20 flex flex-col items-center">
                  
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.7, delay: 0.2 }}
                      className="inline-flex items-center gap-2.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-violet-300 shadow-[0_0_30px_rgba(124,58,237,0.15)] backdrop-blur-md"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                      UID BYPASS V5-STABLE
                    </motion.div>
                  </div>

                  <h1 className="text-4xl sm:text-[4.5rem] font-black tracking-tight text-white leading-[1.1] drop-shadow-2xl text-center">
                    <span className="argus-text-gradient block mb-2">
                      <WordReveal text="UID BYPASS" delay={0.3} />
                    </span>
                    <WordReveal text="100% SAFE ALL SERVER" delay={0.65} />
                  </h1>

                  <motion.p
                    initial={{ opacity: 0, y: 25, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, delay: 1.1 }}
                    className="text-slate-300/80 text-base sm:text-lg max-w-2xl leading-relaxed font-medium mx-auto text-center"
                  >
                    Deploy unbreakable hardware-level authorization, manage global request routing, and issue reseller tokens from a unified command center.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.35 }}
                    className="flex flex-wrap items-center justify-center gap-4 pt-4"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setError(""); setShowLogin(false); setTrialToken(""); setPlayerUid(""); setClaimSuccess(false); setUsername(""); setPassword(""); setShowTrial(true); }}
                      className="argus-btn flex items-center gap-2 rounded-2xl text-white font-black text-[11px] tracking-[0.2em] uppercase px-8 py-4.5 cursor-pointer"
                    >
                      Claim Free Trial <ArrowRight className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] text-white font-black text-[11px] tracking-[0.2em] uppercase px-8 py-4.5 cursor-pointer backdrop-blur-md transition-all shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
                    >
                      View Protocols
                    </motion.button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.2, duration: 1 }}
                    className="pt-12 flex items-center justify-center gap-3"
                  >
                    <div className="w-5 h-8 rounded-full border border-violet-500/30 bg-violet-500/5 relative overflow-hidden shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                      <motion.div
                        animate={{ y: [0, 12, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="w-1.5 h-2.5 bg-cyan-400 rounded-full absolute left-1/2 -translate-x-1/2 top-1.5 shadow-[0_0_10px_#00d4ff]"
                      />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500/80">Scroll Sequence</span>
                  </motion.div>
                </motion.div>
              </section>

              {/* ═══════ LIVE STATS ═══════ */}
              <section className="w-full border-y border-white/[0.05] py-16 bg-[#030014]/60 backdrop-blur-xl relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-900/5 to-transparent pointer-events-none" />
                <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 grid sm:grid-cols-3 gap-6">
                  {statusCards.map((card, idx) => (
                    <ScrollReveal key={card.label} delay={idx * 0.12} y={40}>
                      <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        transition={{ duration: 0.4 }}
                        className="argus-glass p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] flex flex-col justify-between min-h-[140px] relative overflow-hidden group cursor-default"
                      >
                        {/* Scanline Effect */}
                        <div className="scanline" />
                        
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-400/[0.05] rounded-full blur-[30px] group-hover:bg-cyan-400/[0.1] transition-all duration-700" />
                        
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.1)] group-hover:shadow-[0_0_25px_rgba(0,212,255,0.25)] group-hover:border-cyan-500/30 transition-all">
                            <card.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400/80 uppercase tracking-[0.25em]">{card.label}</p>
                            <p className="text-[11px] font-bold text-slate-500">{card.desc}</p>
                          </div>
                        </div>
                        <div className="mt-6 flex items-baseline justify-between relative z-10">
                          <span className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                            <AnimatedCounter target={card.target} suffix={card.suffix} />
                          </span>
                          <span className="text-[9px] font-black tracking-[0.2em] text-emerald-400 flex items-center gap-1.5 uppercase bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                            Operational
                          </span>
                        </div>
                      </motion.div>
                    </ScrollReveal>
                  ))}
                </div>
              </section>

              {/* ═══════ FEATURES ═══════ */}
              <section className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-28 sm:py-36 space-y-20 relative">
                <div className="text-center max-w-2xl mx-auto space-y-6">
                  <ScrollReveal y={30}>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-400 drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]">Advanced Protocol</h2>
                  </ScrollReveal>
                  <ScrollReveal y={30} delay={0.1}>
                    <p className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                      <WordReveal text="Military-grade encryption for global distribution." />
                    </p>
                  </ScrollReveal>
                  <ScrollReveal y={20} delay={0.2}>
                    <div className="h-[2px] w-16 bg-gradient-to-r from-cyan-400 to-violet-500 mx-auto rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                  </ScrollReveal>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {features.map((feature, idx) => (
                    <ScrollReveal key={feature.title} delay={idx * 0.1} y={50}>
                      <motion.div
                        whileHover={{ y: -8, scale: 1.01 }}
                        transition={{ duration: 0.4 }}
                        className="argus-glass p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] flex flex-col justify-between group h-full cursor-default"
                      >
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="relative">
                              <div className="absolute inset-0 bg-cyan-400/20 blur-[20px] rounded-full group-hover:bg-cyan-400/40 transition-all duration-500" />
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-cyan-400 shadow-[0_8px_32px_rgba(0,212,255,0.1)] group-hover:border-cyan-500/30 transition-all"
                              >
                                <feature.icon className="h-6 w-6" />
                              </motion.div>
                            </div>
                            <span className="text-[9px] font-black tracking-[0.2em] text-slate-400/90 uppercase px-3 py-1 rounded-full border border-white/5 bg-white/[0.02]">
                              {feature.badge}
                            </span>
                          </div>
                          <h3 className="text-xl font-black text-white tracking-tight">{feature.title}</h3>
                          <p className="text-sm leading-relaxed text-slate-400 font-medium">{feature.description}</p>
                        </div>
                        <div className="pt-8 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-violet-400 group-hover:text-cyan-400 transition-colors">
                          Technical Docs <ArrowUpRight className="h-4 w-4" />
                        </div>
                      </motion.div>
                    </ScrollReveal>
                  ))}
                </div>
              </section>

              {/* ═══════ LIVE CONSOLE ═══════ */}
              <section className="w-full max-w-5xl mx-auto px-6 sm:px-10 py-10 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[800px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
                <ScrollReveal y={40}>
                  <div className="argus-glass-panel rounded-3xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-violet-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-50" />
                    <div className="absolute top-0 right-0 p-5 flex gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black text-cyan-400 tracking-[0.3em] uppercase mb-6">
                      <Terminal className="h-4 w-4" /> Root Access Stream
                    </div>
                    <div className="font-mono text-[13px] text-slate-400 space-y-2.5 max-h-[180px] overflow-y-auto pr-4 scrollbar-none leading-relaxed">
                      {terminalLogs.map((log, i) => (
                         <motion.div
                         key={i}
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ duration: 0.3 }}
                         className={log.includes("validated") ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" : log.includes("SECURITY") ? "text-violet-400" : "text-slate-500"}
                       >
                         {log}
                       </motion.div>
                     ))}
                   </div>
                 </div>
               </ScrollReveal>
             </section>

             {/* ═══════ PRICING ═══════ */}
             <section id="pricing" className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-28 sm:py-36 space-y-20 relative">
               <div className="text-center max-w-2xl mx-auto space-y-8 relative z-10">
                 <ScrollReveal y={25}>
                   <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-400">Licensing Model</h2>
                 </ScrollReveal>
                 <ScrollReveal y={25} delay={0.1}>
                   <p className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                     <WordReveal text="Procure global network access" />
                   </p>
                 </ScrollReveal>
                 <ScrollReveal y={20} delay={0.2}>
                   <div className="inline-flex items-center gap-2 argus-glass p-1.5 rounded-2xl relative shadow-2xl">
                     <button
                       onClick={() => setIsYearly(false)}
                       className={`px-6 py-2.5 text-[11px] font-black rounded-xl uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer ${!isYearly ? "bg-white/10 text-white shadow-[0_4px_15px_rgba(0,0,0,0.3)] border border-white/10" : "text-slate-400 hover:text-white bg-transparent border border-transparent"}`}
                     >
                       Monthly
                     </button>
                     <button
                       onClick={() => setIsYearly(true)}
                       className={`px-6 py-2.5 text-[11px] font-black rounded-xl uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 cursor-pointer ${isYearly ? "bg-white/10 text-white shadow-[0_4px_15px_rgba(0,0,0,0.3)] border border-white/10" : "text-slate-400 hover:text-white bg-transparent border border-transparent"}`}
                     >
                       Yearly <span className="bg-emerald-500/20 text-[9px] text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black shadow-[0_0_10px_rgba(16,185,129,0.2)]">-20%</span>
                     </button>
                   </div>
                 </ScrollReveal>
               </div>

               <div className="grid md:grid-cols-3 gap-8 items-stretch relative z-10">
                 {[
                   { name: "Starter Node", desc: "Single app development.", price: [15, 12], features: ["max 250 active UIDs", "standard sync (~150ms)", "basic Webhooks"], excluded: ["reseller panels"], btn: "Provision Basic", featured: false },
                   { name: "Professional", desc: "High-traffic distributions.", price: [39, 31], features: ["unlimited UIDs", "edge sync (<10ms)", "full Reseller Panel", "WebSocket hooks", "24/7 priority SLAs"], excluded: [], btn: "Provision Pro", featured: true },
                   { name: "Enterprise", desc: "Custom DB pipelines.", price: [99, 79], features: ["dedicated nodes", "white-label panels", "secure DB links", "100% latency SLA"], excluded: [], btn: "Request Build", featured: false },
                 ].map((plan, idx) => (
                   <ScrollReveal key={plan.name} delay={idx * 0.12} y={50}>
                     <motion.div
                       whileHover={{ y: -10 }}
                       transition={{ duration: 0.4 }}
                       className={`p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] flex flex-col justify-between h-full transition-all duration-300 relative overflow-hidden ${
                         plan.featured
                           ? "argus-glass border border-violet-500/40 shadow-[0_30px_60px_rgba(124,58,237,0.15)] bg-gradient-to-b from-violet-900/20 to-transparent"
                           : "argus-glass hover:border-white/20"
                       }`}
                     >
                       {plan.featured && (
                         <>
                           <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500" />
                           <div className="absolute top-6 right-6 bg-violet-500/10 border border-violet-500/30 text-[9px] font-black text-violet-300 uppercase tracking-[0.25em] px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.2)] animate-pulse">
                             RECOMMENDED
                           </div>
                         </>
                       )}
                       <div className={`space-y-8 ${plan.featured ? "mt-4" : ""}`}>
                         <div className="space-y-3 text-left">
                           <h3 className="text-[13px] font-black text-white uppercase tracking-[0.25em]">{plan.name}</h3>
                           <p className="text-xs text-slate-400 font-semibold">{plan.desc}</p>
                         </div>
                         <div className="flex items-baseline gap-1.5">
                           <motion.span
                             key={isYearly ? "y" : "m"}
                             initial={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                             animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                             transition={{ duration: 0.3 }}
                             className="text-5xl font-black text-white tracking-tighter"
                           >
                             ${isYearly ? plan.price[1] : plan.price[0]}
                           </motion.span>
                           <span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.1em]">/ mo</span>
                         </div>
                         <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
                         <ul className="space-y-4 text-xs text-slate-300 font-bold text-left">
                           {plan.features.map((f) => (
                             <li key={f} className="flex items-center gap-3">
                               <Check className={`h-4 w-4 flex-shrink-0 ${plan.featured ? "text-violet-400 drop-shadow-[0_0_5px_rgba(124,58,237,0.5)]" : "text-cyan-400"}`} /> {f}
                             </li>
                           ))}
                           {plan.excluded.map((f) => (
                             <li key={f} className="flex items-center gap-3 text-slate-600">
                               <X className="h-4 w-4 text-slate-700 flex-shrink-0" /> {f}
                             </li>
                           ))}
                         </ul>
                       </div>
                       <motion.button
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                         onClick={() => setShowLogin(true)}
                         className={`w-full py-4 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl mt-10 cursor-pointer transition-all ${
                           plan.featured
                             ? "argus-btn"
                             : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white"
                         }`}
                       >
                         {plan.btn}
                       </motion.button>
                     </motion.div>
                   </ScrollReveal>
                 ))}
               </div>
             </section>

             {/* ═══════ FAQ ═══════ */}
             <section className="w-full bg-[#030014]/80 backdrop-blur-2xl border-t border-white/[0.05] py-28 sm:py-36 relative">
               <div className="absolute inset-0 bg-gradient-to-t from-transparent via-cyan-900/5 to-transparent pointer-events-none" />
               <div className="w-full max-w-4xl mx-auto px-6 sm:px-10 space-y-16 relative z-10">
                 <div className="text-center space-y-6">
                   <ScrollReveal y={20}>
                     <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 drop-shadow-[0_0_10px_rgba(0,212,255,0.4)]">Support Database</h2>
                   </ScrollReveal>
                   <ScrollReveal y={20} delay={0.08}>
                     <p className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                       <WordReveal text="Frequently queried protocols" />
                     </p>
                   </ScrollReveal>
                   <ScrollReveal y={15} delay={0.15}>
                     <div className="h-[2px] w-12 bg-cyan-400 mx-auto rounded-full shadow-[0_0_10px_rgba(0,212,255,0.5)]" />
                   </ScrollReveal>
                 </div>
                 <div className="space-y-6">
                   {faqItems.map((item, i) => (
                     <ScrollReveal key={i} delay={i * 0.1} y={30}>
                       <div className="argus-glass p-5 sm:p-8 rounded-2xl sm:rounded-3xl text-left hover:border-cyan-500/30 transition-colors duration-300">
                         <h3 className="text-base font-bold text-white flex items-center gap-3">
                           <HelpCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]" />
                           {item.question}
                         </h3>
                         <p className="text-sm leading-relaxed text-slate-400 font-medium pl-8 mt-3">{item.answer}</p>
                       </div>
                     </ScrollReveal>
                   ))}
                 </div>
               </div>
             </section>
            </motion.div>
          ) : showTrial ? (
            /* ═══════ FREE CLAIM PORTAL ═══════ */
            <motion.div
              key="trial"
              initial={{ opacity: 0, y: 30, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 20 }}
              className="w-full max-w-[480px] mx-auto px-6 py-20 sm:py-32 relative z-20"
              style={{ perspective: "1200px" }}
            >
              <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="w-full">
                <motion.div
                  ref={cardRef}
                  animate={shake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
                  style={{ rotateX: tilt.x, rotateY: tilt.y, transformStyle: "preserve-3d", transition: shake ? undefined : "transform 0.3s ease-out" }}
                  transition={{ duration: 0.45 }}
                  className="argus-glass shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 opacity-60 pointer-events-none" />
                  
                  {claimSuccess ? (
                    <div className="space-y-6 text-center">
                      <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                          <Check className="w-10 h-10 text-emerald-400" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white tracking-tight">Access Granted!</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Player UID is now whitelisted</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5 text-left text-xs font-bold text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase tracking-widest text-[9px]">Player UID</span>
                          <span className="font-mono text-white text-sm">{playerUid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase tracking-widest text-[9px]">Duration</span>
                          <span className="text-amber-400 uppercase">{claimDays} Day{claimDays > 1 ? "s" : ""} Free Trial</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase tracking-widest text-[9px]">Status</span>
                          <span className="text-emerald-400 flex items-center gap-1.5 uppercase text-[9px] bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="h-1 w-1 bg-emerald-400 rounded-full animate-pulse" /> Active
                          </span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setClaimSuccess(false);
                          setTrialToken("");
                          setPlayerUid("");
                          setError("");
                        }}
                        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-white border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.04] transition-all cursor-pointer mt-6"
                      >
                        Whitelist Another UID
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setShowTrial(false);
                          setClaimSuccess(false);
                          setTrialToken("");
                          setPlayerUid("");
                        }}
                        className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 hover:text-violet-300 transition-colors mt-2"
                      >
                        Back to Landing
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-5 relative z-10 mb-10">
                        <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white shadow-[0_15px_30px_rgba(245,158,11,0.3)]">
                          <Gift className="h-7 w-7" />
                        </div>
                        <div className="text-left">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] mb-1">Free Trial Portal</p>
                          <h2 className="text-2xl font-black text-white tracking-tight">Claim Whitelist</h2>
                        </div>
                      </div>

                      <form onSubmit={handleClaimTrial} className="space-y-5 relative z-10 text-left">
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/80 ml-1">Trial Token</label>
                          <div className="flex items-center gap-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl px-5 py-4 focus-within:border-amber-500/50 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all">
                            <KeyRound className="h-4.5 w-4.5 text-slate-500" />
                            <input
                              type="text"
                              value={trialToken}
                              onChange={(e) => { setTrialToken(e.target.value); if (error) setError(""); }}
                              placeholder="Enter SG71-TRIAL-XXXX token"
                              className="bg-transparent border-0 outline-0 text-white placeholder-slate-600 text-sm w-full font-bold"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/80 ml-1">Player UID</label>
                          <div className="flex items-center gap-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl px-5 py-4 focus-within:border-amber-500/50 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all">
                            <Fingerprint className="h-4.5 w-4.5 text-slate-500" />
                            <input
                              type="text"
                              value={playerUid}
                              onChange={(e) => { setPlayerUid(e.target.value); if (error) setError(""); }}
                              placeholder="Enter your game Player UID"
                              className="bg-transparent border-0 outline-0 text-white placeholder-slate-600 text-sm w-full font-bold font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                          <div className="flex items-center gap-3">
                            <Cpu className="w-4.5 h-4.5 text-slate-500" />
                            <div>
                              <div className="text-[10px] font-black text-white uppercase tracking-wider">Bluestacks Simulator</div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase">Required for simulator players</div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={bluestack}
                            onChange={(e) => setBluestack(e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-white/10 bg-black/40 text-amber-500 focus:ring-amber-500/50 cursor-pointer"
                          />
                        </div>

                        <AnimatePresence>
                          {error && (
                            <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }} className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] backdrop-blur-md">
                              {error}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.button
                          type="submit"
                          disabled={loading || !trialToken || !playerUid}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          className="argus-btn w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] mt-6 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}
                        >
                          {loading ? (
                            <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Whitelisting...</span>
                          ) : (
                            <span className="flex items-center gap-2"><Check className="h-5 w-5" /> Whitelist UID <ArrowRight className="h-4 w-4" /></span>
                          )}
                        </motion.button>
                      </form>

                      <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 relative z-10">
                        <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500 drop-shadow-[0_0_5px_#f59e0b]" /> SG71 Crypt Mesh</span>
                        <button type="button" onClick={() => { setError(""); setShowTrial(false); setTrialToken(""); setPlayerUid(""); }} className="text-violet-400 hover:text-violet-300 cursor-pointer transition-colors px-2 py-1">Abort</button>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          ) : (
            /* ═══════ LOGIN PORTAL ═══════ */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 20 }}
              className="w-full max-w-[480px] mx-auto px-6 py-20 sm:py-32 relative z-20"
              style={{ perspective: "1200px" }}
            >
             <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="w-full">
               <motion.div
                 ref={cardRef}
                 animate={shake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
                 style={{ rotateX: tilt.x, rotateY: tilt.y, transformStyle: "preserve-3d", transition: shake ? undefined : "transform 0.3s ease-out" }}
                 transition={{ duration: 0.45 }}
                 className="argus-glass shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 opacity-60 pointer-events-none" />
                 
                 <div className="flex items-center gap-5 relative z-10 mb-10">
                   <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 text-white shadow-[0_15px_30px_rgba(124,58,237,0.3)]">
                     <Fingerprint className="h-7 w-7" />
                   </div>
                   <div>
                     <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.4)] mb-1">Secure Node</p>
                     <h2 className="text-3xl font-black text-white tracking-tight">Access Portal</h2>
                   </div>
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-6 relative z-10 text-left">
                   <div className="space-y-2.5">
                     <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/80 ml-1">Username</label>
                     <div className="flex items-center gap-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl px-5 py-4 focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(124,58,237,0.2)] transition-all">
                       <User className="h-4.5 w-4.5 text-slate-500" />
                       <input type="text" value={username} onChange={(e) => { setUsername(e.target.value); if (error) setError(""); }} placeholder="Enter operator ID" className="bg-transparent border-0 outline-0 text-white placeholder-slate-600 text-sm w-full font-bold" autoComplete="username" />
                     </div>
                   </div>
                   <div className="space-y-2.5">
                     <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/80 ml-1">Password</label>
                     <div className="flex items-center gap-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl px-5 py-4 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.2)] transition-all">
                       <Lock className="h-4.5 w-4.5 text-slate-500" />
                       <input type={showPass ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }} placeholder="Enter secure key" className="bg-transparent border-0 outline-0 text-white placeholder-slate-600 text-sm w-full font-bold" autoComplete="current-password" />
                       <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-500 hover:text-white cursor-pointer transition-colors p-1">
                         {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                       </button>
                     </div>
                   </div>
                   
                   <AnimatePresence>
                     {error && (
                       <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }} className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] backdrop-blur-md">
                         {error}
                       </motion.div>
                     )}
                   </AnimatePresence>
                   
                   <motion.button type="submit" disabled={loading || !username || !password} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="argus-btn w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] mt-6 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                     <AnimatePresence mode="wait">
                       {loading ? (
                         <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Verifying Hash...</motion.span>
                       ) : (
                         <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Establish Connection <ArrowRight className="h-4 w-4" /></motion.span>
                       )}
                     </AnimatePresence>
                   </motion.button>
                 </form>
                 
                 <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 relative z-10">
                   <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_5px_#00d4ff]" /> AES-256 Link</span>
                   <button type="button" onClick={() => { setError(""); setShowLogin(false); }} className="text-violet-400 hover:text-violet-300 cursor-pointer transition-colors px-2 py-1">Abort</button>
                 </div>
               </motion.div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
     </main>

     {/* ── Footer ── */}
     <footer className="w-full bg-[#030014]/90 backdrop-blur-md border-t border-white/5 py-12 mt-auto z-10 relative">
       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
       <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-3">
           <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
             <div className="h-4 w-4 bg-white rounded-full" />
           </div>
           <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/80">UID BYPASS ZERO-TRUST &copy; 2026</span>
         </div>
         <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">
           <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Protocol</a>
           <a href="#" className="hover:text-cyan-400 transition-colors">Terms of Use</a>
           <a href="#" className="hover:text-cyan-400 transition-colors">Developer Docs</a>
         </div>
       </div>
     </footer>
   </div>
 );
}
