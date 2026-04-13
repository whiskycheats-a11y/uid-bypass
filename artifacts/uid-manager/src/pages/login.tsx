import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Loader2, Lock, User, Zap, Sparkles } from "lucide-react";

interface LoginProps {
  onLogin: (role: "admin" | "user", username: string) => void;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -8, y: dx * 8 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("uid_auth", JSON.stringify({ role: data.role, username: data.username, adminKey: password, defaultDays: data.defaultDays ?? 30 }));
        onLogin(data.role, data.username);
      } else {
        throw new Error(data.error ?? "Invalid credentials");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message ?? "Access denied.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Stars */}
      <Stars />

      {/* Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute animate-float-orb rounded-full" style={{ width: 800, height: 800, background: "radial-gradient(circle, hsl(262 83% 68% / 0.35) 0%, transparent 70%)", top: "-250px", left: "-200px" }} />
        <div className="absolute animate-float-orb-delay rounded-full" style={{ width: 600, height: 600, background: "radial-gradient(circle, hsl(192 100% 55% / 0.25) 0%, transparent 70%)", bottom: "-150px", right: "-100px" }} />
        <div className="absolute animate-pulse-glow rounded-full" style={{ width: 400, height: 400, background: "radial-gradient(circle, hsl(320 80% 55% / 0.2) 0%, transparent 70%)", top: "40%", left: "60%" }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Card with 3D tilt */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, type: "spring", stiffness: 120, damping: 18 }}
        className="relative z-10 w-full max-w-md mx-4"
        style={{ perspective: "1000px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          ref={cardRef}
          animate={shake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
          style={{
            rotateX: tilt.x,
            rotateY: tilt.y,
            transformStyle: "preserve-3d",
            transition: shake ? undefined : "transform 0.3s ease",
          }}
          transition={{ duration: 0.5 }}
          className="glass-strong rounded-3xl p-8 relative overflow-hidden shadow-2xl"
        >
          {/* Glow borders */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/90 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-violet-500/30 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />

          {/* 3D depth layer */}
          <div className="absolute -inset-1 rounded-3xl opacity-20" style={{ background: "linear-gradient(135deg, #8b5cf6, transparent, #06b6d4)", filter: "blur(20px)", zIndex: -1 }} />

          {/* Corners */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-violet-500/12 to-transparent rounded-3xl" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-cyan-500/12 to-transparent rounded-3xl" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center glow-primary"
                style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(292 83% 55%), hsl(192 100% 50%))", boxShadow: "0 0 40px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}
              >
                <Shield className="w-10 h-10 text-white drop-shadow-lg" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-2 rounded-3xl"
                style={{ background: "conic-gradient(from 0deg, #8b5cf6, #06b6d4, #ec4899, #8b5cf6)", filter: "blur(8px)", zIndex: -1, opacity: 0.4 }}
              />
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight" style={{ textShadow: "0 0 30px rgba(139,92,246,0.5)" }}>
              UID Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-1 tracking-wide">Bypass Whitelist System</p>

            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full glass"
              style={{ border: "1px solid rgba(16,185,129,0.3)" }}
            >
              <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #10b981" }} />
              <span className="text-[11px] text-emerald-400 font-bold tracking-widest">SECURE CHANNEL</span>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full h-12 pl-10 pr-12 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !username || !password}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-xl btn-gradient text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden mt-2"
              style={{ boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}
            >
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12" animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }} />
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Access System
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <p className="text-center text-[10px] text-muted-foreground/40 mt-6 tracking-widest font-medium">
            RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Stars() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: 0.3 }}
          animate={{ opacity: [0.1, 0.7, 0.1], scale: [1, 1.5, 1] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
