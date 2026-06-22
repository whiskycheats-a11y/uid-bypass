"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Webhook, Link as LinkIcon, Users, CreditCard, ShieldCheck, Globe, KeyRound } from "lucide-react";

export function ConfigClient() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/config");
        const data = await res.json();
        if (res.ok) {
          setSettings(data.settings || {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        alert("System Configuration saved successfully!");
      } else {
        alert(data.message || "Failed to save settings.");
      }
    } catch (err) {
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Registration Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" /> Registration & Users
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure what happens when a new user signs up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-xl">
            <div className="space-y-1">
              <Label className="text-white text-base">Enable 1 Paid UID Trial</Label>
              <p className="text-sm text-slate-400">
                If enabled, new resellers will automatically receive 1 Paid UID Limit upon registration.
              </p>
            </div>
            <div 
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings["TRIAL_PAID_UID_ENABLED"] === "true" ? "bg-emerald-500" : "bg-slate-600"
              }`}
              onClick={() => {
                const checked = settings["TRIAL_PAID_UID_ENABLED"] === "true";
                handleChange("TRIAL_PAID_UID_ENABLED", checked ? "false" : "true");
              }}
            >
              <div 
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings["TRIAL_PAID_UID_ENABLED"] === "true" ? "translate-x-5" : "translate-x-0"
                }`} 
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Discord Webhooks */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-400" /> Discord Webhooks
          </CardTitle>
          <CardDescription className="text-slate-400">
            Where should the system send notifications for different events? Leave blank to disable an alert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> UID Management Webhook
              </Label>
              <Input 
                value={settings["WEBHOOK_UID_MANAGEMENT"] || ""}
                onChange={(e) => handleChange("WEBHOOK_UID_MANAGEMENT", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="bg-black/40 border-white/10"
                icon={<LinkIcon className="w-4 h-4" />}
              />
              <p className="text-xs text-slate-500">Triggers when a UID is added, extended, replaced, or removed.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> User Management Webhook
              </Label>
              <Input 
                value={settings["WEBHOOK_USER_MANAGEMENT"] || ""}
                onChange={(e) => handleChange("WEBHOOK_USER_MANAGEMENT", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="bg-black/40 border-white/10"
                icon={<LinkIcon className="w-4 h-4" />}
              />
              <p className="text-xs text-slate-500">Triggers when users are created, updated, or deleted.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> Limit Management Webhook
              </Label>
              <Input 
                value={settings["WEBHOOK_LIMIT_MANAGEMENT"] || ""}
                onChange={(e) => handleChange("WEBHOOK_LIMIT_MANAGEMENT", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="bg-black/40 border-white/10"
                icon={<LinkIcon className="w-4 h-4" />}
              />
              <p className="text-xs text-slate-500">Triggers when admins/managers modify user limits.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> Free Portals Webhook
              </Label>
              <Input 
                value={settings["WEBHOOK_FREE_PORTALS"] || ""}
                onChange={(e) => handleChange("WEBHOOK_FREE_PORTALS", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="bg-black/40 border-white/10"
                icon={<LinkIcon className="w-4 h-4" />}
              />
              <p className="text-xs text-slate-500">Triggers when a reseller creates a free portal.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> API Key Changes Webhook
              </Label>
              <Input 
                value={settings["WEBHOOK_API_KEY_CHANGES"] || ""}
                onChange={(e) => handleChange("WEBHOOK_API_KEY_CHANGES", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="bg-black/40 border-white/10"
                icon={<LinkIcon className="w-4 h-4" />}
              />
              <p className="text-xs text-slate-500">Triggers when a user regenerates their own API key.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[150px]"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Config
        </Button>
      </div>
    </div>
  );
}
