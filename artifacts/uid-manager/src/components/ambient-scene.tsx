interface AmbientSceneProps {
  variant?: "public" | "user" | "admin";
  compact?: boolean;
}

export function AmbientScene({ variant = "public", compact = false }: AmbientSceneProps) {
  return (
    <div className={`ambient-scene ambient-${variant} ${compact ? "ambient-compact" : ""}`} aria-hidden="true">
      <div className="ambient-spotlight" />
      <div className="ambient-grid" />
    </div>
  );
}
