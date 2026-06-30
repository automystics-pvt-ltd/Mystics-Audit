import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ShoppingCart,
  Landmark,
  ReceiptIndianRupee,
  PackageSearch,
  Calculator,
  PiggyBank,
  PieChart,
  Settings,
  ChevronDown,
  Menu,
  Bell,
  Search,
  HelpCircle,
  Shield,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFY } from "@/contexts/fy-context";
import { useAuth, MODULE_ACCESS } from "@/contexts/auth-context";

/* ── Nav definition ─────────────────────────────────── */
type NavChild = { name: string; path: string; icon?: React.FC<{ className?: string }> };
type NavLeaf  = { name: string; path: string; icon: React.FC<{ className?: string }>; module?: string };
type NavGroup = { name: string; icon: React.FC<{ className?: string }>; module?: string; children: NavChild[] };
type NavEntry = NavLeaf | NavGroup;

const NAV: NavEntry[] = [
  { name: "Dashboard",  path: "/dashboard",  icon: LayoutDashboard, module: "dashboard" },
  {
    name: "Accounting", icon: BookOpen, module: "accounting",
    children: [
      { name: "Chart of Accounts", path: "/accounts" },
      { name: "Journal Entries",   path: "/journals" },
      { name: "Trial Balance",     path: "/accounts/trial-balance" },
    ],
  },
  {
    name: "Sales", icon: FileText, module: "sales",
    children: [
      { name: "Invoices",   path: "/invoices" },
      { name: "Customers",  path: "/customers" },
      { name: "Receipts",   path: "/receipts" },
      { name: "AR Aging",   path: "/customers/ar-aging" },
    ],
  },
  {
    name: "Purchases", icon: ShoppingCart, module: "purchases",
    children: [
      { name: "Vendors",         path: "/vendors" },
      { name: "Bills",           path: "/bills" },
      { name: "Purchase Orders", path: "/purchases/orders" },
      { name: "Goods Receipts",  path: "/purchases/grn" },
      { name: "AP Aging",        path: "/vendors/ap-aging" },
    ],
  },
  { name: "Banking",   path: "/bank",      icon: Landmark,           module: "banking" },
  { name: "Expenses",  path: "/expenses",  icon: ReceiptIndianRupee, module: "expenses" },
  { name: "Inventory", path: "/inventory", icon: PackageSearch,      module: "inventory" },
  {
    name: "GST", icon: Calculator, module: "gst",
    children: [
      { name: "ITC Ledger",      path: "/gst/itc-ledger" },
      { name: "GSTR-1",          path: "/gst/gstr1" },
      { name: "GSTR-3B",         path: "/gst/gstr3b" },
      { name: "Reconciliation",  path: "/gst/reconciliation" },
    ],
  },
  { name: "Budgets", path: "/budgets", icon: PiggyBank, module: "budgets" },
  {
    name: "Reports", icon: PieChart, module: "reports",
    children: [
      { name: "Profit & Loss",  path: "/reports/profit-loss" },
      { name: "Balance Sheet",  path: "/reports/balance-sheet" },
      { name: "Cash Flow",      path: "/reports/cash-flow" },
      { name: "Day Book",       path: "/reports/day-book" },
    ],
  },
  {
    name: "Settings", icon: Settings, module: "users",
    children: [
      { name: "Users",            path: "/users" },
      { name: "Audit Logs",       path: "/audit-logs" },
      { name: "Template Builder", path: "/template-builder" },
    ],
  },
];

function isLeaf(item: NavEntry): item is NavLeaf {
  return "path" in item;
}

/* ── Route → page title ─────────────────────────────── */
function usePageTitle(path: string) {
  for (const item of NAV) {
    if ("path" in item && item.path === path) return item.name;
    if ("children" in item) {
      for (const c of item.children) {
        if (path === c.path || path.startsWith(c.path + "/")) return c.name;
      }
    }
  }
  return "Mystics Audit";
}

