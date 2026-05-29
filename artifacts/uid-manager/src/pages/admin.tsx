import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Trash2, LogOut, Eye, EyeOff, Loader2, Crown,
  UserCheck, Activity, Sparkles, Copy, CheckCheck, X, Zap,
  Lock, User as UserIcon, Gift, RefreshCw, Shield, Timer, Settings,
  Coins, Wallet, CreditCard, Check, XCircle, Clock, LayoutDashboard,
  BarChart2, MessageSquare, UserCircle, Camera, Edit2, Trophy, Medal,
  Send,
} from "lucide-react";
import { AmbientScene } from "@/components/ambient-scene";
import {
  useListUids,
  getListUidsQueryKey,
  useRemoveUid,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

interface PaymentItem {
  _id: string;
  username: string;
  packageTokens: number;
  packagePrice: string;
  txNote: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface ClientUser {
  username: string;
  password: string;
  createdAt: string;
  defaultDays: number;
  isTrial: boolean;
  canResell: boolean;
  balance: number;
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

function userHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("uid_auth");
    if (!raw) return {};
    const { username, adminKey } = JSON.parse(raw);
    return { "x-username": username ?? "", "x-password": adminKey ?? "" };
  } catch { return {}; }
}

function adminHeadersForUids(): Record<string, string> {
  return userHeaders();
}

function rand(len: number, chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789") {
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function Admin({ adminUsername, onLogout }: AdminProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSidebarTab, setActiveSidebarTab] = useState("dashboard");
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"clients" | "trial" | "payments" | "settings">("clients"); // sub-tab
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [profileData, setProfileData] = useState({ displayName: adminUsername || "Admin", avatarBase64: "" });
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchPayments();
  }, []);

  useEffect(() => {
    if (adminUsername) {
      setProfileData({
        displayName: localStorage.getItem(`display_name_${adminUsername}`) || adminUsername,
        avatarBase64: localStorage.getItem(`avatar_${adminUsername}`) || ""
      });

      fetch(`${BASE}/api/auth/profile/${encodeURIComponent(adminUsername)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setProfileData({
              displayName: d.displayName,
              avatarBase64: d.avatar,
            });
            try {
              localStorage.setItem(`display_name_${adminUsername}`, d.displayName);
              localStorage.setItem(`avatar_${adminUsername}`, d.avatar);
            } catch (e) {}
          }
        })
        .catch((err) => console.error("Error fetching admin profile:", err));
    }
  }, [adminUsername]);

  const handleUpdateProfile = (name: string, avatar: string) => {
    setProfileData({ displayName: name, avatarBase64: avatar });
    fetch(`${BASE}/api/auth/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: adminUsername, displayName: name, avatar }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          console.error("Sync failed:", d.error);
        }
      })
      .catch((err) => console.error("Error syncing profile:", err));
  };

  const { data: listResponse, isLoading: isUidsLoading } = useListUids({
    query: { queryKey: getListUidsQueryKey() },
    request: { headers: adminHeadersForUids() },
  });

  const removeMutation = useRemoveUid({
    request: { headers: adminHeadersForUids() },
  });

  const uids: any[] = listResponse?.success ? ((listResponse as any).uids ?? []) : [];

  const activeCount = uids.filter((u) => {
    const addedAt = new Date(u.addedAt).getTime();
    const expiresAt = addedAt + u.days * 24 * 60 * 60 * 1000;
    return expiresAt > Date.now();
  }).length;
  const expiredCount = uids.length - activeCount;

  async function fetchPayments() {
    setPaymentsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/payments`, { headers: adminHeaders() });
      const data = await res.json();
      if (data.success) setPayments(data.requests);
    } finally { setPaymentsLoading(false); }
  }

  async function handleApprovePayment(id: string) {
    const res = await fetch(`${BASE}/api/payments/${encodeURIComponent(id)}/approve`, { method: "PATCH", headers: adminHeaders() });
    const data = await res.json();
    if (data.success) {
      setPayments(p => p.map(x => x._id === id ? { ...x, status: "approved" } : x));
      setUsers(u => u.map(x => x.username === data.username ? { ...x, balance: data.balance } : x));
    }
  }

  async function handleRejectPayment(id: string) {
    const res = await fetch(`${BASE}/api/payments/${encodeURIComponent(id)}/reject`, { method: "PATCH", headers: adminHeaders() });
    const data = await res.json();
    if (data.success) setPayments(p => p.map(x => x._id === id ? { ...x, status: "rejected" } : x));
  }

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

  async function handleAddCredits(username: string, amount: number) {
    const res = await fetch(`${BASE}/api/credits/${encodeURIComponent(username)}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (data.success) {
      setUsers((p) => p.map((u) => u.username === username ? { ...u, balance: data.balance } : u));
    }
  }

  const copy = useCallback((username: string, password?: string) => {
    const text = password ? `Username: ${username}\nPassword: ${password}` : username;
    navigator.clipboard.writeText(text);
    setCopied(username);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const onRemove = (uid: string) => {
    setRemovingUid(uid);
    removeMutation.mutate(
      { data: { uid } },
      {
        onSuccess: (data) => {
          setRemovingUid(null);
          if (data.success) {
            toast({ title: "Access Revoked", description: `UID ${uid} removed.` });
            queryClient.invalidateQueries({ queryKey: getListUidsQueryKey() });
          } else {
            toast({ title: "Failed", description: data.message, variant: "destructive" });
          }
        },
        onError: () => {
          setRemovingUid(null);
          toast({ title: "Error", description: "Removal failed.", variant: "destructive" });
        },
      }
    );
  };

  const regular = users.filter((u) => !u.isTrial);
  const trials = users.filter((u) => u.isTrial);

  const SIDEBAR_NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analyze", label: "Analyze", icon: BarChart2 },
    { id: "manage", label: "Manage Clients", icon: Users },
    { id: "chat", label: "Team Chat", icon: MessageSquare },
    { id: "profile", label: "My Profile", icon: UserCircle },
  ];

  const renderUidTable = (showFull = false, highlightDelete = false) => {
    const displayedUids = showFull ? [...uids].reverse() : [...uids].reverse().slice(0, 9);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`argus-glass rounded-[2rem] overflow-hidden relative shadow-2xl ${showFull ? 'h-full' : ''}`}
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-white/[0.05] bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-red-500/30" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(0,0,0,0.1))" }}>
              <Activity className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="font-black text-lg text-white tracking-wide">{showFull ? "Global Endpoints" : "Recent UIDs"}</h2>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{showFull ? "All active connections globally" : "History of recently registered UIDs"}</div>
            </div>
          </div>
        </div>

        {isUidsLoading ? (
          <div className="flex flex-col items-center justify-center p-20 opacity-50">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing with Auth Mesh...</p>
          </div>
        ) : uids.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center opacity-60">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Activity className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-300 font-bold mb-2">No Active UIDs</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Resellers will register endpoints here</p>
          </div>
        ) : (
          <div className={`p-6 sm:p-8 overflow-y-auto custom-scrollbar ${showFull ? 'max-h-[70vh]' : 'max-h-[800px]'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {displayedUids.map((uidObj) => (
                  <motion.div
                    key={uidObj.uid}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    onHoverStart={() => setHoveredRow(uidObj.uid)}
                    onHoverEnd={() => setHoveredRow(null)}
                    className={`group relative bg-black/40 border ${highlightDelete ? 'border-red-500/20' : 'border-white/10'} rounded-3xl p-5 hover:border-white/20 hover:bg-white/[0.02] transition-all overflow-hidden flex flex-col justify-between h-40 shadow-lg`}
                  >
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                      style={{ background: uidObj.bluestack ? "linear-gradient(135deg, transparent, #ef4444, transparent)" : "linear-gradient(135deg, transparent, #10b981, transparent)" }}
                    />

                    {/* Hover delete button */}
                    <div className="absolute top-5 right-5 z-20">
                      {hoveredRow === uidObj.uid || highlightDelete ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemove(uidObj.uid); }}
                          disabled={removingUid === uidObj.uid}
                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        >
                          {removingUid === uidObj.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse" />
                      )}
                    </div>

                    <div>
                      {/* Friendly name top left */}
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        {uidObj.bluestack ? <Activity className="w-3.5 h-3.5 text-red-500/80" /> : <Shield className="w-3.5 h-3.5 text-emerald-400/80" />}
                        <span className="truncate max-w-[150px]">{uidObj.name || `NODE_${uidObj.uid.slice(0, 10)}`}</span>
                      </div>
                      
                      {/* UID value */}
                      <div className="text-xl font-black text-white tracking-wider mt-3.5 font-mono drop-shadow-md">{uidObj.uid}</div>
                    </div>

                    {/* Footer with Operator and Expires */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                      <div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">OPERATOR</span>
                        <span className="text-xs font-black text-slate-300 uppercase tracking-wide truncate max-w-[100px] block">{uidObj.addedBy || "UNKNOWN"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">EXPIRES</span>
                        <span className="text-xs font-black text-slate-300 uppercase tracking-wide block">{getDaysLeft(uidObj.addedAt, uidObj.days)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="flex h-screen bg-[#030014] text-white font-sans overflow-hidden relative">
      <div ref={spotlightRef} className="fixed inset-0 pointer-events-none z-0" style={{ willChange: "background" }} />
      
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#0a0a0a]/95 border-r border-white/5 flex-col z-50 shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        {/* Sidebar Logo Area */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,0,110,0.4)]" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-black text-[11px] uppercase tracking-[0.1em] text-white">UID BYPASS ADMIN PANEL</div>
            <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">SUPER ADMIN</div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
          {SIDEBAR_NAV.map((nav) => {
            const Icon = nav.icon;
            const active = activeSidebarTab === nav.id;
            
            return (
              <button
                key={nav.id}
                onClick={() => setActiveSidebarTab(nav.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-sm font-semibold
                  ${active 
                    ? "bg-white/[0.05] border border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)] relative" 
                    : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"}
                `}
              >
                <Icon className={`w-4.5 h-4.5 ${active ? "text-red-500" : "text-slate-500"}`} />
                <span>{nav.label}</span>
                {active && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-semibold text-sm"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden h-full">
        {/* Background Effects for Main Content */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="argus-bg w-full h-full" />
          <div className="argus-mesh w-full h-full opacity-60" />
        </div>

        {/* Main Content Header */}
        <header className="h-20 shrink-0 border-b border-white/5 px-8 flex items-center justify-between relative z-20 backdrop-blur-md bg-black/20">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            <span>ADMIN TERMINAL</span>
            <span className="text-slate-600">/</span>
            <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] uppercase">
              {SIDEBAR_NAV.find(n => n.id === activeSidebarTab)?.label || "DASHBOARD"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10 bg-white/[0.03] text-xs text-slate-300 font-bold shadow-inner">
              {profileData.avatarBase64 ? (
                <img src={profileData.avatarBase64} alt="Avatar" className="w-5 h-5 rounded-full object-cover shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
              ) : (
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">{profileData.displayName}</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
                SUPER ADMIN
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full glass">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400 tracking-widest">LIVE</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-28 md:pb-8 relative z-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-8 h-full">
            
            <AnimatePresence mode="wait">
              {activeSidebarTab === "dashboard" && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                  {/* Title */}
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                      <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">System Overview</h1>
                      <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-[9px] font-black tracking-widest text-white mt-1">GLOBAL CONTROL</span>
                    </div>
                    <p className="text-slate-400 font-semibold text-sm mt-2">Real-time global routing status of all registered endpoints</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <OverviewStatCard
                      icon={Activity}
                      label="Total UIDs"
                      value={isUidsLoading ? "—" : uids.length}
                      delay={0}
                      sparklinePoints={[28, 25, 27, 22, 20, 18, 19, 15, 12, 10]}
                    />
                    <OverviewStatCard
                      icon={Zap}
                      label="Active UIDs"
                      value={isUidsLoading ? "—" : activeCount}
                      delay={0.1}
                      sparklinePoints={[26, 24, 25, 21, 19, 17, 18, 14, 13, 11]}
                    />
                    <OverviewStatCard
                      icon={XCircle}
                      label="Expired"
                      value={isUidsLoading ? "—" : expiredCount}
                      delay={0.2}
                      sparklinePoints={[25, 24, 25, 24, 25, 24, 25, 24, 25, 24]}
                    />
                  </div>

                  <div className="w-full">
                    {renderUidTable(false, false)}
                  </div>
                </motion.div>
              )}

              {activeSidebarTab === "analyze" && (
                <motion.div key="analyze" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <LeaderboardView />
                </motion.div>
              )}

              {activeSidebarTab === "manage" && (
                <motion.div key="manage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  {/* Tab switcher */}
                  <div className="text-left">
                    <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Client Operations</h1>
                    <p className="text-slate-400 font-semibold text-sm mt-1">Manage resellers, allocate credit balances, handle approvals, and adjust settings.</p>
                  </div>
                  
                  <div
                    className="flex gap-1 p-1 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {([
                      { key: "clients", icon: Users, label: "Client Accounts", count: regular.length, gold: false, rose: false, teal: false },
                      { key: "trial", icon: Gift, label: "Free Trial", count: trials.length, gold: true, rose: false, teal: false },
                      { key: "payments", icon: CreditCard, label: "Payments", count: payments.filter(p => p.status === "pending").length, gold: false, rose: true, teal: false },
                      { key: "settings", icon: Settings, label: "Settings", count: null, gold: false, rose: false, teal: true },
                    ] as const).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200 relative overflow-hidden"
                        style={{
                          background: tab === t.key ? ("teal" in t && t.teal ? "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(16,185,129,0.15))" : "rose" in t && t.rose ? "linear-gradient(135deg, rgba(236,72,153,0.25), rgba(239,68,68,0.15))" : t.gold ? "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.15))" : "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.15))") : "transparent",
                          color: tab === t.key ? ("teal" in t && t.teal ? "#06b6d4" : "rose" in t && t.rose ? "#f472b6" : t.gold ? "#f59e0b" : "#a78bfa") : "#6b7280",
                          border: tab === t.key ? `1px solid ${"teal" in t && t.teal ? "rgba(6,182,212,0.3)" : "rose" in t && t.rose ? "rgba(236,72,153,0.3)" : t.gold ? "rgba(245,158,11,0.3)" : "rgba(139,92,246,0.3)"}` : "1px solid transparent",
                        }}
                      >
                        <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">{t.label}</span>
                        {!loading && t.count !== null && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{ background: tab === t.key ? (t.gold ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.2)") : "rgba(255,255,255,0.05)" }}>
                            {t.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "clients" ? (
                      <motion.div key="clients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <ClientsPanel
                          users={regular}
                          loading={loading}
                          deleting={deleting}
                          copied={copied}
                          onAdd={() => setShowModal(true)}
                          onDelete={handleDelete}
                          onCopy={copy}
                          onResellToggle={handleResellToggle}
                          onAddCredits={handleAddCredits}
                        />
                      </motion.div>
                    ) : tab === "trial" ? (
                      <motion.div key="trial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <FreeTrialPanel
                          trials={trials}
                          deleting={deleting}
                          copied={copied}
                          onDelete={handleDelete}
                          onCopy={copy}
                          onCreated={(u) => setUsers((p) => [...p, u])}
                        />
                      </motion.div>
                    ) : tab === "payments" ? (
                      <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <PaymentsPanel
                          payments={payments}
                          loading={paymentsLoading}
                          onApprove={handleApprovePayment}
                          onReject={handleRejectPayment}
                          onRefresh={fetchPayments}
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <SettingsPanel />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {activeSidebarTab === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <TeamChatView currentUsername={adminUsername} />
                </motion.div>
              )}

              {activeSidebarTab === "profile" && (
                <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <UserProfilePanel 
                    username={adminUsername} 
                    isTrial={false} 
                    balance={null} 
                    displayName={profileData.displayName}
                    avatarBase64={profileData.avatarBase64}
                    onUpdate={handleUpdateProfile}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main>

      <AnimatePresence>
        {showModal && (
          <CreateUserModal
            onClose={() => setShowModal(false)}
            onCreate={(u) => { setUsers((p) => [...p, u]); setShowModal(false); }}
          />
        )}
      </AnimatePresence>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden argus-glass rounded-2xl flex items-center justify-around py-3 px-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 overflow-x-auto scrollbar-none gap-2">
        {SIDEBAR_NAV.map((nav) => {
          const Icon = nav.icon;
          const active = activeSidebarTab === nav.id;
          return (
            <button
              key={nav.id}
              onClick={() => setActiveSidebarTab(nav.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                active 
                  ? "text-red-500 bg-white/[0.05]" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-wider">{nav.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ─── Clients panel ─── */
function ClientsPanel({ users, loading, deleting, copied, onAdd, onDelete, onCopy, onResellToggle, onAddCredits }: {
  users: ClientUser[]; loading: boolean; deleting: string | null;
  copied: string | null; onAdd: () => void;
  onDelete: (u: string) => void; onCopy: (u: string, p?: string) => void;
  onResellToggle: (u: string, v: boolean) => void;
  onAddCredits: (u: string, amount: number) => Promise<void>;
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
            <p className="text-[11px] text-muted-foreground">Full access users · 1 token = 1 day</p>
          </div>
        </div>
        <GlowButton onClick={onAdd} icon={<Plus className="w-4 h-4" />} label="Add Client" />
      </div>
      <div className="p-4">
        <UserList users={users} loading={loading} deleting={deleting} copied={copied} onDelete={onDelete} onCopy={onCopy} onResellToggle={onResellToggle} onAddCredits={onAddCredits} emptyText="No clients yet — click Add Client" />
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
        onCreated({ username, password, createdAt: new Date().toISOString(), defaultDays: days, isTrial: true, canResell: false, balance: 0 });
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
                  className="w-full h-12 rounded-xl btn-viral-3d text-white font-bold text-sm flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-50"
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
function UserList({ users, loading, deleting, copied, onDelete, onCopy, onResellToggle, onAddCredits, emptyText, isTrial = false }: {
  users: ClientUser[]; loading: boolean; deleting: string | null; copied: string | null;
  onDelete: (u: string) => void; onCopy: (u: string, p?: string) => void;
  onResellToggle?: (u: string, v: boolean) => void;
  onAddCredits?: (u: string, amount: number) => Promise<void>;
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
          <UserRow key={user.username} user={user} index={i} deleting={deleting === user.username} copied={copied === user.username} onDelete={() => onDelete(user.username)} onCopy={() => onCopy(user.username, user.password)} onResellToggle={onResellToggle ? (v) => onResellToggle(user.username, v) : undefined} onAddCredits={onAddCredits ? (amt) => onAddCredits(user.username, amt) : undefined} isTrial={isTrial} />
        ))}
      </div>
    </AnimatePresence>
  );
}

/* ─── User row — CSS hover, no continuous framer motion ─── */
const UserRow = memo(function UserRow({ user, index, deleting, copied, onDelete, onCopy, onResellToggle, onAddCredits, isTrial }: {
  user: ClientUser; index: number; deleting: boolean; copied: boolean;
  onDelete: () => void; onCopy: () => void; onResellToggle?: (v: boolean) => void;
  onAddCredits?: (amount: number) => Promise<void>; isTrial: boolean;
}) {
  const [showCredits, setShowCredits] = useState(false);
  const [creditInput, setCreditInput] = useState("");
  const [crediting, setCrediting] = useState(false);

  const handleCredit = async () => {
    const n = parseInt(creditInput);
    if (!n || n === 0 || !onAddCredits) return;
    setCrediting(true);
    await onAddCredits(n);
    setCreditInput("");
    setShowCredits(false);
    setCrediting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 28 }}
      className="rounded-xl overflow-hidden"
    >
      <div className="user-row relative flex items-center justify-between px-4 py-3.5">
        <div className="user-row-bar absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: isTrial ? "linear-gradient(180deg, #f59e0b, #ef4444)" : "linear-gradient(180deg, #8b5cf6, #06b6d4)" }} />
        <div className="flex items-center gap-3 ml-2 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 user-row-icon" style={{ background: isTrial ? "rgba(245,158,11,0.12)" : "rgba(139,92,246,0.12)", border: `1px solid ${isTrial ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.2)"}` }}>
            {isTrial ? <Gift className="w-4 h-4 text-amber-400" /> : <UserIcon className="w-4 h-4 text-violet-400" />}
          </div>
          <div className="min-w-0">
            <div className="font-mono font-bold text-sm text-foreground truncate">{user.username}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>{new Date(user.createdAt).toLocaleDateString()} · <span className="font-semibold" style={{ color: isTrial ? "#f59e0b" : "#a78bfa" }}>{user.defaultDays}d</span></span>
              {!isTrial && (
                <span className="flex items-center gap-0.5 font-bold" style={{ color: (user.balance ?? 0) > 0 ? "#10b981" : "#ef4444" }}>
                  <Coins className="w-2.5 h-2.5" />{user.balance ?? 0} tokens
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold user-row-badge"
            style={{ background: isTrial ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", color: isTrial ? "#fbbf24" : "#34d399", border: `1px solid ${isTrial ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}` }}
          >
            {isTrial ? "TRIAL" : "ACTIVE"}
          </span>
          {/* Resell toggle */}
          {!isTrial && onResellToggle && (
            <button onClick={() => onResellToggle(!user.canResell)} title={user.canResell ? "Revoke reseller" : "Allow reseller"}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={{ background: user.canResell ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)", color: user.canResell ? "#f59e0b" : "#6b7280", border: user.canResell ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.08)" }}
            >
              <Gift className="w-3 h-3" />
              {user.canResell ? "RESELLER" : "NO RESELL"}
            </button>
          )}
          {/* Add credits button */}
          {!isTrial && onAddCredits && (
            <button onClick={() => setShowCredits(!showCredits)} title="Add tokens"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={{ background: showCredits ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.08)", color: "#10b981", border: showCredits ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(16,185,129,0.2)" }}
            >
              <Wallet className="w-3 h-3" />
              +Tokens
            </button>
          )}
          <button onClick={onCopy} className="icon-btn p-2 rounded-lg transition-all" style={{ color: copied ? "#06b6d4" : undefined }} title="Copy credentials">
            {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onDelete} disabled={deleting} className="icon-btn p-2 rounded-lg transition-all text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Inline credits panel (Premium 3D Design) */}
      <AnimatePresence>
        {showCredits && !isTrial && (
          <motion.div 
            initial={{ height: 0, opacity: 0, y: -10 }} 
            animate={{ height: "auto", opacity: 1, y: 0 }} 
            exit={{ height: 0, opacity: 0, y: -10 }} 
            transition={{ type: "spring", stiffness: 300, damping: 25 }} 
            className="overflow-hidden"
          >
            <div className="mx-4 mb-3 p-3 rounded-xl relative overflow-hidden" 
                 style={{ 
                   background: "linear-gradient(145deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.03) 100%)", 
                   border: "1px solid rgba(16,185,129,0.2)",
                   boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.1)"
                 }}>
              
              {/* Glow effects */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <div className="absolute -left-10 -top-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
              <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                
                {/* Balance Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0" 
                     style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    {user.balance ?? 0} <span className="text-emerald-500/70 font-normal">Tokens</span>
                  </span>
                </div>

                {/* Input & Action */}
                <div className="flex-1 w-full flex items-center gap-2 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-lg blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                  
                  <input
                    type="number"
                    value={creditInput}
                    onChange={(e) => setCreditInput(e.target.value)}
                    placeholder="Enter amount (e.g. 30 or -10)"
                    className="relative z-10 flex-1 h-9 px-3 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.03] transition-all shadow-inner"
                    onKeyDown={(e) => e.key === "Enter" && handleCredit()}
                  />
                  
                  <motion.button 
                    onClick={handleCredit} 
                    disabled={crediting || !creditInput} 
                    whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(16,185,129,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    className="relative z-10 h-9 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 overflow-hidden" 
                    style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-150%] animate-[shimmer_2s_infinite]" />
                    {crediting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Apply</>}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
        setTimeout(() => onCreate({ username, password, createdAt: new Date().toISOString(), defaultDays: days, isTrial: false, canResell: false, balance: 0 }), 900);
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

/* ─── Settings panel ─── */
function SettingsPanel() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/settings`, { headers: adminHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setApiUrl(d.externalApiUrl ?? "");
          setHasCustomKey(d.hasCustomKey ?? false);
        }
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const body: Record<string, string> = { externalApiUrl: apiUrl };
      if (apiKey) body.externalApiKey = apiKey;
      const res = await fetch(`${BASE}/api/settings`, {
        method: "PATCH", headers: adminHeaders(), body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) {
        setSaved(true);
        if (apiKey) { setHasCustomKey(true); setApiKey(""); }
        setTimeout(() => setSaved(false), 2500);
      } else { setError(d.error ?? "Failed to save"); }
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  const HOUR_PRESETS = [
    { h: 24, label: "1 Day" }, { h: 72, label: "3 Days" },
    { h: 168, label: "1 Week" }, { h: 336, label: "2 Weeks" },
    { h: 720, label: "1 Month" },
  ];

  return (
    <div className="space-y-4">
      {/* API Config card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(6,182,212,0.15)" }}>
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, #06b6d4, #10b981, transparent)" }} />
        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/[0.04]">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.25)" }}>
            <Settings className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">External API Configuration</h2>
            <p className="text-[11px] text-muted-foreground">UID bypass API endpoint &amp; authentication</p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 flex items-center gap-3 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            {/* API URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">API Base URL</label>
              <div className="relative group">
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://your-api.example.com/api/endpoint.php"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.1)] transition-all font-mono text-[12px]"
                />
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">API Key</label>
                {hasCustomKey && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <CheckCheck className="w-3 h-3" /> Custom key active
                  </span>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type={showKey ? "text" : "password"} value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasCustomKey ? "Enter new key to replace current…" : "Paste your API key here"}
                  className="w-full h-11 pl-10 pr-12 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.1)] transition-all font-mono text-[12px]"
                />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 pl-1">Leave blank to keep the current key unchanged</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <X className="w-3.5 h-3.5 shrink-0" />{error}
              </div>
            )}

            <motion.button type="submit" disabled={saving || !apiUrl} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #06b6d4, #10b981)", boxShadow: "0 0 20px rgba(6,182,212,0.25)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -skew-x-12 btn-shimmer" />
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><CheckCheck className="w-4 h-4" />Saved!</> : <><Settings className="w-4 h-4" />Save Settings</>}
            </motion.button>
          </form>
        )}
      </div>

      {/* Duration info card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <h3 className="font-bold text-sm text-foreground">Allowed Duration Values</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">The external API accepts these exact hour values</p>
        </div>
        <div className="p-4 grid grid-cols-5 gap-2">
          {HOUR_PRESETS.map(({ h, label }) => (
            <div key={h} className="flex flex-col items-center gap-1 py-3 rounded-xl" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.12)" }}>
              <span className="text-xl font-black text-cyan-400">{h}</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">hrs</span>
              <span className="text-[10px] text-muted-foreground/60">{label}</span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4">
          <div className="rounded-xl px-4 py-3 text-[11px] font-mono" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#6b7280" }}>
            <span className="text-cyan-400/70">{"{base_url}"}</span>
            <span className="text-muted-foreground/40">?api=</span>
            <span className="text-amber-400/70">{"{key}"}</span>
            <span className="text-muted-foreground/40">&action=create&uid=</span>
            <span className="text-violet-400/70">{"{uid}"}</span>
            <span className="text-muted-foreground/40">&duration=</span>
            <span className="text-emerald-400/70">{"{hours}"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Payments Panel ─── */
const PACKAGES = [
  { tokens: 10,  price: "$0.50",  label: "Starter" },
  { tokens: 30,  price: "$1.30",  label: "Basic" },
  { tokens: 70,  price: "$2.33",  label: "Standard" },
  { tokens: 150, price: "$3.50",  label: "Pro" },
  { tokens: 300, price: "$5.20",  label: "Ultimate" },
];

function PaymentsPanel({
  payments, loading, onApprove, onReject, onRefresh
}: {
  payments: PaymentItem[];
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState<string | null>(null);

  const pending = payments.filter(p => p.status === "pending");
  const done = payments.filter(p => p.status !== "pending");

  const act = async (id: string, fn: (id: string) => void) => {
    setActing(id);
    await fn(id);
    setActing(null);
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #ec4899, transparent)" }} />

        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.25)" }}>
              <CreditCard className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground">Payment Requests</h2>
              <p className="text-[11px] text-muted-foreground">{pending.length} pending approval</p>
            </div>
          </div>
          <button onClick={onRefresh} disabled={loading} className="p-2 rounded-lg hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CreditCard className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No payment requests yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {[...pending, ...done].map((p) => (
              <div key={p._id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm text-foreground">{p.username}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(236,72,153,0.12)", color: "#f472b6", border: "1px solid rgba(236,72,153,0.2)" }}>
                      <Coins className="w-2.5 h-2.5" />{p.packageTokens} tokens
                    </span>
                  </div>
                  {p.txNote && (
                    <div className="text-[11px] text-muted-foreground font-mono truncate">Note: {p.txNote}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(p.createdAt).toLocaleString()}</div>
                </div>

                {p.status === "pending" ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => act(p._id, onApprove)}
                      disabled={acting === p._id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                    >
                      {acting === p._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Approve
                    </button>
                    <button
                      onClick={() => act(p._id, onReject)}
                      disabled={acting === p._id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${p.status === "approved" ? "text-emerald-400" : "text-red-400"}`} style={{ background: p.status === "approved" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${p.status === "approved" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}` }}>
                    {p.status === "approved" ? <Check className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                    {p.status === "approved" ? "Approved" : "Rejected"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing reference */}
      <div className="glass-strong rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-foreground">Token Packages</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {PACKAGES.map(pkg => (
            <div key={pkg.tokens} className="flex flex-col items-center p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-lg font-black text-foreground">{pkg.tokens}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">tokens</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{pkg.label}</div>
            </div>
          ))}
        </div>
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

/* ─── My Profile UserProfilePanel ─── */
function UserProfilePanel({ 
  username, 
  isTrial, 
  balance,
  displayName,
  avatarBase64,
  onUpdate
}: { 
  username: string, 
  isTrial: boolean, 
  balance: number | null,
  displayName: string,
  avatarBase64: string,
  onUpdate: (name: string, avatar: string) => void
}) {
  const { toast } = useToast();
  const [tempName, setTempName] = useState(displayName);
  const [tempAvatar, setTempAvatar] = useState(avatarBase64);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingKey, setUpdatingKey] = useState(false);

  useEffect(() => {
    setTempName(displayName);
    setTempAvatar(avatarBase64);
  }, [displayName, avatarBase64]);

  const handleSaveIdentity = async () => {
    setSavingIdentity(true);
    try {
      try {
        localStorage.setItem(`display_name_${username}`, tempName);
        localStorage.setItem(`avatar_${username}`, tempAvatar);
      } catch (e) {
        console.warn("Local storage quota exceeded or unavailable:", e);
      }
      await onUpdate(tempName, tempAvatar);
      toast({ title: "Profile Saved", description: "Identity settings updated successfully." });
    } catch {
      toast({ title: "Failed", description: "Could not update profile.", variant: "destructive" });
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleUpdateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast({ title: "Required Fields", description: "Please enter both current and new passwords.", variant: "destructive" });
      return;
    }
    setUpdatingKey(true);
    try {
      const res = await fetch(`${BASE}/api/auth/update-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Key Updated", description: "Security password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        toast({ title: "Verification Failed", description: data.error || "Could not change key.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Could not contact security servers.", variant: "destructive" });
    } finally {
      setUpdatingKey(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setTempAvatar(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div className="mb-8 text-left">
        <div className="flex items-center gap-3">
          <UserCircle className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Account Profile</h1>
        </div>
        <p className="text-slate-400 font-semibold text-sm mt-2">Personalize your identity for the team chat and dashboard.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="argus-glass rounded-[2rem] p-8 sm:p-10 relative overflow-hidden shadow-2xl border border-white/5 text-left"
      >
        <div className="flex items-center gap-3.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="font-black text-base text-white tracking-wide">Identity Settings</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mt-0.5">HOW OTHERS SEE YOU IN CHAT</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          <div className="relative shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-full bg-black/40 border-2 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden flex items-center justify-center relative hover:border-cyan-500/50 group/preview transition-all">
              {tempAvatar ? (
                <img src={tempAvatar} alt="DP Preview" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-16 h-16 text-slate-600" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="flex-grow w-full space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">DISPLAY NAME</label>
              <input 
                type="text" 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all text-sm"
                placeholder="Enter display name..."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">AVATAR URL</label>
              <input 
                type="text" 
                value={tempAvatar} 
                onChange={(e) => setTempAvatar(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all text-sm"
                placeholder="https://image-link.com/photo.jpg or Base64..."
              />
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Use a direct link to an image file.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5">
          <button 
            onClick={handleSaveIdentity}
            disabled={savingIdentity}
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {savingIdentity ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="argus-glass rounded-[2rem] p-8 sm:p-10 relative overflow-hidden shadow-2xl border border-white/5 text-left"
      >
        <div className="flex items-center gap-3.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="font-black text-base text-white tracking-wide">Security Key</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mt-0.5">UPDATE YOUR ACCESS CREDENTIALS</p>
          </div>
        </div>

        <form onSubmit={handleUpdateKey} className="space-y-5 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">CURRENT PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">NEW PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all text-sm"
                placeholder="Enter new password"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={updatingKey || !currentPassword || !newPassword}
              className="w-full h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {updatingKey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crown className="w-4 h-4 text-slate-400" />
              )}
              Update Key
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── Leaderboard View ─── */
interface LeaderboardEntry {
  username: string;
  displayName: string;
  avatar: string;
  total: number;
  today: number;
  active: number;
  expired: number;
  role: string;
}

function LeaderboardView() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/uid/leaderboard`);
      const json = await res.json();
      if (json.success) {
        setData(json.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-60">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Leaderboard...</p>
      </div>
    );
  }

  const top1 = data[0];
  const top2 = data[1];
  const top3 = data[2];
  const rest = data.slice(3);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between text-left">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Leaderboard</h1>
            <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-[9px] font-black tracking-widest text-white mt-1">REAL-TIME RANKINGS</span>
          </div>
          <p className="text-slate-400 font-semibold text-sm mt-2">Ranked by UIDs added on the global authorization mesh</p>
        </div>
        
        <button 
          onClick={() => fetchLeaderboard(true)}
          disabled={refreshing}
          className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-red-500" : ""}`} />
        </button>
      </div>

      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10">
          {top2 ? (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              className="md:order-1"
            >
              <TiltWrapper>
                <div className="argus-glass rounded-[2rem] p-6 text-center border border-white/5 relative overflow-hidden shadow-xl md:h-[280px] flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-200" />
                  <div className="flex justify-center -mt-12 relative">
                    <div className="w-20 h-20 rounded-full bg-slate-800/80 border-4 border-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.3)] overflow-hidden flex items-center justify-center relative">
                      {top2.avatar ? (
                        <img src={top2.avatar} alt="Rank 2" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-12 h-12 text-slate-400" />
                      )}
                      <div className="absolute -bottom-2 right-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-slate-400 text-black text-xs font-black flex items-center justify-center shadow-lg border-2 border-slate-800">
                        2
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="font-black text-white text-lg tracking-wide truncate max-w-full">{top2.displayName}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      @{top2.username} <span className="opacity-40">·</span> <span className={top2.role === "admin" ? "text-red-400" : "text-violet-400"}>{top2.role === "admin" ? "Admin" : "Reseller"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 py-2.5 px-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-bold text-slate-400">
                    <div>
                      <div className="text-emerald-400 font-extrabold">{top2.today}</div>
                      <div>TODAY</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 font-extrabold">{top2.active}</div>
                      <div>ACTIVE</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-extrabold">{top2.expired}</div>
                      <div>EXPIRED</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TOTAL UIDs</span>
                    <span className="text-xl font-black text-slate-200 tracking-tight">{top2.total}</span>
                  </div>
                </div>
              </TiltWrapper>
            </motion.div>
          ) : (
            <div className="md:order-1 hidden md:block" />
          )}

          {top1 && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }}
              className="md:order-2 z-10"
            >
              <TiltWrapper>
                <div className="argus-glass rounded-[2rem] p-8 text-center border border-yellow-500/30 relative overflow-hidden shadow-2xl md:h-[320px] flex flex-col justify-between" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.05), rgba(239,68,68,0.05))" }}>
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                  
                  <div className="flex justify-center -mt-16 relative">
                    <div className="w-24 h-24 rounded-full bg-slate-900/90 border-4 border-yellow-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] overflow-hidden flex items-center justify-center relative">
                      {top1.avatar ? (
                        <img src={top1.avatar} alt="Rank 1" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-14 h-14 text-yellow-500" />
                      )}
                      <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full animate-bounce" />
                      <div className="absolute -bottom-2 right-1/2 translate-x-1/2 w-7 h-7 rounded-full bg-yellow-500 text-black text-sm font-black flex items-center justify-center shadow-lg border-2 border-yellow-800">
                        1
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <h3 className="font-black text-white text-xl tracking-wide truncate max-w-full">{top1.displayName}</h3>
                      <Trophy className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)] shrink-0" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      @{top1.username} <span className="opacity-40">·</span> <span className={top1.role === "admin" ? "text-red-400 font-extrabold" : "text-violet-400 font-extrabold"}>{top1.role === "admin" ? "Admin" : "Reseller"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 py-2.5 px-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-bold text-slate-400">
                    <div>
                      <div className="text-emerald-400 font-extrabold">{top1.today}</div>
                      <div>TODAY</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 font-extrabold">{top1.active}</div>
                      <div>ACTIVE</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-extrabold">{top1.expired}</div>
                      <div>EXPIRED</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL UIDs</span>
                    <span className="text-2xl font-black text-yellow-400 tracking-tight drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">{top1.total}</span>
                  </div>
                </div>
              </TiltWrapper>
            </motion.div>
          )}

          {top3 ? (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:order-3"
            >
              <TiltWrapper>
                <div className="argus-glass rounded-[2rem] p-6 text-center border border-white/5 relative overflow-hidden shadow-xl md:h-[280px] flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-400" />
                  <div className="flex justify-center -mt-12 relative">
                    <div className="w-20 h-20 rounded-full bg-slate-800/80 border-4 border-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.3)] overflow-hidden flex items-center justify-center relative">
                      {top3.avatar ? (
                        <img src={top3.avatar} alt="Rank 3" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-12 h-12 text-amber-600" />
                      )}
                      <div className="absolute -bottom-2 right-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-amber-600 text-black text-xs font-black flex items-center justify-center shadow-lg border-2 border-amber-950">
                        3
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-black text-white text-lg tracking-wide truncate max-w-full">{top3.displayName}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      @{top3.username} <span className="opacity-40">·</span> <span className={top3.role === "admin" ? "text-red-400" : "text-violet-400"}>{top3.role === "admin" ? "Admin" : "Reseller"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 py-2.5 px-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-bold text-slate-400">
                    <div>
                      <div className="text-emerald-400 font-extrabold">{top3.today}</div>
                      <div>TODAY</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 font-extrabold">{top3.active}</div>
                      <div>ACTIVE</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-extrabold">{top3.expired}</div>
                      <div>EXPIRED</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TOTAL UIDs</span>
                    <span className="text-xl font-black text-slate-200 tracking-tight">{top3.total}</span>
                  </div>
                </div>
              </TiltWrapper>
            </motion.div>
          ) : (
            <div className="md:order-3 hidden md:block" />
          )}
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="argus-glass rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/5 text-left"
      >
        <div className="flex items-center gap-3 px-6 sm:px-8 py-6 border-b border-white/[0.05] bg-black/20">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)] border border-red-500/20" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(0,0,0,0.05))" }}>
            <Users className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-black text-lg text-white tracking-wide">Rankings</h2>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Performance of all distributor nodes</div>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center opacity-60">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-300 font-bold mb-2">No Leaderboard Data</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Resellers will appear here as they register UIDs</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Operator</div>
              <div className="col-span-2 text-center text-emerald-500">Today</div>
              <div className="col-span-2 text-center text-cyan-400">Active</div>
              <div className="col-span-2 text-center text-red-400">Expired</div>
              <div className="col-span-1 text-right text-slate-300">Total</div>
            </div>

            <AnimatePresence>
              {data.map((user, idx) => (
                <motion.div
                  key={user.username}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 items-center gap-4 transition-all hover:bg-white/[0.03] hover:border-white/20 overflow-hidden"
                >
                  <div className="col-span-1 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center border shadow-inner ${
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                      idx === 1 ? "bg-slate-400/20 text-slate-300 border-slate-400/30" :
                      idx === 2 ? "bg-amber-600/20 text-amber-500 border-amber-600/30" :
                      "bg-black/50 text-slate-400 border-white/5"
                    }`}>
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-sm text-white tracking-wide">{user.displayName}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        @{user.username} <span className="opacity-40">·</span> <span className={user.role === "admin" ? "text-red-400 font-extrabold" : "text-violet-400 font-extrabold"}>{user.role === "admin" ? "Admin" : "Reseller"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 text-center flex sm:block justify-between items-center sm:border-0 border-b border-white/5 py-1 sm:py-0">
                    <span className="sm:hidden text-[9px] font-black uppercase text-slate-500 tracking-wider">Today</span>
                    <span className="text-emerald-400 font-extrabold text-sm sm:bg-emerald-500/10 sm:border sm:border-emerald-500/20 px-2.5 py-1 rounded-lg">{user.today}</span>
                  </div>

                  <div className="col-span-2 text-center flex sm:block justify-between items-center sm:border-0 border-b border-white/5 py-1 sm:py-0">
                    <span className="sm:hidden text-[9px] font-black uppercase text-slate-500 tracking-wider">Active</span>
                    <span className="text-cyan-400 font-extrabold text-sm sm:bg-cyan-500/10 sm:border sm:border-cyan-500/20 px-2.5 py-1 rounded-lg">{user.active}</span>
                  </div>

                  <div className="col-span-2 text-center flex sm:block justify-between items-center sm:border-0 border-b border-white/5 py-1 sm:py-0">
                    <span className="sm:hidden text-[9px] font-black uppercase text-slate-500 tracking-wider">Expired</span>
                    <span className="text-red-400 font-extrabold text-sm sm:bg-red-500/10 sm:border sm:border-red-500/20 px-2.5 py-1 rounded-lg">{user.expired}</span>
                  </div>

                  <div className="col-span-1 text-right flex sm:block justify-between items-center py-1 sm:py-0">
                    <span className="sm:hidden text-[9px] font-black uppercase text-slate-500 tracking-wider">Total</span>
                    <span className="text-white font-black text-base tracking-tight">{user.total}</span>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Team Chat View ─── */
interface ChatMessageData {
  _id?: string;
  username: string;
  displayName: string;
  avatar: string;
  message: string;
  createdAt: string;
}

function TeamChatView({ currentUsername }: { currentUsername: string }) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        headers: userHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat messages:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);
    
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const payloadText = text.trim();
    setText("");
    setSending(true);

    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: {
          ...userHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: payloadText }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.chat]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-60">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Secure Channel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[75vh] argus-glass rounded-[2rem] overflow-hidden border border-white/5 relative text-left">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05] bg-black/25">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <MessageSquare className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="font-black text-base text-white tracking-wide">Team Cryptochat</h2>
            <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              Secured aes-256 node
            </div>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/30 border border-white/5 px-3 py-1 rounded-md">
          {messages.length} packets
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <MessageSquare className="w-12 h-12 text-slate-500 mb-4" />
            <p className="text-slate-300 font-bold text-sm">No transmissions yet</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Start chatting with the team below</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.username === currentUsername;
            const isAdminMsg = msg.username === "admin" || msg.displayName === "ADMIN";
            
            return (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto text-left"}`}
              >
                <div className="w-9 h-9 rounded-full bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                  {msg.avatar ? (
                    <img src={msg.avatar} alt={msg.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className={`w-6 h-6 ${isAdminMsg ? "text-red-400" : "text-slate-500"}`} />
                  )}
                </div>

                <div>
                  <div className={`text-[10px] font-black tracking-wide uppercase mb-1 ${isMe ? "text-right text-cyan-400" : isAdminMsg ? "text-red-400" : "text-violet-400"}`}>
                    {msg.displayName}
                    {isAdminMsg && <span className="ml-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-black border border-red-500/30 tracking-widest">ADMIN</span>}
                  </div>
                  
                  <div className={`p-4 rounded-2xl text-sm font-semibold leading-relaxed shadow-lg border ${
                    isMe 
                      ? "bg-cyan-500/10 border-cyan-500/30 text-white rounded-tr-none" 
                      : isAdminMsg
                        ? "bg-red-500/10 border-red-500/20 text-white rounded-tl-none"
                        : "bg-white/[0.03] border-white/10 text-slate-200 rounded-tl-none"
                  }`}>
                    {msg.message}
                  </div>

                  <div className={`text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest ${isMe ? "text-right" : ""}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-white/[0.05] bg-black/25 flex items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Transmit encrypted message to team..."
          className="flex-1 h-12 px-5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 text-sm font-bold focus:outline-none focus:border-red-500/50 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="h-12 w-12 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-4.5 h-4.5" />
          )}
        </button>
      </form>
    </div>
  );
}

/* ─── Overview Stat Card ─── */
function OverviewStatCard({
  label,
  value,
  icon: Icon,
  delay,
  sparklinePoints = [30, 28, 25, 20, 23, 18, 15, 12, 16, 10]
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  delay: number;
  sparklinePoints?: number[];
}) {
  const pathD = sparklinePoints
    .map((p, i) => {
      const x = (i / (sparklinePoints.length - 1)) * 100;
      const y = p;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 22 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="argus-glass rounded-[2rem] p-6 sm:p-7 relative overflow-hidden cursor-default group flex items-center justify-between border border-white/[0.04] bg-black/40 shadow-xl text-left"
    >
      <div className="scanline" />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[2rem] pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.05), rgba(0,0,0,0))" }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, #ef4444, transparent)" }}
      />

      <div className="flex flex-col justify-between h-full relative z-10">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-slate-400 transition-colors">{label}</div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-3.5 drop-shadow-md">{value}</div>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between h-full relative z-10 gap-3">
        <Icon className="w-4 h-4 text-slate-500/50 group-hover:text-red-500/80 transition-colors" />
        <div className="w-24 sm:w-28 h-10 mt-2">
          <svg viewBox="0 0 100 30" className="w-full h-full text-red-500/80 group-hover:text-red-400 transition-colors filter drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]">
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Days Left Helper ─── */
function getDaysLeft(addedAtStr: string, days: number): string {
  try {
    const addedAt = new Date(addedAtStr).getTime();
    const expiresAt = addedAt + days * 24 * 60 * 60 * 1000;
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return "Expired";
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return `${diffDays}d left`;
  } catch {
    return `${days}d left`;
  }
}

/* ─── Tilt Wrapper ─── */
function TiltWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTilt({ x: dy * -6, y: dx * 6 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transformStyle: "preserve-3d",
        transition: "transform 0.25s ease-out",
      }}
    >
      {children}
    </div>
  );
}
