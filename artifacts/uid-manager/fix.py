import os, re

path = r'c:\Users\HP\Music\uid-bypass\artifacts\uid-manager\src\pages\dashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. PERFORMANCE — TiltWrapper
tilt_old = r'''function TiltWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTilt({ x: dy * -6, y: dx * 6 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transformStyle: "preserve-3d",
        transition: "transform 0.25s ease-out",
      }}
    >
      {children}
    </div>
  );
}'''
tilt_new = r'''function TiltWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    const tiltX = dy * -6;
    const tiltY = dx * 6;

    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (ref.current) {
      ref.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    }
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.25s ease-out",
        willChange: "transform"
      }}
    >
      {children}
    </div>
  );
}'''
code = code.replace(tilt_old, tilt_new)

# 2. PERFORMANCE — OverviewStatCard sparkline
sparkline_old = r'''transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 }}'''
sparkline_new = r'''transition={{ duration: 2, ease: "easeInOut" }}'''
code = code.replace(sparkline_old, sparkline_new)

# 3, 4, 5. TeamChatView fixes
chat_old = r'''function TeamChatView({ currentUsername }: { currentUsername: string }) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        headers: userHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat messages:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll to bottom on load/new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const payloadText = text.trim();
    setText("");
    setSending(true);

    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: {
          ...userHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: payloadText }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.chat]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };'''

chat_new = r'''function TeamChatView({ currentUsername }: { currentUsername: string }) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const fetchMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await apiFetch(`${BASE}/api/chat`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat messages:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      if (!document.hidden) fetchMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const payloadText = text.trim();
    setText("");
    setSending(true);

    try {
      const res = await apiFetch(`${BASE}/api/chat`, {
        method: "POST",
        body: JSON.stringify({ message: payloadText }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.some((m) => m._id === data.chat._id) ? prev : [...prev, data.chat]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };'''
code = code.replace(chat_old, chat_new)
code = code.replace(r'''<div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/10">''', r'''<div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/10">''')
code = code.replace(r'''<div ref={messagesEndRef} />''', r'''{/* removed messagesEndRef */}''')

# 6. BUG — custom scrollbar invisible
css_old = r'''.custom-scrollbar::-webkit-scrollbar-thumb:hover {'''
css_new = r'''.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {'''
code = code.replace(css_old, css_new)

# 7. CONSISTENCY — auth on fetch calls
code = code.replace(r'''fetch(`${BASE}/api/uid/leaderboard`)''', r'''apiFetch(`${BASE}/api/uid/leaderboard`)''')
code = code.replace(r'''fetch(`${BASE}/api/settings/notice`)''', r'''apiFetch(`${BASE}/api/settings/notice`)''')
code = code.replace(r'''fetch(`${BASE}/api/auth/profile/${encodeURIComponent(username)}`)''', r'''apiFetch(`${BASE}/api/auth/profile/${encodeURIComponent(username)}`)''')
code = code.replace(r'''fetch(`${BASE}/api/credits/me`, { headers: userHeaders() })''', r'''apiFetch(`${BASE}/api/credits/me`)''')
code = code.replace(r'''fetch(`${BASE}/api/auth/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: name, avatar }),
    })''', r'''apiFetch(`${BASE}/api/auth/profile`, {
      method: "POST",
      body: JSON.stringify({ username, displayName: name, avatar }),
    })''')
code = code.replace(r'''fetch(`${BASE}/api/auth/update-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, currentPassword, newPassword }),
      })''', r'''apiFetch(`${BASE}/api/auth/update-key`, {
        method: "POST",
        body: JSON.stringify({ username, currentPassword, newPassword }),
      })''')
code = code.replace(r'''fetch(`${BASE}/api/users/login-history`)''', r'''apiFetch(`${BASE}/api/users/login-history`)''')

