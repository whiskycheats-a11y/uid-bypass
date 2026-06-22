"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Coins, ArrowUpRight, ArrowDownRight, Settings2, Search, User as UserIcon, ShieldAlert } from "lucide-react";
import { Session } from "next-auth";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  uidLimit: number;
  freeUidLimit: number;
  profilePicture: string | null;
  createdBy: number | null;
}

export function LimitClient({ session }: { session: Session }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [manageUser, setManageUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<"add" | "deduct" | "set">("add");
  const [limitType, setLimitType] = useState<"paid" | "free">("paid");
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentUserRole = session.user.role;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageUser) return;
    setIsSubmitting(true);
    setError("");

    let newLimit = 0;
    const currentLimit = limitType === "paid" ? manageUser.uidLimit : manageUser.freeUidLimit;

    if (actionType === "add") newLimit = currentLimit + amount;
    else if (actionType === "deduct") newLimit = Math.max(0, currentLimit - amount);
    else newLimit = Math.max(0, amount);

    const payload: any = { id: manageUser.id };
    if (limitType === "paid") payload.uidLimit = newLimit;
    else payload.freeUidLimit = newLimit;

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to update limits");
      } else {
        setManageUser(null);
        fetchUsers();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" /> Limit Allocation Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quickly distribute or revoke UID limits for your resellers.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
          <Input 
            placeholder="Search users..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="max-w-sm bg-black/40 border-white/10 text-white" 
            icon={<Search className="w-4 h-4" />}
          />
      </div>

      <Card className="glass-premium rounded-2xl relative overflow-hidden border-white/10">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Paid Limits</th>
                <th className="px-6 py-4 font-medium">Free Limits</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.username} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                          <UserIcon className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {user.username}
                          {user.role === "ADMIN" && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase">Admin</span>}
                        </div>
                        <div className="text-[10px] text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-emerald-400 font-bold">{user.uidLimit}</td>
                  <td className="px-6 py-4 font-mono text-cyan-400 font-bold">{user.freeUidLimit}</td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setManageUser(user);
                        setAmount(0);
                        setError("");
                      }} 
                      disabled={currentUserRole !== "ADMIN" && user.role === "ADMIN"} 
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-all h-8"
                    >
                      <Settings2 className="w-4 h-4 mr-2" /> Manage Limits
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Quick Manage Modal Overlay */}
      {manageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f0f1d] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent">
              <h2 className="text-xl font-bold text-white mb-1">Manage Limits</h2>
              <p className="text-sm text-slate-400">Modifying limits for <span className="text-white font-medium">@{manageUser.username}</span></p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Select Limit Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setLimitType("paid")} 
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${limitType === "paid" ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400" : "bg-white/5 border border-transparent text-slate-400 hover:bg-white/10"}`}
                  >
                    Paid UIDs ({manageUser.uidLimit})
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLimitType("free")} 
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${limitType === "free" ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-400" : "bg-white/5 border border-transparent text-slate-400 hover:bg-white/10"}`}
                  >
                    Free Portals ({manageUser.freeUidLimit})
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Select Transaction Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setActionType("add")} 
                    className={`py-2 flex justify-center items-center rounded-lg text-sm font-semibold transition-all ${actionType === "add" ? "bg-green-500/20 border border-green-500/50 text-green-400" : "bg-white/5 border border-transparent text-slate-400 hover:bg-white/10"}`}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1" /> Add
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActionType("deduct")} 
                    className={`py-2 flex justify-center items-center rounded-lg text-sm font-semibold transition-all ${actionType === "deduct" ? "bg-red-500/20 border border-red-500/50 text-red-400" : "bg-white/5 border border-transparent text-slate-400 hover:bg-white/10"}`}
                  >
                    <ArrowDownRight className="w-4 h-4 mr-1" /> Deduct
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActionType("set")} 
                    className={`py-2 flex justify-center items-center rounded-lg text-sm font-semibold transition-all ${actionType === "set" ? "bg-blue-500/20 border border-blue-500/50 text-blue-400" : "bg-white/5 border border-transparent text-slate-400 hover:bg-white/10"}`}
                  >
                    <Settings2 className="w-4 h-4 mr-1" /> Set Exact
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Amount</label>
                <Input 
                  type="number" 
                  min={0} 
                  value={amount} 
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)} 
                  className="bg-black/40 border-white/10 text-white font-mono text-lg h-12" 
                  required 
                  icon={<Coins className="w-5 h-5 text-amber-400" />}
                />
              </div>

              {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 flex items-center gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setManageUser(null)} className="text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm Transaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
