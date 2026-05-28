import { useEffect, useRef } from "react";
import { Activity, Database, Fingerprint, Radar, ShieldCheck } from "lucide-react";

interface AmbientSceneProps {
  variant?: "public" | "user" | "admin";
  compact?: boolean;
}

const variantLabels = {
  public: ["Gateway", "Auth Mesh", "Live Scan"],
  user: ["UID Queue", "Token Core", "Access Relay"],
  admin: ["Clients", "Payments", "Policy"],
};

export function AmbientScene({ variant = "public", compact = false }: AmbientSceneProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      el.style.setProperty("--mx", `${x * 28}deg`);
      el.style.setProperty("--my", `${y * -22}deg`);
      el.style.setProperty("--px", `${event.clientX}px`);
      el.style.setProperty("--py", `${event.clientY}px`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const labels = variantLabels[variant];

  return (
    <div ref={ref} className={`ambient-scene ambient-${variant} ${compact ? "ambient-compact" : ""}`} aria-hidden="true">
      <div className="ambient-spotlight" />
      <div className="ambient-grid" />
      <div className="ambient-scanline" />

      <div className="ambient-core">
        <div className="core-ring core-ring-a" />
        <div className="core-ring core-ring-b" />
        <div className="core-ring core-ring-c" />
        <div className="core-cube">
          <span className="cube-face cube-front"><ShieldCheck /></span>
          <span className="cube-face cube-back"><Fingerprint /></span>
          <span className="cube-face cube-right"><Radar /></span>
          <span className="cube-face cube-left"><Activity /></span>
          <span className="cube-face cube-top"><Database /></span>
          <span className="cube-face cube-bottom"><ShieldCheck /></span>
        </div>
      </div>

      <div className="ambient-node node-a">
        <span>{labels[0]}</span>
      </div>
      <div className="ambient-node node-b">
        <span>{labels[1]}</span>
      </div>
      <div className="ambient-node node-c">
        <span>{labels[2]}</span>
      </div>
    </div>
  );
}
