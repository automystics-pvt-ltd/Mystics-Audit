import { useListVendors } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { Plus, Search, Store, ShieldCheck, Receipt, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VendorsList() {
  const [search,  setSearch]  = useState("");
  const [isMsme,  setIsMsme]  = useState(false);
  const { data, isLoading } = useListVendors(isMsme ? { isMsme: true } : search ? { search } : {});
  const all: any[] = data ?? [];

  const msme       = all.filter(v => v.isMsme);
  const tdsVendors = all.filter(v => v.tdsSection && v.tdsSection !== "No TDS");
  const totalBal   = all.reduce((s, v) => s + (Number(v.currentBalance) ?? 0), 0);

  const display = search
    ? all.filter(v =>
        v.name?.toLowerCase().includes(search.toLowerCase()) ||
        v.email?.toLowerCase().includes(search.toLowerCase()) ||
        v.gstin?.toLowerCase().includes(search.toLowerCase())
      )
    : all;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">{all.length} vendors · Accounts Payable</p>
        </div>
        <div className="flex gap-2">
          <Link href="/vendors/ap-aging">
            <Button variant="outline" size="sm" className="rounded-xl h-8 gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />AP Aging
            </Button>
          </Link>
          <Link href="/vendors/new">
            <Button size="sm" className="rounded-xl h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" />New Vendor
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Vendors",   value: all.length,           sub: "all vendors",         icon: Store,      color: "bg-violet-50 border-violet-100", iconBg: "bg-violet-100", iconColor: "text-violet-600"  },
          { label: "MSME Registered", value: msme.length,          sub: "government registered",icon: ShieldCheck,color: "bg-amber-50 border-amber-100",  iconBg: "bg-amber-100",  iconColor: "text-amber-600"   },
          { label: "TDS Applicable",  value: tdsVendors.length,    sub: "need TDS deduction",  icon: Receipt,    color: "bg-blue-50 border-blue-100",     iconBg: "bg-blue-100",   iconColor: "text-blue-600"    },
          { label: "Total Outstanding",value: formatCurrency(totalBal), sub: "payable balance", icon: Wallet,     color: "bg-red-50 border-red-100",       iconBg: "bg-red-100",    iconColor: "text-red-600"     },
        ].map(({ label, value, sub, icon: Icon, color, iconBg, iconColor }) => (
          <div key={label} className={cn("rounded-2xl border px-5 py-4 flex items-start gap-3", color)}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
              <Icon className={cn("w-4 h-4", iconColor)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 h-8 rounded-xl text-sm"
            placeholder="Search vendors…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant={isMsme ? "default" : "outline"}
          className="h-8 rounded-xl text-sm gap-1.5"
          onClick={() => setIsMsme(!isMsme)}
        >
          <ShieldCheck className="w-3.5 h-3.5" />MSME Only
        </Button>
        {(search || isMsme) && (
          <Button size="sm" variant="ghost" className="h-8 text-xs rounded-xl"
            onClick={() => { setSearch(""); setIsMsme(false); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_160px_80px_120px_130px_130px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          {["Name", "GSTIN", "MSME", "TDS Section", "Payment Terms", "Balance"].map(h => (
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
            <Store className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No vendors found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || isMsme ? "Try adjusting filters" : "Add your first vendor to get started"}
            </p>
          </div>
        ) : (
          display.map((v: any) => (
            <div key={v.id} className="grid grid-cols-[1fr_160px_80px_120px_130px_130px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
              <div className="self-center pr-4">
                <Link href={`/vendors/${v.id}`}>
                  <span className="font-medium text-violet-700 hover:text-violet-900 hover:underline cursor-pointer text-sm">{v.name}</span>
                </Link>
                {v.email && <p className="text-xs text-gray-400 mt-0.5 truncate">{v.email}</p>}
              </div>
              <div className="self-center text-xs font-mono text-gray-500">{v.gstin || "—"}</div>
              <div className="self-center">
                {v.isMsme ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    <ShieldCheck className="w-3 h-3" />MSME
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </div>
              <div className="self-center text-sm text-gray-600">{v.tdsSection || "—"}</div>
              <div className="self-center text-sm text-gray-500">{v.paymentTerms}</div>
              <div className="self-center">
                <span className={cn("text-sm font-mono font-semibold", Number(v.currentBalance) > 0 ? "text-red-600" : "text-gray-500")}>
                  {formatCurrency(v.currentBalance)}
                </span>
              </div>
            </div>
          ))
        )}

        {display.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
            <span className="text-xs text-gray-400">{display.length} of {all.length} vendors</span>
          </div>
        )}
      </div>
    </div>
  );
}
