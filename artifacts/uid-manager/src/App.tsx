import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import FreePortal from "@/pages/FreePortal";
import { WelcomeSplash } from "@/components/welcome-splash";
import { useEffect, useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

interface AuthState {
  role: "admin" | "user";
  username: string;
  defaultDays: number;
  isTrial: boolean;
  canResell: boolean;
}

function readSession(): AuthState | null {
  try {
    const raw = sessionStorage.getItem("uid_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.role && parsed?.username) return { role: parsed.role, username: parsed.username, defaultDays: parsed.defaultDays ?? 30, isTrial: parsed.isTrial ?? false, canResell: parsed.canResell ?? false };
    return null;
  } catch {
    return null;
  }
}

function AppRoot() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashUser, setSplashUser] = useState("");

  useEffect(() => {
    async function verifyAndSetSession() {
      const BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL).replace(/\/$/, "");
      const session = sessionStorage.getItem("uid_auth");
      if (!session) {
        setAuth(null);
        setReady(true);
        return;
      }
      try {
        const parsed = JSON.parse(session);
        if (parsed?.username && parsed?.role && parsed?.adminKey) {
          const res = await fetch(`${BASE}/api/auth/verify-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: parsed.username,
              password: parsed.adminKey,
              role: parsed.role,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setAuth({
                role: parsed.role,
                username: parsed.username,
                defaultDays: parsed.defaultDays ?? 30,
                isTrial: parsed.isTrial ?? false,
                canResell: parsed.canResell ?? false,
              });
              setReady(true);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Session verification error:", e);
      }
      // Purge fake or expired session
      sessionStorage.removeItem("uid_auth");
      setAuth(null);
      setReady(true);
    }

    verifyAndSetSession();
  }, []);

  const handleLogin = (role: "admin" | "user", username: string) => {
    const raw = sessionStorage.getItem("uid_auth");
    const parsed = raw ? JSON.parse(raw) : {};
    const defaultDays = parsed.defaultDays ?? 30;
    const isTrial = parsed.isTrial ?? false;
    const canResell = parsed.canResell ?? false;
    const newAuth = { role, username, defaultDays, isTrial, canResell };
    if (role === "user") {
      setSplashUser(username);
      setShowSplash(true);
      setTimeout(() => setAuth(newAuth), 200);
    } else {
      setAuth(newAuth);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("uid_auth");
    setAuth(null);
    setShowSplash(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center font-sans bg-[#030014] overflow-hidden selection:bg-violet-500/30 selection:text-white">
        <div className="argus-bg opacity-30" />
        <div className="argus-mesh opacity-25" />
        <div className="relative flex flex-col items-center gap-4 z-10 text-center">
          <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(124,58,237,0.4)] animate-pulse">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400/80 mt-2">SECURE HANDSHAKE</p>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 animate-pulse">Verifying network identity...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <WelcomeSplash username={splashUser} visible={showSplash} onDone={() => setShowSplash(false)} />
      {!auth ? (
        <Login onLogin={handleLogin} />
      ) : auth.role === "admin" ? (
        <Admin adminUsername={auth.username} onLogout={handleLogout} />
      ) : (
        <Dashboard username={auth.username} defaultDays={auth.defaultDays} isTrial={auth.isTrial} canResell={auth.canResell} onLogout={handleLogout} />
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/" component={AppRoot} />
            <Route path="/free-portal" component={FreePortal} />
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
