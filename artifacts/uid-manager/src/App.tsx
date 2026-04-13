import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import { useEffect, useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

interface AuthState {
  role: "admin" | "user";
  username: string;
}

function readSession(): AuthState | null {
  try {
    const raw = sessionStorage.getItem("uid_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.role && parsed?.username) return { role: parsed.role, username: parsed.username };
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
    setAuth({ role, username });
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

  return <Dashboard username={auth.username} onLogout={handleLogout} />;
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
