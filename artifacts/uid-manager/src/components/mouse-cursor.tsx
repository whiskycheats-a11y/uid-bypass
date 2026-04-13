import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function MouseCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 500, damping: 28 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 28 });
  const ringX = useSpring(cursorX, { stiffness: 120, damping: 18 });
  const ringY = useSpring(cursorY, { stiffness: 120, damping: 18 });
  const [clicked, setClicked] = useState(false);
  const [hoveringBtn, setHoveringBtn] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; life: number; hue: number }[]>([]);
  const particleId = useRef(0);
  const lastPos = useRef({ x: -100, y: -100 });
  const frameRef = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy);

      if (speed > 6) {
        const count = Math.min(Math.floor(speed / 8), 4);
        setParticles((prev) => {
          const newOnes = Array.from({ length: count }, () => ({
            id: ++particleId.current,
            x: e.clientX,
            y: e.clientY,
            vx: (Math.random() - 0.5) * 3.5,
            vy: (Math.random() - 0.5) * 3.5,
            life: 1,
            hue: 260 + Math.random() * 100,
          }));
          return [...prev.slice(-30), ...newOnes];
        });
        lastPos.current = { x: e.clientX, y: e.clientY };
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      setHoveringBtn(!!(el && (el.tagName === "BUTTON" || el.closest("button") || el.tagName === "A" || el.closest("a") || el.tagName === "INPUT" || el.closest("input"))));
    };

    const onDown = () => setClicked(true);
    const onUp = () => setClicked(false);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16, 3);
      last = now;
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 0.04 * dt, life: p.life - 0.042 * dt }))
          .filter((p) => p.life > 0)
      );
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: Math.max(4, 8 * p.life),
            height: Math.max(4, 8 * p.life),
            opacity: p.life * 0.9,
            background: `hsl(${p.hue}deg 90% 70%)`,
            boxShadow: `0 0 ${8 * p.life}px hsl(${p.hue}deg 90% 70%)`,
            filter: "blur(0.5px)",
            transform: "translate(-50%,-50%)",
          }}
        />
      ))}

      {/* Outer ring — follows with lag */}
      <motion.div
        className="absolute rounded-full border border-violet-500/50"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          width: hoveringBtn ? 56 : clicked ? 24 : 40,
          height: hoveringBtn ? 56 : clicked ? 24 : 40,
          borderColor: hoveringBtn ? "rgba(139,92,246,1)" : clicked ? "rgba(236,72,153,0.9)" : "rgba(139,92,246,0.55)",
          backgroundColor: hoveringBtn ? "rgba(139,92,246,0.1)" : "transparent",
          borderWidth: hoveringBtn ? 2 : 1.5,
          boxShadow: hoveringBtn
            ? "0 0 24px rgba(139,92,246,0.7), inset 0 0 12px rgba(139,92,246,0.12)"
            : clicked
            ? "0 0 16px rgba(236,72,153,0.5)"
            : "0 0 10px rgba(139,92,246,0.25)",
          transition: "width 0.18s ease, height 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease",
        }}
      />

      {/* Inner dot — snaps to cursor */}
      <motion.div
        className="absolute rounded-full"
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
          width: clicked ? 5 : hoveringBtn ? 10 : 8,
          height: clicked ? 5 : hoveringBtn ? 10 : 8,
          backgroundColor: clicked ? "#ec4899" : "#8b5cf6",
          boxShadow: clicked
            ? "0 0 14px #ec4899, 0 0 5px #ec4899"
            : "0 0 14px #8b5cf6, 0 0 5px #8b5cf6",
          transition: "width 0.12s ease, height 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease",
        }}
      />
    </div>
  );
}
