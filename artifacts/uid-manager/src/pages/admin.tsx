import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Trash2, LogOut, Eye, EyeOff, Loader2, Crown,
  UserCheck, Activity, Sparkles, Copy, CheckCheck, X, Zap,
  Lock, User as UserIcon, Gift, RefreshCw, Shield, Timer,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ClientUser {
  username: string;
  password: string;
  createdAt: string;
  defaultDays: number;
  isTrial: boolean;
  canResell: boolean;
}

interface AdminProps {
  adminUsername: string;
  onLogout: () => void;
}

function getAdminKey() {
  try {
    const raw = sessionStorage.getItem("uid_auth");
    if (!raw) return "";
    return JSON.parse(raw).adminKey ?? "";
  } catch { return ""; }
}

function adminHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", "x-admin-key": getAdminKey() };
}

function rand(len: number, chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789") {
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function Admin({ adminUsername, onLogout }: AdminProps) {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"clients" | "trial">("clients");
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => { fetchUsers(); }, []);

  /* RAF-throttled spotlight — zero layout thrash */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (spotlightRef.current) {
          spotlightRef.current.style.background =
            `radial-gradient(500px circle at ${e.clientX}px ${e.clientY}px, rgba(139,92,246,0.07), transparent 70%)`;
        }
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users`, { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally { setLoading(false); }
  }

  async function handleDelete(username: string) {
    setDeleting(username);
    try {
      await fetch(`${BASE}/api/users/${encodeURIComponent(username)}`, {
        method: "DELETE", headers: adminHeaders(),
      });
      setUsers((p) => p.filter((u) => u.username !== username));
    } finally { setDeleting(null); }
  }

  async function handleResellToggle(username: string, canResell: boolean) {
    await fetch(`${BASE}/api/users/${encodeURIComponent(username)}/resell`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ canResell }),
    });
    setUsers((p) => p.map((u) => u.username === username ? { ...u, canResell } : u));
  }

  const copy = useCallback((username: string, password?: string) => {
    const text = password ? `Username: ${username}\nPassword: ${password}` : username;
    navigator.clipboard.writeText(text);
    setCopied(username);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const regular = users.filter((u) => !u.isTrial);
  const trials = users.filter((u) => u.isTrial);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Spotlight — GPU layer, no JS re-render */}
      <div ref={spotlightRef} className="fixed inset-0 pointer-events-none z-0" style={{ willChange: "background" }} />

      {/* Background orbs — pure CSS, zero JS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{ contain: "layout paint" }}>
        <div className="animate-float-orb absolute rounded-full" style={{ width: 800, height: 800, background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)", top: "-250px", left: "-180px" }} />
        <div className="animate-float-orb-delay absolute rounded-full" style={{ width: 650, height: 650, background: "radial-gradient(circle, rgba(6,182,212,0.16) 0%, transparent 65%)", bottom: "-180px", right: "-130px" }} />
        <div className="animate-pulse-glow absolute rounded-full" style={{ width: 280, height: 280, background: "radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%)", top: "50%", left: "72%" }} />
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)", backgroundSize: "55px 55px" }} />
        <CssParticles />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-20 sticky top-0"
        style={{ background: "rgba(6,6,18,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(139,92,246,0.12)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="admin-crown w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)" }}>
              <Crown className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <div className="font-black text-sm tracking-tight grad-amber">ADMIN PANEL</div>
              <div className="text-[11px] text-muted-foreground">Welcome, {adminUsername}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Crown className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-400 tracking-widest">SUPER ADMIN</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400 tracking-widest">LIVE</span>
            </div>
            <button onClick={onLogout} className="hov-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-muted-foreground border border-white/[0.05] transition-all">
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Clients", value: loading ? "—" : regular.length, color: "#8b5cf6" },
            { icon: Gift, label: "Free Trials", value: loading ? "—" : trials.length, color: "#f59e0b" },
            { icon: UserCheck, label: "Total Active", value: loading ? "—" : users.length, color: "#06b6d4" },
            { icon: Activity, label: "Status", value: "ONLINE", color: "#10b981" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, ease: "easeOut" }}
              className="stat-card relative rounded-2xl p-4 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${s.color}20` }}
            >
              <div className="absolute inset-0 opacity-0 stat-card-glow rounded-2xl transition-opacity duration-300" style={{ background: `radial-gradient(circle at 80% 20%, ${s.color}25, transparent 65%)` }} />
              <div className="relative z-10">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ease: "easeOut" }}
          className="flex gap-1 p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {([
            { key: "clients", icon: Users, label: "Client Accounts", count: regular.length },
            { key: "trial", icon: Gift, label: "Free Trial", count: trials.length, gold: true },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 relative overflow-hidden"
              style={{
                background: tab === t.key ? (t.gold ? "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.15))" : "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.15))") : "transparent",
                color: tab === t.key ? (t.gold ? "#f59e0b" : "#a78bfa") : "#6b7280",
                border: tab === t.key ? `1px solid ${t.gold ? "rgba(245,158,11,0.3)" : "rgba(139,92,246,0.3)"}` : "1px solid transparent",
                boxShadow: tab === t.key ? `0 0 20px ${t.gold ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.15)"}` : "none",
              }}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {!loading && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: tab === t.key ? (t.gold ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.2)") : "rgba(255,255,255,0.05)" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === "clients" ? (
            <motion.div key="clients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <ClientsPanel
                users={regular}
                loading={loading}
                deleting={deleting}
                copied={copied}
                onAdd={() => setShowModal(true)}
                onDelete={handleDelete}
                onCopy={copy}
                onResellToggle={handleResellToggle}
              />
            </motion.div>
          ) : (
            <motion.div key="trial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <FreeTrialPanel
                trials={trials}
                deleting={deleting}
                copied={copied}
                onDelete={handleDelete}
                onCopy={copy}
                onCreated={(u) => setUsers((p) => [...p, u])}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showModal && (
          <CreateUserModal
            onClose={() => setShowModal(false)}
            onCreate={(u) => { setUsers((p) => [...p, u]); setShowModal(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Clients panel ─── */
function ClientsPanel({ users, loading, deleting, copied, onAdd, onDelete, onCopy, onResellToggle }: {
  users: ClientUser[]; loading: boolean; deleting: string | null;
  copied: string | null; onAdd: () => void;
  onDelete: (u: string) => void; onCopy: (u: string, p?: string) => void;
  onResellToggle: (u: string, v: boolean) => void;
}) {
  return (
    <div className="panel rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)" }} />
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Client Accounts</h2>
            <p className="text-[11px] text-muted-foreground">Full access users</p>
          </div>
        </div>
        <GlowButton onClick={onAdd} icon={<Plus className="w-4 h-4" />} label="Add Client" />
      </div>
      <div className="p-4">
        <UserList users={users} loading={loading} deleting={deleting} copied={copied} onDelete={onDelete} onCopy={onCopy} onResellToggle={onResellToggle} emptyText="No clients yet — click Add Client" />
      </div>
    </div>
  );
}

/* ─── Free Trial panel ─── */
function FreeTrialPanel({ trials, deleting, copied, onDelete, onCopy, onCreated }: {
  trials: ClientUser[]; deleting: string | null; copied: string | null;
  onDelete: (u: string) => void; onCopy: (u: string, p?: string) => void;
  onCreated: (u: ClientUser) => void;
}) {
  const PRESETS = [1, 3, 7, 14, 30];
  const [days, setDays] = useState(7);
  const [username, setUsername] = useState(() => `trial-${rand(4)}`);
  const [password, setPassword] = useState(() => rand(8));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<{ username: string; password: string; days: number } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);

  const refresh = () => {
    setUsername(`trial-${rand(4)}`);
    setPassword(rand(8));
    setCreds(null);
    setError("");
  };

  const copyField = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyCard = (c: { username: string; password: string; days: number }) => {
    const loginUrl = window.location.origin;
    const msg =
`✨「 SG71 BYPASS MODULE 」✨
🔓 FREE TRIAL ACCESS GRANTED 🔓
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔

💠 YOUR LOGIN CREDENTIALS 💠

   👤  User   ➜  ${c.username}
   🔑  Pass   ➜  ${c.password}
   ⏳  Valid  ➜  ${c.days} Day${c.days > 1 ? "s" : ""} Free Trial

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
🌐  PORTAL LINK
   ${loginUrl}

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
🎯  HOW TO ACTIVATE

   ▸ Open the portal link
   ▸ Login with your credentials
   ▸ Enter your Player UID
   ▸ Access granted instantly ✅

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
💎  SG71 Developer Zone Velocira Cheats
🔥  Premium Bypass Service
━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    navigator.clipboard.writeText(msg);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ username, password, defaultDays: days, isTrial: true }),
      });
      const data = await res.json();
      if (data.success) {
        setCreds({ username, password, days });
        onCreated({ username, password, createdAt: new Date().toISOString(), defaultDays: days, isTrial: true, canResell: false });
      } else {
        setError(data.error ?? "Failed");
      }
    } catch { setError("Server error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Generator card */}
      <div className="panel rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.15)" }}>
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #f59e0b, #ef4444, transparent)" }} />
        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Gift className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Free Trial Generator</h2>
            <p className="text-[11px] text-muted-foreground">Generate instant trial credentials to share with clients</p>
          </div>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {creds ? (
              <motion.div key="creds" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Success header */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.2)" }}>
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Trial Created!</p>
                    <p className="text-[11px] text-muted-foreground">Valid for {creds.days} day{creds.days > 1 ? "s" : ""} — share these credentials</p>
                  </div>
                </div>

                {/* Credentials display */}
                <div className="space-y-2">
                  {[
                    { label: "Username", value: creds.username, key: "user" },
                    { label: "Password", value: creds.password, key: "pass" },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{f.label}</div>
                        <div className="font-mono font-bold text-sm text-foreground">{f.value}</div>
                      </div>
                      <button onClick={() => copyField(f.value, f.key)} className="p-2 rounded-lg transition-all hover:bg-white/[0.06]" style={{ color: copiedField === f.key ? "#06b6d4" : "#6b7280" }}>
                        {copiedField === f.key ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <Timer className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-400">{creds.days} days access</span>
                  </div>
                </div>

                {/* Reseller copy card */}
                <motion.button
                  onClick={() => copyCard(creds)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold relative overflow-hidden transition-all"
                  style={{
                    background: copiedCard
                      ? "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.15))"
                      : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))",
                    border: copiedCard ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(245,158,11,0.3)",
                    color: copiedCard ? "#34d399" : "#f59e0b",
                    boxShadow: copiedCard ? "0 0 18px rgba(16,185,129,0.2)" : "0 0 18px rgba(245,158,11,0.15)",
                  }}
                >
                  {copiedCard ? (
                    <><CheckCheck className="w-4 h-4" /> Copied to Clipboard!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Message for Client</>
                  )}
                </motion.button>

                <button
                  onClick={refresh}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold text-muted-foreground border border-white/[0.07] hover:bg-white/[0.04] hover:text-foreground transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Another
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleGenerate} className="space-y-4">
                {/* Days picker */}
                <DurationPicker value={days} onChange={setDays} presets={PRESETS} min={1} max={30} theme="amber" />

                {/* Auto-gen credentials */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Credentials</label>
                    <button type="button" onClick={refresh} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-violet-400 transition-colors">
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">Username</div>
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-foreground focus:outline-none focus:border-amber-500/50 focus:shadow-[0_0_0_2px_rgba(245,158,11,0.12)] transition-all"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">Password</div>
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-foreground focus:outline-none focus:border-amber-500/50 focus:shadow-[0_0_0_2px_rgba(245,158,11,0.12)] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <X className="w-3.5 h-3.5 shrink-0" />{error}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading || !username || !password}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)", boxShadow: "0 0 25px rgba(245,158,11,0.4)" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 btn-shimmer" />
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4" />Generate Free Trial Access</>}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active trials list */}
      {trials.length > 0 && (
        <div className="panel rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.1)" }}>
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-foreground">Active Trials</span>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{trials.length}</span>
          </div>
          <div className="p-4">
            <UserList users={trials} loading={false} deleting={deleting} copied={copied} onDelete={onDelete} onCopy={onCopy} emptyText="" isTrial />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared user list ─── */
function UserList({ users, loading, deleting, copied, onDelete, onCopy, onResellToggle, emptyText, isTrial = false }: {
  users: ClientUser[]; loading: boolean; deleting: string | null; copied: string | null;
  onDelete: (u: string) => void; onCopy: (u: string, p?: string) => void;
  onResellToggle?: (u: string, v: boolean) => void;
  emptyText: string; isTrial?: boolean;
}) {
  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-xl skeleton" />
      ))}
    </div>
  );
  if (users.length === 0) return (
    <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.1)" }}>
        <Users className="w-8 h-8 opacity-15" />
      </div>
      <p className="text-sm opacity-60">{emptyText}</p>
    </div>
  );
  return (
    <AnimatePresence initial={false}>
      <div className="space-y-2">
        {users.map((user, i) => (
          <UserRow key={user.username} user={user} index={i} deleting={deleting === user.username} copied={copied === user.username} onDelete={() => onDelete(user.username)} onCopy={() => onCopy(user.username, user.password)} onResellToggle={onResellToggle ? (v) => onResellToggle(user.username, v) : undefined} isTrial={isTrial} />
        ))}
      </div>
    </AnimatePresence>
  );
}

/* ─── User row — CSS hover, no continuous framer motion ─── */
const UserRow = memo(function UserRow({ user, index, deleting, copied, onDelete, onCopy, onResellToggle, isTrial }: {
  user: ClientUser; index: number; deleting: boolean; copied: boolean;
  onDelete: () => void; onCopy: () => void; onResellToggle?: (v: boolean) => void; isTrial: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 28 }}
      className="user-row relative flex items-center justify-between px-4 py-3.5 rounded-xl"
    >
      <div className="user-row-bar absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: isTrial ? "linear-gradient(180deg, #f59e0b, #ef4444)" : "linear-gradient(180deg, #8b5cf6, #06b6d4)" }} />
      <div className="flex items-center gap-3 ml-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 user-row-icon" style={{ background: isTrial ? "rgba(245,158,11,0.12)" : "rgba(139,92,246,0.12)", border: `1px solid ${isTrial ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.2)"}` }}>
          {isTrial ? <Gift className="w-4 h-4 text-amber-400" /> : <UserIcon className="w-4 h-4 text-violet-400" />}
        </div>
        <div>
          <div className="font-mono font-bold text-sm text-foreground">{user.username}</div>
          <div className="text-[11px] text-muted-foreground">
            {new Date(user.createdAt).toLocaleDateString()} · <span className="font-semibold" style={{ color: isTrial ? "#f59e0b" : "#a78bfa" }}>{user.defaultDays}d</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold user-row-badge"
          style={{ background: isTrial ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", color: isTrial ? "#fbbf24" : "#34d399", border: `1px solid ${isTrial ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}` }}
        >
          {isTrial ? "TRIAL" : "ACTIVE"}
        </span>
        {/* Resell toggle — only for non-trial clients */}
        {!isTrial && onResellToggle && (
          <button
            onClick={() => onResellToggle(!user.canResell)}
            title={user.canResell ? "Revoke trial permission" : "Allow free trial generation"}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
            style={{
              background: user.canResell ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
              color: user.canResell ? "#f59e0b" : "#6b7280",
              border: user.canResell ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Gift className="w-3 h-3" />
            {user.canResell ? "RESELLER" : "NO RESELL"}
          </button>
        )}
        <button onClick={onCopy} className="icon-btn p-2 rounded-lg transition-all" style={{ color: copied ? "#06b6d4" : undefined }} title="Copy username & password">
          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onDelete} disabled={deleting} className="icon-btn p-2 rounded-lg transition-all text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </motion.div>
  );
});

/* ─── Create user modal ─── */
function CreateUserModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (user: ClientUser) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [days, setDays] = useState(30);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users`, {
        method: "POST", headers: adminHeaders(),
        body: JSON.stringify({ username, password, defaultDays: days, isTrial: false }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => onCreate({ username, password, createdAt: new Date().toISOString(), defaultDays: days, isTrial: false, canResell: false }), 900);
      } else { setError(data.error ?? "Failed"); setLoading(false); }
    } catch { setError("Server error"); setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ opacity: 0, scale: 0.88, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="w-full max-w-md relative rounded-2xl p-6 overflow-hidden"
        style={{ background: "rgba(8,6,22,0.97)", border: "1px solid rgba(139,92,246,0.28)", backdropFilter: "blur(30px)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)" }} />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Plus className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Create Client Account</h3>
              <p className="text-[11px] text-muted-foreground">Full access to UID manager</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center gap-3">
              <motion.div animate={{ scale: [0.5, 1.15, 1] }} transition={{ duration: 0.5 }} className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <CheckCheck className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <p className="font-bold text-emerald-400 text-sm">Account Created!</p>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleCreate} className="space-y-4">
              {[
                { label: "Username", value: username, onChange: setUsername, type: "text", placeholder: "client-username", icon: <UserIcon className="w-4 h-4" /> },
              ].map((f) => (
                <div key={f.label} className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{f.label}</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-violet-400 transition-colors">{f.icon}</span>
                    <input type={f.type} value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder} className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all" />
                  </div>
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
                  <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Strong password"
                    className="w-full h-11 pl-10 pr-12 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <DurationPicker value={days} onChange={setDays} presets={[7, 15, 30, 60, 90]} min={7} max={90} theme="violet" />

              {error && <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20"><X className="w-3.5 h-3.5 shrink-0" />{error}</div>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-white/[0.07] text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all font-semibold">Cancel</button>
                <motion.button type="submit" disabled={loading || !username || !password} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 h-11 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -skew-x-12 btn-shimmer" />
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Zap className="w-3.5 h-3.5" />Create</>}
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ─── Duration Picker ─── */
function DurationPicker({ value, onChange, presets, min = 1, max = 90, theme = "violet" }: {
  value: number; onChange: (v: number) => void; presets: number[];
  min?: number; max?: number; theme?: "violet" | "amber";
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  const isViolet = theme === "violet";
  const c1 = isViolet ? "139,92,246" : "245,158,11";
  const c2 = isViolet ? "6,182,212" : "239,68,68";
  const hex1 = isViolet ? "#8b5cf6" : "#f59e0b";
  const hex2 = isViolet ? "#06b6d4" : "#ef4444";

  const label =
    value === 1 ? "1 Day" :
    value === 7 ? "1 Week" :
    value === 14 ? "2 Weeks" :
    value === 30 ? "1 Month" :
    value === 60 ? "2 Months" :
    value === 90 ? "3 Months" :
    `${value} Days`;

  return (
    <div className="space-y-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Duration</label>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black tabular-nums" style={{ background: `linear-gradient(135deg, ${hex1}, ${hex2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</span>
          <span className="text-[11px] font-semibold" style={{ color: `rgba(${c1},0.7)` }}>day{value !== 1 ? "s" : ""}</span>
          <span className="text-[10px] text-muted-foreground/40 ml-1">• {label}</span>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative h-10 flex items-center px-1">
        {/* bg track */}
        <div className="absolute inset-x-1 h-[5px] rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.04)" }} />
        {/* fill */}
        <div
          className="absolute left-1 h-[5px] rounded-full transition-all duration-100"
          style={{ width: `calc(${pct}% - ${pct * 0.02}rem)`, background: `linear-gradient(90deg, ${hex1}, ${hex2})`, boxShadow: `0 0 10px rgba(${c1},0.5)` }}
        />
        {/* invisible native input */}
        <input type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-10 cursor-pointer z-10"
          style={{ opacity: 0 }}
        />
        {/* custom thumb */}
        <div
          className="absolute w-[18px] h-[18px] rounded-full pointer-events-none transition-all duration-100"
          style={{
            left: `calc(${pct}% - 9px + ${pct === 0 ? "0.25rem" : pct === 100 ? "-0.25rem" : "0px"})`,
            background: `linear-gradient(135deg, ${hex1}, ${hex2})`,
            border: "2px solid rgba(255,255,255,0.25)",
            boxShadow: `0 0 0 3px rgba(${c1},0.2), 0 0 14px rgba(${c1},0.6)`,
          }}
        />
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between px-1 -mt-1.5">
        <span className="text-[10px] text-muted-foreground/40">{min}d</span>
        <span className="text-[10px] text-muted-foreground/40">{max}d</span>
      </div>

      {/* Preset chips */}
      <div className="flex gap-1.5 pt-0.5">
        {presets.map((d) => {
          const active = value === d;
          return (
            <button key={d} type="button" onClick={() => onChange(d)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-bold transition-all duration-150 relative overflow-hidden"
              style={{
                background: active ? `linear-gradient(135deg, rgba(${c1},0.2), rgba(${c2},0.15))` : "rgba(255,255,255,0.025)",
                color: active ? hex1 : "#4b5563",
                border: active ? `1px solid rgba(${c1},0.45)` : "1px solid rgba(255,255,255,0.05)",
                boxShadow: active ? `0 0 12px rgba(${c1},0.3), inset 0 1px 0 rgba(255,255,255,0.06)` : "none",
                transform: active ? "translateY(-1px)" : "none",
              }}
            >
              {active && <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />}
              <span className="text-[13px] font-black leading-none">{d}</span>
              <span className="text-[9px] opacity-60 mt-0.5">days</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Glow button ─── */
function GlowButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="glow-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 btn-shimmer" />
      {icon}{label}
    </button>
  );
}

/* ─── 6 CSS-animated particles — no JS per frame ─── */
function CssParticles() {
  const pts = [
    { color: "#8b5cf6", x: 15, delay: 0, dur: 9 },
    { color: "#06b6d4", x: 45, delay: 2, dur: 11 },
    { color: "#f59e0b", x: 70, delay: 1, dur: 8 },
    { color: "#8b5cf6", x: 85, delay: 3.5, dur: 13 },
    { color: "#06b6d4", x: 30, delay: 5, dur: 10 },
    { color: "#ec4899", x: 60, delay: 0.5, dur: 12 },
  ];
  return (
    <>
      {pts.map((p, i) => (
        <div key={i} className="css-particle absolute rounded-full" style={{
          left: `${p.x}%`, bottom: "-8px", width: 4, height: 4,
          background: p.color, boxShadow: `0 0 8px ${p.color}`,
          animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </>
  );
}
