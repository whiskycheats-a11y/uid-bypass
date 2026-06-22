"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Pencil, Trash2, Mail, User, Lock, Zap, Search, ChevronDown, Loader2, Save, ShieldAlert } from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  uidLimit: number;
  freeUidLimit: number;
  profilePicture: string | null;
  createdAt: string;
  createdBy: string | null;
  isLocked?: boolean;
  hwidLockEnabled?: boolean;
};

export default function UsersClient({
  initialUsers,
  currentUserRole,
  currentUserId,
}: {
  initialUsers: User[];
  currentUserRole: string;
  currentUserId: string;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Create Form State
  const [cUsername, setCUsername] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState("RESELLER");
  const [cUidLimit, setCUidLimit] = useState(0);
  const [cFreeUidLimit, setCFreeUidLimit] = useState(50);
  const [cProfilePicture, setCProfilePicture] = useState("");

  // Edit Form State
  const [eUsername, setEUsername] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [ePassword, setEPassword] = useState("");
  const [eRole, setERole] = useState("");
  const [eUidLimit, setEUidLimit] = useState(0);
  const [eFreeUidLimit, setEFreeUidLimit] = useState(50);
  const [eProfilePicture, setEProfilePicture] = useState("");
  const [eIsLocked, setEIsLocked] = useState(false);
  const [eHwidLockEnabled, setEHwidLockEnabled] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cUsername,
          email: cEmail,
          password: cPassword,
          role: cRole,
          uidLimit: cUidLimit,
          freeUidLimit: cFreeUidLimit,
          ...(cProfilePicture ? { profilePicture: cProfilePicture } : {})
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCreateOpen(false);
        fetchUsers();
        // Reset form
        setCUsername(""); setCEmail(""); setCPassword(""); setCRole("RESELLER");
        setCUidLimit(0); setCFreeUidLimit(50);
        setCProfilePicture("");
      } else {
        setError(data.message);
      }
    } catch (_err) {
      setError("An unexpected error occurred.");
    }
    setLoading(false);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEUsername(user.username);
    setEEmail(user.email);
    setEPassword(""); // Blank to not update unless typed
    setERole(user.role);
    setEUidLimit(user.uidLimit);
    setEFreeUidLimit(user.freeUidLimit);
    setEProfilePicture(user.profilePicture || "");
    setEIsLocked(user.isLocked || false);
    setEHwidLockEnabled(user.hwidLockEnabled ?? true);
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      id: editingUser.id,
      username: eUsername,
      email: eEmail,
      role: eRole,
      uidLimit: eUidLimit,
      freeUidLimit: eFreeUidLimit,
      profilePicture: eProfilePicture,
      isLocked: eIsLocked,
      hwidLockEnabled: eHwidLockEnabled,
    };
    if (ePassword) payload.password = ePassword;

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditOpen(false);
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (_err) {
      setError("An unexpected error occurred.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
      else alert("Failed to delete user.");
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <PageWrapper className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">User Management</h1>
          <p className="text-slate-400">Manage your resellers and their UID limits.</p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all">
          <UserPlus className="w-4 h-4 mr-2" /> Add User
        </Button>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#0a0a1a] p-6 shadow-2xl">
              <button onClick={() => setIsCreateOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-white">&times;</button>
              <h2 className="text-xl font-semibold text-white mb-4">Create New User</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm border border-red-500/30 flex items-center gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Username</label>
                    <Input value={cUsername} onChange={(e) => setCUsername(e.target.value)} required minLength={3} className="bg-black/40 border-white/10 text-white" icon={<User className="w-4 h-4" />} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Email</label>
                    <Input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required className="bg-black/40 border-white/10 text-white" icon={<Mail className="w-4 h-4" />} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Password</label>
                  <Input type="text" value={cPassword} onChange={(e) => setCPassword(e.target.value)} required minLength={6} className="bg-black/40 border-white/10 text-white" icon={<Lock className="w-4 h-4" />} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Profile Picture URL (Optional)</label>
                  <Input type="url" value={cProfilePicture} onChange={(e) => setCProfilePicture(e.target.value)} placeholder="https://..." className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Role</label>
                  <div className="relative">
                    <select value={cRole} onChange={(e) => setCRole(e.target.value)} className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="RESELLER" className="bg-[#0a0a1a] text-white">Reseller</option>
                      {(currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN") && <option value="MANAGER" className="bg-[#0a0a1a] text-white">Manager</option>}
                      {(currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN") && <option value="ADMIN" className="bg-[#0a0a1a] text-white">Admin</option>}
                      {currentUserRole === "SUPER_ADMIN" && <option value="SUPER_ADMIN" className="bg-[#0a0a1a] text-white">Super Admin</option>}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">UID Limit</label>
                    <Input type="number" value={cUidLimit} onChange={(e) => setCUidLimit(parseInt(e.target.value) || 0)} min={0} required className="bg-black/40 border-white/10 text-white" icon={<Zap className="w-4 h-4" />} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Free UID Limit</label>
                    <Input type="number" value={cFreeUidLimit} onChange={(e) => setCFreeUidLimit(parseInt(e.target.value) || 0)} min={0} required className="bg-black/40 border-white/10 text-white" icon={<Zap className="w-4 h-4 text-emerald-400" />} />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {loading ? "Creating..." : "Create User"}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-black/40 border-white/10 text-white flex-1 max-w-sm"
          icon={<Search className="w-4 h-4" />}
        />
        <div className="relative w-full sm:w-[180px]">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 w-full appearance-none rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL" className="bg-[#0a0a1a]">All Roles</option>
            <option value="RESELLER" className="bg-[#0a0a1a]">Reseller</option>
            <option value="MANAGER" className="bg-[#0a0a1a]">Manager</option>
            <option value="ADMIN" className="bg-[#0a0a1a]">Admin</option>
            {currentUserRole === "SUPER_ADMIN" && <option value="SUPER_ADMIN" className="bg-[#0a0a1a]">Super Admin</option>}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </div>

      <Card className="glass-premium rounded-2xl relative overflow-hidden border-white/10">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <CardContent className="p-0 overflow-x-auto w-full hide-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">UID Limit</th>
                <th className="px-6 py-4 font-medium">Free Limit</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No users found.</td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.profilePicture ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={user.profilePicture} alt={user.username} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white">{user.username}</div>
                        <div className="text-[10px] text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <Badge variant="outline" className={
                        user.role === "SUPER_ADMIN" ? "border-fuchsia-500/50 text-fuchsia-400" :
                        user.role === "ADMIN" ? "border-amber-500/50 text-amber-400" : 
                        user.role === "MANAGER" ? "border-blue-500/50 text-blue-400" : 
                        "border-slate-500/50 text-slate-400"}>
                        {user.role}
                      </Badge>
                      {user.isLocked && (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                          LOCKED (HWID)
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-emerald-400">{user.uidLimit}</td>
                  <td className="px-6 py-4 font-mono text-blue-400">{user.freeUidLimit}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)} disabled={(currentUserRole !== "ADMIN" && currentUserRole !== "SUPER_ADMIN") || (user.role === "SUPER_ADMIN" && currentUserRole !== "SUPER_ADMIN")} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} disabled={user.id === currentUserId || (currentUserRole !== "ADMIN" && currentUserRole !== "SUPER_ADMIN") || (user.role === "SUPER_ADMIN")} className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#0a0a1a] p-6 shadow-2xl">
            <button onClick={() => setIsEditOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-white">&times;</button>
            <h2 className="text-xl font-semibold text-white mb-4">Edit User: {editingUser?.username}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm border border-red-500/30 flex items-center gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Username</label>
                  <Input value={eUsername} onChange={(e) => setEUsername(e.target.value)} required minLength={3} className="bg-black/40 border-white/10 text-white" icon={<User className="w-4 h-4" />} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Email</label>
                  <Input type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} required className="bg-black/40 border-white/10 text-white" icon={<Mail className="w-4 h-4" />} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">New Password (Optional)</label>
                <Input type="text" value={ePassword} onChange={(e) => setEPassword(e.target.value)} placeholder="Leave blank to keep current" className="bg-black/40 border-white/10 text-white" icon={<Lock className="w-4 h-4 text-slate-500" />} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Profile Picture URL (Optional)</label>
                <Input type="url" value={eProfilePicture} onChange={(e) => setEProfilePicture(e.target.value)} placeholder="https://..." className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Role</label>
                <div className="relative">
                  <select value={eRole} onChange={(e) => setERole(e.target.value)} disabled={currentUserRole !== "ADMIN" && currentUserRole !== "SUPER_ADMIN"} className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="RESELLER" className="bg-[#0a0a1a] text-white">Reseller</option>
                    {(currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN") && <option value="MANAGER" className="bg-[#0a0a1a] text-white">Manager</option>}
                    {(currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN") && <option value="ADMIN" className="bg-[#0a0a1a] text-white">Admin</option>}
                    {currentUserRole === "SUPER_ADMIN" && <option value="SUPER_ADMIN" className="bg-[#0a0a1a] text-white">Super Admin</option>}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">UID Limit</label>
                  <Input type="number" value={eUidLimit} onChange={(e) => setEUidLimit(parseInt(e.target.value) || 0)} min={0} required className="bg-black/40 border-white/10 text-white" icon={<Zap className="w-4 h-4" />} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Free UID Limit</label>
                  <Input type="number" value={eFreeUidLimit} onChange={(e) => setEFreeUidLimit(parseInt(e.target.value) || 0)} min={0} required className="bg-black/40 border-white/10 text-white" icon={<Zap className="w-4 h-4 text-emerald-400" />} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col justify-center">
                  <label className="text-sm text-slate-400 flex items-center gap-2">
                    <input type="checkbox" checked={eHwidLockEnabled} onChange={(e) => setEHwidLockEnabled(e.target.checked)} className="rounded border-white/10 bg-black/40" />
                    HWID Lock Enabled
                  </label>
                </div>
                <div className="space-y-2 flex flex-col justify-center">
                  <label className="text-sm text-slate-400 flex items-center gap-2">
                    <input type="checkbox" checked={eIsLocked} onChange={(e) => setEIsLocked(e.target.checked)} className="rounded border-white/10 bg-black/40 text-red-500" />
                    Account is Locked
                  </label>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
