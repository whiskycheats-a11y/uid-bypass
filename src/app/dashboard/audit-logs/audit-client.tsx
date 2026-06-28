"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Activity, ShieldAlert, KeyRound, Globe, UserPlus, Server } from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { format } from "date-fns";

type AuditLog = {
  id: string;
  action: string;
  description: string;
  metadata: any;
  createdAt: string;
  user: {
    username: string;
    email: string;
    role: string;
    profilePicture?: string;
  };
};

export default function AuditClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/audit-logs?search=${encodeURIComponent(search)}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLogs();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Helper to determine the color/icon based on action
  const getActionStyles = (action: string) => {
    if (action.includes("UID")) return { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: KeyRound };
    if (action.includes("API")) return { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Server };
    if (action.includes("PORTAL")) return { color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", icon: Globe };
    if (action.includes("USER") || action.includes("REGISTER")) return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: UserPlus };
    return { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", icon: Activity };
  };

  return (
    <PageWrapper className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            Master Audit Trail
          </h1>
          <p className="text-slate-400">Super Admin exclusive. Track exactly who did what across the entire platform.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search by action, description, username or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-black/40 border-white/10 text-white flex-1"
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      <Card className="glass-premium rounded-2xl relative overflow-hidden border-white/10">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        <CardContent className="p-0 overflow-x-auto w-full hide-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">User / Role</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No activity logs found.</td></tr>
              ) : logs.map((log) => {
                const styles = getActionStyles(log.action);
                const Icon = styles.icon;
                
                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="font-mono">{format(new Date(log.createdAt), "dd MMM yyyy")}</div>
                      <div className="font-mono text-slate-400">{format(new Date(log.createdAt), "HH:mm:ss")}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {log.user.profilePicture ? (
                          <img src={log.user.profilePicture} alt={log.user.username} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 text-xs font-bold text-blue-300">
                            {log.user.username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">{log.user.username}</div>
                          <Badge variant={log.user.role.toLowerCase() as any} className="text-[8px] px-1 py-0 h-3 uppercase tracking-wider mt-0.5">
                            {log.user.role.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${styles.bg} ${styles.color} ${styles.border}`}>
                        <Icon className="w-3 h-3" />
                        {log.action}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 max-w-md truncate" title={log.description}>
                      {log.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
