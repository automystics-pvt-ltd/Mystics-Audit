import { useListPurchaseOrders } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, ShoppingCart, Clock, CheckCircle2, Archive, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  approved:  { color: "bg-blue-100 text-blue-700 border-blue-200",      label: "Approved" },
  draft:     { color: "bg-gray-100 text-gray-600 border-gray-200",      label: "Draft" },
  closed:    { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Closed" },
  cancelled: { color: "bg-red-100 text-red-700 border-red-200",         label: "Cancelled" },
};

export default function PoList() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useListPurchaseOrders(status ? { status } : {});
  const all: any[] = data ?? [];

  const approved   = all.filter(o => o.status === "approved");
  const draft      = all.filter(o => o.status === "draft");
  const totalValue = all.reduce((s, o) => s + (Number(o.totalAmount) ?? 0), 0);
  const pending    = approved.reduce((s, o) => s + (Number(o.totalAmount) ?? 0) - (Number(o.receivedAmount) ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{all.length} orders</p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchases/grn">
            <Button variant="outline" size="sm" className="rounded-xl h-8 gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />Goods Receipts
            </Button>
          </Link>
          <Link href="/purchases/orders/new">
            <Button size="sm" className="rounded-xl h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" />New PO
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: String(all.length),      sub: "all statuses",        icon: ShoppingCart, bg: "bg-violet-600" },
          { label: "Approved",     value: String(approved.length), sub: "pending fulfillment", icon: CheckCircle2, bg: "bg-blue-600"   },
          { label: "Draft",        value: String(draft.length),    sub: "pending approval",    icon: Clock,        bg: "bg-amber-600"  },
          { label: "Total Value",  value: formatCurrency(totalValue), sub: "all orders",       icon: Archive,      bg: "bg-emerald-600"},
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

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(["", "draft", "approved", "closed", "cancelled"] as const).map(s => (
          <Button key={s} size="sm"
            variant={status === s ? "default" : "outline"}
            className="h-8 rounded-xl text-sm"
            onClick={() => setStatus(s)}>
            {s === "" ? `All ${all.length}` : `${s.charAt(0).toUpperCase() + s.slice(1)} ${all.filter(o => o.status === s).length}`}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[160px_1fr_100px_110px_130px_110px_100px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          {["PO No", "Vendor", "Date", "Delivery", "Total", "Received", "Status"].map(h => (
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
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No purchase orders found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first purchase order to get started</p>
          </div>
        ) : (
          all.map((o: any) => {
            const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.draft;
            const received = Number(o.receivedAmount ?? 0);
            const total    = Number(o.totalAmount ?? 0);
            const pct      = total > 0 ? Math.round((received / total) * 100) : 0;
            return (
              <div key={o.id} className="grid grid-cols-[160px_1fr_100px_110px_130px_110px_100px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                <div className="self-center">
                  <Link href={`/purchases/orders/${o.id}`}>
                    <span className="font-mono text-sm text-violet-700 hover:text-violet-900 hover:underline cursor-pointer">{o.poNo}</span>
                  </Link>
                </div>
                <div className="self-center text-sm font-medium text-gray-700 pr-4 truncate">{o.vendorName}</div>
                <div className="self-center text-sm text-gray-500">{formatDate(o.date)}</div>
                <div className="self-center text-sm text-gray-500">{o.deliveryDate ? formatDate(o.deliveryDate) : "—"}</div>
                <div className="self-center text-sm font-mono text-gray-700">{formatCurrency(o.totalAmount)}</div>
                <div className="self-center">
                  <div className="text-sm font-mono text-gray-500">{formatCurrency(o.receivedAmount)}</div>
                  {pct > 0 && <div className="text-[10px] text-gray-400">{pct}% received</div>}
                </div>
                <div className="self-center">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", cfg.color)}>{cfg.label}</span>
                </div>
              </div>
            );
          })
        )}

        {all.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-400">{all.length} orders</span>
            {pending > 0 && <span className="text-xs font-mono text-amber-600">Pending delivery: {formatCurrency(pending)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
