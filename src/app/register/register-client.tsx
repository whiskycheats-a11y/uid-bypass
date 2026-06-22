"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, KeyRound, Mail, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Gift, Check, Ban } from "lucide-react";

export function RegisterClient({ trialEnabled }: { trialEnabled: boolean }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed.");
        setLoading(false);
        return;
      }

      // Auto login after registration
      const signInRes = await signIn("credentials", {
        identifier: formData.username, // Using username to login
        password: formData.password,
        redirect: false,
      });

      if (signInRes?.error) {
        // If auto-login fails, redirect to login page
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch (_err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl relative z-10 my-8 grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="glass-premium rounded-2xl p-8 sm:p-10 order-2 md:order-1 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
              Create Account
            </h1>
            <p className="text-slate-400 text-sm text-center">
              Join UID BYPASS RESELLER Panel for the best UID Bypass experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
                required
                icon={<User className="w-4 h-4 text-slate-500" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
                icon={<Mail className="w-4 h-4 text-slate-500" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
                icon={<KeyRound className="w-4 h-4 text-slate-500" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
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
              className="w-full h-12 text-base group mt-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
              >
                Sign in
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

        {/* New User Benefits */}
        <div className="glass-premium rounded-2xl p-8 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/5 border-indigo-500/20 order-1 md:order-2 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5 text-indigo-400" /> New User Benefits
          </h2>
          
          <ul className="space-y-4 text-sm text-slate-300">
            <li className={`flex items-center gap-3 ${!trialEnabled ? "text-slate-500" : "text-white"}`}>
              {trialEnabled ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Ban className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className={!trialEnabled ? "line-through opacity-70" : "font-medium"}>
                1 Paid UID Trial {!trialEnabled && "(Not Available Now)"}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Full API Access</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-amber-400 shrink-0" />
              <span>UID Management Tools</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Discord Support</span>
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
