"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Globe, Clock, Users, Link as LinkIcon, ShieldAlert, CalendarClock, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// We'll reuse the CopyButton locally
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-2 w-24">
      {copied ? "Copied!" : <><Copy className="w-3 h-3" /> Copy</>}
    </Button>
  );
}

interface PortalType {
  id: number;
  brandName: string;
  durationHours: number;
  maxUids: number;
  usedUids: number;
  token: string;
  expiresAt: Date | string | null;
  createdAt: Date | string;
}

interface FreePortalClientProps {
  freeUidLimit: number | "Unlimited";
  initialPortals: PortalType[];
  baseUrl: string;
}

export function FreePortalClient({ freeUidLimit, initialPortals, baseUrl }: FreePortalClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Modals state
  const [editPortal, setEditPortal] = useState<PortalType | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const expiryDaysRaw = formData.get("expiryDays");
    
    const data = {
      brandName: formData.get("brandName"),
      durationHours: parseInt(formData.get("durationDays") as string, 10) * 24,
      maxUids: parseInt(formData.get("maxUids") as string, 10),
      ...(expiryDaysRaw ? { expiryDays: parseInt(expiryDaysRaw as string, 10) } : {})
    };

    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (res.ok) {
        router.refresh();
        (e.target as HTMLFormElement).reset();
      } else {
        setError(json.message);
      }
    } catch (_err) {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPortal) return;
    
    setLoading(true);
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
        router.refresh();
      } else {
        const json = await res.json();
        setError(json.message);
      }
    } catch (_err) {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this portal? This action cannot be undone.")) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/portals/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const json = await res.json();
        alert(json.message);
      }
    } catch (err) {
      alert("Failed to delete portal");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageWrapper>
      <Card className="glass-premium mb-12 relative overflow-hidden">
        {/* Edit Modal Overlay */}
        {editPortal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                    <Button type="submit" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit2 className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <CardHeader>
          <CardTitle>Create New Portal</CardTitle>
          <CardDescription>
            Generate a custom link for your clients. They can whitelist their ID for free.
            Each use deducts from your Free Limit ({freeUidLimit} remaining).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input id="brandName" name="brandName" placeholder="e.g. zytrone Bypass" required minLength={2} icon={<Globe className="w-4 h-4" />} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationDays">UID Duration (Days)</Label>
                <Input id="durationDays" name="durationDays" type="number" min="1" max="3" defaultValue="1" required icon={<Clock className="w-4 h-4" />} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUids">Max Uses Limit</Label>
                <Input id="maxUids" name="maxUids" type="number" min="1" max="1000" defaultValue="10" required icon={<Users className="w-4 h-4" />} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDays">Portal Expiry (Days)</Label>
                <Input id="expiryDays" name="expiryDays" type="number" min="1" max="3" placeholder="Optional (Max 3)" icon={<CalendarClock className="w-4 h-4" />} />
              </div>
            </div>

            {error && !editPortal && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex items-center gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{error}</p>}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto mt-4">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Generate Portal Link
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold text-white mb-6">Your Active Portals</h2>
        
        <div className="glass-card overflow-hidden">
          {initialPortals.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              You haven&apos;t created any free portals yet.
            </div>
          ) : (
            <div className="overflow-x-auto w-full hide-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-white/[0.04] text-slate-400 border-b border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Brand Name</th>
                    <th className="px-6 py-4 font-medium">Link</th>
                    <th className="px-6 py-4 font-medium">Duration</th>
                    <th className="px-6 py-4 font-medium">Uses</th>
                    <th className="px-6 py-4 font-medium">Expires At</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {initialPortals.map((portal) => {
                    const isExhausted = portal.usedUids >= portal.maxUids;
                    const isExpired = portal.expiresAt && new Date(portal.expiresAt) < new Date();
                    const portalLink = `${baseUrl}/portal/${portal.token}`;
                    
                    return (
                      <tr key={portal.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{portal.brandName}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={isExhausted || isExpired ? "destructive" : "success"}>
                              {isExhausted ? "EXHAUSTED" : isExpired ? "EXPIRED" : "ACTIVE"}
                            </Badge>
                            <CopyButton text={portalLink} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {portal.durationHours / 24} Days
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {portal.usedUids} / {portal.maxUids}
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {portal.expiresAt ? format(new Date(portal.expiresAt), "MMM d, HH:mm") : "Never"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditPortal(portal)}
                              className="h-8 w-8 text-slate-400 hover:text-blue-400"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(portal.id)}
                              disabled={deletingId === portal.id}
                              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                            >
                              {deletingId === portal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
