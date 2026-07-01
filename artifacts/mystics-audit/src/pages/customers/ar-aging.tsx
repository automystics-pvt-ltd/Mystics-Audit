import { useGetArAging } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { RefreshCw, Download, Printer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function ArAging() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetArAging();
  const d = data as any;
  const totals = d?.totals ?? {};
  const customers: any[] = d?.customers ?? [];

  const totalOverdue = (totals.days0to30 || 0) + (totals.days31to60 || 0) +
    (totals.days61to90 || 0) + (totals.days91to180 || 0) + (totals.days180plus || 0);
  const totalOutstanding = (totals.current || 0) + totalOverdue;

  const collectionRate = totalOutstanding > 0
    ? Math.round(((totals.total || 0) / ((totals.total || 0) + totalOutstanding)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AR Aging Report</h1>
          <p className="text-muted-foreground text-sm">
            As of {d?.asOf ? formatDate(d.asOf) : "today"} · Customer-wise receivables by age bucket
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl"
            onClick={() => qc.invalidateQueries({ queryKey: ["getArAging"] })}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-violet-600 text-white p-5">
          <p className="text-xs font-medium text-violet-100">Current (Not Due)</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.current || 0)}</p>
          <p className="text-xs text-violet-100 mt-0.5">Within credit terms</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-amber-500 text-white p-5">
          <p className="text-xs font-medium text-amber-100">0–30 Days Overdue</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.days0to30 || 0)}</p>
          <p className="text-xs text-amber-100 mt-0.5">Follow up required</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-orange-500 text-white p-5">
          <p className="text-xs font-medium text-orange-100">31–60 Days Overdue</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.days31to60 || 0)}</p>
          <p className="text-xs text-orange-100 mt-0.5">Escalate collection</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-red-600 text-white p-5">
          <p className="text-xs font-medium text-red-100">61+ Days Overdue</p>
          <p className="text-2xl font-bold font-mono mt-1">
            {formatCurrency((totals.days61to90 || 0) + (totals.days91to180 || 0) + (totals.days180plus || 0))}
          </p>
          <p className="text-xs text-red-100 mt-0.5">High default risk</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="rounded-xl bg-muted/50 border px-5 py-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" /> {customers.length} customers with outstanding AR
        </span>
        <div className="flex gap-6">
          <span className="text-muted-foreground">Total Outstanding: <span className="font-semibold text-foreground font-mono">{formatCurrency(totalOutstanding)}</span></span>
          <span className="text-muted-foreground">Total Overdue: <span className="font-semibold text-red-600 font-mono">{formatCurrency(totalOverdue)}</span></span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_110px_110px_110px_110px_110px_120px] gap-3 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div>Customer</div>
          <div className="text-right">Current</div>
          <div className="text-right">0-30 Days</div>
          <div className="text-right">31-60 Days</div>
          <div className="text-right text-amber-600">61-90 Days</div>
          <div className="text-right text-red-600">91+ Days</div>
          <div className="text-right">Total</div>
        </div>
        {isLoading && (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading AR aging data…</div>
        )}
        {!isLoading && customers.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">No receivables data found</div>
        )}
        {customers.map((c: any) => {
          const overdue91 = (c.days91to180 || 0) + (c.days180plus || 0);
          return (
            <div key={c.customerId} className={`grid grid-cols-[2fr_110px_110px_110px_110px_110px_120px] gap-3 px-5 py-3.5 border-b last:border-0 items-center hover:bg-gray-50 ${c.days180plus > 0 ? "bg-red-50/50" : ""}`}>
              <Link href={`/customers/${c.customerId}`} className="font-semibold text-violet-600 hover:underline">{c.customerName}</Link>
              <div className="text-right font-mono text-sm">{formatCurrency(c.current)}</div>
              <div className={`text-right font-mono text-sm ${c.days0to30 > 0 ? "text-amber-600" : ""}`}>{formatCurrency(c.days0to30)}</div>
              <div className={`text-right font-mono text-sm ${c.days31to60 > 0 ? "text-orange-600 font-semibold" : ""}`}>{formatCurrency(c.days31to60)}</div>
              <div className={`text-right font-mono text-sm ${c.days61to90 > 0 ? "text-amber-600 font-semibold" : ""}`}>{formatCurrency(c.days61to90)}</div>
              <div className={`text-right font-mono text-sm ${overdue91 > 0 ? "text-red-600 font-bold" : ""}`}>{formatCurrency(overdue91)}</div>
              <div className="text-right font-mono font-semibold">{formatCurrency(c.total)}</div>
            </div>
          );
        })}
        {/* Totals footer */}
        {customers.length > 0 && (
          <div className="grid grid-cols-[2fr_110px_110px_110px_110px_110px_120px] gap-3 px-5 py-3.5 border-t bg-gray-50 font-semibold text-sm">
            <div>Total</div>
            <div className="text-right font-mono">{formatCurrency(totals.current || 0)}</div>
            <div className="text-right font-mono text-amber-600">{formatCurrency(totals.days0to30 || 0)}</div>
            <div className="text-right font-mono text-orange-600">{formatCurrency(totals.days31to60 || 0)}</div>
            <div className="text-right font-mono text-amber-600">{formatCurrency(totals.days61to90 || 0)}</div>
            <div className="text-right font-mono text-red-600">{formatCurrency((totals.days91to180 || 0) + (totals.days180plus || 0))}</div>
            <div className="text-right font-mono">{formatCurrency(totalOutstanding)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
