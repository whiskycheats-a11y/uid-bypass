import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Shield, CheckCircle } from "lucide-react";

interface WelcomeSplashProps {
  username: string;
  visible: boolean;
  onDone: () => void;
}

export function WelcomeSplash({ username, visible, onDone }: WelcomeSplashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 1500);
    const t4 = setTimeout(() => onDone(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [visible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string; life: number; maxLife: number };
    const particles: Particle[] = [];
    const colors = ["#8b5cf6", "#a78bfa", "#06b6d4", "#ec4899", "#ffffff", "#c4b5fd"];

    const burst = () => {
      const cx = W / 2, cy = H / 2;
      for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 2,
          r: 1.5 + Math.random() * 3.5,
          alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 80 + Math.random() * 80,
        });
      }
    };

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      frame++;
      if (frame === 8 || frame === 28 || frame === 50) burst();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.99;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: "radial-gradient(ellipse at 50% 50%, #0d0515 0%, #060010 100%)" }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }} />

          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          <div className="relative flex flex-col items-center text-center gap-6 px-6 max-w-lg">

            <motion.div
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={phase >= 1 ? { scale: 1, rotate: 0, opacity: 1 } : {}}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
              className="relative"
            >
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: "radial-gradient(circle, rgba(139,92,246,0.9) 0%, rgba(236,72,153,0.4) 60%, transparent 80%)", transform: "scale(2.5)" }}
              />
              <div className="relative w-28 h-28 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(236,72,153,0.2) 100%)", border: "1.5px solid rgba(139,92,246,0.6)", boxShadow: "0 0 60px rgba(139,92,246,0.5), inset 0 0 30px rgba(139,92,246,0.1)" }}>
                <Shield className="w-14 h-14 text-violet-400" strokeWidth={1.5} />
              </div>
            </motion.div>

            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
                animate={phase >= 1 ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <span className="text-[11px] font-bold tracking-[0.35em] uppercase" style={{ color: "#a78bfa" }}>
                  Welcome Back
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30, filter: "blur(16px)" }}
                animate={phase >= 1 ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                className="text-4xl sm:text-5xl font-black leading-tight"
                style={{ background: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 40%, #ec4899 80%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 30px rgba(139,92,246,0.6))" }}
              >
                UID Bypass
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex items-center justify-center gap-2"
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </motion.div>
                <span className="text-lg font-bold" style={{ background: "linear-gradient(90deg, #34d399, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  All Servers Safe
                </span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.45, type: "spring" }}
              className="px-6 py-3 rounded-2xl"
              style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 20px rgba(139,92,246,0.15)" }}
            >
              <span className="text-sm text-muted-foreground">Logged in as </span>
              <span className="text-sm font-bold font-mono" style={{ color: "#c4b5fd" }}>{username}</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : {}}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-1.5">
                {[0,1,2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400"
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground/60 tracking-wide">Loading dashboard...</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
