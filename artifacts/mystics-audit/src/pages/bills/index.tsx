import { useListBills } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { useFY } from "@/contexts/fy-context";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, AlertTriangle, FileText, Clock, CheckCircle2, Wallet, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  posted:  { color: "bg-blue-100 text-blue-700 border-blue-200",      label: "Posted" },
  draft:   { color: "bg-gray-100 text-gray-600 border-gray-200",      label: "Draft" },
  paid:    { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Paid" },
  partial: { color: "bg-amber-100 text-amber-700 border-amber-200",   label: "Partial" },
};

export default function BillsList() {
  const { fy } = useFY();
  const [status, setStatus] = useState("");
  const { data, isLoading } = useListBills({ from: fy.from, to: fy.to, ...(status ? { status } : {}) } as any);
  const all: any[] = data ?? [];
  const today = new Date().toISOString().split("T")[0];

  const totalAmount = all.reduce((s, b) => s + (Number(b.totalAmount) ?? 0), 0);
  const draftAmt    = all.filter(b => b.status === "draft").reduce((s, b) => s + Number(b.totalAmount ?? 0), 0);
  const pendingAmt  = all.filter(b => ["posted","partial"].includes(b.status)).reduce((s, b) => s + Number(b.balanceDue ?? 0), 0);
  const paidAmt     = all.filter(b => b.status === "paid").reduce((s, b) => s + Number(b.totalAmount ?? 0), 0);
  const overdueCount = all.filter(b => b.status === "posted" && b.dueDate < today && b.balanceDue > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Bills</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {all.length} bills · {fy.label}
            {overdueCount > 0 && <span className="ml-2 text-red-600 font-medium">· {overdueCount} overdue</span>}
          </p>
        </div>
        <Link href="/bills/new">
          <Button size="sm" className="rounded-xl h-8 gap-1.5">
            <Plus className="w-3.5 h-3.5" />New Bill
          </Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Billed",    value: formatCurrency(totalAmount), sub: `${all.length} bills`,          icon: FileText,     bg: "bg-violet-600" },
          { label: "Draft",           value: formatCurrency(draftAmt),    sub: `${all.filter(b=>b.status==="draft").length} bills`, icon: Clock,       bg: "bg-gray-500" },
          { label: "Pending Payment", value: formatCurrency(pendingAmt),  sub: `${overdueCount} overdue`,      icon: AlertTriangle, bg: "bg-amber-600" },
          { label: "Paid",            value: formatCurrency(paidAmt),     sub: `${all.filter(b=>b.status==="paid").length} bills`,  icon: CheckCircle2, bg: "bg-emerald-600" },
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
        {(["", "draft", "posted", "partial", "paid"] as const).map(s => (
          <Button key={s} size="sm"
            variant={status === s ? "default" : "outline"}
            className="h-8 rounded-xl text-sm"
            onClick={() => setStatus(s)}>
            {s === "" ? `All ${all.length}` : `${s.charAt(0).toUpperCase() + s.slice(1)} ${all.filter(b => b.status === s).length}`}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[160px_1fr_100px_100px_120px_100px_120px_90px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          {["Bill No", "Vendor", "Date", "Due Date", "Total", "Paid", "Balance", "Status"].map(h => (
            <div key={h} className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div>{[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 px-4 flex items-center animate-pulse border-b border-gray-50">
              <div className="h-3 w-full bg-gray-100 rounded" />
            </div>
          ))}</div>
        ) : all.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No bills found</p>
            <p className="text-sm text-gray-400 mt-1">Bills from vendors will appear here</p>
          </div>
        ) : (
          all.map((b: any) => {
            const isOverdue = b.status === "posted" && b.dueDate < today && b.balanceDue > 0;
            const cfg = STATUS_CFG[b.status] ?? STATUS_CFG.draft;
            return (
              <div key={b.id}
                className={cn(
                  "grid grid-cols-[160px_1fr_100px_100px_120px_100px_120px_90px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-violet-50/30 transition-colors",
                  isOverdue && "bg-red-50/40"
                )}>
                <div className="self-center">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/bills/${b.id}`}>
                      <span className="font-mono text-sm text-violet-700 hover:text-violet-900 hover:underline cursor-pointer">{b.billNo}</span>
                    </Link>
                    {b.isMsmeVendor && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        <ShieldCheck className="w-2.5 h-2.5" />MSME
                      </span>
                    )}
                  </div>
                </div>
                <div className="self-center text-sm font-medium text-gray-700 pr-4 truncate">{b.vendorName}</div>
                <div className="self-center text-sm text-gray-500">{formatDate(b.date)}</div>
                <div className={cn("self-center text-sm", isOverdue ? "text-red-600 font-medium" : "text-gray-500")}>
                  {formatDate(b.dueDate)}
                  {isOverdue && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />}
                </div>
                <div className="self-center text-sm font-mono text-gray-700">{formatCurrency(b.totalAmount)}</div>
                <div className="self-center text-sm font-mono text-gray-400">{formatCurrency(b.paidAmount)}</div>
                <div className="self-center">
                  <span className={cn("text-sm font-mono font-semibold", Number(b.balanceDue) > 0 ? "text-red-600" : "text-gray-400")}>
                    {formatCurrency(b.balanceDue)}
                  </span>
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
            <span className="text-xs text-gray-400">{all.length} bills total</span>
            <span className="text-xs font-mono text-gray-500">Outstanding: {formatCurrency(pendingAmt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
