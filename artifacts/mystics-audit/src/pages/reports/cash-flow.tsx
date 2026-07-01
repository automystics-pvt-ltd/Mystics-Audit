import { useGetCashFlow } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { useFY } from "@/contexts/fy-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { formatCurrency } from "@/lib/format";
import { printReportPage } from "@/lib/print-utils";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_CFG = {
  operating: { label: "Operating Activities",   color: "bg-violet-50 border-violet-100",   text: "text-violet-800" },
  investing: { label: "Investing Activities",   color: "bg-blue-50 border-blue-100",       text: "text-blue-800" },
  financing: { label: "Financing Activities",   color: "bg-amber-50 border-amber-100",     text: "text-amber-800" },
};

function CashSection({ type, items, total }: {
  type: keyof typeof SECTION_CFG;
  items: { name: string; amount: number }[];
  total: number;
}) {
  const cfg = SECTION_CFG[type];
  const amtColor = total > 0 ? "text-emerald-600" : total < 0 ? "text-red-600" : "text-gray-500";
  const Icon = total > 0 ? TrendingUp : total < 0 ? TrendingDown : Minus;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={cn("px-4 py-3 flex items-center justify-between", cfg.color)}>
        <p className={cn("text-sm font-semibold", cfg.text)}>{cfg.label}</p>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5", amtColor)} />
          <span className={cn("text-sm font-bold font-mono", amtColor)}>{formatCurrency(total)}</span>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No {cfg.label.toLowerCase()} data</div>
      ) : (
        <>
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-4 border-t border-gray-50 hover:bg-gray-50/50">
              <span className="text-sm text-gray-600">{item.name}</span>
              <span className={cn("text-sm font-mono", item.amount < 0 ? "text-red-600" : "text-gray-700")}>
                {item.amount < 0 ? `(${formatCurrency(Math.abs(item.amount))})` : formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2.5 px-4 border-t border-gray-200 bg-gray-50">
            <span className="text-sm font-semibold text-gray-800">Net {cfg.label}</span>
            <span className={cn("text-sm font-bold font-mono", amtColor)}>{formatCurrency(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function CashFlow() {
  const { fy } = useFY();
  const [from, setFrom] = useState(fy.from);
  const [to, setTo]     = useState(fy.to);
  useEffect(() => { setFrom(fy.from); setTo(fy.to); }, [fy.value]);

  const { data, isLoading, refetch, isFetching } = useGetCashFlow({ from, to });
  const d = data as any;

  const totalOperating = d?.operatingCashFlow ?? d?.totalOperating ?? 0;
  const totalInvesting = d?.investingCashFlow ?? d?.totalInvesting ?? 0;
  const totalFinancing = d?.financingCashFlow ?? d?.totalFinancing ?? 0;
  const netCashFlow    = d?.netCashChange ?? (totalOperating + totalInvesting + totalFinancing);

  const operating: { name: string; amount: number }[] = d ? [
    ...(d.netProfit                 ? [{ name: "Net Profit / (Loss)",                          amount: d.netProfit }]             : []),
    ...(d.adjustments               ? [{ name: "Add: Non-cash Adjustments (Depreciation etc.)", amount: d.adjustments }]          : []),
    ...(d.workingCapitalChange != null ? [{ name: "Working Capital Changes",                    amount: d.workingCapitalChange }] : []),
  ] : [];

  const investing: { name: string; amount: number }[] = d ? [
    ...(d.capitalExpenditure ? [{ name: "Capital Expenditure",       amount: d.capitalExpenditure }] : []),
    ...(d.assetSales         ? [{ name: "Proceeds from Asset Sales", amount: d.assetSales }]         : []),
  ] : [];

  const financing: { name: string; amount: number }[] = d ? [
    ...(d.loanDrawdown  ? [{ name: "Loan Proceeds",   amount: d.loanDrawdown }]  : []),
    ...(d.loanRepayment ? [{ name: "Loan Repayments", amount: d.loanRepayment }] : []),
  ] : [];

  const kpis = [
    { label: "Operating", value: totalOperating, bg: "bg-violet-600", sub: "Cash from operations" },
    { label: "Investing",  value: totalInvesting,  bg: "bg-blue-600",   sub: "Investment activities" },
    { label: "Financing",  value: totalFinancing,  bg: "bg-amber-600",  sub: "Debt & equity" },
    { label: "Net Cash",   value: netCashFlow,     bg: netCashFlow >= 0 ? "bg-emerald-600" : "bg-red-600", sub: "Net change in cash" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Flow Statement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sources and uses of cash for the period</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-gray-500">From</Label>
            <DateInput className="h-8 rounded-xl text-sm w-32" value={from} onChange={e => setFrom(e.target.value)} />
            <Label className="text-xs font-semibold text-gray-500">To</Label>
            <DateInput className="h-8 rounded-xl text-sm w-32" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />Refresh
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={() => printReportPage("Cash Flow Statement")}>
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, bg, sub }) => (
          <div key={label} className={cn("rounded-2xl px-5 py-5 text-white", bg)}>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="text-2xl font-bold font-mono mt-2">
              {value < 0 ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value)}
            </p>
            <p className="text-xs opacity-70 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      <CashSection type="operating" items={operating} total={totalOperating} />
      <CashSection type="investing" items={investing} total={totalInvesting} />
      <CashSection type="financing" items={financing} total={totalFinancing} />

      {/* Net summary */}
      <div className={cn(
        "rounded-2xl border px-6 py-5 flex items-center justify-between",
        netCashFlow >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200",
      )}>
        <div>
          <p className="text-sm font-medium text-gray-500">Net Change in Cash</p>
          <p className="text-xs text-gray-400 mt-0.5">{from} to {to}</p>
        </div>
        <p className={cn("text-2xl font-bold font-mono", netCashFlow >= 0 ? "text-emerald-700" : "text-red-600")}>
          {netCashFlow < 0 ? `(${formatCurrency(Math.abs(netCashFlow))})` : formatCurrency(netCashFlow)}
        </p>
      </div>
    </div>
  );
}
