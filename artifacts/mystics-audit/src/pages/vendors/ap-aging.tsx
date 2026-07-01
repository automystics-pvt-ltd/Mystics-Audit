import { useGetApAging } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { AlertTriangle, RefreshCw, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function ApAging() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetApAging();
  const d = data as any;
  const totals = d?.totals ?? {};
  const vendors: any[] = d?.vendors ?? [];

  const totalOverdue = (totals.days0to30 || 0) + (totals.days31to60 || 0) +
    (totals.days61to90 || 0) + (totals.days91to180 || 0) + (totals.days180plus || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AP Aging Report</h1>
          <p className="text-muted-foreground text-sm">
            As of {d?.asOf ? formatDate(d.asOf) : "today"} · Vendor-wise payables by age bucket
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl"
            onClick={() => qc.invalidateQueries({ queryKey: ["getApAging"] })}>
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
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-emerald-600 text-white p-5">
          <p className="text-xs font-medium text-emerald-100">Current (Not Due)</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.current || 0)}</p>
          <p className="text-xs text-emerald-100 mt-0.5">Within payment terms</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-amber-500 text-white p-5">
          <p className="text-xs font-medium text-amber-100">0–30 Days Overdue</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.days0to30 || 0)}</p>
          <p className="text-xs text-amber-100 mt-0.5">Pay soon</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-orange-500 text-white p-5">
          <p className="text-xs font-medium text-orange-100">31–60 Days Overdue</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.days31to60 || 0)}</p>
          <p className="text-xs text-orange-100 mt-0.5">Approaching breach</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-red-600 text-white p-5">
          <p className="text-xs font-medium text-red-100">61+ Days Overdue</p>
          <p className="text-2xl font-bold font-mono mt-1">
            {formatCurrency((totals.days61to90 || 0) + (totals.days91to180 || 0) + (totals.days180plus || 0))}
          </p>
          <p className="text-xs text-red-100 mt-0.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> High breach risk
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="rounded-xl bg-muted/50 border px-5 py-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{vendors.length} vendors with outstanding AP</span>
        <div className="flex gap-6">
          <span className="text-muted-foreground">Total Outstanding: <span className="font-semibold text-foreground font-mono">{formatCurrency((totals.current || 0) + totalOverdue)}</span></span>
          <span className="text-muted-foreground">Total Overdue: <span className="font-semibold text-red-600 font-mono">{formatCurrency(totalOverdue)}</span></span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_80px_120px_120px_120px_120px_120px] gap-3 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div>Vendor</div>
          <div className="text-center">MSME</div>
          <div className="text-right">Current</div>
          <div className="text-right">0-30 Days</div>
          <div className="text-right">31-60 Days</div>
          <div className="text-right text-orange-600">61+ Days</div>
          <div className="text-right">Total</div>
        </div>
        {isLoading && (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading AP aging data…</div>
        )}
        {!isLoading && vendors.length === 0 && (
          <div className="py-16 text-center text-muted-foreground text-sm">No payables data found</div>
        )}
        {vendors.map((v: any) => {
          const overdue61 = (v.days61to90 || 0) + (v.days91to180 || 0) + (v.days180plus || 0);
          return (
            <div key={v.vendorId} className={`grid grid-cols-[2fr_80px_120px_120px_120px_120px_120px] gap-3 px-5 py-3.5 border-b last:border-0 items-center ${v.msmeBreachRisk ? "bg-amber-50" : "hover:bg-gray-50"}`}>
              <div>
                <Link href={`/vendors/${v.vendorId}`} className="font-semibold text-violet-600 hover:underline">{v.vendorName}</Link>
                {v.msmeBreachRisk && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3" /> MSME 45-day breach risk
                  </p>
                )}
              </div>
              <div className="flex justify-center">
                {v.isMsme ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">MSME</span>
                ) : <span className="text-muted-foreground text-sm">—</span>}
              </div>
              <div className="text-right font-mono text-sm">{formatCurrency(v.current)}</div>
              <div className={`text-right font-mono text-sm ${v.days0to30 > 0 ? "text-amber-600" : ""}`}>{formatCurrency(v.days0to30)}</div>
              <div className={`text-right font-mono text-sm ${v.days31to60 > 0 ? "text-orange-600 font-semibold" : ""}`}>{formatCurrency(v.days31to60)}</div>
              <div className={`text-right font-mono text-sm ${overdue61 > 0 ? "text-red-600 font-semibold" : ""}`}>{formatCurrency(overdue61)}</div>
              <div className="text-right font-mono font-semibold">{formatCurrency(v.total)}</div>
            </div>
          );
        })}
        {/* Totals footer */}
        {vendors.length > 0 && (
          <div className="grid grid-cols-[2fr_80px_120px_120px_120px_120px_120px] gap-3 px-5 py-3.5 border-t bg-gray-50 font-semibold text-sm">
            <div>Total</div>
            <div />
            <div className="text-right font-mono">{formatCurrency(totals.current || 0)}</div>
            <div className="text-right font-mono text-amber-600">{formatCurrency(totals.days0to30 || 0)}</div>
            <div className="text-right font-mono text-orange-600">{formatCurrency(totals.days31to60 || 0)}</div>
            <div className="text-right font-mono text-red-600">{formatCurrency((totals.days61to90 || 0) + (totals.days91to180 || 0) + (totals.days180plus || 0))}</div>
            <div className="text-right font-mono">{formatCurrency((totals.current || 0) + totalOverdue)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
