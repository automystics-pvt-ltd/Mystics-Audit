import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  FileSpreadsheet, 
  Users, 
  ReceiptIndianRupee,
  Building2,
  ShoppingCart,
  Banknote,
  Landmark,
  PiggyBank,
  PackageSearch,
  Calculator,
  PieChart,
  Settings,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Menu,
  LayoutTemplate
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { 
    name: "Accounting", icon: BookOpen, 
    children: [
      { name: "Chart of Accounts", path: "/accounts" },
      { name: "Journal Entries", path: "/journals" },
      { name: "Trial Balance", path: "/accounts/trial-balance" },
    ]
  },
  {
    name: "Sales", icon: FileText,
    children: [
      { name: "Invoices", path: "/invoices" },
      { name: "Customers", path: "/customers" },
      { name: "Receipts", path: "/receipts" },
      { name: "AR Aging", path: "/customers/ar-aging" },
    ]
  },
  {
    name: "Purchases", icon: ShoppingCart,
    children: [
      { name: "Vendors", path: "/vendors" },
      { name: "Bills", path: "/bills" },
      { name: "Purchase Orders", path: "/purchases/orders" },
      { name: "Goods Receipts", path: "/purchases/grn" },
      { name: "AP Aging", path: "/vendors/ap-aging" },
    ]
  },
  { name: "Banking", path: "/bank", icon: Landmark },
  { name: "Expenses", path: "/expenses", icon: ReceiptIndianRupee },
  { name: "Inventory", path: "/inventory", icon: PackageSearch },
  {
    name: "GST", icon: Calculator,
    children: [
      { name: "ITC Ledger", path: "/gst/itc-ledger" },
      { name: "GSTR-1", path: "/gst/gstr1" },
      { name: "GSTR-3B", path: "/gst/gstr3b" },
      { name: "Reconciliation", path: "/gst/reconciliation" },
    ]
  },
  { name: "Budgets", path: "/budgets", icon: PiggyBank },
  {
    name: "Reports", icon: PieChart,
    children: [
      { name: "Profit & Loss", path: "/reports/profit-loss" },
      { name: "Balance Sheet", path: "/reports/balance-sheet" },
      { name: "Cash Flow", path: "/reports/cash-flow" },
      { name: "Day Book", path: "/reports/day-book" },
    ]
  },
  {
    name: "Settings", icon: Settings,
    children: [
      { name: "Users", path: "/users" },
      { name: "Audit Logs", path: "/audit-logs" },
      { name: "Template Builder", path: "/template-builder" },
    ]
  }
];

function NavItem({ item, isActive, currentPath }: { item: any, isActive: boolean, currentPath: string }) {
  const [isOpen, setIsOpen] = useState(isActive || (item.children && item.children.some((c: any) => currentPath.startsWith(c.path))));

  if (item.children) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {isOpen && (
          <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-1">
            {item.children.map((child: any) => {
              const isChildActive = currentPath === child.path;
              return (
                <Link key={child.path} href={child.path}>
                  <div
                    className={cn(
                      "block px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
                      isChildActive 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
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

  return (
    <Link href={item.path}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors mb-1 cursor-pointer",
          isActive 
            ? "bg-sidebar-primary text-sidebar-primary-foreground" 
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.name}</span>
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform transform",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "md:relative md:flex md:flex-col"
      )}>
        <div className="flex items-center h-16 px-6 border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2 text-sidebar-foreground font-bold text-lg tracking-tight">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              M
            </div>
            Mystics Audit
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {navItems.map((item) => (
            <NavItem 
              key={item.name} 
              item={item} 
              isActive={location === item.path || (item.path !== '/' && location.startsWith(item.path + '/'))} 
              currentPath={location}
            />
          ))}
        </div>
        <div className="p-4 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground font-medium">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">John Doe</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
              {/* Dynamic title could go here based on route */}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-muted-foreground">
              FY 2024-25
            </div>
            <Button size="sm" variant="outline" className="hidden sm:flex">
              Need Help?
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
