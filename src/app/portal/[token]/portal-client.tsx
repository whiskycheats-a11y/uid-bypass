"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PortalClientProps {
  portalToken: string;
  brandName: string;
  durationHours: number;
}

export function PortalClient({ portalToken, brandName, durationHours }: PortalClientProps) {
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/portals/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalToken, uid }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", message: `Successfully activated for ${durationHours / 24} days!` });
        setUid("");
      } else {
        setResult({ type: "error", message: data.message || "Failed to whitelist." });
      }
    } catch (_err) {
      setResult({ type: "error", message: "Network error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/15 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/20 flex items-center justify-center mb-6"
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2 text-center">
              {brandName}
            </h1>
            <p className="text-slate-400 text-sm text-center">
              Whitelist your UID for {durationHours / 24} days of free access.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="uid">Your UID</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                </div>
                <Input
                  id="uid"
                  type="text"
                  placeholder="Enter your numeric UID"
                  className="pl-10"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  disabled={loading || result?.type === "success"}
                  required
                  pattern="\d+"
                />
              </div>
            </div>

            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`text-sm text-center py-2 rounded-lg ${
                  result.type === "success" 
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" 
                    : "bg-red-500/10 text-red-300 border border-red-500/20"
                }`}
              >
                {result.message}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base group"
              disabled={loading || result?.type === "success"}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : result?.type === "success" ? (
                "Activated"
              ) : (
                <>
                  Whitelist UID
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Powered by UID BYPASS Shield
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
