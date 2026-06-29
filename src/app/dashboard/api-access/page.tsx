import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ApiKeyManager } from "./api-key-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, ShieldAlert, Code2 } from "lucide-react";
import { CodeCopyButton } from "@/components/code-copy-button";

export const dynamic = 'force-dynamic';

export default async function ApiAccessPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) redirect("/login");

  if (!user.apiAccessEnabled) {
    redirect("/dashboard");
  }

  // Base URL for API
  const baseUrl = "https://uid-bypass-beryl.vercel.app";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          API Access
        </h1>
        <p className="text-slate-400">
          Automate your reseller operations using our secure REST API.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                Your API Key
              </CardTitle>
              <CardDescription>
                Use this key to authenticate external scripts and bots. Do not share it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyManager initialKey={user.apiKey} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-white">1. Add UID</h4>
                <p className="text-sm text-slate-400">Adds a UID for the specified days. Deducts 1 limit.</p>
                <div className="relative">
                  <code className="block bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-blue-300 overflow-x-auto pr-10">
                    GET {baseUrl}/api/uid/add?key=YOUR_KEY&uid=123456&days=30
                  </code>
                  <CodeCopyButton text={`GET ${baseUrl}/api/uid/add?key=YOUR_KEY&uid=123456&days=30`} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-white">2. Extend UID</h4>
                <p className="text-sm text-slate-400">Extends an active UID. Deducts 1 limit.</p>
                <div className="relative">
                  <code className="block bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-blue-300 overflow-x-auto pr-10">
                    GET {baseUrl}/api/uid/extend?key=YOUR_KEY&uid=123456&days=30
                  </code>
                  <CodeCopyButton text={`GET ${baseUrl}/api/uid/extend?key=YOUR_KEY&uid=123456&days=30`} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-white">3. Replace UID</h4>
                <p className="text-sm text-slate-400">Free. Transfers time from old to new UID.</p>
                <div className="relative">
                  <code className="block bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-blue-300 overflow-x-auto pr-10">
                    GET {baseUrl}/api/uid/replace?key=YOUR_KEY&old_uid=123&new_uid=456
                  </code>
                  <CodeCopyButton text={`GET ${baseUrl}/api/uid/replace?key=YOUR_KEY&old_uid=123&new_uid=456`} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-white">4. Remove UID</h4>
                <p className="text-sm text-slate-400">Free. Revokes access immediately.</p>
                <div className="relative">
                  <code className="block bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-blue-300 overflow-x-auto pr-10">
                    GET {baseUrl}/api/uid/remove?key=YOUR_KEY&uid=123456
                  </code>
                  <CodeCopyButton text={`GET ${baseUrl}/api/uid/remove?key=YOUR_KEY&uid=123456`} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-white">5. Check UID Info</h4>
                <p className="text-sm text-slate-400">Free. Returns expiration and status details.</p>
                <div className="relative">
                  <code className="block bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-blue-300 overflow-x-auto pr-10">
                    GET {baseUrl}/api/uid/info?key=YOUR_KEY&uid=123456
                  </code>
                  <CodeCopyButton text={`GET ${baseUrl}/api/uid/info?key=YOUR_KEY&uid=123456`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card border-amber-500/20 shadow-amber-500/10">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Security Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-300 space-y-3 list-disc pl-4">
                <li>Your API key has exactly the same permissions as your dashboard account.</li>
                <li>Keep your API key absolutely secret. Do not expose it in client-side code.</li>
                <li>If you suspect your key is compromised, contact an administrator immediately to regenerate it.</li>
                <li>Abuse of the API will result in an automatic permanent ban from zytrone.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
