"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Trash2, Link as LinkIcon, ExternalLink, Edit2, Globe, Clock, Users, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { PageWrapper } from "@/components/page-wrapper";

interface PortalRecord {
  id: number;
  brandName: string;
  durationHours: number;
  maxUids: number;
  usedUids: number;
  token: string;
  expiresAt: string | null;
  createdAt: string;
  user: {
    username: string;
    email: string;
  };
}

export function ManagePortalsClient() {
  const [portals, setPortals] = useState<PortalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [editPortal, setEditPortal] = useState<PortalRecord | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPortals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/portals");
      const data = await res.json();
      if (res.ok) setPortals(data.portals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortals();
  }, [fetchPortals]);

  const filteredPortals = portals.filter((p) => 
    p.brandName.toLowerCase().includes(search.toLowerCase()) || 
    p.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number, brandName: string) => {
    if (!confirm(`Are you sure you want to completely delete the portal "${brandName}"?`)) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/portals/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to delete portal");
      } else {
        fetchPortals();
      }
    } catch (err) {
      alert("An error occurred while deleting the portal.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPortal) return;
    
    setEditLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const expiryDaysRaw = formData.get("expiryDays");

    const data = {
      brandName: formData.get("brandName"),
      durationHours: parseInt(formData.get("durationDays") as string, 10) * 24,
      maxUids: parseInt(formData.get("maxUids") as string, 10),
      ...(expiryDaysRaw ? { expiryDays: parseInt(expiryDaysRaw as string, 10) } : { expiryDays: null })
    };

    try {
      const res = await fetch(`/api/portals/${editPortal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setEditPortal(null);
        fetchPortals();
      } else {
        const json = await res.json();
        setError(json.message);
      }
    } catch (_err) {
      setError("Network error occurred.");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <PageWrapper className="space-y-6 relative">
      {editPortal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-premium w-full max-w-lg border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle>Edit Portal: {editPortal.brandName}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editBrandName">Brand Name</Label>
                  <Input id="editBrandName" name="brandName" defaultValue={editPortal.brandName} required minLength={2} icon={<Globe className="w-4 h-4" />} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editDurationDays">Duration (Days)</Label>
                    <Input id="editDurationDays" name="durationDays" type="number" min="1" max="3" defaultValue={editPortal.durationHours / 24} required icon={<Clock className="w-4 h-4" />} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editMaxUids">Max Uses Limit</Label>
                    <Input id="editMaxUids" name="maxUids" type="number" min="1" max="1000" defaultValue={editPortal.maxUids} required icon={<Users className="w-4 h-4" />} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editExpiryDays">Update Expiry (Days from now)</Label>
                  <Input id="editExpiryDays" name="expiryDays" type="number" min="1" max="3" placeholder="Leave empty to remove expiry" icon={<CalendarClock className="w-4 h-4" />} />
                  <p className="text-xs text-slate-400">Current Expiry: {editPortal.expiresAt ? format(new Date(editPortal.expiresAt), "PPP p") : "Never"}</p>
                </div>

                {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}

                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="ghost" onClick={() => { setEditPortal(null); setError(""); }}>Cancel</Button>
                  <Button type="submit" disabled={editLoading}>
                    {editLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit2 className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Input 
            placeholder="Search by Brand Name or Username..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="bg-black/40 border-white/10 text-white" 
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <Card className="glass-premium">
        <CardContent className="p-0 overflow-x-auto w-full hide-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Portal / Brand</th>
                <th className="px-6 py-4 font-medium">Reseller</th>
                <th className="px-6 py-4 font-medium">Usage</th>
                <th className="px-6 py-4 font-medium">Expires At</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredPortals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No portals found.
                  </td>
                </tr>
              ) : filteredPortals.map((record) => {
                const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
                const host = typeof window !== "undefined" ? window.location.host : "uidbypass.online";
                const portalLink = `${protocol}//${host}/portal/${record.token}`;
                
                return (
                  <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-base">{record.brandName}</div>
                      <div className="flex items-center gap-1.5 mt-1 text-cyan-400 hover:text-cyan-300 text-xs font-mono">
                        <LinkIcon className="w-3 h-3" />
                        <a href={portalLink} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline">
                          /portal/{record.token.substring(0, 5)}... <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-50" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{record.user.username}</div>
                      <div className="text-[10px] text-slate-500">{record.user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-cyan-500" 
                            style={{ width: `${Math.min((record.usedUids / record.maxUids) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">
                          {record.usedUids} / {record.maxUids}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {record.expiresAt ? format(new Date(record.expiresAt), "MMM d, yyyy HH:mm") : "Never"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {format(new Date(record.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setEditPortal(record)} 
                          className="h-8 w-8 text-slate-400 hover:text-blue-400"
                          title="Edit Portal"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(record.id, record.brandName)} 
                          disabled={deletingId === record.id}
                          className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                          title="Delete Portal"
                        >
                          {deletingId === record.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
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
