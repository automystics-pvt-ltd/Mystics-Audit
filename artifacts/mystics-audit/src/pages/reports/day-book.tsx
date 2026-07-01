import { useGetDayBook } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { printReportPage } from "@/lib/print-utils";
import {
  Printer, RefreshCw, BookOpen, ArrowUpCircle, ArrowDownCircle, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const VOUCHER_COLORS: Record<string, string> = {
  "Sales Invoice":    "bg-violet-100 text-violet-700 border-violet-200",
  "Credit Note":      "bg-amber-100 text-amber-700 border-amber-200",
  "Purchase Invoice": "bg-blue-100 text-blue-700 border-blue-200",
  "Payment":          "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Receipt":          "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Journal":          "bg-gray-100 text-gray-700 border-gray-200",
};

export default function DayBook() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { data, refetch, isFetching } = useGetDayBook({ date });
  const d = data as any;
  const entries: any[] = Array.isArray(d?.entries) ? d.entries : [];
  const totalDebit  = d?.totalDebit  ?? 0;
  const totalCredit = d?.totalCredit ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Day Book</h1>
          <p className="text-sm text-gray-500 mt-0.5">All journal transactions for {formatDate(date)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-gray-500">Date</Label>
            <DateInput className="h-8 rounded-xl text-sm w-36" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />Refresh
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1.5" onClick={() => printReportPage("Day Book")}>
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Transactions", value: String(entries.length), icon: Activity, color: "bg-violet-50 border-violet-100", iconColor: "text-violet-600" },
          { label: "Total Debit",  value: formatCurrency(totalDebit),  icon: ArrowUpCircle,   color: "bg-blue-50 border-blue-100",     iconColor: "text-blue-600" },
          { label: "Total Credit", value: formatCurrency(totalCredit), icon: ArrowDownCircle, color: "bg-emerald-50 border-emerald-100", iconColor: "text-emerald-600" },
        ].map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className={cn("rounded-2xl border px-5 py-4 flex items-start gap-3", color)}>
            <div className="p-2 bg-white rounded-xl shadow-sm shrink-0">
              <Icon className={cn("w-4 h-4", iconColor)} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-xl font-bold font-mono mt-0.5 text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No transactions for {formatDate(date)}</p>
            <p className="text-sm text-gray-400 mt-1">Try selecting a different date</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[140px_130px_1fr_1fr_130px_130px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              {["Voucher No", "Type", "Account", "Narration", "Debit", "Credit"].map((h, i) => (
                <div key={h} className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide text-gray-400",
                  i >= 4 && "text-right",
                )}>
                  {h}
                </div>
              ))}
            </div>
            {/* Table rows */}
            {entries.map((e: any, i: number) => (
              <div key={i} className="grid grid-cols-[140px_130px_1fr_1fr_130px_130px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                <div>
                  <Link href={`/journals/${e.journalId}`}
                    className="text-sm font-mono text-violet-600 hover:text-violet-800 font-medium hover:underline">
                    {e.voucherNo}
                  </Link>
                </div>
                <div>
                  <span className={cn(
                    "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border",
                    VOUCHER_COLORS[e.voucherType] ?? "bg-gray-100 text-gray-600 border-gray-200",
                  )}>
                    {e.voucherType}
                  </span>
                </div>
                <div className="text-sm text-gray-700 truncate pr-2">{e.accountCode} — {e.accountName}</div>
                <div className="text-sm text-gray-400 truncate pr-2">{e.narration || "—"}</div>
                <div className="text-sm font-mono text-right text-blue-600 font-medium">
                  {e.debit > 0 ? formatCurrency(e.debit) : <span className="text-gray-300">—</span>}
                </div>
                <div className="text-sm font-mono text-right text-emerald-600 font-medium">
                  {e.credit > 0 ? formatCurrency(e.credit) : <span className="text-gray-300">—</span>}
                </div>
              </div>
            ))}
            {/* Total row */}
            <div className="grid grid-cols-[140px_130px_1fr_1fr_130px_130px] gap-0 px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="col-span-4 text-sm font-bold text-gray-800">Total</div>
              <div className="text-sm font-bold font-mono text-right text-blue-700">{formatCurrency(totalDebit)}</div>
              <div className="text-sm font-bold font-mono text-right text-emerald-700">{formatCurrency(totalCredit)}</div>
            </div>
          </>
        )}
      </div>

      {totalDebit !== totalCredit && entries.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <span className="font-semibold">⚠ Imbalance:</span> Debit total does not equal Credit total. Check for unposted journals.
        </div>
      )}
    </div>
  );
}
