import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import {
  Building2, LayoutDashboard, Users, BarChart3, LogOut,
  ChevronRight, CreditCard, Receipt,
} from "lucide-react";

const NAV = [
  { href: "/platform-admin",               icon: LayoutDashboard, label: "Overview" },
  { href: "/platform-admin/organizations", icon: Building2,       label: "Organizations" },
  { href: "/platform-admin/subscriptions", icon: CreditCard,      label: "Subscriptions" },
  { href: "/platform-admin/billing",       icon: Receipt,         label: "Billing & Payments" },
  { href: "/platform-admin/users",         icon: Users,           label: "All Users" },
  { href: "/platform-admin/analytics",     icon: BarChart3,       label: "Analytics" },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Mystics Audit</p>
            <p className="text-indigo-400 text-[10px] font-medium uppercase tracking-wider">Platform Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === "/platform-admin"
              ? location === href
              : location.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-slate-800 mt-4">
            <Link href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
              <ChevronRight className="w-4 h-4 shrink-0" />
              Switch to App
            </Link>
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.avatar ?? "PA"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-slate-200 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
        {children}
      </main>
    </div>
  );
}
