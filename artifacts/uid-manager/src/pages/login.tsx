import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Lock,
  User,
  Terminal,
  Cpu,
  Globe,
  Fingerprint,
  Loader2,
  ShieldCheck,
  Gauge,
  Coins,
  HelpCircle,
  Check,
  X,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { WaterWaveBackground } from "@/components/WaterWaveBackground";
import { Turnstile } from "@marsidev/react-turnstile";

interface LoginProps {
  onLogin: (role: "admin" | "user", username: string) => void;
}

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

/* ─── Shared Animation Components ─── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function WordReveal({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const words = text.split(" ");
  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: delay + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

function ScrollReveal({ children, delay = 0, y = 40, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ target, suffix = "", prefix = "", duration = 2 }: { target: number; suffix?: string; prefix?: string; duration?: number }) {
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

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Content Data ─── */
const statusCards = [
  { icon: ShieldCheck, label: "Core Integrity", target: 99, suffix: ".98%", desc: "Cryptographic validation" },
  { icon: Gauge, label: "Sync Latency", target: 8, suffix: " ms", desc: "Global edge replication" },
  { icon: Cpu, label: "Active Nodes", target: 2840, suffix: "", desc: "Distributed proxy mesh" },
];

const features = [
  { icon: Shield, title: "Cryptographic Authorization", description: "Every whitelist entry is hashed via high-entropy key pairs, completely preventing database bypass vectors." },
  { icon: Globe, title: "Ultra-Low Latency Sync", description: "Changes push to all edge nodes globally in under 10ms, maintaining constant zero-lag protection." },
  { icon: Terminal, title: "Developer API Console", description: "Integrate deep security hooks into your project with high-capacity WebSocket and REST interfaces." },
  { icon: Coins, title: "Token-Gated Automation", description: "Create and manage license tokens with customized active days, reseller margins, and trial bounds." },
];

