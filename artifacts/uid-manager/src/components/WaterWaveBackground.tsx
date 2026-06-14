import { memo } from "react";
import { motion } from "framer-motion";

/**
 * Optimized Water Wave Background Component
 * 
 * Performance improvements:
 * - GPU acceleration via transform: translate3d(0,0,0)
 * - backface-visibility: hidden to reduce paint cycles
 * - Reduced noise pattern density
 * - Optimized scale ranges for smoother animations
 * - React.memo to prevent unnecessary re-renders
 * - contain: strict on container for layout containment
 */
export const WaterWaveBackground = memo(function WaterWaveBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: -50,
        contain: "strict",
        background:
          "radial-gradient(circle at center, #060816 0%, #02030d 60%, #01020a 100%)",
      }}
    >
      {/* Top Aurora - GPU accelerated */}
      <motion.div
        className="absolute -top-40 right-0 rounded-full"
        style={{
          width: "min(700px, 90vw)",
          height: "min(700px, 90vw)",
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          background:
            "radial-gradient(circle, rgba(0,212,255,0.18) 0%, rgba(0,212,255,0.06) 45%, rgba(0,212,255,0) 70%)",
          willChange: "transform, opacity",
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Bottom Aurora - GPU accelerated */}
      <motion.div
        className="absolute -bottom-52 -left-20 rounded-full"
        style={{
          width: "min(800px, 95vw)",
          height: "min(800px, 95vw)",
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.04) 45%, rgba(139,92,246,0) 70%)",
          willChange: "transform, opacity",
        }}
        animate={{
          scale: [1, 1.07, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Center Energy Core */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: "min(420px, 60vw)",
          height: "min(420px, 60vw)",
          transform: "translate3d(-50%, -50%, 0)",
          backfaceVisibility: "hidden",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(120,119,255,0.04) 35%, rgba(255,255,255,0) 70%)",
          willChange: "transform, opacity",
        }}
        animate={{
          scale: [1, 1.03, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating Accent Glow - GPU accelerated Y translation */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: "20%",
          top: "35%",
          width: "min(160px, 25vw)",
          height: "min(160px, 25vw)",
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          background:
            "radial-gradient(circle, rgba(255,0,110,0.22) 0%, rgba(255,0,110,0.05) 45%, transparent 70%)",
          willChange: "transform, opacity",
        }}
        animate={{
          y: [-15, 15, -15],
          opacity: [0.15, 0.28, 0.15],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Vignette - static, no animation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 20%, rgba(2,3,13,0.8) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Optimized Lightweight Noise - reduced density */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.008,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
          pointerEvents: "none",
        }}
      />
    </div>
  );
});