"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SecurityGuard() {
  const [isBlocking, setIsBlocking] = useState(false);

  const showSecurityPopup = () => {
    if (!isBlocking) {
      setIsBlocking(true);
      setTimeout(async () => {
        await fetch("/api/auth/logout");
        window.location.href = "/login";
      }, 3000);
    }
  };

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showSecurityPopup();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
        showSecurityPopup();
      }
    };

    const handleSelect = (e: Event) => e.preventDefault();

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("selectstart", handleSelect);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("selectstart", handleSelect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlocking]);

  return (
    <AnimatePresence mode="wait">
      {isBlocking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-black flex items-center justify-center p-4 overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(255,255,255,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotateX: 20 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotateX: 0,
              x: [0, -2, 2, -2, 0],
            }}
            transition={{ duration: 0.4, type: "tween", ease: "easeInOut" }}
            className="bg-red-600 text-white rounded-3xl shadow-[0_0_150px_rgba(220,38,38,0.4)] p-0 w-full max-w-md text-center border-[6px] border-white/10 overflow-hidden relative"
          >
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="h-2 bg-yellow-300 w-full"
            />

            <div className="bg-red-700/60 p-6 sm:p-8 flex flex-col items-center gap-4 border-b-2 border-white/5">
              <div className="relative group">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-white blur-3xl rounded-full opacity-30"
                />
                <Ban className="w-16 h-16 sm:w-20 sm:h-20 text-white drop-shadow-[0_0_20px_rgba(255,255,255,1)] relative z-10" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic leading-none drop-shadow-md">
                  ACCESS DENIED
                </h1>
                <div className="inline-block bg-black/40 px-4 py-1.5 rounded-lg border border-white/10">
                  <p className="text-[10px] sm:text-[11px] text-yellow-300 font-bold uppercase tracking-[0.4em] leading-none">
                    Security protocol: uidbypass~v2
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent)]">
              <div className="space-y-1">
                <p className="text-lg font-black uppercase tracking-widest text-white italic">
                  Violation Detected
                </p>
                <p className="text-xs font-bold text-red-100/80 uppercase tracking-widest">
                  MotherFucker Fuck You Bitch!
                </p>
              </div>

              <div className="bg-black/30 rounded-2xl p-6 text-left border border-white/5 font-mono relative group overflow-hidden shadow-inner">
                <div className="absolute top-0 right-0 p-2 opacity-30">
                  <ShieldAlert className="w-4 h-4 text-white" />
                </div>

                <div className="space-y-1.5 opacity-90">
                  <p className="text-[9px] text-yellow-300/80 flex justify-between">
                    <span>{">"} DOM_INSPECTION_ATTEMPT</span>
                    <span className="text-white/50">BLOCKED</span>
                  </p>
                  <p className="text-[9px] text-yellow-300/80 flex justify-between">
                    <span>{">"} KEYBOARD_TRAP_F12</span>
                    <span className="text-white/50">INTERCEPTED</span>
                  </p>
                  <p className="text-[9px] text-yellow-300/80 flex justify-between">
                    <span>{">"} SOURCE_PROTECTION_ACTV</span>
                    <span className="text-white/50">LOCK_ON</span>
                  </p>
                  <p className="text-[9px] text-red-300 flex justify-between animate-pulse">
                    <span>{">"} SESSION_TERMINAL_AUTH</span>
                    <span>FORCE_EXIT</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/60 px-2 leading-none">
                  <span>System Lockout</span>
                  <span className="text-white">Active</span>
                </div>

                <div className="h-5 bg-black/40 rounded-full p-1 border border-white/10 overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 3, ease: "linear" }}
                    className="h-full bg-white rounded-full relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.5)_50%,transparent_100%)] animate-shimmer" />
                  </motion.div>
                </div>

                <p className="text-[9px] text-yellow-300 font-bold uppercase tracking-[0.2em] italic opacity-80 leading-snug">
                  Terminating Session and Clearing Cache Assets...
                </p>
              </div>
            </div>

            <div className="h-10 sm:h-12 bg-white flex items-center justify-center gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                  Live Monitor
                </span>
              </div>
              <div className="w-px h-5 bg-red-600/20" />
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest italic opacity-80">
                UID BYPASS Shield Activated
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
