import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
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
    setAuth(readSession());
    setReady(true);
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

  if (!ready) return null;

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
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
