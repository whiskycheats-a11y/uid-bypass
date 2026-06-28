"use client";

import { useState } from "react";
// Custom Auth
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, KeyRound, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let deviceToken = localStorage.getItem("deviceToken");
      if (!deviceToken) {
        deviceToken = crypto.randomUUID();
        localStorage.setItem("deviceToken", deviceToken);
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, deviceToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An unexpected error occurred.");
      } else {
        router.push("/dashboard");
      }
    } catch (_err: unknown) {
      console.error(_err);
      const errMsg = _err instanceof Error ? _err.message : String(_err);
      setError(`Network Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* PREMIUM BACKGROUND EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#06060f]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen animate-float-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-premium rounded-2xl p-8 sm:p-10 relative overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.1)]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/20 flex items-center justify-center mb-6"
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-400 text-sm text-center">
              Sign in to manage your UID bypass access and resellers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                required
                icon={<ShieldCheck className="w-4 h-4 text-slate-500" />}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                icon={<KeyRound className="w-4 h-4 text-slate-500" />}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 py-2 rounded-lg"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-slate-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
              >
                Create one now
              </Link>
            </p>
            <p className="text-sm text-slate-400">
              Need help?{" "}
              <a href="https://discord.gg/QTwupjcKre" target="_blank" rel="noreferrer" className="text-blue-400 font-medium hover:text-blue-300 transition-colors inline-flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" /> Join our Discord
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
