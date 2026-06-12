import React, { useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   ✦  Celestial Nebula — Premium Interactive Background
   ─────────────────────────────────────────────────────────────────
   Layers (bottom → top):
     1. Deep-space radial base (#050016)
     2. Three large GPU-accelerated CSS gradient orbs (animate-float)
     3. Lightweight HTML5 Canvas particle constellation (mouse-reactive)
     4. Subtle SVG film-grain texture overlay
     5. Radial vignette
   No WebGL. Pure CSS + Canvas2D → buttery 60 fps on any device.
   ═══════════════════════════════════════════════════════════════════ */

// ─── Interactive Canvas Particles ──────────────────────────────────
function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mouse = useRef({ x: -1000, y: -1000 });
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; r: number; o: number }[]>([]);
  const raf = useRef(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);

    // Reduce count on mobile for performance
    const count = window.innerWidth < 768 ? 45 : 90;
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.5 + 0.5,
      o: Math.random() * 0.5 + 0.15,
    }));
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    init();

    const handleResize = () => init();
    const handleMouse = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    const handleTouch = (e: TouchEvent) => {
      mouse.current.x = e.touches[0].clientX;
      mouse.current.y = e.touches[0].clientY;
    };
    const handleLeave = () => {
      mouse.current.x = -1000;
      mouse.current.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouse, { passive: true });
    window.addEventListener("touchmove", handleTouch, { passive: true });
    window.addEventListener("mouseleave", handleLeave);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const pts = particles.current;
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const connectDist = 140;
      const mouseDist = 200;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        // Gentle mouse repulsion
        const dmx = p.x - mx;
        const dmy = p.y - my;
        const dm = Math.sqrt(dmx * dmx + dmy * dmy);
        if (dm < mouseDist && dm > 0) {
          const force = (mouseDist - dm) / mouseDist * 0.015;
          p.vx += (dmx / dm) * force;
          p.vy += (dmy / dm) * force;
        }

        // Dampen velocity
        p.vx *= 0.995;
        p.vy *= 0.995;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 200, 255, ${p.o})`;
        ctx.fill();

        // Constellation lines between nearby particles
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = dx * dx + dy * dy;
          if (d < connectDist * connectDist) {
            const alpha = (1 - Math.sqrt(d) / connectDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(140, 160, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // Lines to mouse cursor
        if (dm < mouseDist) {
          const alpha = (1 - dm / mouseDist) * 0.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(120, 140, 255, ${alpha})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, [canvasRef, init]);
}

export function WaterWaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticleCanvas(canvasRef);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: "#050016" }}>

      {/* ── Layer 1 : Deep-space radial gradients ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 60%, rgba(88, 28, 135, 0.25) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 30%, rgba(14, 116, 144, 0.2) 0%, transparent 55%),
            radial-gradient(ellipse 50% 60% at 50% 100%, rgba(124, 58, 237, 0.12) 0%, transparent 50%)
          `,
        }}
      />

      {/* ── Layer 2 : Animated gradient orbs (GPU-accelerated) ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Orb 1 — large violet */}
        <div
          className="absolute rounded-full"
          style={{
            width: "55vmax",
            height: "55vmax",
            left: "-8%",
            top: "5%",
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, rgba(124, 58, 237, 0) 70%)",
            filter: "blur(60px)",
            animation: "orb-float-1 18s ease-in-out infinite",
            willChange: "transform",
          }}
        />
        {/* Orb 2 — cyan/teal */}
        <div
          className="absolute rounded-full"
          style={{
            width: "45vmax",
            height: "45vmax",
            right: "-5%",
            top: "15%",
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.14) 0%, rgba(6, 182, 212, 0) 70%)",
            filter: "blur(50px)",
            animation: "orb-float-2 22s ease-in-out infinite",
            willChange: "transform",
          }}
        />
        {/* Orb 3 — pink/rose accent */}
        <div
          className="absolute rounded-full"
          style={{
            width: "35vmax",
            height: "35vmax",
            left: "30%",
            bottom: "-10%",
            background: "radial-gradient(circle, rgba(219, 39, 119, 0.1) 0%, rgba(219, 39, 119, 0) 70%)",
            filter: "blur(55px)",
            animation: "orb-float-3 26s ease-in-out infinite",
            willChange: "transform",
          }}
        />
      </div>

      {/* ── Layer 3 : Interactive canvas particles ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.7 }}
      />

      {/* ── Layer 4 : Film grain ── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* ── Layer 5 : Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, #050016 100%)",
          opacity: 0.65,
        }}
      />
    </div>
  );
}
