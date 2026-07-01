import { useGetProfitLoss } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { useFY } from "@/contexts/fy-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { printReportPage } from "@/lib/print-utils";
import {
  TrendingUp, TrendingDown, Download, Printer, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: number; sub?: string;
  color: string; icon: React.ElementType;
}) {
  const isNeg = value < 0;
  return (
    <div className={cn("rounded-2xl border px-5 py-4 flex items-start gap-3", color)}>
      <div className="p-2 bg-white rounded-xl shadow-sm shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={cn("text-xl font-bold font-mono mt-0.5", isNeg ? "text-red-600" : "text-gray-900")}>
          {formatCurrency(Math.abs(value))}
          {isNeg && <span className="text-xs font-normal text-red-400 ml-1">(loss)</span>}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function LineRow({ name, amount, isTotal }: { name: string; amount: number; isTotal?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between py-2.5 px-4",
      isTotal ? "bg-gray-50 border-t border-gray-200 font-semibold" : "border-t border-gray-50 hover:bg-gray-50/50",
    )}>
      <span className={cn("text-sm", isTotal ? "text-gray-800" : "text-gray-600")}>{name}</span>
      <span className={cn(
        "text-sm font-mono",
        isTotal ? "text-gray-900 font-bold" : amount < 0 ? "text-red-600" : "text-gray-700",
      )}>
        {amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
      </span>
    </div>
  );
}

function Section({ title, color, rows, total, totalLabel }: {
  title: string; color: string; rows: { name: string; amount: number }[];
  total: number; totalLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={cn("px-4 py-3 flex items-center justify-between", color)}>
        <p className="text-sm font-semibold">{title}</p>
        <span className="text-sm font-bold font-mono">{formatCurrency(total)}</span>
      </div>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No {title.toLowerCase()} entries</div>
      ) : (
        <>
          {rows.map((r, i) => <LineRow key={i} name={r.name} amount={r.amount} />)}
          <LineRow name={totalLabel} amount={total} isTotal />
        </>
      )}
    </div>
  );
}

export default function ProfitLoss() {
  const { fy } = useFY();
  const [from, setFrom] = useState(fy.from);
  const [to, setTo]     = useState(fy.to);
  useEffect(() => { setFrom(fy.from); setTo(fy.to); }, [fy.value]);

  const { data, isLoading, refetch, isFetching } = useGetProfitLoss({ from, to });
  const d = data as any;

  const totalRevenue  = d?.totalRevenue  ?? 0;
  const netProfit     = d?.netProfit     ?? 0;
  const totalExpenses = totalRevenue - netProfit;
  const grossMargin   = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const revenue: { name: string; amount: number }[] = d ? [
    ...(d.revenueFromOperations ? [{ name: "Revenue from Operations",  amount: d.revenueFromOperations }] : []),
    ...(d.otherIncome           ? [{ name: "Other Income",             amount: d.otherIncome }]           : []),
  ] : [];

  const expenses: { name: string; amount: number }[] = d ? [
    ...(d.cogs              > 0 ? [{ name: "Cost of Services / COGS",  amount: d.cogs }]              : []),
    ...(d.operatingExpenses > 0 ? [{ name: "Operating Expenses",       amount: d.operatingExpenses }] : []),
    ...(d.depreciation      > 0 ? [{ name: "Depreciation",             amount: d.depreciation }]      : []),
    ...(d.financeCharges    > 0 ? [{ name: "Finance Charges",          amount: d.financeCharges }]    : []),
    ...(d.taxProvision      > 0 ? [{ name: "Tax Provision",            amount: d.taxProvision }]      : []),
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit &amp; Loss Statement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Income &amp; expenditure for the period</p>
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
          <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={() => printReportPage("Profit & Loss Statement")}>
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={totalRevenue} sub={`FY ${fy.value}`} color="bg-violet-50 border-violet-100" icon={TrendingUp} />
        <KpiCard label="Total Expenses" value={totalExpenses} sub="All categories" color="bg-red-50 border-red-100" icon={TrendingDown} />
        <KpiCard
          label={netProfit >= 0 ? "Net Profit" : "Net Loss"}
          value={netProfit}
          sub={`${grossMargin}% net margin`}
          color={netProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}
          icon={netProfit >= 0 ? ArrowUpRight : ArrowDownRight}
        />
        <KpiCard label="Gross Margin %" value={Number(grossMargin)} sub="Net profit / revenue" color="bg-blue-50 border-blue-100" icon={netProfit >= 0 ? TrendingUp : Minus} />
      </div>

      {/* Revenue & Expenses sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Revenue" color="bg-emerald-50 text-emerald-800" rows={revenue} total={totalRevenue} totalLabel="Total Revenue" />
        <Section title="Expenses" color="bg-red-50 text-red-800" rows={expenses} total={totalExpenses} totalLabel="Total Expenses" />
      </div>

      {/* Net result */}
      <div className={cn(
        "rounded-2xl border px-6 py-5 flex items-center justify-between",
        netProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200",
      )}>
        <div>
          <p className="text-sm font-medium text-gray-500">Net {netProfit >= 0 ? "Profit" : "Loss"} for the period</p>
          <p className="text-xs text-gray-400 mt-0.5">{from} to {to}</p>
        </div>
        <div className="flex items-center gap-2">
          {netProfit >= 0
            ? <TrendingUp className="w-5 h-5 text-emerald-600" />
            : <TrendingDown className="w-5 h-5 text-red-600" />}
          <p className={cn("text-2xl font-bold font-mono", netProfit >= 0 ? "text-emerald-700" : "text-red-600")}>
            {formatCurrency(Math.abs(netProfit))}
          </p>
        </div>
      </div>
    </div>
  );
}
