import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowRight,
  Lock,
  User,
  Fingerprint,
  Loader2
} from "lucide-react";
import { WaterWaveBackground } from "@/components/WaterWaveBackground";
import { Turnstile } from "@marsidev/react-turnstile";

interface LoginProps {
  onLogin: (role: "admin" | "user", username: string) => void;
}

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

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

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 400, damping: 30 });
  const rotateY = useSpring(tiltY, { stiffness: 400, damping: 30 });
  
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    tiltX.set(dy * -4); 
    tiltY.set(dx * 4);
  };
  const handleMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
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
        body: JSON.stringify({ username, password, turnstileToken }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) throw new Error(data?.message || "Authentication failed");
      if (data.success) {
        sessionStorage.setItem("uid_auth", JSON.stringify({ role: data.role, username: data.username, defaultDays: data.defaultDays ?? 30 }));
        onLogin(data.role, data.username);
      } else {
        throw new Error("Invalid credentials");
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

      <header className="fixed top-0 left-0 right-0 z-50 py-8 px-8 sm:px-16 flex items-center justify-between pointer-events-none">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-md">
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase">Nexus</span>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="pointer-events-auto">
          <button onClick={() => setShowLogin(!showLogin)} className="text-[11px] font-semibold tracking-widest uppercase hover:text-white/70 transition-colors">
            {showLogin ? "Back to overview" : "Sign In"}
          </button>
        </motion.div>
      </header>

      <main className="flex-grow flex items-center justify-center relative z-10 px-6">
        <AnimatePresence mode="wait">
          {!showLogin ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-center max-w-4xl mx-auto mt-20"
            >
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-2xl mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest font-medium text-white/70">System Operational</span>
                </div>
              </FadeIn>
              
              <FadeIn delay={0.2}>
                <h1 className="text-5xl sm:text-7xl lg:text-[7rem] font-medium tracking-tight leading-[1.05] mb-8">
                  Unified <span className="text-white/40">Access.</span><br />
                  Infinite <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">Scale.</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-lg text-white/50 max-w-2xl mx-auto font-light leading-relaxed mb-12">
                  Experience the next generation of cryptographic authorization. Instantly distribute secure sessions across a global edge network with zero latency.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
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
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[440px] perspective-1000 mt-10"
            >
              <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                <motion.div
                  ref={cardRef}
                  animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
                  style={{ rotateX, rotateY, transformStyle: "preserve-3d", transition: shake ? undefined : "transform 0.2s ease-out" }}
                  className="bg-white/[0.02] border border-white/5 backdrop-blur-[40px] p-10 rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex flex-col items-center text-center mb-10">
                    <div className="h-16 w-16 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center mb-6 shadow-2xl">
                      <Fingerprint className="h-7 w-7 text-white/80" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-medium tracking-tight mb-2">Authentication</h2>
                    <p className="text-xs text-white/40 tracking-widest uppercase">Verify your identity</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                      <div className="relative flex items-center">
                        <User className="absolute left-4 h-4 w-4 text-white/30" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setError(""); }}
                          placeholder="Operator ID"
                          className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 focus:bg-white/5 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-4 h-4 w-4 text-white/30" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(""); }}
                          placeholder="Passphrase"
                          className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 focus:bg-white/5 transition-all"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-center text-red-400 text-xs font-medium tracking-wide pt-2">
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
