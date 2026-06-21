"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { EyeOff, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
        <div className="absolute w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full top-[-200px] right-[-200px]" />
        <div className="absolute w-[600px] h-[600px] bg-violet-600/10 blur-[100px] rounded-full bottom-[-100px] left-[-100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="glass-premium p-8 md:p-12 rounded-3xl border border-white/10">
          <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 flex items-center justify-center border border-blue-500/30">
              <EyeOff className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Privacy Policy</h1>
              <p className="text-slate-400 mt-1">Ghost Protocol Activated. Last Updated: June 2026</p>
            </div>
          </motion.div>

          <div className="space-y-8 text-base leading-relaxed text-slate-300">
            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">1. Our Philosophy on Data</h2>
              <p className="mb-4">
                We operate on a simple, foundational principle: <strong className="text-blue-400">Logs are liabilities.</strong>
              </p>
              <p>
                What we do not have, we cannot lose, leak, or surrender. Our infrastructure is designed from the ground up to minimize data retention. We collect absolutely the bare minimum required to maintain your active session and authorize your UIDs. Beyond that, your business is your business.
              </p>
            </motion.section>

            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">2. What We Actually Collect</h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li><strong className="text-slate-200">Account Credentials:</strong> Hashed passwords using bcrypt. We don't know your password.</li>
                <li><strong className="text-slate-200">HWID Hashes:</strong> We store one-way cryptographic hashes of hardware IDs to authenticate devices. We do not store the raw hardware serials of your end-users.</li>
                <li><strong className="text-slate-200">Active UIDs:</strong> Simply the strings representing active subscriptions in the database.</li>
              </ul>
            </motion.section>

            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">3. What We Destroy</h2>
              <p className="mb-4">
                We do not track IP addresses beyond temporary rate-limiting buffers. We do not use Google Analytics, Facebook Pixels, or any third-party corporate surveillance scripts. There are no tracking cookies here.
              </p>
              <p>
                When a UID expires or is purged from the panel, it is hard-deleted from our database. No soft-deletes. No archives. It ceases to exist.
              </p>
            </motion.section>

            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">4. Third-Party Sharing</h2>
              <p className="mb-4">
                We share data with absolutely no one. We don't sell data, we don't rent data, and our servers are located in offshore jurisdictions that do not play nicely with digital subpoenas. 
              </p>
            </motion.section>

            <motion.section variants={itemVariants}>
              <h2 className="text-xl font-bold text-white mb-4">5. Security Infrastructure</h2>
              <p>
                The database is heavily encrypted at rest. Traffic is routed through enterprise-grade DDoS mitigation and secured via TLS 1.3. We employ aggressive sanitization on all API inputs. We assume the environment is hostile, and we build our walls accordingly.
              </p>
            </motion.section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
