import { useListCustomers } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { Plus, Search, Users, Building2, User, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomersList() {
  const [search, setSearch] = useState("");
  const [type, setType]     = useState("");
  const { data, isLoading } = useListCustomers(search ? { search } : type ? { type } : {});
  const all: any[] = data ?? [];

  const business   = all.filter(c => c.type === "Business");
  const individual = all.filter(c => c.type === "Individual");
  const totalBal   = all.reduce((s, c) => s + (Number(c.currentBalance) ?? 0), 0);

  const filtered = type ? all.filter(c => c.type === type) : all;
  const display  = search
    ? filtered.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.gstin?.toLowerCase().includes(search.toLowerCase())
      )
    : filtered;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{all.length} customers · Accounts Receivable</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers/ar-aging">
            <Button variant="outline" size="sm" className="rounded-xl h-8 gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />AR Aging
            </Button>
          </Link>
          <Link href="/customers/new">
            <Button size="sm" className="rounded-xl h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" />New Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Customers",  value: String(all.length),       sub: "all types",             icon: Users,     bg: "bg-violet-600" },
          { label: "Business",         value: String(business.length),  sub: "corporate clients",     icon: Building2, bg: "bg-blue-600"   },
          { label: "Individual",       value: String(individual.length), sub: "personal accounts",    icon: User,      bg: "bg-emerald-600"},
          { label: "Total Outstanding",value: formatCurrency(totalBal), sub: "receivable balance",    icon: Wallet,    bg: "bg-amber-600"  },
        ].map(({ label, value, sub, icon: Icon, bg }) => (
          <div key={label} className={cn("rounded-2xl px-5 py-5 text-white", bg)}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium opacity-80">{label}</p>
              <Icon className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold font-mono mt-2">{value}</p>
            <p className="text-xs opacity-70 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 h-8 rounded-xl text-sm"
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {(["", "Business", "Individual"] as const).map(t => (
          <Button
            key={t}
            size="sm"
            variant={type === t ? "default" : "outline"}
            className="h-8 rounded-xl text-sm"
            onClick={() => setType(t)}
          >
            {t || "All"}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_160px_120px_120px_130px_120px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          {["Name", "Type", "GSTIN", "Phone", "Credit Limit", "Balance", "Terms"].map(h => (
            <div key={h} className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 px-4 flex items-center gap-4 border-b border-gray-50 animate-pulse">
                <div className="h-3 flex-1 bg-gray-100 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : display.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No customers found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? "Try a different search term" : "Add your first customer to get started"}
            </p>
          </div>
        ) : (
          display.map((c: any) => (
            <div key={c.id} className="grid grid-cols-[1fr_100px_160px_120px_120px_130px_120px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-violet-50/30 transition-colors group">
              <div className="self-center pr-4">
                <Link href={`/customers/${c.id}`}>
                  <span className="font-medium text-violet-700 hover:text-violet-900 hover:underline cursor-pointer text-sm">{c.name}</span>
                </Link>
                {c.email && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.email}</p>}
              </div>
              <div className="self-center">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full border",
                  c.type === "Business"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>{c.type}</span>
              </div>
              <div className="self-center text-xs font-mono text-gray-500">{c.gstin || "—"}</div>
              <div className="self-center text-sm text-gray-600">{c.phone || "—"}</div>
              <div className="self-center text-sm font-mono text-gray-700">{formatCurrency(c.creditLimit)}</div>
              <div className="self-center">
                <span className={cn("text-sm font-mono font-semibold", Number(c.currentBalance) > 0 ? "text-amber-600" : "text-gray-500")}>
                  {formatCurrency(c.currentBalance)}
                </span>
              </div>
              <div className="self-center text-sm text-gray-500">{c.paymentTerms}</div>
            </div>
          ))
        )}

        {display.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
            <span className="text-xs text-gray-400">{display.length} of {all.length} customers</span>
          </div>
        )}
      </div>
    </div>
  );
}