const faqItems = [
  { question: "How does real-time sync safeguard connections?", answer: "Our system performs an automated 8ms edge audit on every connection. Updates push globally in real-time, locking out unauthorized UIDs in milliseconds." },
  { question: "Is there dual-session sharing protection?", answer: "Our engine performs constant concurrency audits. If a token is detected concurrently on separate endpoints, it triggers an instant block." },
  { question: "How do reseller trial periods function?", answer: "Resellers configure trial limits, assign token balances, customize active durations, and monitor earnings directly from their modular dashboard." },
];

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isYearly, setIsYearly] = useState(true);
  const [headerBlur, setHeaderBlur] = useState(false);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 400, damping: 30 });
  const rotateY = useSpring(tiltY, { stiffness: 400, damping: 30 });
  
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 🚀 PERFORMANCE BOOST: Throttle scroll event to 60fps to prevent main thread blocking
    let ticking = false;
    const handler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setHeaderBlur(window.scrollY > 60);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // 🚀 PERFORMANCE BOOST: Cache bounding rect to eliminate Layout Thrashing (forces reflow) on every mouse pixel movement
  const rectCache = useRef<DOMRect | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    
    if (!rectCache.current) {
      rectCache.current = el.getBoundingClientRect();
    }
    const rect = rectCache.current;
    
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    tiltX.set(dy * -4); 
    tiltY.set(dx * 4);
  };
  const handleMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
    rectCache.current = null; // Reset cache on leave
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!turnstileToken) {
      setError("Verification required.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken, t: Date.now() }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) throw new Error(data?.message || data?.error || "Authentication failed");
      
      if (data.success) {
        // ── ANTI-MITM: Verify that the server ACTUALLY created a session ──
        const verifyRes = await fetch(`${BASE}/api/auth/verify-session`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: data.username, role: data.role }),
        });
        
        if (!verifyRes.ok) {
          throw new Error("Connection integrity check failed. Login rejected.");
        }
        
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          throw new Error("Session verification failed. Login rejected.");
        }

        sessionStorage.setItem("uid_auth", JSON.stringify({ role: data.role, username: data.username, defaultDays: data.defaultDays ?? 30 }));
        onLogin(data.role, data.username);
      } else {
        throw new Error(data.message || "Invalid credentials");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Connection refused.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col font-sans overflow-x-hidden selection:bg-white/20 selection:text-white bg-[#02030d] text-white">
      <WaterWaveBackground />

      {/* ── Fixed Navigation ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 py-6 px-6 sm:px-10 flex items-center justify-between ${headerBlur ? "bg-black/20 backdrop-blur-2xl border-b border-white/5" : "bg-transparent border-b border-transparent"}`}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="flex items-center gap-4 cursor-pointer" onClick={() => setShowLogin(false)}>
          <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
            <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-white/90">UID BYPASS</span>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="pointer-events-auto">
          <button onClick={() => setShowLogin(!showLogin)} className="text-[10px] font-semibold tracking-widest uppercase hover:text-white transition-colors text-white/60 bg-white/5 px-6 py-2.5 rounded-full border border-white/10 hover:bg-white/10">
            {showLogin ? "Return Home" : "Sign In"}
          </button>
        </motion.div>
      </header>

      <main className="flex-grow z-10 relative">
        <AnimatePresence mode="wait">
          {!showLogin ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {/* ═══════ HERO ═══════ */}
              <section className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 py-32 sm:py-48 flex flex-col items-center justify-center min-h-screen text-center">
                <div className="w-full max-w-4xl space-y-8 z-20 flex flex-col items-center relative">
                  
                  <FadeIn delay={0.1}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/10 backdrop-blur-md mb-4">
                      <span className="relative flex h-2 w-2">
                        
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-blue-300">System Operational</span>
                    </div>
                  </FadeIn>
                  
                  <h1 className="text-5xl sm:text-7xl lg:text-[7.5rem] font-medium tracking-tight leading-[1] mb-6">
                    <FadeIn delay={0.2}>
                      <span className="text-white">UID Bypass</span>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                      <span className="text-white/40">All Server Safe</span>
                    </FadeIn>
                  </h1>

                  <FadeIn delay={0.4}>
                    <p className="text-lg text-white/50 max-w-2xl mx-auto font-light leading-relaxed mb-12">
                      Experience the next generation of cryptographic authorization. Instantly distribute secure sessions across a global edge network with zero latency.
                    </p>
                  </FadeIn>

                  <FadeIn delay={0.5}>
                    <button
                      onClick={() => setShowLogin(true)}
                      className="group relative inline-flex items-center gap-4 bg-white text-black px-8 py-4 rounded-full text-xs font-semibold uppercase tracking-widest hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] cursor-pointer"
                    >
                      Enter Portal
                      <div className="h-8 w-8 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </button>
                  </FadeIn>
                </div>
              </section>

              {/* ═══════ LIVE STATS ═══════ */}
              <section className="w-full border-y border-white/5 py-16 bg-white/[0.01] backdrop-blur-3xl relative">
                <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 grid sm:grid-cols-3 gap-6">
                  {statusCards.map((card, idx) => (
                    <ScrollReveal key={card.label} delay={idx * 0.1} y={30}>
                      <div className="bg-white/[0.02] border border-white/5 p-6 sm:p-8 rounded-[2rem] flex flex-col justify-between min-h-[140px] hover:bg-white/[0.04] transition-colors duration-500">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-white/5 text-white/80">
                            <card.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{card.label}</p>
                            <p className="text-[11px] font-medium text-white/40 mt-1">{card.desc}</p>
                          </div>
                        </div>
                        <div className="mt-8 flex items-baseline justify-between">
                          <span className="text-4xl font-medium text-white tracking-tight">
                            <AnimatedCounter target={card.target} suffix={card.suffix} />
                          </span>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </section>

              {/* ═══════ FEATURES ═══════ */}
              <section className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-32 space-y-20 relative">
                <div className="text-center max-w-2xl mx-auto space-y-6">
                  <ScrollReveal y={20}>
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Advanced Protocol</h2>
                  </ScrollReveal>
                  <ScrollReveal y={20} delay={0.1}>
                    <p className="text-3xl sm:text-5xl font-medium text-white tracking-tight leading-[1.1]">
                      <WordReveal text="Military-grade encryption for global distribution." />
                    </p>
                  </ScrollReveal>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {features.map((feature, idx) => (
                    <ScrollReveal key={feature.title} delay={idx * 0.1} y={40}>
                      <div className="w-full mx-auto bg-white/[0.02] border border-white/5 p-8 sm:p-10 rounded-[2.5rem] flex flex-col h-full hover:bg-white/[0.04] transition-all duration-500 group">
                        <div className="flex items-center justify-between mb-8">
                          <div className="p-4 rounded-2xl bg-white/5 text-white group-hover:scale-110 transition-transform duration-500">
                            <feature.icon className="h-6 w-6" />
                          </div>
                        </div>
                        <h3 className="text-xl font-medium text-white tracking-tight mb-3">{feature.title}</h3>
                        <p className="text-sm leading-relaxed text-white/50 font-light">{feature.description}</p>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </section>

              {/* ═══════ PRICING ═══════ */}
              <section id="pricing" className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-32 space-y-20 relative border-t border-white/5">
                <div className="text-center max-w-2xl mx-auto space-y-8">
                  <ScrollReveal y={20}>
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Licensing Model</h2>
                  </ScrollReveal>
                  <ScrollReveal y={20} delay={0.1}>
                    <p className="text-4xl sm:text-5xl font-medium text-white tracking-tight">
                      Procure access
                    </p>
                  </ScrollReveal>
                  <ScrollReveal y={20} delay={0.2}>
                    <div className="inline-flex items-center gap-2 bg-white/[0.02] border border-white/5 p-1.5 rounded-2xl">
                      <button
                        onClick={() => setIsYearly(false)}
                        className={`px-6 py-2.5 text-[10px] font-bold rounded-xl uppercase tracking-widest transition-all duration-300 cursor-pointer ${!isYearly ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setIsYearly(true)}
                        className={`px-6 py-2.5 text-[10px] font-bold rounded-xl uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer ${isYearly ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                      >
                        Yearly <span className={`${isYearly ? "text-black/50" : "text-blue-400"}`}>-20%</span>
                      </button>
                    </div>
                  </ScrollReveal>
                </div>

                <div className="grid md:grid-cols-3 gap-6 items-stretch">
                  {[
                    { name: "Starter Node", desc: "Single app development.", price: [15, 12], features: ["Max 250 active UIDs", "Standard sync (~150ms)", "Basic Webhooks"], excluded: ["Reseller panels"], btn: "Provision Basic", featured: false },
                    { name: "Professional", desc: "High-traffic distributions.", price: [39, 31], features: ["Unlimited UIDs", "Edge sync (<10ms)", "Full Reseller Panel", "WebSocket hooks"], excluded: [], btn: "Provision Pro", featured: true },
                    { name: "Enterprise", desc: "Custom DB pipelines.", price: [99, 79], features: ["Dedicated nodes", "White-label panels", "Secure DB links", "100% latency SLA"], excluded: [], btn: "Request Build", featured: false },
                  ].map((plan, idx) => (
                    <ScrollReveal key={plan.name} delay={idx * 0.1} y={40}>
                      <div className={`p-8 sm:p-10 rounded-[2.5rem] flex flex-col justify-between h-full transition-all duration-500 ${plan.featured ? "bg-white/[0.05] border border-white/20" : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"}`}>
                        <div className="space-y-8">
                          <div className="space-y-3 text-left">
                            <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-widest">{plan.name}</h3>
                            <p className="text-xs text-white/40 font-light">{plan.desc}</p>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-5xl font-medium text-white tracking-tighter">
                              ${isYearly ? plan.price[1] : plan.price[0]}
                            </span>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">/ mo</span>
                          </div>
                          <div className="h-px bg-white/5 w-full" />
                          <ul className="space-y-4 text-xs text-white/70 font-medium text-left">
                            {plan.features.map((f) => (
                              <li key={f} className="flex items-center gap-3">
                                <Check className={`h-4 w-4 flex-shrink-0 ${plan.featured ? "text-white" : "text-white/50"}`} /> {f}
                              </li>
                            ))}
                            {plan.excluded.map((f) => (
                              <li key={f} className="flex items-center gap-3 text-white/30">
                                <X className="h-4 w-4 flex-shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button onClick={() => setShowLogin(true)} className={`w-full py-4 text-[10px] font-bold uppercase tracking-widest rounded-2xl mt-10 cursor-pointer transition-all ${plan.featured ? "bg-white text-black hover:bg-white/90" : "bg-white/5 text-white hover:bg-white/10"}`}>
                          {plan.btn}
                        </button>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </section>

              {/* ═══════ FAQ ═══════ */}
              <section className="w-full py-32 border-t border-white/5 relative bg-white/[0.01]">
                <div className="w-full max-w-4xl mx-auto px-6 sm:px-10 space-y-16">
                  <div className="text-center space-y-6">
                    <ScrollReveal y={20}>
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Support</h2>
                    </ScrollReveal>
                    <ScrollReveal y={20} delay={0.1}>
                      <p className="text-3xl sm:text-5xl font-medium text-white tracking-tight">
                        Common inquiries
                      </p>
                    </ScrollReveal>
                  </div>
                  <div className="space-y-4">
                    {faqItems.map((item, i) => (
                      <ScrollReveal key={i} delay={i * 0.1} y={30}>
                        <div className="bg-white/[0.02] border border-white/5 p-6 sm:p-8 rounded-[2rem] text-left">
                          <h3 className="text-base font-medium text-white/90 mb-3">{item.question}</h3>
                          <p className="text-sm leading-relaxed text-white/50 font-light">{item.answer}</p>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── Footer ── */}
              <footer className="w-full border-t border-white/5 py-12 bg-transparent text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">UID BYPASS ZERO-TRUST &copy; 2026</p>
              </footer>
            </motion.div>
          ) : (
            /* ═══════ LOGIN PORTAL ═══════ */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[440px] perspective-1000 mt-20 sm:mt-32 pb-20 mx-auto px-4 sm:px-0"
            >
              <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="relative">
                {/* Subtle outer glow for the card */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-white/10 to-transparent rounded-[2.5rem] blur opacity-50" />
                
                <motion.div
                  ref={cardRef}
                  animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
                  style={{ rotateX, rotateY, transformStyle: "preserve-3d", transition: shake ? undefined : "transform 0.2s ease-out" }}
                  className="relative bg-[#0a0a0c]/80 border border-white/10 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <div className="flex flex-col items-center text-center mb-10">
                    <div className="h-16 w-16 rounded-[1.25rem] border border-white/10 bg-gradient-to-b from-white/10 to-transparent flex items-center justify-center mb-6 shadow-[0_10px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]">
                      <Fingerprint className="h-7 w-7 text-white" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">Authentication</h2>
                    <p className="text-[10px] text-white/50 tracking-[0.2em] uppercase font-bold">Verify your identity</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                      <div className="relative flex items-center group">
                        <User className="absolute left-4 h-4.5 w-4.5 text-white/40 group-focus-within:text-white transition-colors" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setError(""); }}
                          placeholder="Operator ID"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 focus:bg-white/5 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="relative flex items-center group">
                        <Lock className="absolute left-4 h-4.5 w-4.5 text-white/40 group-focus-within:text-white transition-colors" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(""); }}
                          placeholder="Passphrase"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 focus:bg-white/5 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-center text-rose-400 text-xs font-medium tracking-wide pt-2">
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-center py-2 opacity-80 mix-blend-screen">
                      <Turnstile
                        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                        onSuccess={setTurnstileToken}
                        options={{ theme: "dark", size: "flexible" }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !username || !password || !turnstileToken}
                      className="cursor-pointer w-full bg-white text-black py-4 rounded-2xl text-xs font-semibold tracking-widest uppercase hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing</> : "Authenticate"}
                    </button>
                  </form>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
