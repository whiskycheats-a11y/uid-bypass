import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  
  // useMotionValue avoids React state re-renders on every mouse move (fixes lag)
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  // Spring config for smooth trailing effect
  const springConfigDot = { damping: 40, stiffness: 1000, mass: 0.1 };
  const dotX = useSpring(cursorX, springConfigDot);
  const dotY = useSpring(cursorY, springConfigDot);

  const springConfigRing = { damping: 28, stiffness: 400, mass: 0.5 };
  const ringX = useSpring(cursorX, springConfigRing);
  const ringY = useSpring(cursorY, springConfigRing);

  useEffect(() => {
    // 🚀 PERFORMANCE BOOST: RAF throttle ensures we don't update state more than 60 times a second
    let tickingPos = false;
    const updateMousePosition = (e: MouseEvent) => {
      if (!tickingPos) {
        requestAnimationFrame(() => {
          cursorX.set(e.clientX);
          cursorY.set(e.clientY);
          tickingPos = false;
        });
        tickingPos = true;
      }
    };

    let tickingHover = false;
    const handleMouseOver = (e: MouseEvent) => {
      if (!tickingHover) {
        requestAnimationFrame(() => {
          const target = e.target as HTMLElement;
          // 🚀 PERFORMANCE BOOST: Simplified closest check to reduce DOM traversal lag
          if (
            target.tagName === "BUTTON" ||
            target.tagName === "A" ||
            target.tagName === "INPUT" ||
            target.closest("button, a, .cursor-pointer")
          ) {
            setIsHovering(true);
          } else {
            setIsHovering(false);
          }
          tickingHover = false;
        });
        tickingHover = true;
      }
    };

    window.addEventListener("mousemove", updateMousePosition, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [cursorX, cursorY]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-violet-500 rounded-full pointer-events-none z-[9999] mix-blend-screen hidden md:block"
        style={{
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          willChange: "transform" // 🚀 PERFORMANCE BOOST: GPU Acceleration
        }}
        animate={{
          scale: isHovering ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-5 h-5 border-[1.5px] border-cyan-400/50 rounded-full pointer-events-none z-[9999] hidden md:flex items-center justify-center bg-cyan-400/5"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          willChange: "transform" // 🚀 PERFORMANCE BOOST: GPU Acceleration
        }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          borderColor: isHovering ? "rgba(124, 58, 237, 0.5)" : "rgba(34, 211, 238, 0.5)"
        }}
        transition={{ duration: 0.2 }}
      />
    </>
  );
}
