import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Gift,
  Check,
  XCircle,
  Loader2,
  Fingerprint,
  Cpu,
  Globe,
  ArrowRight,
  Activity,
  User,
  Timer,
  Medal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Turnstile } from "@marsidev/react-turnstile";

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

export default function FreePortal() {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [uid, setUid] = useState("");
  const [bluestack, setBluestack] = useState(true);
  const [loadingToken, setLoadingToken] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [tokenData, setTokenData] = useState<{
    token: string;
    resellerUsername: string;
    days: number;
    used: boolean;
    isExpired: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeNotice, setActiveNotice] = useState("");
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    // Fetch global settings notice
    fetch(`${BASE}/api/settings/notice`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.noticeText) {
          setActiveNotice(data.noticeText);
          const dismissed = localStorage.getItem("dismissedNotice");
          if (dismissed !== data.noticeText) {
            setShowAnnouncement(true);
          }
        }
      })
      .catch(() => {});

    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const tok = params.get("token") || "";
    setToken(tok);

    if (!tok) {
      setErrorMsg("No trial token provided in the URL.");
      setLoadingToken(false);
      return;
    }

    // Verify token info
    fetch(`${BASE}/api/uid/token-info/${encodeURIComponent(tok)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTokenData(data);
          if (data.isTrialExpired) {
            setErrorMsg("Trial Expired (Off Trial). The whitelisting duration has ended.");
          } else if (data.used) {
            setErrorMsg("This trial link has already been used.");
          } else if (data.isExpired) {
            setErrorMsg("This trial link has expired (valid for 24 hours).");
          }
        } else {
          setErrorMsg(data.message || "Invalid trial token.");
        }
      })
      .catch(() => {
        setErrorMsg("Failed to connect to authentication server.");
      })
      .finally(() => {
        setLoadingToken(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid.trim()) {
      toast({ title: "Required Field", description: "Please enter your Player UID.", variant: "destructive" });
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch(`${BASE}/api/uid/free-whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, uid: uid.trim(), bluestack, turnstileToken }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        toast({ title: "Access Granted", description: "Your Player UID has been whitelisted successfully!" });
      } else {
        if (data.message === "TRIAL_IP_LIMIT_REACHED") {
          setErrorMsg("IP Limit Reached! Your device/IP has already whitelisted a free trial. Only 1 free trial is allowed per IP.");
        } else if (data.message === "TOKEN_ALREADY_USED") {
          setErrorMsg("This trial token was already consumed.");
        } else if (data.message === "TOKEN_EXPIRED") {
          setErrorMsg("This trial token is expired.");
        } else if (data.message === "UID_ALREADY_WHITELISTED") {
          setErrorMsg("This UID is already active in the system.");
        } else {
          setErrorMsg(data.message || "Activation failed. Please contact the reseller.");
        }
      }
    } catch {
      setErrorMsg("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col font-sans overflow-x-hidden selection:bg-violet-500/30 selection:text-white">
      {/* Background aesthetics matching main landing page */}
      <div className="argus-bg" />
      <div className="argus-mesh" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05] bg-[#030014]/60 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 shadow-[0_0_30px_rgba(124,58,237,0.3)]">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-wider text-white">VELOCIRA CHEATS</p>
              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-400/80">FREE PORTAL</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Bypass Live
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center pt-24 px-6 z-10">
        <div className="w-full max-w-[480px] py-10 relative space-y-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[400px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="argus-glass shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 opacity-60 pointer-events-none" />

            {loadingToken ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-6" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Decrypting Security Handshake...</p>
              </div>
            ) : success ? (
              /* Success Panel */
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <Check className="w-10 h-10 text-emerald-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Access Granted!</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Player UID is now whitelisted</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5 text-left text-xs font-bold text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Player UID</span>
                    <span className="font-mono text-white text-sm">{uid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Duration</span>
                    <span className="text-amber-400 uppercase">{tokenData?.days} Day{tokenData && tokenData.days > 1 ? "s" : ""} Free Trial</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Status</span>
                    <span className="text-emerald-400 flex items-center gap-1.5 uppercase text-[9px] bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="h-1 w-1 bg-emerald-400 rounded-full animate-pulse" /> Active
                    </span>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider pt-4">
                  Please open the game and play. Trial features are active!
                </div>
              </motion.div>
            ) : tokenData && !tokenData.used && !tokenData.isExpired ? (
              /* Whitelist Input Form */
              <div className="space-y-8">
                <div className="flex items-center gap-5 mb-2">
                  <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white shadow-[0_15px_30px_rgba(245,158,11,0.3)]">
                    <Gift className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] mb-1">Free Trial Portal</p>
                    <h2 className="text-2xl font-black text-white tracking-tight">Claim Whitelist</h2>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left">
                  <Timer className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trial Duration</div>
                    <div className="text-sm font-black text-white uppercase">{tokenData.days} Day{tokenData.days > 1 ? "s" : ""} Free Access</div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/80 ml-1">Player UID</label>
                    <div className="flex items-center gap-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl px-5 py-4 focus-within:border-amber-500/50 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all">
                      <Fingerprint className="h-4.5 w-4.5 text-slate-500" />
                      <input
                        type="text"
                        value={uid}
                        onChange={(e) => { setUid(e.target.value); if (errorMsg) setErrorMsg(""); }}
                        placeholder="Enter your game Player UID"
                        className="bg-transparent border-0 outline-0 text-white placeholder-slate-600 text-sm w-full font-bold font-mono"
                      />
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Make sure your UID is 100% correct.</p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-4.5 h-4.5 text-slate-500" />
                      <div>
                        <div className="text-[10px] font-black text-white uppercase tracking-wider">Bluestacks Simulator</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Required for simulator players</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={bluestack}
                      onChange={(e) => setBluestack(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-white/10 bg-black/40 text-amber-500 focus:ring-amber-500/50"
                    />
                  </div>

                  {errorMsg && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-start gap-2.5">
                      <XCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex justify-center py-2">
                    <Turnstile
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                      onSuccess={setTurnstileToken}
                      theme="dark"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={submitting || !uid.trim() || !turnstileToken}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="argus-btn w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] mt-6 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                      boxShadow: "0 0 20px rgba(245,158,11,0.3)",
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Whitelisting UID...
                      </>
                    ) : (
                      <>
                        Claim Free Trial <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            ) : (
              /* Error Panel */
              <div className="space-y-6 text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-18 h-18 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white tracking-tight">Activation Error</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Invalid Trial Session</p>
                </div>
                <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-xs font-bold text-red-400 leading-relaxed uppercase tracking-wider">
                  {errorMsg || "This trial link is invalid, expired, or has already been used."}
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em] pt-4">
                  Please ask your reseller to issue a new trial link.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#030014]/90 border-t border-white/5 py-8 mt-auto z-10 relative">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">UID BYPASS PORTAL &copy; 2026</span>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> SECURE LINK ENCRYPTION
          </span>
        </div>
      </footer>

      {/* Announcement Popup Modal */}
      <AnimatePresence>
        {showAnnouncement && activeNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-lg bg-[#0a0a0a] border border-violet-500/30 rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(124,58,237,0.15)] relative text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent pointer-events-none" />
              
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                    <Medal className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-wide">System Announcement</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 mt-0.5">Important Update</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 mb-8">
                  <p className="text-sm font-semibold text-slate-300 leading-relaxed whitespace-pre-wrap">{activeNotice}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      localStorage.setItem("dismissedNotice", activeNotice);
                      setShowAnnouncement(false);
                    }}
                    className="h-12 px-8 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    I Agree
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
