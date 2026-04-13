import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import { MouseCursor } from "@/components/mouse-cursor";
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
}

function readSession(): AuthState | null {
  try {
    const raw = sessionStorage.getItem("uid_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.role && parsed?.username) return { role: parsed.role, username: parsed.username, defaultDays: parsed.defaultDays ?? 30, isTrial: parsed.isTrial ?? false };
    return null;
  } catch {
    return null;
  }
}

function AppRoot() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuth(readSession());
    setReady(true);
  }, []);

  const handleLogin = (role: "admin" | "user", username: string) => {
    const raw = sessionStorage.getItem("uid_auth");
    const parsed = raw ? JSON.parse(raw) : {};
    const defaultDays = parsed.defaultDays ?? 30;
    const isTrial = parsed.isTrial ?? false;
    setAuth({ role, username, defaultDays, isTrial });
  };

  const handleLogout = () => {
    sessionStorage.removeItem("uid_auth");
    setAuth(null);
  };

  if (!ready) return null;

  if (!auth) {
    return <Login onLogin={handleLogin} />;
  }

  if (auth.role === "admin") {
    return <Admin adminUsername={auth.username} onLogout={handleLogout} />;
  }

  return <Dashboard username={auth.username} defaultDays={auth.defaultDays} isTrial={auth.isTrial} onLogout={handleLogout} />;
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.cursor = "none";
    return () => { document.body.style.cursor = ""; };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MouseCursor />
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
