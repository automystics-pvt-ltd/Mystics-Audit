import { useListGrns } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Plus, Package, CheckCircle2, Clock, Truck, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export default function GrnList() {
  const { data, isLoading } = useListGrns({});
  const all: any[] = data ?? [];

  const received  = all.filter(g => g.status === "received");
  const pending   = all.filter(g => g.status === "pending");
  const partial   = all.filter(g => g.status === "partial");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Receipt Notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{all.length} GRNs</p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchases/orders">
            <Button variant="outline" size="sm" className="rounded-xl h-8 gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />Purchase Orders
            </Button>
          </Link>
          <Link href="/purchases/grn/new">
            <Button size="sm" className="rounded-xl h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" />New GRN
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total GRNs", value: String(all.length),      sub: "all receipts",       icon: Package,      bg: "bg-violet-600" },
          { label: "Received",   value: String(received.length), sub: "fully received",     icon: CheckCircle2, bg: "bg-emerald-600" },
          { label: "Partial",    value: String(partial.length),  sub: "partially received", icon: Truck,        bg: "bg-amber-600" },
          { label: "Pending",    value: String(pending.length),  sub: "awaiting receipt",   icon: Clock,        bg: "bg-blue-600" },
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[160px_160px_1fr_110px_100px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          {["GRN No", "PO No", "Vendor", "Date", "Status"].map(h => (
            <div key={h} className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div>{[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 px-4 flex items-center animate-pulse border-b border-gray-50">
              <div className="h-3 w-full bg-gray-100 rounded" />
            </div>
          ))}</div>
        ) : all.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No goods receipts found</p>
            <p className="text-sm text-gray-400 mt-1">GRNs are created when items are received against a purchase order</p>
          </div>
        ) : (
          all.map((g: any) => {
            return (
              <div key={g.id} className="grid grid-cols-[160px_160px_1fr_110px_100px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                <div className="self-center">
                  <Link href={`/purchases/grn/${g.id}`}>
                    <span className="font-mono text-sm text-violet-700 hover:text-violet-900 hover:underline cursor-pointer">{g.grnNo}</span>
                  </Link>
                </div>
                <div className="self-center">
                  <Link href={`/purchases/orders/${g.poId}`}>
                    <span className="font-mono text-sm text-blue-600 hover:text-blue-900 hover:underline cursor-pointer">{g.poNo}</span>
                  </Link>
                </div>
                <div className="self-center text-sm font-medium text-gray-700 pr-4 truncate">{g.vendorName}</div>
                <div className="self-center text-sm text-gray-500">{formatDate(g.date)}</div>
                <div className="self-center">
                  <StatusBadge status={g.status} />
                </div>
              </div>
            );
          })
        )}

        {all.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
            <span className="text-xs text-gray-400">{all.length} goods receipt notes</span>
          </div>
        )}
      </div>
    </div>
  );
}
