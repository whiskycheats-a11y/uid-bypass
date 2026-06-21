"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DownloadCloud, Shield, Laptop, Book, Bot, Code, Info, Terminal, LifeBuoy, ExternalLink, MessageCircle, MessageSquare, ShieldAlert, Cpu, FileArchive, Lock, Loader2, Sparkles, Zap, Globe, LayoutDashboard } from "lucide-react";
import { SiDiscord, SiPython, SiJavascript } from "react-icons/si";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";

export function DownloadsClient({ uidLimit }: { uidLimit: number }) {
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Custom EXE State
  const [brandName, setBrandName] = useState("");
  const [devName, setDevName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationMethod, setGenerationMethod] = useState<"ALPHA" | "OMEGA" | null>(null);

  const toggleCode = (code: string) => setActiveCode(activeCode === code ? null : code);

  const steps = [
    "[✓] Initializing encryption methods...",
    "[✓] Allocating memory buffers...",
    "[✓] Injecting custom vendor branding strings...",
    "[✓] Applying zytrone obfuscation...",
    "[✓] Compiling secure runtime wrapper...",
    "[✓] Finalizing binary headers and signing...",
    "[✓] Generation complete(Exe Ready). Ready for deployment."
  ];

  const handleGenerate = async (method: "ALPHA" | "OMEGA", isGlobal: boolean) => {
    setGenerationMethod(method);
    setIsGenerating(true);
    setGenerationStep(0);

    try {
      // Simulate generation animation for UX
      for (let i = 0; i < steps.length - 1; i++) {
        setGenerationStep(i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Final step: downloading
      setGenerationStep(steps.length - 1);

      const response = await fetch("/api/downloads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: isGlobal ? "UID BYPASS GLOBAL" : brandName,
          devName: isGlobal ? "uidbypass.online" : devName,
          method
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate");
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract filename from Content-Disposition if present, else fallback
      const cd = response.headers.get("content-disposition");
      let filename = "bypass" + (method === "ALPHA" ? ".exe" : ".zip");
      if (cd && cd.includes("filename=")) {
        filename = cd.split("filename=")[1].replace(/"/g, "");
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      // Silently catch the error to prevent Next.js from throwing a red overlay
      // The user is notified via the alert below
      alert("Generation failed. Please check your internet connection or server status.");
    } finally {
      setIsGenerating(false);
      setIsGlobalModalOpen(false);
      setIsCustomModalOpen(false);
      setGenerationMethod(null);
    }
  };

  // CSS animations used instead of framer-motion stagger for performance

  return (
    <div className="space-y-12 pb-12 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/40 via-black to-emerald-900/20 border border-white/10 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-500/15 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-emerald-500/8 blur-[60px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Next-Generation Tools
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight mb-4">
            Downloads & Integrations
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Make Bypass Windows executables, integrate our powerful Discord bot, or build your own custom solutions via our REST API.
          </p>
        </div>
      </div>

      {/* Main Tools Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Bypass EXE Card */}
        <div className="group relative h-full">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
          <Card className="relative h-full glass-card border-white/10 bg-black/50 backdrop-blur-xl flex flex-col justify-between overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <Laptop className="w-6 h-6 text-blue-400" />
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  Windows 10/11
                </div>
              </div>
              <CardTitle className="text-2xl text-white font-bold">Bypass Client</CardTitle>
              <CardDescription className="text-slate-400 text-base">The Bypass executable to bypass emulator.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 flex-1 flex flex-col justify-end">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 rounded-lg p-2 border border-white/5"><Zap className="w-4 h-4 text-amber-400" /> 1-Click Operation</div>
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 rounded-lg p-2 border border-white/5"><ShieldAlert className="w-4 h-4 text-emerald-400" /> Auto-Updates</div>
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 rounded-lg p-2 border border-white/5"><Globe className="w-4 h-4 text-blue-400" /> Web Synced</div>
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 rounded-lg p-2 border border-white/5"><LayoutDashboard className="w-4 h-4 text-purple-400" /> Tray Integration</div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <Button
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 transition-all"
                  onClick={() => setIsGlobalModalOpen(true)}
                >
                  <DownloadCloud className="w-5 h-5 mr-2" /> Download Global Client
                </Button>

                <div className="relative group/btn">
                  <Button
                    variant="outline"
                    disabled={uidLimit < 25}
                    className={`w-full h-12 border transition-all duration-300 ${uidLimit >= 25 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-white shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]" : "border-white/10 bg-black/40 text-slate-500"}`}
                    onClick={() => setIsCustomModalOpen(true)}
                  >
                    <Shield className="w-4 h-4 mr-2" /> Generate Custom EXE
                    {uidLimit < 25 && <Lock className="w-4 h-4 ml-2 opacity-50" />}
                  </Button>
                  {uidLimit < 25 && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[240px] bg-black/90 border border-red-500/30 text-red-400 text-xs text-center py-2 px-3 rounded shadow-xl opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 z-10">
                      Requires 25+ Paid UIDs to unlock the Custom EXE White-Label builder
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Discord Bot Card */}
        <div className="group relative h-full">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
          <Card className="relative h-full glass-card border-white/10 bg-black/50 backdrop-blur-xl flex flex-col justify-between overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  <Bot className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                  Official Bot
                </div>
              </div>
              <CardTitle className="text-2xl text-white font-bold">Discord Integration</CardTitle>
              <CardDescription className="text-slate-400 text-base">Manage users directly from your Discord server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 flex-1 flex flex-col justify-end">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 rounded-lg p-2 border border-white/5"><Terminal className="w-4 h-4 text-purple-400" /> Slash Commands</div>
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 rounded-lg p-2 border border-white/5"><Shield className="w-4 h-4 text-amber-400" /> Role Access</div>
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 rounded-lg p-2 border border-white/5"><MessageSquare className="w-4 h-4 text-emerald-400" /> Live Webhooks</div>
                <div className="flex items-center gap-2 text-slate-300 bg-white/5 rounded-lg p-2 border border-white/5"><Globe className="w-4 h-4 text-blue-400" /> Multi-Server</div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <Button
                  className="w-full h-12 bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-lg shadow-[#5865F2]/25 transition-all"
                  onClick={() => window.open('https://discord.com/oauth2/authorize?client_id=1425099105327124613', '_blank')}
                >
                  <SiDiscord className="w-5 h-5 mr-2" /> Add Bot to Server
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                  onClick={() => window.open('/dashboard/documentation', '_self')}
                >
                  <Book className="w-4 h-4 mr-2" /> Bot Setup Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OS-Style Terminal Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Code className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">API Integration</h2>
            <p className="text-sm text-slate-400">Build your own custom tools using our REST architecture.</p>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-white font-medium text-sm">Authentication Required</h4>
            <p className="text-sm text-blue-200/70 mt-1">
              All requests require your unique API key. Grab yours from the <a href="/dashboard/api-access" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">API Access</a> page.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {["python", "js", "curl"].map((lang) => (
            <Card key={lang} className="glass-card overflow-hidden bg-black/60 border-white/10 hover:border-white/20 transition-colors shadow-xl">
              <div
                className="bg-[#1e1e1e] border-b border-white/5 px-4 py-3 flex items-center justify-between cursor-pointer"
                onClick={() => toggleCode(lang)}
              >
                <div className="flex items-center gap-3">
                  {/* OS window dots */}
                  <div className="flex gap-1.5 mr-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  {lang === "python" && <><SiPython className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium text-slate-300">python</span></>}
                  {lang === "js" && <><SiJavascript className="w-4 h-4 text-yellow-400" /><span className="text-sm font-medium text-slate-300">javascript</span></>}
                  {lang === "curl" && <><Terminal className="w-4 h-4 text-emerald-400" /><span className="text-sm font-medium text-slate-300">bash</span></>}
                </div>
              </div>
              {activeCode === lang && (
                <div className="p-4 bg-[#0d0d0d] overflow-x-auto text-sm sm:text-base font-mono border-t border-white/5">
                  {lang === "python" && (
                    <pre className="text-slate-300"><code><span className="text-purple-400">import</span> requests

                      <span className="text-blue-400">class</span> <span className="text-amber-300">UIDBypassClient</span>:
                      <span className="text-blue-400">def</span> <span className="text-emerald-300">__init__</span>(self, api_key):
                      self.api_key = api_key
                      self.base_url = <span className="text-orange-300">"https://uidbypass.online/api"</span>

                      <span className="text-blue-400">def</span> <span className="text-emerald-300">check_uid</span>(self, uid):
                      <span className="text-purple-400">return</span> requests.get(
                      f<span className="text-orange-300">"{"{"}self.base_url{"}"}/uid/info"</span>,
                      params={"{"}<span className="text-orange-300">"key"</span>: self.api_key, <span className="text-orange-300">"uid"</span>: uid{"}"}
                      ).json()</code></pre>
                  )}
                  {lang === "js" && (
                    <pre className="text-slate-300"><code><span className="text-blue-400">class</span> <span className="text-amber-300">UIDBypassClient</span> {"{"}
                      <span className="text-blue-400">constructor</span>(apiKey) {"{"}
                      <span className="text-blue-400">this</span>.apiKey = apiKey;
                      <span className="text-blue-400">this</span>.baseUrl = <span className="text-orange-300">'https://uidbypass.online/api'</span>;
                      {"}"}

                      <span className="text-blue-400">async</span> <span className="text-emerald-300">checkUID</span>(uid) {"{"}
                      <span className="text-purple-400">const</span> res = <span className="text-purple-400">await</span> fetch(
                      <span className="text-orange-300">`</span><span className="text-blue-400">${"{"}</span>this.baseUrl<span className="text-blue-400">{"}"}</span><span className="text-orange-300">/uid/info?key=</span><span className="text-blue-400">${"{"}</span>this.apiKey<span className="text-blue-400">{"}"}</span><span className="text-orange-300">&uid=</span><span className="text-blue-400">${"{"}</span>uid<span className="text-blue-400">{"}"}</span><span className="text-orange-300">`</span>
                      );
                      <span className="text-purple-400">return</span> <span className="text-purple-400">await</span> res.json();
                      {"}"}
                      {"}"}</code></pre>
                  )}
                  {lang === "curl" && (
                    <pre className="text-slate-300"><code><span className="text-slate-500"># Check UID Status</span>
                      <span className="text-emerald-400">curl</span> <span className="text-orange-300">"https://uidbypass.online/api/uid/info?key=YOUR_KEY&uid=123"</span>

                      <span className="text-slate-500"># Add UID for 30 days</span>
                      <span className="text-emerald-400">curl</span> <span className="text-orange-300">"https://uidbypass.online/api/uid/add?key=YOUR_KEY&uid=123&days=30"</span></code></pre>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Support Information */}
      <div className="space-y-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
            <LifeBuoy className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Support & Resources</h2>
            <p className="text-sm text-slate-400">Get help, chat with the community, or read the manual.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="glass-card bg-gradient-to-br from-[#5865F2]/10 to-transparent border-[#5865F2]/20 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(88,101,242,0.15)] transition-all duration-300 cursor-pointer" onClick={() => window.open('https://discord.gg/rapidfire', '_blank')}>
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 bg-[#5865F2]/20 rounded-full flex items-center justify-center border border-[#5865F2]/30 shadow-inner">
                <SiDiscord className="w-7 h-7 text-[#5865F2]" />
              </div>
              <h3 className="text-white text-lg font-bold">Discord Server</h3>
              <p className="text-sm text-slate-400">Join our community for real-time support and fast updates.</p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer" onClick={() => window.open('/dashboard/documentation', '_self')}>
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30 shadow-inner">
                <Book className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-white text-lg font-bold">Documentation</h3>
              <p className="text-sm text-slate-400">Read our comprehensive installation and API guides.</p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(16,185,129,0.15)] transition-all duration-300 cursor-pointer" onClick={() => window.open('#', '_blank')}>
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-inner">
                <MessageCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-white text-lg font-bold">Direct Support</h3>
              <p className="text-sm text-slate-400">DM developers directly on WhatsApp for immediate issues.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global EXE Modal */}
      <Modal
        isOpen={isGlobalModalOpen}
        onClose={() => !isGenerating && setIsGlobalModalOpen(false)}
        title="Download Global Bypass"
        description="Choose your generation vector. The default names UID BYPASS GLOBAL and uidbypass.online will be embedded."
      >
        {isGenerating ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center space-y-6 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="relative w-16 h-16 flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full border-t-2 border-blue-500/50 border-r-2 border-transparent animate-spin" style={{ animationDuration: '1s' }} />
              <div className="absolute inset-2 rounded-full border-b-2 border-blue-400/50 border-l-2 border-transparent animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
              <Cpu className="w-6 h-6 text-blue-400 absolute" />
            </motion.div>

            <div className="w-full space-y-3 relative z-10">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-blue-400 tracking-widest uppercase">System Compiler</span>
                <span className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {Math.round(((generationStep + 1) / steps.length) * 100)}%
                </span>
              </div>

              <div className="w-full bg-black/60 border border-white/5 rounded-full h-2 overflow-hidden backdrop-blur-sm shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${((generationStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer" />
                </motion.div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-lg p-3 h-20 overflow-hidden relative shadow-inner">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/80 pointer-events-none z-10" />
                <div className="flex flex-col justify-end h-full">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={generationStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm font-mono text-blue-400 font-bold drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] leading-relaxed"
                    >
                      {steps[generationStep]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <Button
              className="w-full justify-start h-16 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30"
              onClick={() => handleGenerate("ALPHA", true)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Embedded Payload Injection</div>
                  <div className="text-xs text-slate-400">Single .exe file with embedded security string</div>
                </div>
              </div>
            </Button>

            <Button
              className="w-full justify-start h-16 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30"
              onClick={() => handleGenerate("OMEGA", true)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <FileArchive className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">External Configuration Vector</div>
                  <div className="text-xs text-slate-400">.zip containing .exe and encrypted .zytrone payload</div>
                </div>
              </div>
            </Button>
          </div>
        )}
      </Modal>

      {/* Custom EXE Modal */}
      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => !isGenerating && setIsCustomModalOpen(false)}
        title="Custom White-Label Build"
        description="Enter your custom branding. It will be encrypted and embedded securely."
      >
        {isGenerating ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center space-y-6 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none" />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="relative w-16 h-16 flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500/50 border-r-2 border-transparent animate-spin" style={{ animationDuration: '1s' }} />
              <div className="absolute inset-2 rounded-full border-b-2 border-emerald-400/50 border-l-2 border-transparent animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
              <Cpu className="w-6 h-6 text-emerald-400 absolute" />
            </motion.div>

            <div className="w-full space-y-3 relative z-10">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Custom White-Label Compiler</span>
                <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {Math.round(((generationStep + 1) / steps.length) * 100)}%
                </span>
              </div>

              <div className="w-full bg-black/60 border border-white/5 rounded-full h-2 overflow-hidden backdrop-blur-sm shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-400 relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${((generationStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer" />
                </motion.div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-lg p-3 h-20 overflow-hidden relative shadow-inner">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/80 pointer-events-none z-10" />
                <div className="flex flex-col justify-end h-full">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={generationStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm font-mono text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] leading-relaxed"
                    >
                      {steps[generationStep]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Brand Name</label>
              <Input
                placeholder="e.g. RAPID FIRE"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Developer Name</label>
              <Input
                placeholder="e.g. zytrone"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                className="bg-black/40 border-white/10 text-white"
              />
            </div>

            <div className="pt-4 space-y-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Select Generation Vector</p>
              <Button
                disabled={!brandName || !devName}
                className="w-full justify-start h-16 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
                onClick={() => handleGenerate("ALPHA", false)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white">Embedded Payload Injection</div>
                    <div className="text-xs text-slate-400">Single .exe file with encrypted branding</div>
                  </div>
                </div>
              </Button>

              <Button
                disabled={!brandName || !devName}
                className="w-full justify-start h-16 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30"
                onClick={() => handleGenerate("OMEGA", false)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                    <FileArchive className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white">External Configuration Vector</div>
                    <div className="text-xs text-slate-400">.zip containing .exe and encrypted .zytrone payload</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
