import { useListJournals } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { useFY } from "@/contexts/fy-context";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, BookOpen, CheckCircle2, Clock, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_COLOR: Record<string, string> = {
  Payment:  "text-emerald-700 bg-emerald-50 border-emerald-200",
  Purchase: "text-amber-700 bg-amber-50 border-amber-200",
  Sales:    "text-blue-700 bg-blue-50 border-blue-200",
  Receipt:  "text-violet-700 bg-violet-50 border-violet-200",
  Journal:  "text-gray-600 bg-gray-100 border-gray-200",
};

export default function JournalsList() {
  const { fy } = useFY();
  const [status, setStatus] = useState("");
  const { data, isLoading } = useListJournals({ from: fy.from, to: fy.to, ...(status ? { status } : {}) } as any);
  const all: any[] = data ?? [];

  const posted    = all.filter(j => j.status === "posted");
  const drafts    = all.filter(j => j.status === "draft");
  const totalDebit = posted.reduce((s, j) => s + (Number(j.totalDebit) ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-sm text-gray-500 mt-0.5">{all.length} entries · {fy.label}</p>
        </div>
        <Link href="/journals/new">
          <Button size="sm" className="rounded-xl h-8 gap-1.5">
            <Plus className="w-3.5 h-3.5" />New Journal
          </Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Entries",  value: all.length,      sub: "all statuses",       icon: BookOpen,     color: "bg-violet-50 border-violet-100", text: "text-violet-700" },
          { label: "Posted",         value: posted.length,   sub: "in general ledger",  icon: CheckCircle2, color: "bg-emerald-50 border-emerald-100",text: "text-emerald-700"},
          { label: "Draft",          value: drafts.length,   sub: "pending review",     icon: Clock,        color: "bg-amber-50 border-amber-100",   text: "text-amber-700"  },
          { label: "Posted Volume",  value: formatCurrency(totalDebit), sub: "total debit turnover",icon:ArrowRightLeft,color:"bg-blue-50 border-blue-100",text:"text-blue-700"},
        ].map(({ label, value, sub, icon: Icon, color, text }) => (
          <div key={label} className={cn("rounded-2xl border px-5 py-4 flex items-start gap-3", color)}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/60">
              <Icon className={cn("w-4 h-4", text)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={cn("text-xl font-bold mt-0.5 truncate", text)}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(["", "draft", "posted"] as const).map(s => (
          <Button key={s} size="sm"
            variant={status === s ? "default" : "outline"}
            className="h-8 rounded-xl text-sm"
            onClick={() => setStatus(s)}>
            {s === "" ? `All ${all.length}` : `${s.charAt(0).toUpperCase() + s.slice(1)} ${s === "posted" ? posted.length : drafts.length}`}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[160px_100px_100px_1fr_130px_130px_90px] gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          {["Voucher No", "Date", "Type", "Narration", "Debit", "Credit", "Status"].map(h => (
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
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No journal entries found</p>
            <p className="text-sm text-gray-400 mt-1">Entries will appear here when invoices, bills, or payments are posted</p>
          </div>
        ) : (
          all.map((j: any) => (
            <div key={j.id} className="grid grid-cols-[160px_100px_100px_1fr_130px_130px_90px] gap-0 px-4 py-3 border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
              <div className="self-center">
                <Link href={`/journals/${j.id}`}>
                  <span className="font-mono text-sm text-violet-700 hover:text-violet-900 hover:underline cursor-pointer">{j.voucherNo}</span>
                </Link>
              </div>
              <div className="self-center text-sm text-gray-500">{formatDate(j.date)}</div>
              <div className="self-center">
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", TYPE_COLOR[j.voucherType] ?? TYPE_COLOR.Journal)}>
                  {j.voucherType || "Journal"}
                </span>
              </div>
              <div className="self-center text-sm text-gray-600 truncate pr-4" title={j.narration}>{j.narration}</div>
              <div className="self-center text-sm font-mono text-gray-700">{formatCurrency(j.totalDebit)}</div>
              <div className="self-center text-sm font-mono text-gray-700">{formatCurrency(j.totalCredit)}</div>
              <div className="self-center">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full border",
                  j.status === "posted"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                )}>{j.status}</span>
              </div>
            </div>
          ))
        )}

        {all.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-400">{all.length} entries · {posted.length} posted</span>
            <span className="text-xs font-mono text-gray-500">Posted volume: {formatCurrency(totalDebit)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
