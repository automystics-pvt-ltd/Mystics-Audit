import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, BookOpen, FileText, ShoppingCart, Landmark,
  ReceiptIndianRupee, PackageSearch, Calculator, PiggyBank, PieChart,
  Settings, ChevronDown, ChevronRight, Menu, Bell, Search, HelpCircle, Shield,
  LogOut, ExternalLink, X, Plus, ArrowRight, Keyboard, LifeBuoy,
  BookOpen as DocIcon, MessageSquare, Activity, Clock, CheckCircle2,
  AlertCircle, User,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useFY } from "@/contexts/fy-context";
import { useAuth, MODULE_ACCESS } from "@/contexts/auth-context";
import {
  useGetRecentActivity,
  useListNotifications, useGetNotificationSummary,
  useMarkAllNotificationsRead, useMarkNotificationRead, useDismissNotification,
} from "@workspace/api-client-react";
import React from "react";
import { navigate } from "wouter/use-browser-location";

/* ─────────────────────────────────────────────────────── */
/* Nav definition                                          */
/* ─────────────────────────────────────────────────────── */
type NavChild = { name: string; path: string };
type NavLeaf  = { name: string; path: string; icon: React.FC<{ className?: string }>; module?: string; section?: string };
type NavGroup = { name: string; icon: React.FC<{ className?: string }>; module?: string; children: NavChild[]; section?: string };
type NavEntry = NavLeaf | NavGroup;

