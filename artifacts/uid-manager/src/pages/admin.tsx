import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Trash2, LogOut, Eye, EyeOff,
  Loader2, Crown, UserCheck, Activity, Sparkles, Copy,
  CheckCheck, X, Zap, Lock, User as UserIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ClientUser {
  username: string;
  createdAt: string;
}

interface AdminProps {
  adminUsername: string;
  onLogout: () => void;
}

function getAdminKey() {
  try {
    const raw = sessionStorage.getItem("uid_auth");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed.adminKey ?? "";
  } catch {
    return "";
  }
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-key": getAdminKey(),
  };
}

export default function Admin({ adminUsername, onLogout }: AdminProps) {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users`, { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(username: string) {
    setDeleting(username);
    try {
      await fetch(`${BASE}/api/users/${encodeURIComponent(username)}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      setUsers((prev) => prev.filter((u) => u.username !== username));
    } finally {
      setDeleting(null);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Dynamic spotlight following mouse */}
      <div
        className="fixed pointer-events-none inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139,92,246,0.06), transparent 70%)`,
        }}
      />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="absolute rounded-full" style={{ width: 900, height: 900, background: "radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 65%)", top: "-300px", left: "-200px" }} />
        <motion.div animate={{ x: [0, -25, 0], y: [0, 20, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }} className="absolute rounded-full" style={{ width: 700, height: 700, background: "radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 65%)", bottom: "-200px", right: "-150px" }} />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute rounded-full" style={{ width: 300, height: 300, background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)", top: "55%", left: "70%" }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
        {/* Floating particles */}
        <Particles />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative z-20 sticky top-0"
        style={{ background: "rgba(8,8,20,0.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(139,92,246,0.15)" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)", boxShadow: "0 0 20px rgba(245,158,11,0.5)" }}
            >
              <Crown className="w-5 h-5 text-white" />
              <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", boxShadow: "0 0 30px rgba(245,158,11,0.8)" }} />
            </motion.div>
            <div>
              <div className="font-black text-sm tracking-tight" style={{ background: "linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ADMIN PANEL
              </div>
              <div className="text-[11px] text-muted-foreground">Welcome, {adminUsername}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Crown className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-400 tracking-widest">SUPER ADMIN</span>
            </motion.div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
              <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #10b981" }} />
              <span className="text-[11px] font-bold text-emerald-400 tracking-widest">LIVE</span>
            </div>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-white/[0.05] hover:border-red-500/20 transition-all">
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Hero stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users, label: "Total Clients", value: loading ? "…" : users.length, color: "#8b5cf6", glow: "#8b5cf650" },
            { icon: UserCheck, label: "Active Access", value: loading ? "…" : users.length, color: "#06b6d4", glow: "#06b6d450" },
            { icon: Activity, label: "System Status", value: "ONLINE", color: "#10b981", glow: "#10b98150" },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
              whileHover={{ y: -6, scale: 1.03 }}
              className="relative rounded-2xl p-5 overflow-hidden cursor-default"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${card.color}25`, backdropFilter: "blur(20px)" }}
            >
              <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }} className="absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(circle at 80% 20%, ${card.glow}, transparent 60%)` }} />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}18`, border: `1px solid ${card.color}30` }}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div className="text-3xl font-black" style={{ color: card.color, textShadow: `0 0 20px ${card.color}` }}>{card.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium tracking-wide">{card.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Client management panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 160, damping: 22 }}
          className="relative rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(24px)" }}
        >
          {/* Top glow border */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)" }} />

          <div className="px-6 py-5 flex items-center justify-between border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <Users className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-foreground tracking-tight">Client Accounts</h2>
                <p className="text-[11px] text-muted-foreground">Manage user access to the UID whitelist</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}
            >
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12" animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }} />
              <Plus className="w-4 h-4" />
              Add Client
            </motion.button>
          </div>

          {/* User list */}
          <div className="p-4">
            {loading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map((i) => (
                  <motion.div key={i} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }} className="h-16 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
                ))}
              </div>
            ) : users.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 flex flex-col items-center gap-4 text-muted-foreground">
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                  <Users className="w-10 h-10 opacity-20" />
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-center">No clients yet</p>
                  <p className="text-xs opacity-50 text-center mt-1">Click "Add Client" to create the first user</p>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                <div className="space-y-2">
                  {users.map((user, i) => (
                    <UserRow
                      key={user.username}
                      user={user}
                      index={i}
                      deleting={deleting === user.username}
                      copied={copied === user.username}
                      onDelete={() => handleDelete(user.username)}
                      onCopy={() => copyToClipboard(user.username)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* Info panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl p-5"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(139,92,246,0.04))", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-400 mb-1">Admin Credentials</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your admin username is <span className="font-mono text-amber-300 font-bold">{adminUsername}</span>. Client users will log in with the username and password you set for them. They'll get access to the UID whitelist management dashboard.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Create user modal */}
      <AnimatePresence>
        {showModal && (
          <CreateUserModal
            onClose={() => setShowModal(false)}
            onCreate={(user) => {
              setUsers((prev) => [...prev, user]);
              setShowModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserRow({ user, index, deleting, copied, onDelete, onCopy }: {
  user: ClientUser;
  index: number;
  deleting: boolean;
  copied: boolean;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95, height: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 250, damping: 28 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 cursor-default"
      style={{
        background: hovered ? "linear-gradient(90deg, rgba(139,92,246,0.1), rgba(6,182,212,0.05), transparent)" : "rgba(255,255,255,0.02)",
        border: hovered ? "1px solid rgba(139,92,246,0.25)" : "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Left glow on hover */}
      <motion.div animate={{ scaleY: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }} transition={{ duration: 0.2 }} className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: "linear-gradient(180deg, #8b5cf6, #06b6d4)", transformOrigin: "top" }} />

      <div className="flex items-center gap-3 ml-2">
        <motion.div
          animate={{ rotate: hovered ? [0, 5, -5, 0] : 0 }}
          transition={{ duration: 0.4 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <UserIcon className="w-4 h-4 text-violet-400" />
        </motion.div>
        <div>
          <div className="font-mono font-bold text-sm text-foreground tracking-wide">{user.username}</div>
          <div className="text-[11px] text-muted-foreground">Created {new Date(user.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.span
          animate={{ opacity: hovered ? 1 : 0.6 }}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 4px #10b981" }} />
          ACTIVE
        </motion.span>

        <motion.button
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onCopy}
          className="p-2 rounded-lg transition-colors"
          style={{ color: copied ? "#06b6d4" : "#6b7280", background: copied ? "rgba(6,182,212,0.1)" : "transparent" }}
          title="Copy username"
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </motion.button>

        <motion.button
          animate={{ opacity: hovered ? 1 : 0.3, scale: hovered ? 1 : 0.85 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onDelete}
          disabled={deleting}
          className="p-2 rounded-lg hover:bg-red-500/15 hover:text-red-400 text-muted-foreground transition-colors disabled:opacity-40"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </motion.button>
      </div>
    </motion.div>
  );
}

function CreateUserModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (user: ClientUser) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onCreate({ username, createdAt: new Date().toISOString() });
        }, 1000);
      } else {
        setError(data.error ?? "Failed to create user");
        setLoading(false);
      }
    } catch {
      setError("Server error");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="w-full max-w-md relative rounded-2xl p-6 overflow-hidden"
        style={{ background: "rgba(10,8,25,0.95)", border: "1px solid rgba(139,92,246,0.3)", backdropFilter: "blur(30px)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)" }} />
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)" }} />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)" }}>
              <Plus className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Create Client Account</h3>
              <p className="text-[11px] text-muted-foreground">Give a user access to the system</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 flex flex-col items-center gap-3 text-center">
              <motion.div animate={{ scale: [0.5, 1.2, 1], rotate: [0, 10, 0] }} transition={{ duration: 0.5 }} className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <CheckCheck className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <div>
                <p className="font-bold text-emerald-400 text-sm">Account Created!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Client can now log in</p>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Username</label>
                <div className="relative group">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="client-username"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/60 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Strong password"
                    className="w-full h-11 pl-10 pr-12 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/60 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 text-red-400 text-xs px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                    <X className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-white/[0.08] text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all font-semibold">
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={loading || !username || !password}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-11 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", boxShadow: "0 0 20px rgba(139,92,246,0.35)" }}
                >
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12" animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }} />
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Zap className="w-3.5 h-3.5" /> Create Account</>}
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Particles() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    color: i % 3 === 0 ? "#8b5cf6" : i % 3 === 1 ? "#06b6d4" : "#f59e0b",
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 5,
  }));
  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, boxShadow: `0 0 ${p.size * 3}px ${p.color}` }}
          animate={{ y: [0, -60, 0], opacity: [0, 0.7, 0], x: [0, Math.random() * 30 - 15, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

