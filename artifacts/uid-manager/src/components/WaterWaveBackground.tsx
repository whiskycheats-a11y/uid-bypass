import { motion } from "framer-motion";

export function WaterWaveBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: -50,
        background:
          "radial-gradient(circle at center, #060816 0%, #02030d 60%, #01020a 100%)",
      }}
    >
      {/* Top Aurora */}
      <motion.div
        className="absolute -top-40 right-0 w-[700px] h-[700px] rounded-full"
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,255,.22) 0%, rgba(0,212,255,0) 70%)",
          filter: "blur(80px)",
          willChange: "transform, opacity",
        }}
      />

      {/* Bottom Aurora */}
      <motion.div
        className="absolute -bottom-52 -left-20 w-[800px] h-[800px] rounded-full"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.28, 0.15],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,.20) 0%, rgba(139,92,246,0) 70%)",
          filter: "blur(90px)",
          willChange: "transform, opacity",
        }}
      />

      {/* Center Energy Core */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-[420px] h-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        animate={{
          scale: [1, 1.04, 1],
          opacity: [0.4, 0.65, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,.08) 0%, rgba(120,119,255,.06) 40%, rgba(255,255,255,0) 70%)",
          filter: "blur(60px)",
          willChange: "transform, opacity",
        }}
      />

      {/* Floating Accent Glow */}
      <motion.div
        className="absolute left-[20%] top-[35%] w-40 h-40 rounded-full"
        animate={{
          y: [-20, 20, -20],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(circle, rgba(255,0,110,.35) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 20%, rgba(2,3,13,.75) 100%)",
        }}
      />

      {/* Lightweight Noise */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,.12) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
        }}
      />
    </div>
  );
}