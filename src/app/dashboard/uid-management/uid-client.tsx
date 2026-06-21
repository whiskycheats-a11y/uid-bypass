"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Activity, ArrowRightLeft, KeyRound, Info, Search, Calendar, Clock, Trash2, Copy, Plus, Minus, CheckCircle2, ShieldAlert } from "lucide-react";

import { format } from "date-fns";
import { PageWrapper } from "@/components/page-wrapper";

interface UidRecord {
  id: number;
  uidValue: string;
  duration: number;
  createdAt: string | Date;
  expiresAt: string | Date | null;
  status: "ACTIVE" | "EXPIRED" | "DELETED";
}

interface UidClientProps {
  initialUids: UidRecord[];
}

export function UidClient({ initialUids }: UidClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<{ type: "success" | "error"; message: string; data?: any } | null>(null);

  const [activeTab, setActiveTab] = useState("add");
  const [uidValue, setUidValue] = useState("");
  const [oldUidValue, setOldUidValue] = useState("");
  const [newUidValue, setNewUidValue] = useState("");
  const [daysValue, setDaysValue] = useState<number>(30);
  const [extendDaysValue, setExtendDaysValue] = useState<number>(30);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const uidParam = searchParams.get("uid");

    if (tab && ["add", "extend", "replace", "remove", "info"].includes(tab)) {
      // eslint-disable-next-line
      setActiveTab(tab);
    }
    if (uidParam) {
      if (tab === "replace") {
        setOldUidValue(uidParam);
      } else {
        setUidValue(uidParam);
      }
    }
  }, [searchParams]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "DELETED">("ALL");

  const handleAction = async (e: React.FormEvent, endpoint: string) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries()) as Record<string, string | number>;

    if (data.days) data.days = parseInt(data.days as string, 10);

    try {
      const res = await fetch(`/api/uid/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (res.ok) {
        setResult({ type: "success", message: json.message, data: json.data });
        router.refresh();
      } else {
        setResult({ type: "error", message: json.message });
      }
    } catch (_err) {
      setResult({ type: "error", message: "Network error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const prefillAction = (tab: string, uid: string) => {
    setActiveTab(tab);
    setResult(null);
    if (tab === "replace") {
      setOldUidValue(uid);
      setNewUidValue("");
    } else {
      setUidValue(uid);
    }

    // Scroll to top where forms are
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredUids = initialUids.map(uid => {
    // Dynamically compute if it's actually expired
    let effectiveStatus = uid.status;
    if (uid.status === "ACTIVE" && uid.expiresAt && new Date(uid.expiresAt) < new Date()) {
      effectiveStatus = "EXPIRED";
    }
    return { ...uid, effectiveStatus };
  }).filter((uid) => {
    const matchesSearch = uid.uidValue.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || uid.effectiveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <PageWrapper className="space-y-12">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-8 h-auto p-2 bg-white/[0.02]">
            <TabsTrigger value="add" className="gap-2 py-3"><ShieldCheck className="w-4 h-4" /> Add</TabsTrigger>
            <TabsTrigger value="extend" className="gap-2 py-3"><Activity className="w-4 h-4" /> Extend</TabsTrigger>
            <TabsTrigger value="replace" className="gap-2 py-3"><ArrowRightLeft className="w-4 h-4" /> Replace</TabsTrigger>
            <TabsTrigger value="remove" className="gap-2 py-3 text-red-400 data-[state=active]:text-white data-[state=active]:from-red-600 data-[state=active]:to-red-500"><KeyRound className="w-4 h-4" /> Remove</TabsTrigger>
            <TabsTrigger value="info" className="gap-2 py-3"><Info className="w-4 h-4" /> Info</TabsTrigger>
          </TabsList>

          {result && (
            <div
              className={`mb-6 p-4 rounded-xl border animate-fade-in ${result.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200" : "bg-red-500/10 border-red-500/20 text-red-200"
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {result.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-red-400" />}
                <p className="font-semibold">{result.message}</p>
              </div>
              {result.data?.message && result.data.message !== result.message && (
                <p className="text-sm mt-1 opacity-80">{result.data.message}</p>
              )}
              {result.data?.data && typeof result.data.data === "object" && (
                <div className="mt-3 p-3 bg-black/40 border border-white/10 rounded-lg overflow-x-auto shadow-inner">
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(result.data.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <TabsContent value="add" className="mt-0">
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle>Add New UID</CardTitle>
                <CardDescription>Costs 1 UID Limit. Grants access to the specified UID.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleAction(e, "add")} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="uid">UID</Label>
                      <Input id="uid" name="uid" value={uidValue} onChange={(e) => setUidValue(e.target.value)} placeholder="e.g. 1000123456" required pattern="[0-9]+" icon={<KeyRound className="w-4 h-4" />} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="days">Duration (Days)</Label>
                      <div className="flex items-center gap-2">
                        <Input id="days" name="days" type="number" min="1" max="365" value={daysValue} onChange={(e) => setDaysValue(parseInt(e.target.value) || 1)} required icon={<Clock className="w-4 h-4" />} className="[&::-webkit-inner-spin-button]:appearance-none appearance-none bg-black/40" />
                        <Button type="button" variant="outline" className="w-10 h-10 p-0 border-white/10 bg-black/40 hover:bg-white/10 shrink-0" onClick={() => setDaysValue(Math.max(1, daysValue - 1))}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button type="button" variant="outline" className="w-10 h-10 p-0 border-white/10 bg-black/40 hover:bg-white/10 shrink-0" onClick={() => setDaysValue(Math.min(365, daysValue + 1))}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto mt-4 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Add UID
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extend" className="mt-0">
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle>Extend UID</CardTitle>
                <CardDescription>Costs 1 UID Limit. Extends the duration of an existing active UID.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleAction(e, "extend")} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="uid_extend">UID</Label>
                      <Input id="uid_extend" name="uid" value={uidValue} onChange={(e) => setUidValue(e.target.value)} placeholder="e.g. 1000123456" required pattern="[0-9]+" icon={<KeyRound className="w-4 h-4" />} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="days_extend">Days to Add</Label>
                      <div className="flex items-center gap-2">
                        <Input id="days_extend" name="days" type="number" min="1" max="365" value={extendDaysValue} onChange={(e) => setExtendDaysValue(parseInt(e.target.value) || 1)} required icon={<Clock className="w-4 h-4" />} className="[&::-webkit-inner-spin-button]:appearance-none appearance-none bg-black/40" />
                        <Button type="button" variant="outline" className="w-10 h-10 p-0 border-white/10 bg-black/40 hover:bg-white/10 shrink-0" onClick={() => setExtendDaysValue(Math.max(1, extendDaysValue - 1))}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button type="button" variant="outline" className="w-10 h-10 p-0 border-white/10 bg-black/40 hover:bg-white/10 shrink-0" onClick={() => setExtendDaysValue(Math.min(365, extendDaysValue + 1))}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto mt-4 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] transition-all">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                    Extend Time
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="replace" className="mt-0">
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle>Replace UID</CardTitle>
                <CardDescription>Free action. Transfers remaining time from old UID to a new UID.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleAction(e, "replace")} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="oldUid">Old UID</Label>
                      <Input id="oldUid" name="oldUid" value={oldUidValue} onChange={(e) => setOldUidValue(e.target.value)} placeholder="Currently active UID" required pattern="[0-9]+" icon={<KeyRound className="w-4 h-4" />} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newUid">New UID</Label>
                      <Input id="newUid" name="newUid" value={newUidValue} onChange={(e) => setNewUidValue(e.target.value)} placeholder="New UID to transfer to" required pattern="[0-9]+" icon={<ArrowRightLeft className="w-4 h-4" />} />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto mt-4 bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(217,119,6,0.3)] hover:shadow-[0_0_30px_rgba(217,119,6,0.5)] transition-all">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                    Replace UID
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="remove" className="mt-0">
            <Card className="glass-premium border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <CardHeader>
                <CardTitle className="text-red-400">Remove UID</CardTitle>
                <CardDescription>Free action. Instantly revokes access for this UID. Cannot be undone.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleAction(e, "remove")} className="space-y-4">
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="uid_remove">UID to Remove</Label>
                    <Input id="uid_remove" name="uid" value={uidValue} onChange={(e) => setUidValue(e.target.value)} placeholder="e.g. 1000123456" required pattern="[0-9]+" icon={<KeyRound className="w-4 h-4 text-red-400" />} />
                  </div>
                  <Button variant="destructive" type="submit" disabled={loading} className="w-full sm:w-auto mt-4">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Remove Access
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="mt-0">
            <Card className="glass-premium">
              <CardHeader>
                <CardTitle>Check UID Status</CardTitle>
                <CardDescription>Free action. Checks the real-time status and expiry of any UID.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleAction(e, "info")} className="space-y-4">
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="uid_info">UID to Check</Label>
                    <Input id="uid_info" name="uid" value={uidValue} onChange={(e) => setUidValue(e.target.value)} placeholder="e.g. 1000123456" required pattern="[0-9]+" icon={<Info className="w-4 h-4" />} />
                  </div>
                  <Button variant="secondary" type="submit" disabled={loading} className="w-full sm:w-auto mt-4">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Info className="mr-2 h-4 w-4" />}
                    Check Info
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="pt-4 border-t border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-400" /> Your UID Database
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Search UID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-black/40 border-white/10 text-white"
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="flex bg-black/40 border border-white/10 rounded-md overflow-hidden">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${statusFilter === "ALL" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${statusFilter === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-emerald-400"}`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("EXPIRED")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${statusFilter === "EXPIRED" ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:text-amber-400"}`}
              >
                Expired
              </button>
            </div>
          </div>
        </div>

        <Card className="glass-premium rounded-2xl relative overflow-hidden border-white/10">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <CardContent className="p-0 overflow-x-auto w-full hide-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-white/[0.08]">
                <tr>
                  <th className="px-6 py-4 font-medium">UID</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Timestamps</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredUids.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No UIDs match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUids.map((uid) => {
                    return (
                      <tr key={uid.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-white">
                          <div className="flex items-center gap-2">
                            {uid.uidValue}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(uid.uidValue);
                                setResult({ type: "success", message: "UID copied to clipboard!" });
                              }}
                              className="text-slate-500 hover:text-white transition-colors"
                              title="Copy UID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1.5 text-slate-500" />
                            {uid.duration} Days
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={
                            uid.effectiveStatus === "ACTIVE" ? "border-emerald-500/50 text-emerald-400" :
                              uid.effectiveStatus === "EXPIRED" ? "border-amber-500/50 text-amber-400" :
                                "border-red-500/50 text-red-400"
                          }>
                            {uid.effectiveStatus}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs space-y-1">
                          <div className="flex items-center text-slate-400">
                            <span className="w-12 text-slate-500">Created:</span>
                            {format(new Date(uid.createdAt), "MMM d, yyyy HH:mm")}
                          </div>
                          {uid.expiresAt && (
                            <div className="flex items-center text-slate-400">
                              <span className="w-12 text-slate-500">Expires:</span>
                              {format(new Date(uid.expiresAt), "MMM d, yyyy HH:mm")}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {uid.effectiveStatus === "EXPIRED" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => prefillAction("add", uid.uidValue)}
                                className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" /> Re-Add
                              </Button>
                            ) : uid.effectiveStatus === "ACTIVE" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => prefillAction("extend", uid.uidValue)}
                                  className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                                  title="Extend UID"
                                >
                                  <Activity className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => prefillAction("replace", uid.uidValue)}
                                  className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                  title="Replace UID"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => prefillAction("remove", uid.uidValue)}
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                  title="Remove UID"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">No actions</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
