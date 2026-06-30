import { useEffect, useState } from "react";
import PlatformLayout from "@/components/platform-layout";
import {
  CreditCard, Smartphone, Globe, Wallet, Search,
  CheckCircle, XCircle, Clock, Download, RefreshCw,
  FileText, TrendingUp,
} from "lucide-react";

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const METHOD_ICON: Record<string, React.ReactNode> = {
  upi:        <Smartphone className="w-3.5 h-3.5" />,
  card:       <CreditCard className="w-3.5 h-3.5" />,
  netbanking: <Globe className="w-3.5 h-3.5" />,
  wallet:     <Wallet className="w-3.5 h-3.5" />,
  qr:         <Smartphone className="w-3.5 h-3.5" />,
  offline:    <FileText className="w-3.5 h-3.5" />,
};

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  failed:    "bg-red-500/10 text-red-400 border-red-500/20",
  refunded:  "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function BillingPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tab, setTab] = useState<"payments" | "invoices">("payments");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/platform-admin/payments").then(r => r.json()),
      fetch("/api/platform-admin/invoices").then(r => r.json()),
    ]).then(([p, i]) => {
      setPayments(Array.isArray(p) ? p : []);
      setInvoices(Array.isArray(i) ? i : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const totalCollected = payments.filter(p => p.status === "completed").reduce((s, p) => s + (p.total ?? 0), 0);
  const totalTax = payments.filter(p => p.status === "completed").reduce((s, p) => s + (p.tax ?? 0), 0);

  const filteredPayments = payments.filter(p =>
    !search || p.org?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.methodDetail?.toLowerCase().includes(search.toLowerCase()) ||
    p.transactionId?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredInvoices = invoices.filter(i =>
    !search || i.orgName?.toLowerCase().includes(search.toLowerCase()) ||
    i.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PlatformLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Billing & Payments</h1>
            <p className="text-slate-400 text-sm mt-1">Payment history, invoices, and revenue records</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white text-sm transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <TrendingUp className="w-4 h-4" /><span className="text-xs font-medium">Total Revenue Collected</span>
            </div>
            <p className="text-white text-2xl font-bold">{fmt(totalCollected)}</p>
            <p className="text-slate-500 text-xs mt-1">incl. {fmt(totalTax)} GST</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-2 text-indigo-400 mb-3">
              <CreditCard className="w-4 h-4" /><span className="text-xs font-medium">Total Transactions</span>
            </div>
            <p className="text-white text-2xl font-bold">{payments.filter(p => p.status === "completed").length}</p>
            <p className="text-slate-500 text-xs mt-1">{payments.filter(p => p.status === "failed").length} failed</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-2 text-blue-400 mb-3">
              <FileText className="w-4 h-4" /><span className="text-xs font-medium">Invoices Issued</span>
            </div>
            <p className="text-white text-2xl font-bold">{invoices.length}</p>
            <p className="text-slate-500 text-xs mt-1">{invoices.filter(i => i.status === "paid").length} paid</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-800 border border-slate-700 rounded-lg w-fit">
          <button onClick={() => setTab("payments")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "payments" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
            Payments
          </button>
          <button onClick={() => setTab("invoices")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "invoices" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
            Invoices
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 max-w-sm">
          <Search className="w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === "payments" ? "Search org, method, txn ID…" : "Search org or invoice #…"}
            className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1" />
        </div>

        {/* Payments table */}
        {tab === "payments" && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Organization","Method","Amount","Status","Transaction ID","Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredPayments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No payments found</td></tr>
                ) : filteredPayments.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-white font-medium text-sm">{pay.org?.name ?? `Org #${pay.orgId}`}</p>
                      <p className="text-slate-500 text-xs">{pay.description}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 text-slate-300 text-xs">
                        <span className="text-slate-500">{METHOD_ICON[pay.method] ?? <CreditCard className="w-3.5 h-3.5" />}</span>
                        {pay.methodDetail ?? pay.method}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-white font-semibold">{fmt(pay.total ?? pay.amount)}</p>
                      <p className="text-slate-500 text-xs">+{fmt(pay.tax ?? 0)} GST</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[pay.status] ?? "text-slate-400"}`}>
                        {pay.status === "completed" ? <CheckCircle className="w-3 h-3" /> : pay.status === "failed" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {pay.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs font-mono">{pay.transactionId ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs">
                      {pay.paidAt ? new Date(pay.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoices table */}
        {tab === "invoices" && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {["Invoice #","Organization","Plan","Amount","GST","Total","Status","Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No invoices found</td></tr>
                ) : filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-indigo-400 text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-white font-medium text-sm">{inv.orgName}</p>
                      <p className="text-slate-500 text-xs">{inv.billingEmail}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 text-xs capitalize">{inv.planLabel}</td>
                    <td className="px-4 py-3.5 text-slate-300 text-sm">{fmt(inv.amount)}</td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs">{fmt(inv.tax)}</td>
                    <td className="px-4 py-3.5 text-white font-semibold">{fmt(inv.total)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs">
                      {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
