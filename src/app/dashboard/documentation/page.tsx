import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Code2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function DocumentationPage() {
  const baseUrl = "https://uid-bypass-beryl.vercel.app";

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
          <Code2 className="w-8 h-8 text-blue-400" /> API Documentation
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Integrate the UID Bypass API directly into your Discord bots, websites, or automation scripts. 
          All our API endpoints are <strong className="text-emerald-400">GET-based</strong> for ultimate simplicity, allowing you to trigger them via simple web requests.
        </p>
      </div>

      {/* Authentication & Base URL */}
      <Card className="glass-card border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-400 flex items-center gap-2">
            <Info className="w-5 h-5" /> Base URL & Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-300 text-sm">
          <div className="bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-cyan-400">
            {baseUrl}
          </div>
          <p>
            Authentication is handled entirely via the <code className="text-emerald-400">key</code> query parameter. 
            Simply append your secret API key to the end of any GET request.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-amber-200">
              <strong>Security Warning:</strong> Never expose your API key in client-side code (like frontend JavaScript). Always make API requests from a secure backend server.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-4">Endpoints</h2>

        {/* Add UID */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-700">GET</Badge> Add UID
              </CardTitle>
              <Badge variant="outline" className="border-amber-500/50 text-amber-400">Costs 1 Limit</Badge>
            </div>
            <CardDescription className="text-slate-400">Whitelists a new UID for a specific number of days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-x-auto">
              <code className="text-blue-300 whitespace-nowrap text-sm font-mono">
                /api/uid/add?key=<span className="text-emerald-400">YOUR_API_KEY</span>&uid=<span className="text-amber-400">123456789</span>&days=<span className="text-purple-400">30</span>
              </code>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Query Parameters</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><code className="text-emerald-400 font-mono">key</code> (required): Your API key</li>
                  <li><code className="text-amber-400 font-mono">uid</code> (required): Player UID (digits only)</li>
                  <li><code className="text-purple-400 font-mono">days</code> (required): Duration in days (1-365)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Success Response</h4>
                <pre className="bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-emerald-400 font-mono">
{`{
  "success": true,
  "message": "UID added successfully",
  "data": {
    "issued_by": "username",
    "remaining_uid_limit": 99,
    "...": "..."
  }
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Extend UID */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-700">GET</Badge> Extend UID
              </CardTitle>
              <Badge variant="outline" className="border-amber-500/50 text-amber-400">Costs 1 Limit</Badge>
            </div>
            <CardDescription className="text-slate-400">Extends the time of an already active UID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-x-auto">
              <code className="text-blue-300 whitespace-nowrap text-sm font-mono">
                /api/uid/extend?key=<span className="text-emerald-400">YOUR_API_KEY</span>&uid=<span className="text-amber-400">123456789</span>&days=<span className="text-purple-400">30</span>
              </code>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Query Parameters</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><code className="text-emerald-400 font-mono">key</code> (required): Your API key</li>
                  <li><code className="text-amber-400 font-mono">uid</code> (required): Player UID (digits only)</li>
                  <li><code className="text-purple-400 font-mono">days</code> (required): Duration to add (1-365)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Success Response</h4>
                <pre className="bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-emerald-400 font-mono">
{`{
  "success": true,
  "message": "UID extended successfully",
  "data": {
    "issued_by": "username",
    "remaining_uid_limit": 99,
    "...": "..."
  }
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Replace UID */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-700">GET</Badge> Replace UID
              </CardTitle>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">Free Action</Badge>
            </div>
            <CardDescription className="text-slate-400">Transfers remaining time from an old UID to a new UID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-x-auto">
              <code className="text-blue-300 whitespace-nowrap text-sm font-mono">
                /api/uid/replace?key=<span className="text-emerald-400">YOUR_API_KEY</span>&old_uid=<span className="text-amber-400">12345</span>&new_uid=<span className="text-purple-400">67890</span>
              </code>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Query Parameters</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><code className="text-emerald-400 font-mono">key</code> (required): Your API key</li>
                  <li><code className="text-amber-400 font-mono">old_uid</code> (required): Currently active UID</li>
                  <li><code className="text-purple-400 font-mono">new_uid</code> (required): New UID to transfer to</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Success Response</h4>
                <pre className="bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-emerald-400 font-mono">
{`{
  "success": true,
  "message": "UID replaced successfully",
  "data": { ... }
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remove UID */}
        <Card className="glass-card border-red-500/20 shadow-red-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-red-400 flex items-center gap-2">
                <Badge className="bg-red-600 hover:bg-red-700">GET</Badge> Remove UID
              </CardTitle>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">Free Action</Badge>
            </div>
            <CardDescription className="text-slate-400">Instantly revokes access for a specific UID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-x-auto">
              <code className="text-red-300 whitespace-nowrap text-sm font-mono">
                /api/uid/remove?key=<span className="text-emerald-400">YOUR_API_KEY</span>&uid=<span className="text-amber-400">123456789</span>
              </code>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Query Parameters</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><code className="text-emerald-400 font-mono">key</code> (required): Your API key</li>
                  <li><code className="text-amber-400 font-mono">uid</code> (required): UID to remove</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Success Response</h4>
                <pre className="bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-emerald-400 font-mono">
{`{
  "success": true,
  "message": "UID removed successfully",
  "data": { ... }
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info UID */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-700">GET</Badge> UID Info
              </CardTitle>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">Free Action</Badge>
            </div>
            <CardDescription className="text-slate-400">Check the current active status and expiry of any UID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-x-auto">
              <code className="text-blue-300 whitespace-nowrap text-sm font-mono">
                /api/uid/info?key=<span className="text-emerald-400">YOUR_API_KEY</span>&uid=<span className="text-amber-400">123456789</span>
              </code>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Query Parameters</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><code className="text-emerald-400 font-mono">key</code> (required): Your API key</li>
                  <li><code className="text-amber-400 font-mono">uid</code> (required): UID to check</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Success Response</h4>
                <pre className="bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-emerald-400 font-mono">
{`{
  "success": true,
  "message": "UID status fetched",
  "data": { ... }
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Codes Reference */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-4">Error Responses</h2>
        <Card className="glass-card">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-white/[0.08]">
                <tr>
                  <th className="px-6 py-4 font-medium">HTTP Code</th>
                  <th className="px-6 py-4 font-medium">JSON Message</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-emerald-400 font-mono">200 OK</td>
                  <td className="px-6 py-4 font-mono text-xs">{"{ success: true, ... }"}</td>
                  <td className="px-6 py-4 text-slate-400">The request was successful.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-amber-400 font-mono">400 Bad Request</td>
                  <td className="px-6 py-4 font-mono text-xs">{"{ message: \"Invalid UID format\" }"}</td>
                  <td className="px-6 py-4 text-slate-400">Missing parameters, invalid UID format, or insufficient limits.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-red-400 font-mono">401 Unauthorized</td>
                  <td className="px-6 py-4 font-mono text-xs">{"{ message: \"Unauthorized.\" }"}</td>
                  <td className="px-6 py-4 text-slate-400">Invalid or missing API key.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-orange-400 font-mono">403 Forbidden</td>
                  <td className="px-6 py-4 font-mono text-xs">{"{ message: \"Forbidden. You do not own this UID.\" }"}</td>
                  <td className="px-6 py-4 text-slate-400">Attempted to modify a UID that belongs to another reseller.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-orange-400 font-mono">404 Not Found</td>
                  <td className="px-6 py-4 font-mono text-xs">{"{ message: \"UID not found in local database.\" }"}</td>
                  <td className="px-6 py-4 text-slate-400">The specified UID does not exist in the database.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-pink-400 font-mono">409 Conflict</td>
                  <td className="px-6 py-4 font-mono text-xs">{"{ message: \"Duplicate UID...\" }"}</td>
                  <td className="px-6 py-4 text-slate-400">The UID already exists or another zytrone API conflict occurred.</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-red-500 font-mono">500 Server Error</td>
                  <td className="px-6 py-4 font-mono text-xs">{"{ message: \"Internal server error\" }"}</td>
                  <td className="px-6 py-4 text-slate-400">Backend server issue or zytrone API is down.</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
