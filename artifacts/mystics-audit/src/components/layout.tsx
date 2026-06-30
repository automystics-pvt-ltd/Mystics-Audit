import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, BookOpen, FileText, ShoppingCart, Landmark,
  ReceiptIndianRupee, PackageSearch, Calculator, PiggyBank, PieChart,
  Settings, ChevronDown, Menu, Bell, Search, HelpCircle, Shield,
  LogOut, ExternalLink, X, Plus, ArrowRight, Keyboard, LifeBuoy,
  BookOpen as DocIcon, MessageSquare, Activity, Clock, CheckCircle2,
  AlertCircle, User,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useFY } from "@/contexts/fy-context";
import { useAuth, MODULE_ACCESS } from "@/contexts/auth-context";
import { useGetRecentActivity } from "@workspace/api-client-react";

/* ─────────────────────────────────────────────────────── */
/* Nav definition                                          */
/* ─────────────────────────────────────────────────────── */
type NavChild = { name: string; path: string };
type NavLeaf  = { name: string; path: string; icon: React.FC<{ className?: string }>; module?: string };
type NavGroup = { name: string; icon: React.FC<{ className?: string }>; module?: string; children: NavChild[] };
type NavEntry = NavLeaf | NavGroup;

const NAV: NavEntry[] = [
  { name: "Dashboard",  path: "/dashboard",  icon: LayoutDashboard, module: "dashboard" },
  { name: "Accounting", icon: BookOpen, module: "accounting", children: [
    { name: "Chart of Accounts", path: "/accounts" },
    { name: "Journal Entries",   path: "/journals" },
    { name: "Trial Balance",     path: "/accounts/trial-balance" },
  ]},
  { name: "Sales", icon: FileText, module: "sales", children: [
    { name: "Invoices",  path: "/invoices" },
    { name: "Customers", path: "/customers" },
    { name: "Receipts",  path: "/receipts" },
    { name: "AR Aging",  path: "/customers/ar-aging" },
  ]},
  { name: "Purchases", icon: ShoppingCart, module: "purchases", children: [
    { name: "Vendors",         path: "/vendors" },
    { name: "Bills",           path: "/bills" },
    { name: "Purchase Orders", path: "/purchases/orders" },
    { name: "Goods Receipts",  path: "/purchases/grn" },
    { name: "AP Aging",        path: "/vendors/ap-aging" },
  ]},
  { name: "Banking",   path: "/bank",      icon: Landmark,           module: "banking"   },
  { name: "Expenses",  path: "/expenses",  icon: ReceiptIndianRupee, module: "expenses"  },
  { name: "Inventory", path: "/inventory", icon: PackageSearch,      module: "inventory" },
  { name: "GST", icon: Calculator, module: "gst", children: [
    { name: "ITC Ledger",     path: "/gst/itc-ledger" },
    { name: "GSTR-1",         path: "/gst/gstr1" },
    { name: "GSTR-3B",        path: "/gst/gstr3b" },
    { name: "Reconciliation", path: "/gst/reconciliation" },
  ]},
  { name: "Budgets", path: "/budgets", icon: PiggyBank, module: "budgets" },
  { name: "Reports", icon: PieChart, module: "reports", children: [
    { name: "Profit & Loss",  path: "/reports/profit-loss" },
    { name: "Balance Sheet",  path: "/reports/balance-sheet" },
    { name: "Cash Flow",      path: "/reports/cash-flow" },
    { name: "Day Book",       path: "/reports/day-book" },
  ]},
  { name: "Settings", icon: Settings, module: "users", children: [
    { name: "Users",            path: "/users" },
    { name: "Audit Logs",       path: "/audit-logs" },
    { name: "Template Builder", path: "/template-builder" },
  ]},
];

/* Flat search index of all pages */
const SEARCH_PAGES = NAV.flatMap(item =>
  "path" in item
    ? [{ name: item.name, path: item.path, group: item.name }]
    : item.children.map(c => ({ name: c.name, path: c.path, group: item.name }))
);