# 8. UX — replace confirm()/alert() in ResellerTrialPanel
reseller_old = r'''  const handleDeleteToken = async (token: string) => {
    if (!confirm("Are you sure you want to delete this trial link? All associated UIDs will be permanently revoked!")) return;
    try {
      const res = await apiFetch(`${BASE}/api/reseller/trial-token/${token}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchTokens();
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error("Failed to delete token", err);
    }
  };'''
reseller_new = r'''  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);

  const executeDelete = async (token: string) => {
    try {
      const res = await apiFetch(`${BASE}/api/reseller/trial-token/${token}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchTokens();
      } else {
        toast({ title: "Failed", description: data.message || "Failed to delete", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to delete token", err);
      toast({ title: "Error", description: "Failed to delete token", variant: "destructive" });
    }
  };'''
code = code.replace(reseller_old, reseller_new)

delete_btn_old = r'''<button onClick={() => handleDeleteToken(t.token)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors" title="Revoke & Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>'''
delete_btn_new = r'''{tokenToDelete === t.token ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-red-400 font-bold uppercase">Confirm?</span>
                        <button onClick={() => { setTokenToDelete(null); executeDelete(t.token); }} className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors">Yes</button>
                        <button onClick={() => setTokenToDelete(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setTokenToDelete(t.token)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors" title="Revoke & Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}'''
code = code.replace(delete_btn_old, delete_btn_new)

# 9. CLEANUP — ResellerTrialPanel fetchTokens useEffect
effect_old = r'''  useEffect(() => {
    fetchTokens();
  }, [username]);'''
effect_new = r'''  useEffect(() => {
    fetchTokens();
  }, []);'''
code = code.replace(effect_old, effect_new)

# 10. SECURITY — getResellerKey
generate_old = r'''      const resellerKey = getResellerKey();
      const res = await apiFetch(`${BASE}/api/reseller/trial-token`, {
        method: "POST",
        body: JSON.stringify({
          username,
          password: resellerKey,
          days,
          serverName: serverName.trim() || undefined,
        }),
      });'''
generate_new = r'''      const res = await apiFetch(`${BASE}/api/reseller/trial-token`, {
        method: "POST",
        body: JSON.stringify({
          days,
          serverName: serverName.trim() || undefined,
        }),
      });'''
code = code.replace(generate_old, generate_new)

# 11. CLEANUP — unused code
unused_regex = [
    r'function rand\(.*?\n}\n\n',
    r'function getResellerKey\(\).*?\n}\n\n',
    r'function StatCard\(.*?\n  \);\n}\n\n',
    r'function PlaceholderView\(.*?\n  \);\n}\n\n',
    r'const bsCount = uids\.filter\(\(u\) => u\.bluestack\)\.length;\n  ',
    r'const rest = data\.slice\(3\);\n\n  ',
    r'const \[showTrialMessage, setShowTrialMessage\] = useState\(false\);\n  ',
]
import re
for r in unused_regex:
    code = re.sub(r, '', code, flags=re.DOTALL)

code = code.replace('setShowTrialMessage(true);', '')

imports_old = r'''  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Activity,
  LogOut,
  Clock,
  CalendarDays,
  User,
  Gift,
  RefreshCw,
  Copy,
  CheckCheck,
  Timer,
  Coins,
  Wallet,
  QrCode,
  SendHorizonal,
  LayoutDashboard,
  BarChart2,
  Settings,
  Database,
  Trash2,
  Users2,
  Globe,
  Code,
  Server,
  MessageSquare,
  UserCircle,
  Camera,
  Edit2,
  Check,
  Trophy,
  Crown,
  Medal,
  KeyRound,
  Lock,
  Send,
  Menu,
  X,'''

