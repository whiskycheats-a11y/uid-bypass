import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Trash2, LogOut, Eye, EyeOff, Loader2, Crown,
  UserCheck, Activity, Sparkles, Copy, CheckCheck, X, Zap,
  Lock, User as UserIcon, Gift, RefreshCw, Shield, Timer, Settings,
  Coins, Wallet, CreditCard, Check, XCircle, Clock, LayoutDashboard,
  BarChart2, MessageSquare, UserCircle, Camera, Edit2, Trophy, Medal,
  Send, Menu, CalendarDays,
} from "lucide-react";
import { AmbientScene } from "@/components/ambient-scene";
import {
  useListUids,
  getListUidsQueryKey,
  useRemoveUid,
  useAddUid,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");

const addUidSchema = z.object({
  uid: z.string().min(3, "UID must be at least 3 chars").max(50),
  name: z.string().max(100).optional(),
  days: z.coerce.number().min(1).max(3650),
  bluestack: z.boolean().default(false),
});
type AddUidValues = z.infer<typeof addUidSchema>;

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
  hwid?: string;
  hwidLockEnabled?: boolean;
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
  const [tab, setTab] = useState<"clients" | "payments" | "settings">("clients"); // sub-tab
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creditModalUser, setCreditModalUser] = useState<ClientUser | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [profileData, setProfileData] = useState({ displayName: adminUsername || "Admin", avatarBase64: "" });
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const [noticeText, setNoticeText] = useState("");
  const [noticeExpiry, setNoticeExpiry] = useState("indefinite");
  const [activeNotice, setActiveNotice] = useState("");
  const [activeNoticeExpiry, setActiveNoticeExpiry] = useState("");
  const [savingNotice, setSavingNotice] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSuccessBlast, setShowSuccessBlast] = useState(false);

  const form = useForm<AddUidValues>({
    resolver: zodResolver(addUidSchema),
    defaultValues: { uid: "", name: "", days: 30, bluestack: false },
  });

  const addMutation = useAddUid();

  const onSubmitUid = (values: AddUidValues) => {
    // Admin adding UID -> they add it on their own behalf or it's just registered as admin
    const payload = { ...values, username: adminUsername };
    addMutation.mutate(
      { data: payload as typeof values },
      {
        onSuccess: (data) => {
          if (data.success) {
            setShowSuccessBlast(true);
            toast({ title: "Access Granted", description: `UID ${values.uid} whitelisted successfully.` });
            form.reset();
            queryClient.invalidateQueries({ queryKey: getListUidsQueryKey() });
          } else {
            toast({ title: "Failed", description: (data as any).message || "Error", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Error", description: "Could not reach server.", variant: "destructive" }),
      }
    );
  };
  useEffect(() => {
    fetchUsers();
    fetchPayments();
    fetchCurrentNotice();
  }, []);

  async function fetchCurrentNotice() {
    try {
      const res = await fetch(`${BASE}/api/settings/notice`);
      const data = await res.json();
      if (data.success) {
        setActiveNotice(data.noticeText);
        setActiveNoticeExpiry(data.expiry);
        if (data.noticeText) {
          setNoticeText(data.noticeText);
        }
      }
    } catch (e) {
      console.error("Error fetching notice settings:", e);
    }
  }

  async function handleBroadcastNotice(e: React.FormEvent) {
    e.preventDefault();
    setSavingNotice(true);
    try {
      const res = await fetch(`${BASE}/api/settings/notice`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ noticeText, noticeExpiry }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveNotice(data.noticeText);
        setActiveNoticeExpiry(data.expiry);
        toast({
          title: "Global Notice Published",
          description: data.noticeText 
            ? "Announcement has been successfully broadcast to all client & reseller feeds."
            : "Broadcast notice cleared successfully.",
        });
      } else {
        toast({ title: "Broadcast Failed", description: data.error || "Save failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect to API server.", variant: "destructive" });
    } finally {
      setSavingNotice(false);
    }
  }

  async function handleClearNotice() {
    setSavingNotice(true);
    try {
      const res = await fetch(`${BASE}/api/settings/notice`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ noticeText: "", noticeExpiry: "indefinite" }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveNotice("");
        setActiveNoticeExpiry("");
        setNoticeText("");
        toast({
          title: "Broadcast Cleared",
          description: "Global announcement removed from client portals.",
        });
      }
    } catch {
      toast({ title: "Error", description: "Clear request failed.", variant: "destructive" });
    } finally {
      setSavingNotice(false);
    }
  }

  async function handleHwidLockToggle(username: string, enabled: boolean) {
    try {
      const res = await fetch(`${BASE}/api/users/${encodeURIComponent(username)}/hwid-lock`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((p) => p.map((u) => u.username === username ? { ...u, hwidLockEnabled: enabled } : u));
        toast({
          title: enabled ? "HWID Lock Enabled" : "HWID Lock Disabled",
          description: `HWID device locking has been ${enabled ? "activated" : "deactivated"} for user ${username}.`,
        });
      } else {
        toast({ title: "Failed", description: data.error || "Update failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Server request failed.", variant: "destructive" });
    }
  }

  async function handleHwidReset(username: string) {
    try {
      const res = await fetch(`${BASE}/api/users/${encodeURIComponent(username)}/hwid-reset`, {
        method: "POST",
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((p) => p.map((u) => u.username === username ? { ...u, hwid: "" } : u));
        toast({
          title: "HWID Reset Successful",
          description: `The hardware signature for ${username} has been cleared. The next login will register a new device.`,
        });
      } else {
        toast({ title: "Failed", description: data.error || "Reset failed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Server request failed.", variant: "destructive" });
    }
  }

  const renderNoticeBroadcastCard = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="argus-glass rounded-[2rem] overflow-hidden relative shadow-2xl p-6 border border-white/[0.06] flex flex-col justify-between h-full bg-[#080616]/98"
      >
        <div className="absolute -left-16 -top-16 w-36 h-36 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-36 h-36 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.05] mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/25">
              <Medal className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white tracking-wide">Notice Broadcast</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Announcement Board</p>
            </div>
          </div>

          {/* Active Notice Info Banner */}
          {activeNotice ? (
            <div className="bg-violet-950/20 border border-violet-900/30 rounded-2xl p-4 mb-5 text-left text-xs">
              <span className="text-[9px] font-black text-violet-400 uppercase tracking-wider block mb-1">CURRENTLY BROADCASTING</span>
              <p className="text-slate-200 font-medium leading-relaxed font-sans">{activeNotice}</p>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-slate-500 font-bold">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Expires: {activeNoticeExpiry === "indefinite" ? "Never (Indefinite)" : new Date(activeNoticeExpiry).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 mb-5 text-center text-xs text-slate-500 font-bold py-6">
              No active announcements.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleBroadcastNotice} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notice Text</label>
              <textarea
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder="Enter announcement text to show on reseller and client dashboards..."
                className="w-full h-24 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all resize-none font-sans font-medium leading-relaxed"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Duration</label>
                <select
                  value={noticeExpiry}
                  onChange={(e) => setNoticeExpiry(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#0e0c1f] border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-violet-500/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all font-bold"
                >
                  <option value="indefinite">Indefinite (No expiry)</option>
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="72h">3 Days (72 Hours)</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                {activeNotice && (
                  <button
                    type="button"
                    onClick={handleClearNotice}
                    disabled={savingNotice}
                    className="h-10 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400 hover:bg-red-500/10 hover:text-white transition-all cursor-pointer font-bold flex-1"
                  >
                    Clear
                  </button>
                )}
                <motion.button
                  type="submit"
                  disabled={savingNotice || !noticeText.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 relative overflow-hidden flex-grow cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                    boxShadow: "0 0 15px rgba(139,92,246,0.25)",
                  }}
                >
                  {savingNotice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" />Publish</>}
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    );
  };

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
  const freeTrialCount = uids.filter((u) => u.name && u.name.startsWith("Trial-")).length;

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
    { id: "create", label: "Create UID", icon: Plus },
    { id: "analyze", label: "Analyze", icon: BarChart2 },
    { id: "manage", label: "Manage Clients", icon: Users },
    { id: "free", label: "Free Trial", icon: Gift },
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

  const renderCreateUid = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto"
    >
      <div className="argus-glass rounded-[2rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 mb-2 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-red-500/30" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(0,0,0,0.1))" }}>
            <Plus className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="font-black text-lg text-white tracking-wide">Register UID</h2>
        </div>
        <p className="text-xs font-semibold text-slate-400 mb-8 relative z-10">Admin Access: Add an endpoint directly.</p>

        <form onSubmit={form.handleSubmit(onSubmitUid)} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Friendly Name (Optional)</label>
            <div className="relative group">
              <Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-red-500 transition-colors pointer-events-none" />
              <Input
                placeholder="e.g. SHIVAM, NX..."
                className="pl-12 h-14 rounded-2xl bg-black/40 border-white/10 focus-visible:ring-red-500/30 focus-visible:border-red-500/50 text-white font-bold transition-all shadow-inner"
                {...form.register("name")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Player UID</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-red-500 transition-colors pointer-events-none" />
              <Input
                placeholder="Enter UID number..."
                className="pl-12 h-14 rounded-2xl bg-black/40 border-white/10 focus-visible:ring-red-500/30 focus-visible:border-red-500/50 text-white font-bold transition-all shadow-inner"
                {...form.register("uid")}
              />
            </div>
            {form.formState.errors.uid && (
              <p className="text-[10px] font-bold text-red-400 px-2 mt-1">{form.formState.errors.uid.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Duration (Days)</label>
            <div className="relative group">
              <Timer className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-red-500 transition-colors pointer-events-none" />
              <Input
                type="number"
                min="1"
                placeholder="Number of days..."
                className="pl-12 h-14 rounded-2xl bg-black/40 border-white/10 focus-visible:ring-red-500/30 focus-visible:border-red-500/50 text-white font-bold transition-all shadow-inner"
                {...form.register("days", { valueAsNumber: true })}
              />
            </div>
            {form.formState.errors.days && (
              <p className="text-[10px] font-bold text-red-400 px-2 mt-1">{form.formState.errors.days.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between p-5 rounded-2xl bg-black/30 border border-white/10 group hover:border-red-500/30 hover:bg-black/50 transition-all shadow-inner">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <Activity className="w-4 h-4 text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                BlueStack Protocol
              </div>
              <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Emulator Routing</div>
            </div>
            <Switch
              checked={form.watch("bluestack")}
              onCheckedChange={(v) => form.setValue("bluestack", v)}
              className="data-[state=checked]:bg-red-500 data-[state=checked]:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            />
          </div>

          <motion.button
            type="submit"
            disabled={addMutation.isPending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 mt-2 bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all"
          >
            <AnimatePresence mode="wait">
              {addMutation.isPending ? (
                <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Transmitting...
                </motion.span>
              ) : (
                <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Authorize Endpoint
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-screen bg-[#030014] text-white font-sans overflow-hidden relative">
      <div ref={spotlightRef} className="fixed inset-0 pointer-events-none z-0" style={{ willChange: "background" }} />
      
      {/* Sidebar — hidden on mobile, slide-in on mobile when open */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-[#0a0a0a]/98 border-r border-white/5 flex flex-col z-[70] shadow-[10px_0_30px_rgba(0,0,0,0.8)] lg:hidden"
          >
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,0,110,0.4)]" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-black text-[11px] uppercase tracking-[0.1em] text-white">ADMIN PANEL</div>
                  <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">SUPER ADMIN</div>
                </div>
              </div>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
              {SIDEBAR_NAV.map((nav) => {
                const Icon = nav.icon;
                const active = activeSidebarTab === nav.id;
                return (
                  <button
                    key={nav.id}
                    onClick={() => { setActiveSidebarTab(nav.id); setMobileSidebarOpen(false); }}
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
            <div className="p-4 border-t border-white/5">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-semibold text-sm"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0a0a0a]/95 border-r border-white/5 flex-col z-50 shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        {/* Sidebar Logo Area */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,0,110,0.4)]" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-black text-[11px] uppercase tracking-[0.1em] text-white">UID BYPASS ADMIN</div>
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
        <header className="h-16 lg:h-20 shrink-0 border-b border-white/5 px-4 lg:px-8 flex items-center justify-between relative z-20 backdrop-blur-md bg-black/20">
          <div className="flex items-center gap-3">
            {/* Hamburger button — only on mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hidden sm:flex">
              <span>ADMIN TERMINAL</span>
              <span className="text-slate-600">/</span>
              <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] uppercase">
                {SIDEBAR_NAV.find(n => n.id === activeSidebarTab)?.label || "DASHBOARD"}
              </span>
            </div>
            {/* Mobile title */}
            <div className="sm:hidden text-white font-black uppercase tracking-wider text-xs">
              {SIDEBAR_NAV.find(n => n.id === activeSidebarTab)?.label || "DASHBOARD"}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10 bg-white/[0.03] text-xs text-slate-300 font-bold shadow-inner">
              {profileData.avatarBase64 ? (
                <img src={profileData.avatarBase64} alt="Avatar" className="w-5 h-5 rounded-full object-cover shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
              ) : (
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="hidden sm:inline uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">{profileData.displayName}</span>
              <span className="hidden sm:inline-block ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
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
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-8 relative z-10 custom-scrollbar">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                    <OverviewStatCard
                      icon={Gift}
                      label="Free Trials"
                      value={isUidsLoading ? "—" : freeTrialCount}
                      delay={0.3}
                      sparklinePoints={[10, 12, 14, 13, 16, 18, 20, 22, 24, 25]}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <div className="lg:col-span-2">
                      {renderUidTable(false, false)}
                    </div>
                    <div className="lg:col-span-1">
                      {renderNoticeBroadcastCard()}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSidebarTab === "analyze" && (
                <motion.div key="analyze" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <LeaderboardView />
                </motion.div>
              )}

              {activeSidebarTab === "create" && (
                <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {renderCreateUid()}
                </motion.div>
              )}

              {activeSidebarTab === "manage" && (
                <motion.div key="manage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  {/* Title */}
                  <div className="text-left">
                    <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Client Operations</h1>
                    <p className="text-slate-400 font-semibold text-sm mt-1">Manage resellers and allocate credit balances.</p>
                  </div>
                  
                  <ClientsPanel
                    users={regular}
                    loading={loading}
                    deleting={deleting}
                    copied={copied}
                    onAdd={() => setShowModal(true)}
                    onDelete={handleDelete}
                    onCopy={copy}
                    onResellToggle={handleResellToggle}
                    onAddCreditsClick={setCreditModalUser}
                    onHwidLockToggle={handleHwidLockToggle}
                    onHwidReset={handleHwidReset}
                  />
                </motion.div>
              )}

              {activeSidebarTab === "free" && (
                <motion.div key="free" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                  {/* Title */}
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                      <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Free Trials</h1>
                      <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20 text-[9px] font-black tracking-widest text-white mt-1">PROMO ENGINES</span>
                    </div>
                    <p className="text-slate-400 font-semibold text-sm mt-2">Generate free trial keys and manage active trial accounts.</p>
                  </div>
                  <FreeTrialPanel
                    trials={trials}
                    deleting={deleting}
                    copied={copied}
                    onDelete={handleDelete}
                    onCopy={copy}
                    onCreated={(u) => setUsers((p) => [...p, u])}
                    onHwidLockToggle={handleHwidLockToggle}
                    onHwidReset={handleHwidReset}
                  />
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
        {creditModalUser && (
          <ManageCreditsModal
            user={creditModalUser}
            onClose={() => setCreditModalUser(null)}
            onAddCredits={async (amount) => {
              await handleAddCredits(creditModalUser.username, amount);
              setCreditModalUser(null);
            }}
          />
        )}
      </AnimatePresence>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 hidden argus-glass rounded-2xl flex items-center justify-around py-3 px-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 overflow-x-auto scrollbar-none gap-2">
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
  function ClientsPanel({ users, loading, deleting, copied, onAdd, onDelete, onCopy, onResellToggle, onAddCreditsClick, onHwidLockToggle, onHwidReset }: {
    users: ClientUser[]; loading: boolean; deleting: string | null;
    copied: string | null; onAdd: () => void;
    onDelete: (u: string) => void; onCopy: (u: string, p?: string) => void;
    onResellToggle: (u: string, v: boolean) => void;
    onAddCreditsClick: (u: ClientUser) => void;
    onHwidLockToggle: (username: string, enabled: boolean) => void;
    onHwidReset: (username: string) => void;
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
          <UserList users={users} loading={loading} deleting={deleting} copied={copied} onDelete={onDelete} onCopy={onCopy} onResellToggle={onResellToggle} onAddCreditsClick={onAddCreditsClick} onHwidLockToggle={onHwidLockToggle} onHwidReset={onHwidReset} emptyText="No clients yet — click Add Client" />
        </div>
      </div>
    );
  }

/* ─── Free Trial panel ─── */
function FreeTrialPanel({ trials, deleting, copied, onDelete, onCopy, onCreated, onHwidLockToggle, onHwidReset }: {
  trials: ClientUser[]; deleting: string | null; copied: string | null;
  onDelete: (u: string) => void; onCopy: (u: string, p?: string) => void;
  onCreated: (u: ClientUser) => void;
  onHwidLockToggle: (username: string, enabled: boolean) => void;
  onHwidReset: (username: string) => void;
}) {
  const PRESETS = [1, 3, 7, 14, 30];
  const [days, setDays] = useState(7);
  const [serverName, setServerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkData, setLinkData] = useState<{ token: string; link: string; days: number; serverName?: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);
  
  const [tokens, setTokens] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  const fetchTokens = async () => {
    setLoadingTokens(true);
    try {
      const res = await fetch(`${BASE}/api/reseller/trial-tokens`, {
        headers: adminHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setTokens(data.tokens);
      }
    } catch (err) {
      console.error("Failed to fetch trial tokens", err);
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleDeleteToken = async (token: string) => {
    if (!confirm("Are you sure you want to delete this trial link? All associated UIDs will be permanently revoked!")) return;
    try {
      const res = await fetch(`${BASE}/api/reseller/trial-token/${token}`, {
        method: "DELETE",
        headers: adminHeaders()
      });
      const data = await res.json();
      if (data.success) {
        fetchTokens();
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error("Failed to delete token", err);
    }
  };

  const refresh = useCallback(() => {
    setDays(7);
    setError("");
    setLinkData(null);
    setServerName("");
  }, []);

  const copyField = (val: string, field: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyCard = (c: { token: string; link: string; days: number; serverName?: string }) => {
    const sName = c.serverName ? c.serverName.trim() : "Velocira Cheats";
    const msg =
`✨「 ${sName.toUpperCase()} BYPASS MODULE 」✨
🔓 FREE TRIAL ACCESS GRANTED 🔓
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔

🌐  PORTAL LINK (1-TIME USE)
   ${c.link}

   ⏳  Valid  ➜  ${c.days} Day${c.days > 1 ? "s" : ""} Free Trial

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
🎯  HOW TO ACTIVATE

   ▸ Open the portal link provided above
   ▸ Enter your Player UID safely
   ▸ Select Bluestack if playing on simulator
   ▸ Access granted instantly ✅

▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
💎  ${sName} Developer Zone
🔥  Premium Bypass Service
━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    navigator.clipboard.writeText(msg);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/reseller/trial-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({
          days,
          serverName: serverName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const portalUrl = `${window.location.origin}/free-portal?token=${data.token}`;
        setLinkData({ token: data.token, link: portalUrl, days, serverName: serverName.trim() });
        fetchTokens();
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
            {linkData ? (
              <motion.div key="creds" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Success header */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/20">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Trial Link Created!</p>
                    <p className="text-[11px] text-muted-foreground">Valid for 24h to activate — share the link below</p>
                  </div>
                </div>

                {/* Credentials display */}
                <div className="space-y-2">
                  {[
                    { label: "Activation Link", value: linkData.link, key: "link" },
                    { label: "Token Key", value: linkData.token, key: "token" },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex-grow min-w-0 pr-4">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{f.label}</div>
                        <div className="font-mono font-bold text-sm text-foreground truncate">{f.value}</div>
                      </div>
                      <button onClick={() => copyField(f.value, f.key)} className="p-2 rounded-lg transition-all hover:bg-white/[0.06] shrink-0" style={{ color: copiedField === f.key ? "#06b6d4" : "#6b7280" }}>
                        {copiedField === f.key ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <Timer className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-400">{linkData.days} days access</span>
                  </div>
                </div>

                {/* Reseller copy card */}
                <motion.button
                  onClick={() => copyCard(linkData)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-xs font-bold uppercase tracking-widest relative overflow-hidden transition-all"
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
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground border border-white/[0.07] hover:bg-white/[0.04] hover:text-foreground transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Another
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Server Name (Prefix)</label>
                  <div className="flex items-center gap-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-xl px-4 py-3 focus-within:border-amber-500/50 transition-all">
                    <input
                      type="text"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      placeholder="e.g. Velocira Cheats"
                      className="bg-transparent border-0 outline-0 text-white placeholder-slate-600 text-sm w-full font-bold"
                    />
                  </div>
                </div>

                {/* Days picker */}
                <DurationPicker value={days} onChange={setDays} presets={PRESETS} min={1} max={30} theme="amber" />

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <X className="w-3.5 h-3.5 shrink-0" />{error}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full h-12 rounded-xl btn-viral-3d text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 btn-shimmer" />
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4" />Generate Free Trial Access</>}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Generated Tokens List */}
      <div className="panel rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-4 border-b border-white/[0.04] bg-black/20 flex items-center justify-between">
          <h2 className="font-bold text-sm text-foreground">Generated Trial Links</h2>
          <span className="text-[10px] bg-white/10 px-2 py-1 rounded-lg text-slate-300">{tokens.length} Links</span>
        </div>
        <div className="p-4 sm:p-5">
          {loadingTokens ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-[11px] font-bold uppercase tracking-widest">No trial links generated yet</div>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => (
                <div key={t.token} className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-xs text-amber-400 truncate">{t.token}</span>
                      {t.used ? (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-widest">Used</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>{t.days} Day{t.days > 1 ? "s" : ""}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      {t.resellerUsername && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="text-cyan-400">By: {t.resellerUsername}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => {
                        const url = `${window.location.origin}/free-portal?token=${t.token}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Link Copied", description: "Trial activation link copied to clipboard." });
                      }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors" title="Copy Link">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteToken(t.token)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors" title="Revoke & Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <UserList users={trials} loading={false} deleting={deleting} copied={copied} onDelete={onDelete} onCopy={onCopy} onHwidLockToggle={onHwidLockToggle} onHwidReset={onHwidReset} emptyText="" isTrial />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared user list ─── */
function UserList({ users, loading, deleting, copied, onDelete, onCopy, onResellToggle, onAddCreditsClick, onHwidLockToggle, onHwidReset, emptyText, isTrial = false }: {
  users: ClientUser[]; loading: boolean; deleting: string | null; copied: string | null;
  onDelete: (u: string) => void; onCopy: (u: string, p?: string) => void;
  onResellToggle?: (u: string, v: boolean) => void;
  onAddCreditsClick?: (u: ClientUser) => void;
  onHwidLockToggle?: (username: string, enabled: boolean) => void;
  onHwidReset?: (username: string) => void;
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
          <UserRow key={user.username} user={user} index={i} deleting={deleting === user.username} copied={copied === user.username} onDelete={() => onDelete(user.username)} onCopy={() => onCopy(user.username, user.password)} onResellToggle={onResellToggle ? (v) => onResellToggle(user.username, v) : undefined} onAddCreditsClick={onAddCreditsClick ? () => onAddCreditsClick(user) : undefined} onHwidLockToggle={onHwidLockToggle ? (v) => onHwidLockToggle(user.username, v) : undefined} onHwidReset={onHwidReset ? () => onHwidReset(user.username) : undefined} isTrial={isTrial} />
        ))}
      </div>
    </AnimatePresence>
  );
}

/* ─── User row — CSS hover, no continuous framer motion ─── */
const UserRow = memo(function UserRow({ user, index, deleting, copied, onDelete, onCopy, onResellToggle, onAddCreditsClick, onHwidLockToggle, onHwidReset, isTrial }: {
  user: ClientUser; index: number; deleting: boolean; copied: boolean;
  onDelete: () => void; onCopy: () => void; onResellToggle?: (v: boolean) => void;
  onAddCreditsClick?: () => void; onHwidLockToggle?: (enabled: boolean) => void;
  onHwidReset?: () => void; isTrial: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 28 }}
      className="rounded-xl overflow-hidden"
    >
      <div className="user-row relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3.5">
        <div className="user-row-bar absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: isTrial ? "linear-gradient(180deg, #f59e0b, #ef4444)" : "linear-gradient(180deg, #8b5cf6, #06b6d4)" }} />
        <div className="flex items-center gap-3 ml-2 min-w-0 w-full sm:w-auto">
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
              {user.hwidLockEnabled && user.hwid && (
                <span className="text-[10px] font-mono opacity-65 bg-red-950/20 text-red-300 border border-red-900/30 px-1.5 py-0.2 rounded">
                  HWID: {user.hwid.slice(0, 8)}...
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap w-full sm:w-auto justify-start sm:justify-end pl-[44px] sm:pl-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold user-row-badge"
            style={{ background: isTrial ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", color: isTrial ? "#fbbf24" : "#34d399", border: `1px solid ${isTrial ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}` }}
          >
            {isTrial ? "TRIAL" : "ACTIVE"}
          </span>
          {/* HWID Lock Toggle */}
          {onHwidLockToggle && (
            <button
              onClick={() => onHwidLockToggle(!user.hwidLockEnabled)}
              title={user.hwidLockEnabled ? "HWID Lock Enabled (Click to Disable)" : "HWID Lock Disabled (Click to Enable)"}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: user.hwidLockEnabled ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)",
                color: user.hwidLockEnabled ? "#f87171" : "#6b7280",
                border: user.hwidLockEnabled ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Lock className="w-3.5 h-3.5" />
              {user.hwidLockEnabled ? "LOCKED" : "UNLOCKED"}
            </button>
          )}
          {/* Reset HWID */}
          {user.hwidLockEnabled && onHwidReset && (
            <button
              onClick={onHwidReset}
              title="Reset client HWID fingerprint"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: "#fbbf24",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <RefreshCw className="w-3 h-3" />
              RESET
            </button>
          )}
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
          {!isTrial && onAddCreditsClick && (
            <button onClick={onAddCreditsClick} title="Add tokens"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
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
    </motion.div>
  );
});

interface ManageCreditsModalProps {
  user: ClientUser;
  onClose: () => void;
  onAddCredits: (amount: number) => Promise<void>;
}

function ManageCreditsModal({ user, onClose, onAddCredits }: ManageCreditsModalProps) {
  const [creditInput, setCreditInput] = useState("");
  const [creditMode, setCreditMode] = useState<"add" | "deduct" | "set">("add");
  const [crediting, setCrediting] = useState(false);

  const currentBalance = user.balance ?? 0;
  const val = parseInt(creditInput) || 0;

  const newBalance =
    creditMode === "add"
      ? currentBalance + val
      : creditMode === "deduct"
      ? Math.max(0, currentBalance - val)
      : val;

  const handleApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (val <= 0 || isNaN(val)) return;

    let changeAmount = 0;
    if (creditMode === "add") {
      changeAmount = val;
    } else if (creditMode === "deduct") {
      changeAmount = -val;
    } else if (creditMode === "set") {
      changeAmount = val - currentBalance;
    }

    if (changeAmount === 0) {
      onClose();
      return;
    }

    setCrediting(true);
    await onAddCredits(changeAmount);
    setCrediting(false);
    onClose();
  };

  const presets = [100, 500, 1000, 5000];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(24px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="w-full max-w-lg relative rounded-[2rem] p-6 sm:p-8 overflow-hidden"
        style={{
          background: "rgba(8,6,22,0.98)",
          border: `1px solid ${
            creditMode === "add"
              ? "rgba(16,185,129,0.3)"
              : creditMode === "deduct"
              ? "rgba(239,68,68,0.3)"
              : "rgba(6,182,212,0.3)"
          }`,
          boxShadow: `0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px ${
            creditMode === "add"
              ? "rgba(16,185,129,0.05)"
              : creditMode === "deduct"
              ? "rgba(239,68,68,0.05)"
              : "rgba(6,182,212,0.05)"
          }`,
        }}
      >
        {/* Glow header bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] transition-all duration-500"
          style={{
            background:
              creditMode === "add"
                ? "linear-gradient(90deg, transparent, #10b981, transparent)"
                : creditMode === "deduct"
                ? "linear-gradient(90deg, transparent, #ef4444, transparent)"
                : "linear-gradient(90deg, transparent, #06b6d4, transparent)",
          }}
        />

        {/* Ambient background glows */}
        <div className="absolute -left-20 -top-20 w-40 h-40 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute -right-20 -bottom-20 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-all duration-500"
          style={{
            background:
              creditMode === "add"
                ? "rgba(16,185,129,0.05)"
                : creditMode === "deduct"
                ? "rgba(239,68,68,0.05)"
                : "rgba(6,182,212,0.05)",
          }}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.05] mb-6">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300"
              style={{
                background:
                  creditMode === "add"
                    ? "rgba(16,185,129,0.12)"
                    : creditMode === "deduct"
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(6,182,212,0.12)",
                borderColor:
                  creditMode === "add"
                    ? "rgba(16,185,129,0.25)"
                    : creditMode === "deduct"
                    ? "rgba(239,68,68,0.25)"
                    : "rgba(6,182,212,0.25)",
              }}
            >
              <Wallet
                className={`w-5 h-5 transition-colors duration-300 ${
                  creditMode === "add"
                    ? "text-emerald-400"
                    : creditMode === "deduct"
                    ? "text-red-400"
                    : "text-cyan-400"
                }`}
              />
            </div>
            <div>
              <h3 className="font-black text-base text-white tracking-wide">Manage Balance</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                Client: <span className="text-violet-400 font-mono">@{user.username}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Preview Block */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-5 mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent pointer-events-none" />
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
            Transaction Preview
          </div>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Current
              </div>
              <div className="text-3xl font-black text-slate-300 font-mono tracking-tight">
                {currentBalance}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  x: creditMode === "add" ? [0, 4, 0] : creditMode === "deduct" ? [0, -4, 0] : 0,
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`text-xl font-bold ${
                  creditMode === "add"
                    ? "text-emerald-400"
                    : creditMode === "deduct"
                    ? "text-red-400"
                    : "text-cyan-400"
                }`}
              >
                ➜
              </motion.div>
              {val > 0 && (
                <div
                  className="text-[9px] font-black px-1.5 py-0.5 rounded-full mt-1.5 uppercase"
                  style={{
                    background:
                      creditMode === "add"
                        ? "rgba(16,185,129,0.15)"
                        : creditMode === "deduct"
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(6,182,212,0.15)",
                    color:
                      creditMode === "add"
                        ? "#34d399"
                        : creditMode === "deduct"
                        ? "#f87171"
                        : "#22d3ee",
                  }}
                >
                  {creditMode === "add" ? `+${val}` : creditMode === "deduct" ? `-${val}` : `=${val}`}
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Prospective
              </div>
              <motion.div
                key={newBalance}
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-3xl font-black font-mono tracking-tight transition-colors duration-300 ${
                  creditMode === "add"
                    ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : creditMode === "deduct"
                    ? "text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                    : "text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                }`}
              >
                {newBalance}
              </motion.div>
            </div>
          </div>
        </div>

        <form onSubmit={handleApply} className="space-y-6">
          {/* Segmented Mode Picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
              Operation Mode
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-black/40 border border-white/5">
              {(["add", "deduct", "set"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setCreditMode(m);
                    setCreditInput("");
                  }}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all cursor-pointer ${
                    creditMode === m
                      ? m === "add"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        : m === "deduct"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                        : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "text-slate-500 hover:text-slate-300 bg-transparent border border-transparent"
                  }`}
                >
                  {m === "add" ? "Add (+)" : m === "deduct" ? "Deduct (-)" : "Set (=)"}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Preset Chips */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
              Preset Amounts
            </label>
            <div className="flex gap-2.5">
              {presets.map((p) => {
                const label =
                  creditMode === "add" ? `+${p}` : creditMode === "deduct" ? `-${p}` : `${p}`;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCreditInput(p.toString())}
                    className="flex-1 py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer"
                    style={{
                      background:
                        parseInt(creditInput) === p
                          ? creditMode === "add"
                            ? "rgba(16,185,129,0.15)"
                            : creditMode === "deduct"
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(6,182,212,0.15)"
                          : "rgba(255,255,255,0.02)",
                      color:
                        parseInt(creditInput) === p
                          ? creditMode === "add"
                            ? "#34d399"
                            : creditMode === "deduct"
                            ? "#f87171"
                            : "#22d3ee"
                          : "rgba(255,255,255,0.5)",
                      borderColor:
                        parseInt(creditInput) === p
                          ? creditMode === "add"
                            ? "rgba(16,185,129,0.3)"
                            : creditMode === "deduct"
                            ? "rgba(239,68,68,0.3)"
                            : "rgba(6,182,212,0.3)"
                          : "rgba(255,255,255,0.08)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input field */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
              {creditMode === "add"
                ? "Tokens to Add"
                : creditMode === "deduct"
                ? "Tokens to Deduct"
                : "Exact Balance to Set"}
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                #
              </span>
              <input
                type="number"
                value={creditInput}
                onChange={(e) => setCreditInput(e.target.value)}
                placeholder={
                  creditMode === "add"
                    ? "Enter amount to add..."
                    : creditMode === "deduct"
                    ? "Enter amount to deduct..."
                    : "Enter new token balance..."
                }
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-black/40 border text-sm text-white placeholder-slate-600 font-mono focus:outline-none transition-all"
                style={{
                  borderColor:
                    creditMode === "add"
                      ? "rgba(16,185,129,0.2)"
                      : creditMode === "deduct"
                      ? "rgba(239,68,68,0.2)"
                      : "rgba(6,182,212,0.2)",
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-white/[0.08] text-xs font-bold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={crediting || val <= 0 || isNaN(val)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 h-12 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:scale-100 relative overflow-hidden"
              style={{
                background:
                  creditMode === "add"
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : creditMode === "deduct"
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #06b6d4, #0891b2)",
                boxShadow:
                  creditMode === "add"
                    ? "0 0 25px rgba(16,185,129,0.3)"
                    : creditMode === "deduct"
                    ? "0 0 25px rgba(239,68,68,0.3)"
                    : "0 0 25px rgba(6,182,212,0.3)",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -skew-x-12 btn-shimmer" />
              {crediting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Execute Transaction
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

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