const QUICK_ACTIONS = [
  { name: "New Invoice",        path: "/invoices/new",        icon: Plus },
  { name: "New Bill",           path: "/bills/new",           icon: Plus },
  { name: "Add Expense",        path: "/expenses/new",        icon: Plus },
  { name: "Record Payment",     path: "/receipts/new",        icon: Plus },
  { name: "New Purchase Order", path: "/purchases/orders/new",icon: Plus },
  { name: "New Journal Entry",  path: "/journals/new",        icon: Plus },
];

const SHORTCUTS = [
  { label: "Open search",     keys: ["⌘", "K"] },
  { label: "New invoice",     keys: ["⌘", "I"] },
  { label: "New bill",        keys: ["⌘", "B"] },
  { label: "Add expense",     keys: ["⌘", "E"] },
  { label: "Go to dashboard", keys: ["G", "D"] },
  { label: "Go to reports",   keys: ["G", "R"] },
];

function isLeaf(item: NavEntry): item is NavLeaf { return "path" in item; }

/* ─────────────────────────────────────────────────────── */
/* Page title from route                                   */
/* ─────────────────────────────────────────────────────── */
function usePageTitle(path: string) {
  for (const item of NAV) {
    if ("path" in item && item.path === path) return item.name;
    if ("children" in item)
      for (const c of item.children)
        if (path === c.path || path.startsWith(c.path + "/")) return c.name;
  }
  return "Mystics Audit";
}

