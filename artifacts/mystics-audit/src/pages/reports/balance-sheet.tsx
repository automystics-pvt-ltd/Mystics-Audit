import { useGetBalanceSheet } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { formatCurrency } from "@/lib/format";
import { printReportPage } from "@/lib/print-utils";
import {
  Printer, RefreshCw, CheckCircle2, AlertCircle, Scale,
  TrendingUp, Building2, Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

function BSSection({
  title, items, total, color, bg,
}: {
  title: string;
  items: { name: string; amount: number }[];
  total: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={cn("px-4 py-3 flex items-center justify-between", bg)}>
        <p className={cn("text-sm font-semibold", color)}>{title}</p>
        <span className={cn("text-sm font-bold font-mono", color)}>{formatCurrency(total)}</span>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No {title.toLowerCase()} entries</div>
      ) : (
        <>
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-4 border-t border-gray-50 hover:bg-gray-50/50">
              <span className="text-sm text-gray-600">{item.name}</span>
              <span className="text-sm font-mono text-gray-700">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2.5 px-4 border-t border-gray-200 bg-gray-50">
            <span className="text-sm font-semibold text-gray-800">Total {title}</span>
            <span className={cn("text-sm font-bold font-mono", color)}>{formatCurrency(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function BalanceSheet() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { data, refetch, isFetching } = useGetBalanceSheet({ date });
  const d = data as any;

  const totalAssets      = d?.totalAssets      ?? 0;
  const totalLiabilities = d?.totalLiabilities ?? 0;
  const totalEquity      = d?.totalEquity      ?? 0;
  const isBalanced       = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  const assets: { name: string; amount: number }[] = d
    ? [
        { name: "Fixed Assets",               amount: d.fixedAssets      ?? 0 },
        { name: "Current Assets",             amount: d.currentAssets    ?? 0 },
        { name: "Bank & Cash",                amount: d.bankCash         ?? 0 },
        { name: "Trade Receivables (AR)",     amount: d.tradeReceivables ?? 0 },
        { name: "Inventory & Digital Assets", amount: d.inventory        ?? 0 },
      ].filter(r => r.amount !== 0)
    : [];

  const liabilities: { name: string; amount: number }[] = d
    ? [
        { name: "Long-Term Liabilities", amount: d.longTermLiabilities ?? 0 },
        { name: "Current Liabilities",   amount: d.currentLiabilities  ?? 0 },
        { name: "Trade Payables (AP)",   amount: d.tradePayables       ?? 0 },
        { name: "GST Payable",           amount: d.gstPayable          ?? 0 },
      ].filter(r => r.amount !== 0)
    : [];

  const equity: { name: string; amount: number }[] = d
    ? [{ name: "Owner's Equity / Retained Earnings", amount: d.equity ?? totalEquity }].filter(r => r.amount !== 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Statement of financial position as of {date}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-gray-500">As of</Label>
            <DateInput className="h-8 rounded-xl text-sm w-36" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full",
            isBalanced ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
          )}>
            {isBalanced
              ? <><CheckCircle2 className="w-3.5 h-3.5" />Balanced</>
              : <><AlertCircle className="w-3.5 h-3.5" />Unbalanced</>}
          </span>
          <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />Refresh
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={() => printReportPage("Balance Sheet")}>
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Assets",      value: totalAssets,      icon: Landmark,    bg: "bg-violet-600", sub: "All asset classes" },
          { label: "Total Liabilities", value: totalLiabilities, icon: AlertCircle, bg: "bg-red-600",    sub: "Obligations due" },
          { label: "Total Equity",      value: totalEquity,      icon: TrendingUp,  bg: "bg-emerald-600", sub: "Net worth" },
        ].map(({ label, value, icon: Icon, bg, sub }) => (
          <div key={label} className={cn("rounded-2xl px-5 py-5 text-white", bg)}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium opacity-80">{label}</p>
              <Icon className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold font-mono mt-2">{formatCurrency(value)}</p>
            <p className="text-xs opacity-70 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Main sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BSSection
          title="Assets" items={assets} total={totalAssets}
          color="text-violet-800" bg="bg-violet-50"
        />
        <div className="space-y-4">
          <BSSection
            title="Liabilities" items={liabilities} total={totalLiabilities}
            color="text-red-800" bg="bg-red-50"
          />
          <BSSection
            title="Equity" items={equity} total={totalEquity}
            color="text-emerald-800" bg="bg-emerald-50"
          />
          {/* L + E = A confirmation */}
          <div className={cn(
            "rounded-2xl border px-4 py-3 flex items-center justify-between",
            isBalanced ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200",
          )}>
            <div className="flex items-center gap-2">
              <Scale className={cn("w-4 h-4", isBalanced ? "text-emerald-600" : "text-red-600")} />
              <span className="text-sm font-semibold text-gray-700">Total Liabilities + Equity</span>
            </div>
            <span className={cn("font-bold font-mono text-sm", isBalanced ? "text-emerald-700" : "text-red-700")}>
              {formatCurrency(totalLiabilities + totalEquity)}
            </span>
          </div>
        </div>
      </div>

      {!isBalanced && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span><strong>Balance Sheet is unbalanced.</strong> Total Assets ({formatCurrency(totalAssets)}) ≠ Liabilities + Equity ({formatCurrency(totalLiabilities + totalEquity)}). Check for unposted journals or missing entries.</span>
        </div>
      )}
    </div>
  );
}
