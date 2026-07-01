import { useListReceipts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useFY } from "@/contexts/fy-context";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Banknote, CreditCard, ArrowDownCircle, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const MODE_ICON: Record<string, React.ElementType> = {
  NEFT: CreditCard, RTGS: CreditCard, Cheque: ArrowDownCircle,
  UPI: Smartphone, Cash: Banknote,
};

export default function ReceiptsList() {
  const { fy } = useFY();
  const { data, isLoading } = useListReceipts({ from: fy.from, to: fy.to } as any);
  const receipts: any[] = data ?? [];

  const totalGross = receipts.reduce((s, r) => s + (Number(r.grossAmount) ?? 0), 0);
  const totalTds   = receipts.reduce((s, r) => s + (Number(r.tdsDeducted) ?? 0), 0);
  const totalNet   = receipts.reduce((s, r) => s + (Number(r.netAmount) ?? 0), 0);

  const byMode: Record<string, number> = {};
  for (const r of receipts) {
    const mode = r.paymentMode || "Other";
    byMode[mode] = (byMode[mode] || 0) + Number(r.netAmount ?? 0);
  }
  const topMode = Object.entries(byMode).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Receipts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{receipts.length} receipts · {fy.label}</p>
        </div>
        <Link href="/receipts/new">
          <Button size="sm" className="rounded-xl h-8 gap-1.5">
            <Plus className="w-3.5 h-3.5" />Record Receipt
          </Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Gross Collected",  value: formatCurrency(totalGross), sub: `${receipts.length} receipts`,   bg: "bg-violet-600" },
          { label: "TDS Deducted",     value: formatCurrency(totalTds),   sub: "withholding tax",               bg: "bg-amber-600"  },
          { label: "Net Received",     value: formatCurrency(totalNet),   sub: "after TDS",                     bg: "bg-emerald-600" },
          { label: "Top Payment Mode", value: topMode ? topMode[0] : "—", sub: topMode ? formatCurrency(topMode[1]) : "no receipts", bg: "bg-blue-600" },
        ].map(({ label, value, sub, bg }) => (
          <div key={label} className={cn("rounded-2xl px-5 py-5 text-white", bg)}>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="text-2xl font-bold font-mono mt-2 truncate">{value}</p>
            <p className="text-xs opacity-70 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[160px_120px_1fr_130px_130px_80px_130px_90px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          {["Receipt No", "Date", "Customer", "Mode", "Gross", "TDS", "Net", "Status"].map(h => (
            <div key={h} className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div>{[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 px-4 flex items-center animate-pulse border-b border-gray-50">
              <div className="h-3 w-full bg-gray-100 rounded" />
            </div>
          ))}</div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center">
            <Banknote className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No receipts recorded</p>
            <p className="text-sm text-gray-400 mt-1">Record customer payments to see them here</p>
          </div>
        ) : (
          receipts.map((r: any) => {
            const ModeIcon = MODE_ICON[r.paymentMode] ?? CreditCard;
            return (
              <div key={r.id} className="grid grid-cols-[160px_120px_1fr_130px_130px_80px_130px_90px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                <div className="self-center">
                  <Link href={`/receipts/${r.id}`}>
                    <span className="font-mono text-sm text-violet-700 hover:text-violet-900 hover:underline cursor-pointer">{r.receiptNo}</span>
                  </Link>
                </div>
                <div className="self-center text-sm text-gray-500">{formatDate(r.date)}</div>
                <div className="self-center text-sm font-medium text-gray-700 pr-4 truncate">{r.customerName}</div>
                <div className="self-center">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                    <ModeIcon className="w-3 h-3 text-gray-400" />{r.paymentMode}
                  </span>
                </div>
                <div className="self-center text-sm font-mono text-gray-700">{formatCurrency(r.grossAmount)}</div>
                <div className="self-center text-sm font-mono text-amber-600">{r.tdsDeducted > 0 ? formatCurrency(r.tdsDeducted) : "—"}</div>
                <div className="self-center text-sm font-mono font-semibold text-emerald-700">{formatCurrency(r.netAmount)}</div>
                <div className="self-center">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {r.status}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {receipts.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between">
            <span className="text-xs text-gray-400">{receipts.length} receipts</span>
            <span className="text-xs font-mono text-gray-600 font-medium">Total net: {formatCurrency(totalNet)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
