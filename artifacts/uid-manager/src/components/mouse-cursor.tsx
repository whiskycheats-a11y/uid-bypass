import { useEffect, useRef } from "react";

export function MouseCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const raf = useRef(0);
  const hovering = useRef(false);
  const clicking = useRef(false);

  useEffect(() => {
    const dot = dotRef.current;
    const ringEl = ringRef.current;
    if (!dot || !ringEl) return;

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isHover = !!(el && (el.tagName === "BUTTON" || el.closest("button") || el.tagName === "A" || el.closest("a") || (el as HTMLElement).closest("[role=button]")));

      if (isHover !== hovering.current) {
        hovering.current = isHover;
        if (isHover) {
          dot.style.transform = "translate(-50%,-50%) scale(2)";
          dot.style.backgroundColor = "rgba(139,92,246,0.4)";
          dot.style.border = "1px solid rgba(200,180,255,0.8)";
          ringEl.style.width = "34px";
          ringEl.style.height = "34px";
          ringEl.style.borderColor = "rgba(139,92,246,0.7)";
          ringEl.style.boxShadow = "0 0 20px rgba(139,92,246,0.35)";
        } else {
          dot.style.transform = "translate(-50%,-50%) scale(1)";
          dot.style.backgroundColor = "rgba(200,185,255,0.9)";
          dot.style.border = "none";
          ringEl.style.width = "22px";
          ringEl.style.height = "22px";
          ringEl.style.borderColor = "rgba(160,130,255,0.4)";
          ringEl.style.boxShadow = "none";
        }
      }
    };

    const onDown = () => {
      clicking.current = true;
      dot.style.transform = `translate(-50%,-50%) scale(${hovering.current ? 1.5 : 0.5})`;
      ringEl.style.transform = "translate(-50%,-50%) scale(0.85)";
    };

    const onUp = () => {
      clicking.current = false;
      dot.style.transform = `translate(-50%,-50%) scale(${hovering.current ? 2 : 1})`;
      ringEl.style.transform = "translate(-50%,-50%) scale(1)";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    const animate = () => {
      raf.current = requestAnimationFrame(animate);
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;

      dot.style.left = mouse.current.x + "px";
      dot.style.top = mouse.current.y + "px";

      ringEl.style.left = ring.current.x + "px";
      ringEl.style.top = ring.current.y + "px";
    };

    animate();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <>
      {/* Dot — snaps instantly */}
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "rgba(200,185,255,0.9)",
          boxShadow: "0 0 8px rgba(139,92,246,0.8)",
          pointerEvents: "none",
          zIndex: 99999,
          left: -100,
          top: -100,
          transform: "translate(-50%,-50%)",
          transition: "transform 0.15s ease, background-color 0.2s ease, border 0.2s ease, width 0.2s ease, height 0.2s ease",
          willChange: "left, top",
        }}
      />

      {/* Ring — follows smoothly */}
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "1.5px solid rgba(160,130,255,0.4)",
          pointerEvents: "none",
          zIndex: 99998,
          left: -100,
          top: -100,
          transform: "translate(-50%,-50%)",
          transition: "width 0.25s ease, height 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.12s ease",
          willChange: "left, top",
        }}
      />
    </>
  );
}
