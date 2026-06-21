"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Bell, ChevronDown, Calendar, Radio } from "lucide-react";

export function AlertsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      type: formData.get("type"),
      message: formData.get("message"),
      startsAt: formData.get("startsAt") || undefined,
      endsAt: formData.get("endsAt") || undefined,
    };

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.refresh();
        (e.target as HTMLFormElement).reset();
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

  return (
    <Card className="glass-card mb-8">
      <CardHeader>
        <CardTitle>Broadcast New Alert</CardTitle>
        <CardDescription>
          Send a global system alert that will appear at the top of every user&apos;s dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Alert Type</Label>
              <div className="relative">
                <select 
                  id="type" 
                  name="type" 
                  className="flex h-10 w-full appearance-none rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300"
                  required
                >
                  <option value="INFO" className="bg-[#0a0a1a] text-blue-400">INFO</option>
                  <option value="SUCCESS" className="bg-[#0a0a1a] text-emerald-400">SUCCESS</option>
                  <option value="WARNING" className="bg-[#0a0a1a] text-amber-400">WARNING</option>
                  <option value="DANGER" className="bg-[#0a0a1a] text-red-400">DANGER</option>
                  <option value="ANNOUNCEMENT" className="bg-[#0a0a1a] text-blue-400">ANNOUNCEMENT</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Input id="message" name="message" placeholder="e.g. UID Bypass API is undergoing maintenance..." required minLength={3} maxLength={500} icon={<Bell className="w-4 h-4" />} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start Time (Optional)</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" icon={<Calendar className="w-4 h-4" />} className="bg-black/40" />
              <p className="text-xs text-slate-500 ml-1">Leave blank to start immediately.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End Time (Optional)</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" icon={<Calendar className="w-4 h-4" />} className="bg-black/40" />
              <p className="text-xs text-slate-500 ml-1">Leave blank to run indefinitely.</p>
            </div>
          </div>
          
          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <Button type="submit" disabled={loading} className="w-full sm:w-auto mt-4 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
            Broadcast Alert
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function DeleteAlertButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this alert?")) return;
    setLoading(true);
    
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading} className="h-8 w-8 p-0 rounded-lg">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
    </Button>
  );
}
