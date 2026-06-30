import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Building2, Users, CreditCard, Flag,
  ScrollText, Activity, Settings, Shield, LogOut, ChevronRight,
  Bell, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { label: "Dashboard",     icon: LayoutDashboard, path: "/" },
  { label: "Tenants",       icon: Building2,       path: "/tenants" },
  { label: "Users",         icon: Users,           path: "/users" },
  { label: "Subscriptions", icon: CreditCard,      path: "/subscriptions" },
  { label: "Feature Flags", icon: Flag,            path: "/feature-flags" },
  { label: "Audit Logs",    icon: ScrollText,      path: "/audit-logs" },
  { label: "System Health", icon: Activity,        path: "/health" },
  { label: "Settings",      icon: Settings,        path: "/settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-accent-foreground leading-none">Mystics</p>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">Platform Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
          {NAV.map(({ label, icon: Icon, path }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link key={path} href={path}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors group",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Admin info */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-semibold text-white">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">Super Admin</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">platform@mystics.app</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-sidebar-foreground/40 hover:text-sidebar-foreground" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-3 border-b bg-card/80 backdrop-blur flex-shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search tenants, users…" className="pl-9 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
            </Button>
            <Badge variant="outline" className="text-xs font-mono bg-destructive/10 text-destructive border-destructive/20 px-2">
              ADMIN
            </Badge>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
