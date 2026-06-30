import { useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminLayout from "@/components/AdminLayout";
import AdminLogin from "@/pages/AdminLogin";
import Dashboard from "@/pages/Dashboard";
import Tenants from "@/pages/Tenants";
import TenantDetail from "@/pages/TenantDetail";
import Users from "@/pages/Users";
import Billing from "@/pages/Billing";
import Subscriptions from "@/pages/Subscriptions";
import FeatureFlags from "@/pages/FeatureFlags";
import AuditLogs from "@/pages/AuditLogs";
import SystemHealth from "@/pages/SystemHealth";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import { isAuthenticated, clearAuth } from "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <AdminLayout onLogout={onLogout}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tenants" component={Tenants} />
        <Route path="/tenants/:id" component={TenantDetail} />
        <Route path="/users" component={Users} />
        <Route path="/billing" component={Billing} />
        <Route path="/subscriptions" component={Subscriptions} />
        <Route path="/feature-flags" component={FeatureFlags} />
        <Route path="/audit-logs" component={AuditLogs} />
        <Route path="/health" component={SystemHealth} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function App() {
  const [authed, setAuthed] = useState(isAuthenticated);

  const handleLogin = useCallback(() => {
    setAuthed(true);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {}
    clearAuth();
    queryClient.clear();
    setAuthed(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          {authed ? (
            <Router onLogout={handleLogout} />
          ) : (
            <AdminLogin onLogin={handleLogin} />
          )}
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
