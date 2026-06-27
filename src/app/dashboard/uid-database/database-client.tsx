"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ArrowRightLeft, ShieldAlert, CheckCircle2, XCircle, Trash2, ShieldCheck, ChevronDown, Database, Clock, Activity, Copy, Plus } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/page-wrapper";

interface UidRecord {
  id: string;
  uidValue: string;
  duration: number;
  status: "ACTIVE" | "EXPIRED" | "DELETED";
  createdAt: string;
  expiresAt: string | null;
  user: {
    username: string;
    email: string;
  };
}

export function DatabaseClient({ currentUserRole }: { currentUserRole: string }) {
  const router = useRouter();
  const [uids, setUids] = useState<UidRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const fetchUids = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/uid-database");
      const data = await res.json();
      if (res.ok) setUids(data.uids || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUids();
  }, [fetchUids]);

  const filteredUids = uids.map(u => {
    let effectiveStatus = u.status;
    if (u.status === "ACTIVE" && u.expiresAt && new Date(u.expiresAt) < new Date()) {
      effectiveStatus = "EXPIRED";
    }
    return { ...u, effectiveStatus };
  }).filter((u) => {
    const isDigitSearch = /^\d+$/.test(search);
    const matchesSearch = search === "" ? true : (isDigitSearch ? u.uidValue.startsWith(search) : u.uidValue.includes(search) || u.user.username.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || u.effectiveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUids.length / pageSize);
  const paginatedUids = filteredUids.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const handleRemove = async (id: string, uidValue: string) => {
    if (!confirm(`Are you sure you want to remove UID ${uidValue}?`)) return;
    
    setRemovingId(id);
    setError("");

    try {
      const res = await fetch("/api/uid/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: uidValue }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to remove UID");
        alert(data.message || "Failed to remove UID");
      } else {
        fetchUids(); // refresh list
      }
    } catch (err) {
      alert("An error occurred while removing the UID.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <PageWrapper className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-400" /> UID Database
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global view of all UIDs registered on the platform.
          </p>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Input 
            placeholder="Search by exact UID or username..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-black/40 border-white/10 text-white w-full"
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="relative w-full sm:w-[180px]">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="h-10 w-full appearance-none rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL" className="bg-[#0a0a1a]">All Statuses</option>
            <option value="ACTIVE" className="bg-[#0a0a1a]">Active</option>
            <option value="EXPIRED" className="bg-[#0a0a1a]">Expired</option>
            <option value="DELETED" className="bg-[#0a0a1a]">Deleted</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </div>

      <Card className="glass-premium">
        <CardContent className="p-0 overflow-x-auto w-full hide-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">UID</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Timestamps</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredUids.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No UIDs found.
                  </td>
                </tr>
              ) : paginatedUids.map((record) => (
                <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-cyan-400 font-bold">{record.uidValue}</div>
                      <button onClick={() => navigator.clipboard.writeText(record.uidValue)} className="text-slate-500 hover:text-cyan-400 transition-colors" title="Copy UID">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{record.user.username}</div>
                    <div className="text-[10px] text-slate-500">{record.user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-slate-300">
                      <Clock className="w-3 h-3 mr-1.5 text-slate-500" />
                      {record.duration} Days
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={
                      record.effectiveStatus === "ACTIVE" ? "border-emerald-500/50 text-emerald-400" : 
                      record.effectiveStatus === "EXPIRED" ? "border-amber-500/50 text-amber-400" : 
                      "border-red-500/50 text-red-400"
                    }>
                      {record.effectiveStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center text-slate-400">
                        <span className="w-12 text-slate-500">Created:</span>
                        {format(new Date(record.createdAt), "MMM d, yyyy HH:mm")}
                      </div>
                      {record.expiresAt && (
                        <div className="flex items-center text-slate-400">
                          <span className="w-12 text-slate-500">Expires:</span>
                          {format(new Date(record.expiresAt), "MMM d, yyyy HH:mm")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {record.effectiveStatus === "EXPIRED" ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/uid-management?tab=add&uid=${record.uidValue}`)} 
                          className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Re-Add
                        </Button>
                      ) : record.effectiveStatus === "ACTIVE" ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => router.push(`/dashboard/uid-management?tab=extend&uid=${record.uidValue}`)} 
                            className="h-8 w-8 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10"
                            title="Extend UID"
                          >
                            <Activity className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => router.push(`/dashboard/uid-management?tab=replace&uid=${record.uidValue}`)} 
                            className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10"
                            title="Replace UID"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemove(record.id, record.uidValue)} 
                            disabled={removingId === record.id || (currentUserRole !== "ADMIN" && currentUserRole !== "SUPER_ADMIN")}
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                            title={(currentUserRole !== "ADMIN" && currentUserRole !== "SUPER_ADMIN") ? "Only ADMIN can remove UIDs here" : "Remove UID"}
                          >
                            {removingId === record.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">No actions</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
            <div className="text-sm text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredUids.length)} of {filteredUids.length} UIDs
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 border-white/10 bg-black/40 hover:bg-white/10"
              >
                Previous
              </Button>
              <div className="text-sm font-medium text-slate-300 px-2">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 border-white/10 bg-black/40 hover:bg-white/10"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
