import { useState } from "react";
import { Link } from "wouter";
import { useListInvoices } from "@workspace/api-client-react";
import { useFY } from "@/contexts/fy-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Plus, Search, FileText, Download, RefreshCw,
  Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";


export default function InvoicesList() {
  const { fy } = useFY();
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [typeFilter, setType]     = useState("all");

  const { data: invoices, isLoading, refetch, isFetching } = useListInvoices({
    from:   fy.from,
    to:     fy.to,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type:   typeFilter   !== "all" ? typeFilter   : undefined,
  } as any);

  const filtered = (invoices ?? []).filter((inv: any) =>
    !search ||
    inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customerName?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalAmt = filtered.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
  const stats = {
    draft:   filtered.filter((i: any) => i.status === "draft").length,
    posted:  filtered.filter((i: any) => i.status === "posted").length,
    overdue: filtered.filter((i: any) =>
      i.status !== "paid" && i.status !== "cancelled" && i.balanceDue > 0 && new Date(i.dueDate) < new Date()
    ).length,
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-muted-foreground">All sales invoices, credit &amp; debit notes</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-xl">
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => {
          const rows = filtered as any[];
          if (!rows.length) return;
          const cols = ["invoiceNo","date","dueDate","customerName","status","taxableAmount","gstAmount","totalAmount","balanceDue"];
          const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "invoices.csv"; a.click();
        }}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Link href="/invoices/new">
          <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Invoice
          </Button>
        </Link>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Invoiced",  value: formatCurrency(totalAmt), color: "from-violet-600 to-violet-700", Icon: FileText },
          { label: "Draft",           value: String(stats.draft),       color: "from-amber-500 to-amber-600",   Icon: Clock },
          { label: "Posted / Active", value: String(stats.posted),      color: "from-blue-600 to-blue-700",     Icon: CheckCircle2 },
          { label: "Overdue",         value: String(stats.overdue),     color: "from-red-500 to-red-600",       Icon: AlertCircle },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className={cn("rounded-2xl p-4 text-white bg-gradient-to-br", color)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/70">{label}</p>
                <p className="text-xl font-extrabold mt-1">{value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 rounded-xl border-gray-200"
            placeholder="Search invoice no. or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-36 rounded-xl border-gray-200">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setType}>
          <SelectTrigger className="w-40 rounded-xl border-gray-200">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Tax Invoice">Tax Invoice</SelectItem>
            <SelectItem value="Proforma">Proforma</SelectItem>
            <SelectItem value="Credit Note">Credit Note</SelectItem>
            <SelectItem value="Debit Note">Debit Note</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left   text-xs font-bold text-gray-500 uppercase tracking-wide">Invoice No</th>
              <th className="px-4 py-3 text-left   text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left   text-xs font-bold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Due Date</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Taxable</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Total</th>
              <th className="px-4 py-3 text-right  text-xs font-bold text-gray-500 uppercase tracking-wide">Balance Due</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No invoices found
                    </td>
                  </tr>
                )
                : filtered.map((inv: any) => {
                    const isOverdue = inv.status !== "paid" && inv.status !== "cancelled" && inv.balanceDue > 0 && new Date(inv.dueDate) < new Date();
                    const cfgKey    = isOverdue ? "overdue" : (inv.status as string);
                    return (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/invoices/${inv.id}`}>
                            <span className="font-mono font-semibold text-violet-600 hover:underline cursor-pointer">{inv.invoiceNo}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                            {inv.type?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{inv.customerName}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatDate(inv.date)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(isOverdue && "text-red-600 font-semibold", "text-gray-500")}>
                            {formatDate(inv.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <StatusBadge status={cfgKey} showIcon />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(inv.taxableAmount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn("font-bold", inv.balanceDue > 0 ? "text-red-600" : "text-green-600")}>
                            {inv.balanceDue > 0 ? formatCurrency(inv.balanceDue) : "✓ Paid"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/invoices/${inv.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs text-violet-600 hover:bg-violet-50">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
          </tbody>
        </table>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between text-xs text-muted-foreground">
            <span>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
            <span>Total: <span className="font-bold text-gray-800">{formatCurrency(totalAmt)}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