const NAV: NavEntry[] = [
  { name: "Dashboard",  path: "/dashboard",  icon: LayoutDashboard, module: "dashboard", section: "CORE" },
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
  { name: "Banking",   path: "/bank",            icon: Landmark,           module: "banking", section: "OPERATIONS" },
  { name: "Expenses",  path: "/expenses",        icon: ReceiptIndianRupee, module: "expenses"  },
  { name: "Inventory", path: "/inventory",       icon: PackageSearch,      module: "inventory" },
  { name: "Documents", path: "/documents",       icon: BookOpen,           module: "accounting" },
  { name: "GST", icon: Calculator, module: "gst", section: "COMPLIANCE", children: [
    { name: "GST Documents",  path: "/gst/documents" },
    { name: "ITC Ledger",     path: "/gst/itc-ledger" },
    { name: "GSTR-1",         path: "/gst/gstr1" },
    { name: "GSTR-3B",        path: "/gst/gstr3b" },
    { name: "Reconciliation", path: "/gst/reconciliation" },
  ]},
  { name: "Auditor", path: "/auditor",           icon: Shield,             module: "reports" },
  { name: "Financial Tracking", path: "/finance/overview", icon: PieChart, module: "reports", section: "ANALYTICS" },
  { name: "Budgets", path: "/budgets", icon: PiggyBank, module: "budgets" },
  { name: "Reports", icon: PieChart, module: "reports", children: [
    { name: "Profit & Loss",          path: "/reports/profit-loss" },
    { name: "Balance Sheet",          path: "/reports/balance-sheet" },
    { name: "Cash Flow",              path: "/reports/cash-flow" },
    { name: "Day Book",               path: "/reports/day-book" },
    { name: "GST Sales Register",     path: "/reports/gst-sales-register" },
    { name: "GST Purchase Register",  path: "/reports/gst-purchase-register" },
    { name: "Expense Report",         path: "/reports/expense-report" },
    { name: "Vendor Payments",        path: "/reports/vendor-payments" },
    { name: "Customer Collections",   path: "/reports/customer-collections" },
    { name: "Budget Variance",        path: "/reports/budget-variance" },
  ]},
  { name: "Settings", icon: Settings, module: "users", section: "ADMIN", children: [
    { name: "Company Profile",  path: "/settings" },
    { name: "Users",            path: "/users" },
    { name: "Billing",          path: "/billing" },
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
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors mx-1 mb-0.5 group",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium border-l-2 border-sidebar-primary-foreground/40"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}>
          <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors",
            active
              ? "text-sidebar-primary-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground",
          )} />
          <span className="flex-1 truncate">{item.name}</span>
          {active && <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />}
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
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors mx-1 group",
          hasActiveChild
            ? "text-sidebar-accent-foreground bg-sidebar-accent/60 font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )} style={{ width: "calc(100% - 8px)" }}>
        <GroupIcon className={cn("w-4 h-4 flex-shrink-0 transition-colors",
          hasActiveChild
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground",
        )} />
        <span className="flex-1 text-left truncate">{group.name}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 text-sidebar-foreground/30", open && "rotate-180")} />
      </button>
      <div className={cn("overflow-hidden transition-all duration-200", open ? "max-h-96" : "max-h-0")}>
        <div className="ml-5 mt-0.5 pl-3 border-l border-sidebar-border/50 space-y-0.5 mb-1">
          {group.children.map(child => {
            const childActive = currentPath === child.path || currentPath.startsWith(child.path + "/");
            return (
              <Link key={child.path} href={child.path}>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-[13px] cursor-pointer transition-colors",
                  childActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium border-l-2 border-sidebar-primary-foreground/40"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                    childActive ? "bg-sidebar-primary-foreground/70" : "bg-sidebar-foreground/20",
                  )} />
                  {child.name}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
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

const PRIORITY_CFG: Record<string, { dot: string; badge: string }> = {
  critical: { dot: "bg-red-500",    badge: "bg-red-100 text-red-700" },
  high:     { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  medium:   { dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-700" },
  low:      { dot: "bg-gray-300",   badge: "bg-gray-100 text-gray-500" },
};
const NOTIF_TYPE_ICON: Record<string, { icon: typeof AlertCircle; color: string }> = {
  overdue_task:       { icon: AlertCircle, color: "#ef4444" },
  overdue_compliance: { icon: AlertCircle, color: "#dc2626" },
  deadline_tomorrow:  { icon: Clock,       color: "#f97316" },
  deadline_3days:     { icon: Clock,       color: "#f59e0b" },
  deadline_7days:     { icon: Clock,       color: "#3b82f6" },
  query_followup:     { icon: MessageSquare, color: "#7c3aed" },
  unassigned_tasks:   { icon: User,        color: "#6b7280" },
};

function NotifBell() {
  const { fy } = useFY();
  const [open, setOpen] = useState(false);

  /* Real notifications from automation system */
  const { data: notifData, refetch: refetchNotifs } = useListNotifications({ status: "unread", limit: 20 } as any);
  const { data: summaryData } = useGetNotificationSummary();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead    = useMarkNotificationRead();
  const dismiss     = useDismissNotification();

  const notifs: any[] = (notifData as any) ?? [];
  const summary: any  = summaryData ?? {};
  const unreadCount   = Math.min(summary.total ?? 0, 99);

  /* Fallback to recent activity if no automation notifications yet */
  const { data: activity } = useGetRecentActivity({ fy: fy.value });
  const activityItems: any[] = (activity as any) ?? [];

  function handleMarkAllRead() {
    markAllRead.mutate({} as any, { onSuccess: () => refetchNotifs() });
  }

  function handleMarkRead(id: number) {
    markRead.mutate({ id } as any, { onSuccess: () => refetchNotifs() });
  }

  function handleDismiss(id: number) {
    dismiss.mutate({ id } as any, { onSuccess: () => refetchNotifs() });
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-violet-50 transition-colors">
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] font-bold px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
                <p className="text-[11px] text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  {summary.critical > 0 && <span className="ml-1.5 text-red-600 font-semibold">· {summary.critical} critical</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead}
                    className="text-[11px] text-violet-600 hover:text-violet-700 font-medium">Mark all read</button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {/* Automation notifications */}
              {notifs.slice(0, 12).map((n: any) => {
                const pc  = PRIORITY_CFG[n.priority] ?? PRIORITY_CFG.medium;
                const cfg = NOTIF_TYPE_ICON[n.type] ?? NOTIF_TYPE_ICON.overdue_task;
                const Icon = cfg.icon;
                return (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${cfg.color}18` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", pc.badge)}>
                          {n.priority.toUpperCase()}
                        </span>
                        {n.clientName && <span className="text-[10px] text-gray-400">{n.clientName}</span>}
                      </div>
                      <p className="text-xs font-medium text-gray-800 leading-snug">{n.title}</p>
                      {n.message && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{n.message}</p>}
                      <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleMarkRead(n.id)} title="Mark read"
                        className="p-1 rounded hover:bg-green-100 text-gray-400 hover:text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDismiss(n.id)} title="Dismiss"
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Divider + recent activity feed when no automation notifs */}
              {notifs.length === 0 && activityItems.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide bg-gray-50">Recent Activity</div>
                  {activityItems.slice(0, 5).map((item: any, i: number) => {
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
                </>
              )}

              {notifs.length === 0 && activityItems.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  <p className="text-sm text-gray-400">All caught up!</p>
                  <p className="text-[11px] text-gray-300 mt-0.5">No pending alerts or notifications</p>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
              <Link href="/auditor?tab=automation">
                <div onClick={() => setOpen(false)} className="text-xs text-violet-600 hover:text-violet-700 font-medium cursor-pointer flex items-center gap-1">
                  View Automation Hub <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
              <Link href="/audit-logs">
                <div onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1">
                  Audit trail <ArrowRight className="w-3 h-3" />
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
              <button onClick={() => { setOpen(false); navigate("/users"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                <User className="w-4 h-4" />
                My Profile
              </button>
              <button onClick={() => { setOpen(false); navigate("/settings"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
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
    <p className="text-[10px] text-sidebar-foreground/30 text-center mt-2 font-medium">
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
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer group"
        title="Account options"
      >
        <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground flex-shrink-0">
          {user?.avatar ?? "JD"}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-sidebar-accent-foreground truncate leading-snug">{user?.name ?? "John Doe"}</p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email ?? ""}</p>
        </div>
        <LogOut className="w-3.5 h-3.5 text-sidebar-foreground/40 group-hover:text-red-400 transition-colors flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-semibold text-gray-800">{user?.name}</p>
              <p className="text-[11px] text-gray-500">{user?.orgName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{user?.email}</p>
            </div>
            {user?.isPlatformAdmin && (
              <Link href="/platform-admin">
                <div onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 cursor-pointer font-medium transition-colors">
                  <Shield className="w-3.5 h-3.5" />
                  Platform Admin
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </div>
              </Link>
            )}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
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
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300",
        "w-60",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "md:relative md:flex",
      )}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border flex-shrink-0 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary flex-shrink-0">
            <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-accent-foreground leading-none truncate">Mystics Audit</p>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">ENTERPRISE</p>
          </div>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-4 py-2 border-b border-sidebar-border/50">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-sidebar-foreground/50" />
              <span className="text-[11px] font-semibold text-sidebar-foreground/70">{user.role}</span>
              <span className="text-[10px] text-sidebar-foreground/30 ml-auto">{user.orgName.split(" ")[0]}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 sidebar-scroll space-y-1">
          {visibleNav.map((item, index) => {
            const showSection = item.section && (index === 0 || visibleNav[index - 1].section !== item.section);
            return (
              <React.Fragment key={item.name}>
                {showSection && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-4 pt-3 pb-1">
                    {item.section}
                  </p>
                )}
                <NavItem item={item} currentPath={location} />
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom user card */}
        <div className="flex-shrink-0 px-3 py-3 border-t border-sidebar-border">
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
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 page-enter">
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