imports_new = r'''  XCircle,
  Loader2,
  Plus,
  Activity,
  LogOut,
  Clock,
  CalendarDays,
  User,
  Gift,
  RefreshCw,
  Copy,
  CheckCheck,
  Timer,
  Coins,
  LayoutDashboard,
  BarChart2,
  Trash2,
  Users2,
  Globe,
  MessageSquare,
  UserCircle,
  Camera,
  Edit2,
  Check,
  Trophy,
  Crown,
  Medal,
  KeyRound,
  Lock,
  Send,
  X,'''
code = code.replace(imports_old, imports_new)

# 12. UX — avatar file upload size
avatar_old = r'''  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setTempAvatar(base64);
      };
      reader.readAsDataURL(file);
    }
  };'''
avatar_new = r'''  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > 128) {
              height = Math.round((height * 128) / width);
              width = 128;
            }
          } else {
            if (height > 128) {
              width = Math.round((width * 128) / height);
              height = 128;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          setTempAvatar(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };'''
code = code.replace(avatar_old, avatar_new)

# 13. MINOR — duplicate sidebar markup
sidebar_shared = r'''function SidebarContent({ activeSidebarTab, setActiveSidebarTab, canResell, onLogout, onCloseMobile }: { activeSidebarTab: string, setActiveSidebarTab: (id: string) => void, canResell: boolean, onLogout: () => void, onCloseMobile?: () => void }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        {SIDEBAR_NAV.map((nav) => {
          const Icon = nav.icon;
          const active = activeSidebarTab === nav.id;
          if (nav.id === "free" && !canResell) return null;
          return (
            <button
              key={nav.id}
              onClick={() => { setActiveSidebarTab(nav.id); onCloseMobile?.(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-sm font-semibold
                ${active 
                  ? "bg-white/[0.05] border border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)] relative" 
                  : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"}
              `}
            >
              <Icon className={`w-4.5 h-4.5 ${active ? "text-cyan-400" : "text-slate-500"}`} />
              <span>{nav.label}</span>
              {active && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />}
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-semibold text-sm"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}

export default function Dashboard'''
code = code.replace('export default function Dashboard', sidebar_shared)

mobile_old = r'''        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
          {SIDEBAR_NAV.map((nav) => {
            const Icon = nav.icon;
            const active = activeSidebarTab === nav.id;
            
            // Hide Free Portal if not a reseller
            if (nav.id === "free" && !canResell) return null;

            return (
              <button
                key={nav.id}
                onClick={() => { setActiveSidebarTab(nav.id); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-sm font-semibold
                  ${active 
                    ? "bg-white/[0.05] border border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)] relative" 
                    : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"}
                `}
              >
                <Icon className={`w-4.5 h-4.5 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                <span>{nav.label}</span>
                {active && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-semibold text-sm"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Logout</span>
          </button>
        </div>'''
desktop_old = r'''        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
          {SIDEBAR_NAV.map((nav) => {
            const Icon = nav.icon;
            const active = activeSidebarTab === nav.id;
            if (nav.id === "free" && !canResell) return null;
            return (
              <button
                key={nav.id}
                onClick={() => setActiveSidebarTab(nav.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-sm font-semibold
                  ${active 
                    ? "bg-white/[0.05] border border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)] relative" 
                    : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"}
                `}
              >
                <Icon className={`w-4.5 h-4.5 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                <span>{nav.label}</span>
                {active && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-semibold text-sm"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Logout</span>
          </button>
        </div>'''

mobile_new = r'''        <SidebarContent 
          activeSidebarTab={activeSidebarTab} 
          setActiveSidebarTab={setActiveSidebarTab} 
          canResell={canResell} 
          onLogout={handleLogout} 
          onCloseMobile={() => setMobileSidebarOpen(false)} 
        />'''
desktop_new = r'''        <SidebarContent 
          activeSidebarTab={activeSidebarTab} 
          setActiveSidebarTab={setActiveSidebarTab} 
          canResell={canResell} 
          onLogout={handleLogout} 
        />'''
code = code.replace(mobile_old, mobile_new)
code = code.replace(desktop_old, desktop_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print('Done!')
