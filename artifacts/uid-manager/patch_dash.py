import re

with open('src/pages/dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_docs = '''        <div className="space-y-4">
          <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-emerald-400">Add UID</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">POST</span>
            </div>
            <p className="text-sm text-slate-400">Endpoint: <span className="text-cyan-400 font-mono">/api/uid/add</span></p>
            
            <div className="bg-black/60 rounded-lg p-4 font-mono text-[11px] sm:text-xs text-slate-300 overflow-x-auto border border-white/5">
{`curl -X POST https://uid-api-server.onrender.com/api/uid/add \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "uid": "123456789",
    "days": 30
  }'`}
            </div>
            
            <div className="mt-4 bg-black/60 rounded-lg p-4 font-mono text-[11px] sm:text-xs text-slate-300 border border-white/5">
{`// Success Response
{
  "success": true,
  "message": "UID whitelisted successfully for 30 days"
}`}
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-red-400">Remove UID</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/30">POST</span>
            </div>
            <p className="text-sm text-slate-400">Endpoint: <span className="text-cyan-400 font-mono">/api/uid/remove</span></p>
            
            <div className="bg-black/60 rounded-lg p-4 font-mono text-[11px] sm:text-xs text-slate-300 overflow-x-auto border border-white/5">
{`curl -X POST https://uid-api-server.onrender.com/api/uid/remove \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "uid": "123456789"
  }'`}
            </div>
            
            <div className="mt-4 bg-black/60 rounded-lg p-4 font-mono text-[11px] sm:text-xs text-slate-300 border border-white/5">
{`// Success Response
{
  "success": true,
  "message": "UID removed successfully"
}`}
            </div>
          </div>
        </div>'''

# Regex to match the old <div className="space-y-4">...</div> entirely.
content = re.sub(
    r'<div className="space-y-4">\s*<div className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-3">\s*<div className="flex items-center justify-between">\s*<h3 className="font-bold text-emerald-400">Create UID Token</h3>[\s\S]*?</div>\s*</div>\s*</div>',
    new_docs,
    content
)

with open('src/pages/dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
