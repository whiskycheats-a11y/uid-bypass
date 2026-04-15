import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Loader2, Lock, User, Zap } from "lucide-react";

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
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("uid_auth", JSON.stringify({
          role: data.role, username: data.username,
          adminKey: password, defaultDays: data.defaultDays ?? 30,
          isTrial: data.isTrial ?? false,
          canResell: data.canResell ?? false,
        }));
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
      {/* Canvas star field — mouse parallax */}
      <StarField />

      {/* Background orbs — CSS only */}
      <div className="fixed inset-0 pointer-events-none" style={{ contain: "layout paint" }}>
        <div className="absolute animate-float-orb rounded-full" style={{ width: 800, height: 800, background: "radial-gradient(circle, rgba(139,92,246,0.32) 0%, transparent 68%)", top: "-250px", left: "-200px" }} />
        <div className="absolute animate-float-orb-delay rounded-full" style={{ width: 600, height: 600, background: "radial-gradient(circle, rgba(6,182,212,0.22) 0%, transparent 68%)", bottom: "-150px", right: "-100px" }} />
        <div className="absolute animate-pulse-glow rounded-full" style={{ width: 400, height: 400, background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 68%)", top: "40%", left: "60%" }} />
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, type: "spring", stiffness: 120, damping: 18 }}
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
            transition: shake ? undefined : "transform 0.25s ease",
          }}
          transition={{ duration: 0.45 }}
          className="glass-strong rounded-3xl p-8 relative overflow-hidden shadow-2xl"
        >
          {/* Glow borders */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/90 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-violet-500/30 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />
          <div className="absolute -inset-1 rounded-3xl opacity-20 -z-10" style={{ background: "linear-gradient(135deg, #8b5cf6, transparent, #06b6d4)", filter: "blur(20px)" }} />
          <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-violet-500/12 to-transparent rounded-3xl" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-cyan-500/12 to-transparent rounded-3xl" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(292 83% 55%), hsl(192 100% 50%))", boxShadow: "0 0 40px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}
              >
                <Shield className="w-10 h-10 text-white drop-shadow-lg" />
              </motion.div>
              <div className="absolute -inset-2 rounded-3xl -z-10 logo-ring" style={{ background: "conic-gradient(from 0deg, #8b5cf6, #06b6d4, #ec4899, #8b5cf6)", filter: "blur(8px)", opacity: 0.4 }} />
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight" style={{ textShadow: "0 0 30px rgba(139,92,246,0.5)" }}>
              UID Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-1 tracking-wide">Bypass Whitelist System</p>

            <div className="flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full glass secure-badge" style={{ border: "1px solid rgba(16,185,129,0.3)" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 live-dot" style={{ boxShadow: "0 0 6px #10b981" }} />
              <span className="text-[11px] text-emerald-400 font-bold tracking-widest">SECURE CHANNEL</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors duration-200" />
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username" autoComplete="username"
                  className="login-input w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors duration-200" />
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password" autoComplete="current-password"
                  className="login-input w-full h-12 pl-10 pr-12 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="eyebtn absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground p-1 rounded-lg transition-all">
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
              whileHover={{ scale: 1.025 }}
              whileTap={{ scale: 0.975 }}
              className="w-full h-12 rounded-xl btn-gradient text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden mt-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 btn-shimmer" />
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Access System
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

/* ── Canvas Star Field with Mouse Parallax ── */
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    /* Star layers — each has a parallax multiplier */
    interface Star { x: number; y: number; ox: number; oy: number; r: number; a: number; twinkleSpeed: number; twinklePhase: number; layer: number; }
    let stars: Star[] = [];
    const LAYERS = [
      { count: 120, mult: 0.018, rMin: 0.4, rMax: 1.0, aBase: 0.25 },
      { count: 60,  mult: 0.038, rMin: 0.9, rMax: 1.8, aBase: 0.55 },
      { count: 20,  mult: 0.065, rMin: 1.5, rMax: 2.8, aBase: 0.8  },
    ];

    function buildStars(w: number, h: number) {
      stars = [];
      LAYERS.forEach((l, li) => {
        for (let i = 0; i < l.count; i++) {
          const ox = Math.random() * w;
          const oy = Math.random() * h;
          stars.push({ x: ox, y: oy, ox, oy, r: l.rMin + Math.random() * (l.rMax - l.rMin), a: l.aBase, twinkleSpeed: 0.4 + Math.random() * 1.2, twinklePhase: Math.random() * Math.PI * 2, layer: li });
        }
      });
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildStars(canvas.width, canvas.height);
      mouse.current = { x: canvas.width / 2, y: canvas.height / 2 };
      target.current = { ...mouse.current };
    }

    resize();

    const onResize = () => resize();
    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });

    let t = 0;
    function draw() {
      raf.current = requestAnimationFrame(draw);
      t += 0.016;

      /* Smooth lerp toward mouse — feels heavy and cinematic */
      mouse.current.x += (target.current.x - mouse.current.x) * 0.06;
      mouse.current.y += (target.current.y - mouse.current.y) * 0.06;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const dx = mouse.current.x - cx;
      const dy = mouse.current.y - cy;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((s, i) => {
        const layer = LAYERS[s.layer];
        /* Parallax offset */
        s.x = s.ox + dx * layer.mult;
        s.y = s.oy + dy * layer.mult;

        /* Twinkle */
        const alpha = layer.aBase * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase));

        /* Draw glow for bigger stars */
        if (s.r > 1.4) {
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
          grad.addColorStop(0, `rgba(200,185,255,${alpha * 0.6})`);
          grad.addColorStop(1, "rgba(200,185,255,0)");
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        /* Core dot */
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,210,255,${alpha})`;
        ctx.fill();
      });
    }

    draw();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
}