/* ── Single nav item ────────────────────────────────── */
function NavItem({ item, currentPath }: { item: NavEntry; currentPath: string }) {
  const leaf = isLeaf(item);

  const active = leaf
    ? currentPath === item.path ||
      (!item.path.endsWith("/dashboard") && currentPath.startsWith(item.path + "/"))
    : false;

  const hasActiveChild = !leaf
    ? (item as NavGroup).children.some(
        (c) => currentPath === c.path || currentPath.startsWith(c.path + "/"),
      )
    : false;

  const [open, setOpen] = useState(hasActiveChild);

  /* ── Leaf ── */
  if (leaf) {
    const Icon = item.icon;
    return (
      <Link href={item.path}>
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-150 mx-1 mb-0.5",
            active ? "text-white shadow-md" : "text-gray-500 hover:bg-violet-50 hover:text-violet-700",
          )}
          style={active ? { background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" } : undefined}
        >
          <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", active ? "text-white" : "text-violet-500")} />
          <span className="flex-1 truncate">{item.name}</span>
        </div>
      </Link>
    );
  }

  /* ── Group ── */
  const group = item as NavGroup;
  const GroupIcon = group.icon;
  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
          "mx-1 hover:bg-violet-50 hover:text-violet-700",
          hasActiveChild ? "text-violet-700 bg-violet-50" : "text-gray-500",
        )}
        style={{ width: "calc(100% - 8px)" }}
      >
        <GroupIcon
          className={cn(
            "h-[18px] w-[18px] flex-shrink-0",
            hasActiveChild ? "text-violet-600" : "text-violet-500",
          )}
        />
        <span className="flex-1 text-left truncate">{group.name}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 text-gray-400",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="ml-5 mt-0.5 pl-3 border-l-2 border-violet-100 space-y-0.5 mb-1">
          {group.children.map((child) => {
            const childActive =
              currentPath === child.path || currentPath.startsWith(child.path + "/");
            return (
              <Link key={child.path} href={child.path}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all duration-150",
                    childActive
                      ? "font-semibold text-white shadow-sm"
                      : "text-gray-500 hover:bg-violet-50 hover:text-violet-700 font-medium",
                  )}
                  style={
                    childActive
                      ? { background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      childActive ? "bg-white" : "bg-violet-300",
                    )}
                  />
                  {child.name}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar FY label ────────────────────────────────── */
function SidebarFYLabel() {
  const { fy } = useFY();
  return (
    <p className="text-[10px] text-gray-300 text-center mt-2 font-medium">
      Mystics Audit · {fy.label}
    </p>
  );
}

/* ── FY Selector ─────────────────────────────────────── */
function FYSelector() {
  const { fy, setFY, options } = useFY();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-1.5 hover:bg-violet-100 transition-colors"
      >
        <span className="text-xs font-bold text-violet-600">{fy.label}</span>
        <ChevronDown className="w-3 h-3 text-violet-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[130px]">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setFY(opt); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-violet-50 hover:text-violet-700 transition-colors",
                  opt.value === fy.value ? "text-violet-700 bg-violet-50" : "text-gray-700",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── User menu (bottom of sidebar) ─────────────────── */
function UserMenu() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation() as any;
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-violet-50 transition-colors"
      >
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
        >
          {user?.avatar ?? "JD"}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{user?.name ?? "John Doe"}</p>
          <p className="text-[11px] text-gray-400 truncate">{user?.role ?? "Super Admin"}</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700">{user?.orgName}</p>
              <p className="text-[11px] text-gray-400">{user?.email}</p>
            </div>
            {user?.isPlatformAdmin && (
              <Link href="/platform-admin">
                <div onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 cursor-pointer font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  Platform Admin
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </div>
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Layout ─────────────────────────────────────────── */
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = usePageTitle(location);
  const { user, canAccess } = useAuth();

  const visibleNav = NAV.filter(item => {
    const mod = (item as any).module;
    if (!mod) return true;
    return canAccess(mod);
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white transition-transform duration-300",
          "w-60 border-r border-gray-100",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "md:relative md:flex",
        )}
        style={{ boxShadow: "4px 0 24px 0 rgba(109,40,217,0.06)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-gray-100 flex-shrink-0">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-white text-lg flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
          >
            M
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm leading-tight truncate">Mystics Audit</p>
            <p className="text-[10px] text-violet-500 font-semibold tracking-wide">ENTERPRISE</p>
          </div>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-4 py-2 border-b border-gray-50 bg-violet-50/50">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-violet-500" />
              <span className="text-[11px] font-semibold text-violet-600">{user.role}</span>
              <span className="text-[10px] text-gray-400 ml-auto">{user.orgName.split(" ")[0]}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-1 sidebar-scroll">
          {visibleNav.map((item) => (
            <NavItem key={item.name} item={item} currentPath={location} />
          ))}
        </nav>

        {/* Bottom user card */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100">
          <UserMenu />
          <SidebarFYLabel />
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="h-16 flex items-center gap-3 px-4 sm:px-6 bg-white border-b border-gray-100 flex-shrink-0"
          style={{ boxShadow: "0 2px 12px 0 rgba(109,40,217,0.05)" }}>
          <button
            className="md:hidden p-2 rounded-xl hover:bg-violet-50 text-gray-500"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-800 hidden sm:block">{pageTitle}</h1>
          </div>

          <div className="flex-1 max-w-sm hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mx-4 hover:border-violet-300 transition-colors group">
            <Search className="h-4 w-4 text-gray-400 group-hover:text-violet-500 transition-colors flex-shrink-0" />
            <span className="text-sm text-gray-400 select-none">Search anything here...</span>
          </div>

          <div className="flex-1" />

          {/* FY dropdown */}
          <FYSelector />

          {/* Notifications */}
          <button className="relative p-2 rounded-xl hover:bg-violet-50 transition-colors">
            <Bell className="h-5 w-5 text-gray-500" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Help */}
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 text-gray-500 hover:text-violet-600 text-sm font-medium transition-colors">
            <HelpCircle className="h-4 w-4" />
            Help
          </button>

          {/* Avatar */}
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
          >
            {user?.avatar ?? "JD"}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
