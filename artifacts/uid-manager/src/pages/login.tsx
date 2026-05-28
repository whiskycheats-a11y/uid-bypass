import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Fingerprint,
  Gauge,
  KeyRound,
  Loader2,
  LogIn,
  Lock,
  Orbit,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserRoundCheck,
  Zap,
} from "lucide-react";
import { AmbientScene } from "@/components/ambient-scene";

interface LoginProps {
  onLogin: (role: "admin" | "user", username: string) => void;
}

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

const statusCards = [
  { icon: ShieldCheck, label: "Secure Relay", value: "Online" },
  { icon: Gauge, label: "Latency", value: "12 ms" },
  { icon: Cpu, label: "Core Load", value: "18%" },
];

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTilt({ x: dy * -7, y: dx * 7 });
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
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error("Login server response is invalid. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data?.error ?? "Login request failed. Please try again.");
      }

      if (data.success) {
        sessionStorage.setItem("uid_auth", JSON.stringify({
          role: data.role,
          username: data.username,
          adminKey: password,
          defaultDays: data.defaultDays ?? 30,
          isTrial: data.isTrial ?? false,
          canResell: data.canResell ?? false,
        }));
        onLogin(data.role, data.username);
      } else {
        throw new Error(data.error ?? "Invalid credentials");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message && !String(err.message).includes("JSON") ? err.message : "Login failed. Please check your username and password.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground relative">
      <AmbientScene variant="public" />

      <header className="relative z-20 mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="brand-mark">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black tracking-wide text-white">UID Manager</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/55">Access Console</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300 sm:flex">
          <span className="live-dot h-2 w-2 rounded-full bg-emerald-300" />
          Live Network
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-8 px-5 pb-8 sm:px-8 lg:grid-cols-[1.06fr_0.94fr]">
        <section className="home-hero">
          <motion.div
            initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/7 px-4 py-2 text-xs font-bold text-cyan-100 shadow-[0_0_32px_rgba(34,211,238,0.12)]">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Professional whitelist command center
            </div>

            <div className="space-y-5">
              <h1 className="home-title">
                UID control with a real-time 3D security interface.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Manage client access, token balance, trials, payments, and admin controls from one fast responsive portal built for desktop and mobile.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                onClick={() => setShowLogin(true)}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="home-login-button"
              >
                <span className="btn-shimmer" />
                <LogIn className="relative h-5 w-5" />
                <span className="relative">Login</span>
                <ArrowRight className="relative h-5 w-5" />
              </motion.button>
              <span className="home-login-note">Authorized users only</span>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {statusCards.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08, duration: 0.5 }}
                  whileHover={{ y: -6, rotateX: 5, rotateY: -5 }}
                  className="home-status-card"
                >
                  <item.icon className="h-4 w-4 text-cyan-200" />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </motion.div>
              ))}
            </div>

            <div className="home-console">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-violet-200/70">
                <Orbit className="h-4 w-4 text-violet-300" />
                Interactive Core
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {["Token guarded", "UID synced", "Admin ready"].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3 text-sm font-semibold text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="login-shell" style={{ perspective: "1200px" }}>
          <AnimatePresence mode="wait">
            {!showLogin ? (
              <motion.div
                key="landing-visual"
                initial={{ opacity: 0, x: 30, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.94 }}
                transition={{ duration: 0.55, type: "spring", stiffness: 110, damping: 18 }}
                className="landing-visual-card"
              >
                <div className="landing-orbit">
                  <span />
                  <span />
                  <span />
                  <div className="landing-shield">
                    <ShieldCheck className="h-14 w-14" />
                  </div>
                </div>
                <div className="landing-panel panel-a">
                  <strong>5900</strong>
                  <span>Tokens Ready</span>
                </div>
                <div className="landing-panel panel-b">
                  <strong>LIVE</strong>
                  <span>Secure Channel</span>
                </div>
                <div className="landing-panel panel-c">
                  <strong>UID</strong>
                  <span>Instant Access</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 30, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.94 }}
                transition={{ duration: 0.55, type: "spring", stiffness: 110, damping: 18 }}
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
                  className="login-card"
                >
                  <div className="login-card-glow" />
                  <div className="login-character" aria-hidden="true">
                    <div className="character-halo" />
                    <motion.div
                      className="character-avatar"
                      animate={{ y: [0, -8, 0], rotateZ: [0, 2, 0, -2, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="character-face">
                        <span className="character-eye" />
                        <span className="character-eye" />
                      </div>
                      <div className="character-body">
                        <UserRoundCheck className="h-5 w-5" />
                      </div>
                    </motion.div>
                  </div>
                  <div className="login-card-header">
                    <motion.div
                      animate={{ rotateY: [0, 12, 0, -12, 0], rotateZ: [0, 4, 0, -4, 0], y: [0, -8, 0] }}
                      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      className="login-logo-3d"
                    >
                      <Fingerprint className="h-10 w-10" />
                    </motion.div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/65">Secure Login</p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Access Portal</h2>
                      <p className="mt-1 text-sm text-slate-400">Enter your assigned credentials.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Username</label>
                <div className="login-field">
                  <User className="h-4 w-4" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Password</label>
                <div className="login-field">
                  <Lock className="h-4 w-4" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Hide password" : "Show password"}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading || !username || !password}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="login-submit"
              >
                <span className="btn-shimmer" />
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Authenticating
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
                      Enter Console
                      <ArrowRight className="h-5 w-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
                  </form>

                  <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-cyan-300" /> Encrypted session</span>
                    <button type="button" onClick={() => setShowLogin(false)} className="text-cyan-200/70 transition hover:text-white">Back</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