/* ─────────────────────────────────────────────────────── */
/* NavItem                                                 */
/* ─────────────────────────────────────────────────────── */
function NavItem({ item, currentPath }: { item: NavEntry; currentPath: string }) {
  const leaf = isLeaf(item);
  const active = leaf
    ? currentPath === item.path || (!item.path.endsWith("/dashboard") && currentPath.startsWith(item.path + "/"))
    : false;
  const hasActiveChild = !leaf
    ? (item as NavGroup).children.some(c => currentPath === c.path || currentPath.startsWith(c.path + "/"))
    : false;
  const [open, setOpen] = useState(hasActiveChild);

  if (leaf) {
    const Icon = item.icon;
    return (
      <Link href={item.path}>
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-150 mx-1 mb-0.5",
          active ? "text-white shadow-md" : "text-gray-500 hover:bg-violet-50 hover:text-violet-700",
        )} style={active ? { background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" } : undefined}>
          <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", active ? "text-white" : "text-violet-500")} />
          <span className="flex-1 truncate">{item.name}</span>
        </div>
      </Link>
    );
  }

  const group = item as NavGroup;
  const GroupIcon = group.icon;
  return (
    <div className="mb-0.5">
      <button onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mx-1 hover:bg-violet-50 hover:text-violet-700",
          hasActiveChild ? "text-violet-700 bg-violet-50" : "text-gray-500",
        )} style={{ width: "calc(100% - 8px)" }}>
        <GroupIcon className={cn("h-[18px] w-[18px] flex-shrink-0", hasActiveChild ? "text-violet-600" : "text-violet-500")} />
        <span className="flex-1 text-left truncate">{group.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 text-gray-400", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-5 mt-0.5 pl-3 border-l-2 border-violet-100 space-y-0.5 mb-1">
          {group.children.map(child => {
            const childActive = currentPath === child.path || currentPath.startsWith(child.path + "/");
            return (
              <Link key={child.path} href={child.path}>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all duration-150",
                  childActive ? "font-semibold text-white shadow-sm" : "text-gray-500 hover:bg-violet-50 hover:text-violet-700 font-medium",
                )} style={childActive ? { background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" } : undefined}>
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", childActive ? "bg-white" : "bg-violet-300")} />
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

/* ─────────────────────────────────────────────────────── */
/* FY Selector                                             */
/* ─────────────────────────────────────────────────────── */
function FYSelector() {
  const { fy, setFY, options } = useFY();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative hidden sm:block">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-1.5 hover:bg-violet-100 transition-colors">
        <span className="text-xs font-bold text-violet-600">FY {fy.value}</span>
        <ChevronDown className="w-3 h-3 text-violet-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
            {options.map(opt => (
              <button key={opt.value} onClick={() => { setFY(opt); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-violet-50 hover:text-violet-700 transition-colors flex items-center justify-between",
                  opt.value === fy.value ? "text-violet-700 bg-violet-50" : "text-gray-700",
                )}>
                {opt.label}
                {opt.value === fy.value && <span className="text-[9px] text-violet-400 font-normal">current</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Search Command Palette                                  */
/* ─────────────────────────────────────────────────────── */
function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation() as any;

  useEffect(() => {
    if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = query.toLowerCase().trim();

  const matchedPages = q
    ? SEARCH_PAGES.filter(p => p.name.toLowerCase().includes(q) || p.group.toLowerCase().includes(q))
    : SEARCH_PAGES.slice(0, 8);

  const matchedActions = q
    ? QUICK_ACTIONS.filter(a => a.name.toLowerCase().includes(q))
    : QUICK_ACTIONS;

  const goTo = (path: string) => { navigate(path); onClose(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
          />
          <div className="flex items-center gap-1">
            <kbd className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Esc</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {/* Quick actions */}
          {matchedActions.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">Quick Actions</p>
              <div className="space-y-0.5">
                {matchedActions.map(a => (
                  <button key={a.path} onClick={() => goTo(a.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors group text-left">
                    <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    {a.name}
                    <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pages */}
          {matchedPages.length > 0 && (
            <div className="px-3 pt-2 pb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
                {q ? "Pages" : "All Pages"}
              </p>
              <div className="space-y-0.5">
                {matchedPages.slice(0, q ? 20 : 8).map(p => (
                  <button key={p.path} onClick={() => goTo(p.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors group text-left">
                    <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                      <LayoutDashboard className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="flex-1">{p.name}</span>
                    <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">{p.group}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && matchedPages.length === 0 && matchedActions.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-gray-400">No results for "{query}"</div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded border border-gray-200">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded border border-gray-200">Esc</kbd> close</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded border border-gray-200">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Notifications bell + panel                              */
/* ─────────────────────────────────────────────────────── */
const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  invoice: { icon: FileText,      color: "#7C3AED" },
  receipt: { icon: CheckCircle2,  color: "#059669" },
  expense: { icon: ReceiptIndianRupee, color: "#D97706" },
  bill:    { icon: FileText,      color: "#DC2626" },
  payment: { icon: CheckCircle2,  color: "#059669" },
  default: { icon: Activity,      color: "#6B7280" },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifBell() {
  const { fy } = useFY();
  const [open, setOpen] = useState(false);
  const { data: activity } = useGetRecentActivity({ fy: fy.value });
  const items: any[] = (activity as any) ?? [];
  const unread = Math.min(items.length, 9);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-violet-50 transition-colors">
        <Bell className="h-5 w-5 text-gray-500" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] font-bold px-0.5">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
                <p className="text-[11px] text-gray-400">Recent activity · {fy.label}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {items.slice(0, 8).map((item: any, i: number) => {
                const kind = item.entityType?.toLowerCase() ?? "default";
                const { icon: Icon, color } = NOTIF_ICONS[kind] ?? NOTIF_ICONS.default;
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${color}18` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">{item.description}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(item.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No recent activity</div>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100">
              <Link href="/audit-logs">
                <div onClick={() => setOpen(false)} className="text-xs text-violet-600 hover:text-violet-700 font-medium cursor-pointer flex items-center gap-1">
                  View all activity <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Help modal                                              */
/* ─────────────────────────────────────────────────────── */
function HelpButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 text-gray-500 hover:text-violet-600 text-sm font-medium transition-colors">
        <HelpCircle className="h-4 w-4" />
        Help
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-violet-600" />
                <p className="font-semibold text-gray-800">Help & Resources</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Quick links */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: DocIcon, label: "Documentation", desc: "Guides & tutorials" },
                  { icon: MessageSquare, label: "Support Chat", desc: "Get help instantly" },
                  { icon: Activity, label: "System Status", desc: "Platform uptime" },
                  { icon: Keyboard, label: "Shortcuts", desc: "Keyboard hotkeys" },
                ].map(({ icon: Icon, label, desc }) => (
                  <button key={label}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                      <Icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Keyboard shortcuts */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1">
                  {SHORTCUTS.map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50">
                      <span className="text-sm text-gray-600">{s.label}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, i) => (
                          <kbd key={i} className="text-[11px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Mystics Audit v2.0 · Enterprise Cloud Accounting
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Header profile dropdown                                 */
/* ─────────────────────────────────────────────────────── */
function HeaderProfile() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation() as any;

  const handleLogout = () => { setOpen(false); logout(); navigate("/login"); };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-400 hover:ring-offset-1 transition-all"
        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
        {user?.avatar ?? "JD"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3.5 border-b border-gray-100 bg-gradient-to-br from-violet-50 to-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
                  {user?.avatar ?? "JD"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Shield className="w-3 h-3 text-violet-500" />
                    <span className="text-[11px] text-violet-600 font-medium">{user?.role}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {user?.orgName}
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                <User className="w-4 h-4" />
                My Profile
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                <Settings className="w-4 h-4" />
                Account Settings
              </button>
              {user?.isPlatformAdmin && (
                <Link href="/platform-admin">
                  <div onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors">
                    <Shield className="w-4 h-4" />
                    Platform Admin
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </div>
                </Link>
              )}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Sidebar FY label                                        */
/* ─────────────────────────────────────────────────────── */
function SidebarFYLabel() {
  const { fy } = useFY();
  return (
    <p className="text-[10px] text-gray-300 text-center mt-2 font-medium">
      Mystics Audit · {fy.label}
    </p>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Sidebar user menu                                       */
/* ─────────────────────────────────────────────────────── */
function UserMenu() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation() as any;
  const [open, setOpen] = useState(false);
  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-violet-50 transition-colors">
        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
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
                  <Shield className="w-3.5 h-3.5" /> Platform Admin
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </div>
              </Link>
            )}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Layout                                                  */
/* ─────────────────────────────────────────────────────── */
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pageTitle = usePageTitle(location);
  const { user, canAccess } = useAuth();

  const visibleNav = NAV.filter(item => {
    const mod = (item as any).module;
    return !mod || canAccess(mod);
  });

  /* Cmd+K → open search */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(o => !o); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Search modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white transition-transform duration-300",
        "w-60 border-r border-gray-100",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "md:relative md:flex",
      )} style={{ boxShadow: "4px 0 24px 0 rgba(109,40,217,0.06)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-gray-100 flex-shrink-0">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-white text-lg flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
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
          {visibleNav.map(item => <NavItem key={item.name} item={item} currentPath={location} />)}
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
          <button className="md:hidden p-2 rounded-xl hover:bg-violet-50 text-gray-500"
            onClick={() => setMobileOpen(o => !o)}>
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-base font-bold text-gray-800 hidden sm:block">{pageTitle}</h1>

          {/* Search bar */}
          <button onClick={() => setSearchOpen(true)}
            className="flex-1 max-w-sm hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mx-4 hover:border-violet-300 hover:bg-violet-50/50 transition-colors group text-left">
            <Search className="h-4 w-4 text-gray-400 group-hover:text-violet-500 transition-colors flex-shrink-0" />
            <span className="text-sm text-gray-400 flex-1 select-none">Search anything here...</span>
            <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] text-gray-300 bg-white border border-gray-200 px-1.5 py-0.5 rounded-lg">
              <span>⌘</span><span>K</span>
            </kbd>
          </button>

          <div className="flex-1" />

          {/* FY dropdown */}
          <FYSelector />

          {/* Notifications */}
          <NotifBell />

          {/* Help */}
          <HelpButton />

          {/* Header avatar / profile dropdown */}
          <HeaderProfile />
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
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)} />
      )}
    </div>
  );
}
