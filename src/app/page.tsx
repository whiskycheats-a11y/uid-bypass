"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] selection:bg-violet-500/30">
      {/* PREMIUM BACKGROUND EFFECTS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none bg-[#06060f]">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-600/30 rounded-full blur-[120px] mix-blend-screen animate-float-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-fuchsia-600/20 rounded-full blur-[120px] mix-blend-screen animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen animate-float-slow" style={{ animationDelay: '-5s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">UID<span className="text-violet-400">Bypass</span></span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login">
              <Button variant="ghost" className="hidden sm:inline-flex text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-300 rounded-full px-6">
                Reseller Login
              </Button>
            </a>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 transition-all duration-300 text-white font-medium rounded-full px-6">
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center max-w-4xl mx-auto relative z-10"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-violet-500/30 text-violet-300 text-sm font-medium mb-8 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Status: Undetected (v2.4.1)
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              The Ultimate <span className="gradient-text">UID Bypass</span> Infrastructure
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
              Enterprise-grade hardware spoofing and UID management for serious resellers. High margins, 99.9% uptime, and impenetrable security.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.5)] hover:-translate-y-1 transition-all duration-300 group">
                  Become a Reseller
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full h-14 px-8 text-lg glass hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 group">
                  Panel Login
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform text-slate-400" />
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Engineered for Dominance
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-slate-400 max-w-2xl mx-auto"
            >
              Stop worrying about bans. Focus on your sales while we handle the heavy lifting.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative z-10">
            {[
              {
                icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
                title: "Ring-0 Protection",
                desc: "Kernel-level driver execution ensures total invisibility from modern anti-cheat systems."
              },
              {
                icon: <Zap className="w-8 h-8 text-amber-400" />,
                title: "Instant Generation",
                desc: "Generate and deliver UIDs to your customers instantly via our optimized REST API."
              },
              {
                icon: <Activity className="w-8 h-8 text-blue-400" />,
                title: "Live Telemetry",
                desc: "Monitor your bypass usage, active injections, and customer statistics in real-time."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: "easeOut" }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="glass-card p-8 bg-white/[0.01] hover:bg-white/[0.03] transition-colors duration-300 border border-white/5 hover:border-violet-500/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] group rounded-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-32 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-violet-300 transition-colors">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats/Social Proof */}
        <section className="max-w-7xl mx-auto px-6 py-20 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl p-8 md:p-12 border border-white/10 overflow-hidden relative shadow-[0_0_40px_rgba(139,92,246,0.1)] hover:border-violet-500/20 transition-colors"
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-violet-500/20 rounded-full blur-[60px] animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
              {[
                { label: "Status", value: "Undetected" },
                { label: "Execution", value: "Ring-0" },
                { label: "Uptime", value: "99.9%" },
                { label: "Delivery", value: "Instant API" },
              ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  className="text-center group"
                >
                  <div className="text-3xl md:text-4xl font-black text-white mb-2 group-hover:scale-110 transition-transform group-hover:text-violet-400">{stat.value}</div>
                  <div className="text-sm font-medium text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-semibold tracking-tight">Uid Bypass &copy; 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <a href="https://discord.gg/QTwupjcKre" target="_blank" rel="noreferrer" className="hover:text-violet-400 transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
