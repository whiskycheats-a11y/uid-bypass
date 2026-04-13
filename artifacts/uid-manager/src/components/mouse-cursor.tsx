import { useEffect, useRef, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  hue: number;
}

export function MouseCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pos = useRef({ x: -200, y: -200 });
  const smoothPos = useRef({ x: -200, y: -200 });
  const glowPos = useRef({ x: -200, y: -200 });
  const particles = useRef<Particle[]>([]);
  const pid = useRef(0);
  const lastSpawn = useRef({ x: -200, y: -200 });
  const raf = useRef(0);
  const [hoveringBtn, setHoveringBtn] = useState(false);
  const hoverRef = useRef(false);
  const clickScale = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      const dx = e.clientX - lastSpawn.current.x;
      const dy = e.clientY - lastSpawn.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy);

      if (speed > 8) {
        const count = Math.min(Math.floor(speed / 10) + 1, 5);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = 1 + Math.random() * 2.5;
          particles.current.push({
            id: ++pid.current,
            x: e.clientX,
            y: e.clientY,
            vx: Math.cos(angle) * r * 0.7 - (dx / speed) * 0.5,
            vy: Math.sin(angle) * r * 0.7 - (dy / speed) * 0.5,
            life: 1,
            size: 1.5 + Math.random() * 2.5,
            hue: 260 + Math.random() * 80,
          });
        }
        lastSpawn.current = { x: e.clientX, y: e.clientY };
        if (particles.current.length > 80) {
          particles.current = particles.current.slice(-80);
        }
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isHover = !!(el && (el.tagName === "BUTTON" || el.closest("button") || el.tagName === "A" || el.closest("a")));
      if (isHover !== hoverRef.current) {
        hoverRef.current = isHover;
        setHoveringBtn(isHover);
      }
    };

    const onDown = () => { clickScale.current = 0.6; };
    const onUp = () => { clickScale.current = 1; };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    let t = 0;
    const draw = () => {
      raf.current = requestAnimationFrame(draw);
      t += 0.016;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const lerpSpeed = 0.18;
      smoothPos.current.x += (pos.current.x - smoothPos.current.x) * lerpSpeed;
      smoothPos.current.y += (pos.current.y - smoothPos.current.y) * lerpSpeed;

      const glowLerp = 0.07;
      glowPos.current.x += (pos.current.x - glowPos.current.x) * glowLerp;
      glowPos.current.y += (pos.current.y - glowPos.current.y) * glowLerp;

      clickScale.current += (1 - clickScale.current) * 0.2;

      const sc = clickScale.current;
      const cx = pos.current.x;
      const cy = pos.current.y;

      /* ── Soft ambient glow (slow follow) ── */
      const glowR = hoverRef.current ? 90 : 70;
      const grd = ctx.createRadialGradient(glowPos.current.x, glowPos.current.y, 0, glowPos.current.x, glowPos.current.y, glowR);
      grd.addColorStop(0, `rgba(139,92,246,${hoverRef.current ? 0.18 : 0.11})`);
      grd.addColorStop(0.5, `rgba(139,92,246,0.04)`);
      grd.addColorStop(1, "rgba(139,92,246,0)");
      ctx.beginPath();
      ctx.arc(glowPos.current.x, glowPos.current.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      /* ── Particles ── */
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= 0.04;

        if (p.life <= 0) continue;
        const a = p.life;
        const r = p.size * p.life;

        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.5);
        pg.addColorStop(0, `hsla(${p.hue},90%,75%,${a * 0.9})`);
        pg.addColorStop(1, `hsla(${p.hue},90%,60%,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
      }
      particles.current = particles.current.filter((p) => p.life > 0);

      /* ── Cursor dot ── */
      const dotR = hoverRef.current ? 5 * sc : 4 * sc;
      const dotGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
      dotGrd.addColorStop(0, `rgba(200,170,255,${0.95 * sc})`);
      dotGrd.addColorStop(0.4, `rgba(139,92,246,${0.7 * sc})`);
      dotGrd.addColorStop(1, "rgba(139,92,246,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, dotR * 3, 0, Math.PI * 2);
      ctx.fillStyle = dotGrd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(230,210,255,0.95)";
      ctx.shadowColor = "#8b5cf6";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      /* ── Hover ring (smooth follow pos, not instant) ── */
      if (hoverRef.current) {
        const ringR = 22 * sc;
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.beginPath();
        ctx.arc(smoothPos.current.x, smoothPos.current.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139,92,246,${0.55 + pulse * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#8b5cf6";
        ctx.shadowBlur = 10 + pulse * 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
}
