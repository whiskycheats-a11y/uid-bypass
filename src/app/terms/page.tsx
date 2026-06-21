"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-[#03030a] text-slate-300 selection:bg-violet-500/30 font-sans relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="absolute w-[800px] h-[800px] bg-violet-600/20 blur-[120px] rounded-full top-[-200px] left-[-200px]" />
        <div className="absolute w-[600px] h-[600px] bg-fuchsia-600/10 blur-[100px] rounded-full bottom-[-100px] right-[-100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="glass-premium p-8 md:p-12 rounded-3xl border border-white/10">
          <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 flex items-center justify-center border border-violet-500/30">
              <ShieldAlert className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Terms of Service</h1>
              <p className="text-slate-400 mt-1">Last Updated: June 2026</p>
            </div>
          </motion.div>

          <div className="space-y-8 text-base leading-relaxed text-slate-300">
            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of the Dark Arts</h2>
              <p className="mb-4">
                By accessing, purchasing, or using the UID Bypass infrastructure, you are entering into a binding agreement. You acknowledge that this software operates at the kernel level and alters hardware identification strings. If you lack the technical competence to understand what that entails, step away now. 
              </p>
              <p>
                We provide the tools; you provide the intent. By using this service, you agree that you are utilizing this software strictly for educational analysis, hardware testing, or environments where you have explicit authorization to bypass identification protocols.
              </p>
            </motion.section>

            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">2. Reseller Accountability & The Chain of Command</h2>
              <p className="mb-4">
                As a Reseller, you are the absolute point of contact for your end-users. We do not provide end-user support. Your panel, your clients, your responsibility. If your users are incompetent, that falls on you.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li>You are explicitly forbidden from reverse-engineering the loader.</li>
                <li>You will not attempt to sniff, intercept, or reroute our API traffic.</li>
                <li>Account sharing, credential stuffing, or attempting to brute-force the reseller portal will result in an immediate, unappealable hardware ban and termination of your master account.</li>
              </ul>
            </motion.section>

            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">3. The Zero Refund Doctrine</h2>
              <p className="mb-4">
                Digital goods are irretrievable once transmitted. Therefore, <strong className="text-violet-400">ALL SALES ARE FINAL</strong>.
              </p>
              <p>
                There are absolutely no refunds, pro-rates, or chargebacks authorized under any circumstances. If the software is temporarily down for an update, you wait. If a specific game updates its anti-cheat architecture and we need 48 hours to rewrite our kernel driver, you wait. Initiating a chargeback will instantly permanently blacklist your hardware, IP, and associated payment methods across our entire network and affiliate networks.
              </p>
            </motion.section>

            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">4. Liability & Indemnification</h2>
              <p className="mb-4">
                We provide this software "AS IS" without any warranties, express or implied. We are not responsible for any bans, account suspensions, hardware damage, or loss of digital assets that occur while using our software. 
              </p>
              <p>
                You use this at your own absolute risk. We guarantee our spoofing methodologies are state-of-the-art, but the digital landscape is a perpetual arms race. You acknowledge that anti-cheat systems evolve, and we hold zero liability for the consequences of your usage.
              </p>
            </motion.section>

            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">5. Termination & Blacklisting</h2>
              <p>
                We reserve the right to terminate your access, revoke your UIDs, and blacklist your hardware at our sole discretion, without notice, for any reason. Common reasons include: disrespecting staff, attempting to crack the software, leaking files to competitors, or being generally insufferable. Play smart, make your money, and keep your head down.
              </p>
            </motion.section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
