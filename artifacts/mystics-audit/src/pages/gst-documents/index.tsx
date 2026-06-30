import { useState, useEffect } from "react";
import {
  FileText, Plus, Search, Filter, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, XCircle, Upload, Download, ChevronDown,
  Building2, Smartphone, Globe, Receipt, CreditCard, X,
  TrendingUp, TrendingDown, Banknote, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ── helpers ─────────────────────────────────────────── */
const fmt = (v: number) => formatCurrency(v);
const periodOptions = () => {
  const opts: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return opts;
};

const DOC_TYPES = [
  { value: "invoice",      label: "Tax Invoice",     icon: <Receipt className="w-3.5 h-3.5" />,     color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "bill",         label: "Purchase Bill",   icon: <FileText className="w-3.5 h-3.5" />,    color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "credit_note",  label: "Credit Note",     icon: <TrendingDown className="w-3.5 h-3.5" />,color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "debit_note",   label: "Debit Note",      icon: <TrendingUp className="w-3.5 h-3.5" />,  color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "receipt",      label: "Receipt Voucher", icon: <Banknote className="w-3.5 h-3.5" />,    color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "e_way_bill",   label: "E-Way Bill",      icon: <Globe className="w-3.5 h-3.5" />,       color: "bg-amber-50 text-amber-700 border-amber-200" },
];

const FILING_STATUS = [
  { value: "unfiled",    label: "Unfiled",    color: "bg-gray-100 text-gray-600" },
  { value: "filed",      label: "Filed",      color: "bg-blue-100 text-blue-700" },
  { value: "matched",    label: "Matched",    color: "bg-emerald-100 text-emerald-700" },
  { value: "mismatched", label: "Mismatched", color: "bg-red-100 text-red-700" },
  { value: "cancelled",  label: "Cancelled",  color: "bg-gray-100 text-gray-400 line-through" },
];

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

const GST_RATES = ["0","5","12","18","28"];

/* ── Summary card ─────────────────────────────────────── */
function SummaryCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Add document modal ───────────────────────────────── */
function AddDocModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    docType: "invoice", docNo: "", docDate: new Date().toISOString().split("T")[0],
    partyName: "", partyGstin: "", partyType: "supplier", placeOfSupply: "Tamil Nadu",
    taxableAmount: "", gstRate: "18", description: "", hsnCode: "",
    period: new Date().toISOString().slice(0, 7), notes: "",
  });
  const [saving, setSaving] = useState(false);

  const taxable = parseFloat(form.taxableAmount) || 0;
  const rate    = parseFloat(form.gstRate) || 0;
  const gstAmt  = (taxable * rate) / 100;
  const isIGST  = !["Tamil Nadu"].includes(form.placeOfSupply); // simplified: assume company is Tamil Nadu
  const cgst    = isIGST ? 0 : gstAmt / 2;
  const sgst    = isIGST ? 0 : gstAmt / 2;
  const igst    = isIGST ? gstAmt : 0;
  const total   = taxable + gstAmt;

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.docNo || !form.partyName || !taxable) return;
    setSaving(true);
    try {
      await fetch("/api/gst-documents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, taxableAmount: taxable, cgst, sgst, igst, cess: 0, total }),
      });
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" />Add GST Document</DialogTitle></DialogHeader>
        <div className="space-y-5 pt-2">

          {/* Doc type selector */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Document Type *</Label>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map(dt => (
                <button key={dt.value} onClick={() => set("docType", dt.value)}
                  className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all", form.docType === dt.value ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300")}>
                  {dt.icon}{dt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Document Number *</Label>
              <Input value={form.docNo} onChange={e => set("docNo", e.target.value)} placeholder="INV-2025-001" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Document Date *</Label>
              <Input type="date" value={form.docDate} onChange={e => set("docDate", e.target.value)} />
            </div>
          </div>

          {/* Party */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Party Type</Label>
              <Select value={form.partyType} onValueChange={v => set("partyType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer (Sales)</SelectItem>
                  <SelectItem value="supplier">Supplier (Purchase)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Party Name *</Label>
              <Input value={form.partyName} onChange={e => set("partyName", e.target.value)} placeholder="ABC Enterprises Pvt Ltd" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Party GSTIN</Label>
              <Input value={form.partyGstin} onChange={e => set("partyGstin", e.target.value)} placeholder="33AAAAA0000A1Z5" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Place of Supply</Label>
              <Select value={form.placeOfSupply} onValueChange={v => set("placeOfSupply", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-52">
                  {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description + HSN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Description of Goods/Services</Label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Software consulting services…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">HSN / SAC Code</Label>
              <Input value={form.hsnCode} onChange={e => set("hsnCode", e.target.value)} placeholder="998314" className="font-mono" />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Taxable Amount (₹) *</Label>
              <Input value={form.taxableAmount} onChange={e => set("taxableAmount", e.target.value)} placeholder="0" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">GST Rate</Label>
              <Select value={form.gstRate} onValueChange={v => set("gstRate", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GST_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-calculated GST summary */}
          {taxable > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 grid grid-cols-4 gap-3 text-center">
              {[
                { label: "Taxable", value: fmt(taxable) },
                { label: isIGST ? "IGST" : "CGST", value: fmt(isIGST ? igst : cgst) },
                { label: isIGST ? "—" : "SGST", value: isIGST ? "—" : fmt(sgst) },
                { label: "Total", value: fmt(total) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-medium text-indigo-500 uppercase tracking-wider">{label}</p>
                  <p className="font-bold text-indigo-800 font-mono text-sm mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filing period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Filing Period</Label>
              <Select value={form.period} onValueChange={v => set("period", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{periodOptions().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Notes</Label>
              <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Reference or note…" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.docNo || !form.partyName || !taxable}>
              {saving ? "Saving…" : "Add Document"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function GstDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Filters
  const [docType, setDocType] = useState("");
  const [filingStatus, setFilingStatus] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [partyType, setPartyType] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = () => {
    setLoading(true);
    const qp = new URLSearchParams();
    if (docType) qp.set("docType", docType);
    if (filingStatus) qp.set("filingStatus", filingStatus);
    if (period) qp.set("period", period);
    if (partyType) qp.set("partyType", partyType);
    Promise.all([
      fetch(`/api/gst-documents?${qp}`).then(r => r.json()),
      fetch(`/api/gst-documents/summary${period ? `?period=${period}` : ""}`).then(r => r.json()),
    ]).then(([d, s]) => {
      setDocs(Array.isArray(d) ? d : []);
      setSummary(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [docType, filingStatus, period, partyType]);

  const filtered = search
    ? docs.filter(d => d.partyName?.toLowerCase().includes(search.toLowerCase()) || d.docNo?.toLowerCase().includes(search.toLowerCase()) || d.hsnCode?.includes(search))
    : docs;

  const getDocTypeConfig = (type: string) => DOC_TYPES.find(d => d.value === type) ?? DOC_TYPES[0];
  const getFilingConfig  = (status: string) => FILING_STATUS.find(f => f.value === status) ?? FILING_STATUS[0];

  const updateFilingStatus = async (id: number, newStatus: string) => {
    await fetch(`/api/gst-documents/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filingStatus: newStatus }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Document Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all GST documents — invoices, bills, credit notes, e-way bills, and more</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1.5" />Add Document</Button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 lg:grid-cols-8">
          <div className="col-span-2">
            <SummaryCard label="Total Documents" value={String(summary.totalDocs)}
              sub={`${summary.filed} filed · ${summary.unfiled} unfiled`}
              color="bg-indigo-100 text-indigo-600" icon={<FileText className="w-4 h-4" />} />
          </div>
          <div className="col-span-2">
            <SummaryCard label="Tax Liability (Sales)" value={fmt(summary.taxLiability ?? 0)}
              sub={`${summary.sales?.count ?? 0} sales docs`}
              color="bg-blue-100 text-blue-600" icon={<TrendingUp className="w-4 h-4" />} />
          </div>
          <div className="col-span-2">
            <SummaryCard label="ITC Available (Purchase)" value={fmt(summary.itcAvailable ?? 0)}
              sub={`${summary.purchases?.count ?? 0} purchase docs`}
              color="bg-emerald-100 text-emerald-600" icon={<TrendingDown className="w-4 h-4" />} />
          </div>
          <div className="col-span-2">
            <SummaryCard label="Net GST Payable" value={fmt(summary.netPayable ?? 0)}
              sub="After ITC set-off"
              color={summary.netPayable > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}
              icon={<Banknote className="w-4 h-4" />} />
          </div>
        </div>
      )}

      {/* ITC vs Liability strip */}
      {summary && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-indigo-800 text-sm">GST Position — {period || "All Periods"}</h3>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36 h-8 text-xs border-indigo-200 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{periodOptions().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              { label: "Output Tax (Sales)", value: summary.taxLiability ?? 0, color: "text-blue-700" },
              { label: "ITC (Purchases)", value: summary.itcAvailable ?? 0, color: "text-emerald-700" },
              { label: "CGST", value: (summary.sales?.cgst ?? 0) - (summary.purchases?.cgst ?? 0), color: "text-gray-700" },
              { label: "SGST", value: (summary.sales?.sgst ?? 0) - (summary.purchases?.sgst ?? 0), color: "text-gray-700" },
              { label: "Net Payable", value: summary.netPayable ?? 0, color: summary.netPayable > 0 ? "text-red-600 font-extrabold" : "text-emerald-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/70 rounded-xl p-3">
                <p className="text-[10px] font-medium text-indigo-500 uppercase tracking-wider mb-1">{label}</p>
                <p className={`font-bold font-mono text-base ${color}`}>{fmt(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Doc type tabs */}
        <div className="flex items-center gap-1">
          <button onClick={() => setDocType("")}
            className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all", !docType ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300")}>
            All Types
          </button>
          {DOC_TYPES.map(dt => (
            <button key={dt.value} onClick={() => setDocType(docType === dt.value ? "" : dt.value)}
              className={cn("flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all", docType === dt.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300")}>
              {dt.icon}{dt.label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowFilters(f => !f)}
          className={cn("ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all", showFilters ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-gray-500 border-gray-200")}>
          <Filter className="w-3.5 h-3.5" />More Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <Select value={filingStatus} onValueChange={setFilingStatus}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Filing Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              {FILING_STATUS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={partyType} onValueChange={setPartyType}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Party Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Parties</SelectItem>
              <SelectItem value="customer">Customer (Sales)</SelectItem>
              <SelectItem value="supplier">Supplier (Purchase)</SelectItem>
            </SelectContent>
          </Select>
          {(filingStatus || partyType) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilingStatus(""); setPartyType(""); }} className="text-gray-400">
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-sm shadow-sm">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search party, doc no, HSN…"
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
        {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              {["Type", "Document #", "Party", "Date", "Taxable", "GST", "Total", "Filing Status", "Actions"].map(h => (
                <TableHead key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="font-medium">No GST documents found</p>
                    <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" />Add First Document</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map((doc: any) => {
              const dtCfg = getDocTypeConfig(doc.docType);
              const fsCfg = getFilingConfig(doc.filingStatus);
              const gstTotal = doc.cgst + doc.sgst + doc.igst + doc.cess;
              return (
                <TableRow key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${dtCfg.color}`}>
                      {dtCfg.icon}{dtCfg.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-sm font-semibold text-indigo-700">{doc.docNo}</p>
                    {doc.hsnCode && <p className="text-[10px] font-mono text-gray-400">HSN: {doc.hsnCode}</p>}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm text-gray-800">{doc.partyName}</p>
                    {doc.partyGstin && <p className="text-[10px] font-mono text-gray-400">{doc.partyGstin}</p>}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${doc.partyType === "customer" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                      {doc.partyType}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(doc.docDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    {doc.placeOfSupply && <p className="text-[10px] text-gray-400">{doc.placeOfSupply}</p>}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-800">{fmt(doc.taxableAmount)}</TableCell>
                  <TableCell>
                    <p className="font-mono text-sm text-blue-700">{fmt(gstTotal)}</p>
                    <div className="text-[10px] text-gray-400 space-x-1">
                      {doc.cgst > 0 && <span>C:{fmt(doc.cgst)}</span>}
                      {doc.sgst > 0 && <span>S:{fmt(doc.sgst)}</span>}
                      {doc.igst > 0 && <span>I:{fmt(doc.igst)}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-gray-900">{fmt(doc.total)}</TableCell>
                  <TableCell>
                    <Select value={doc.filingStatus} onValueChange={v => updateFilingStatus(doc.id, v)}>
                      <SelectTrigger className="h-7 w-32 text-xs border-0 bg-transparent p-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${fsCfg.color}`}>{fsCfg.label}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {FILING_STATUS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <button className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View</button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Footer totals */}
        {filtered.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">{filtered.length} documents</p>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-400">Total Taxable: <span className="font-mono font-semibold text-gray-700">{fmt(filtered.reduce((s, d) => s + d.taxableAmount, 0))}</span></span>
              <span className="text-gray-400">Total GST: <span className="font-mono font-semibold text-blue-700">{fmt(filtered.reduce((s, d) => s + d.cgst + d.sgst + d.igst + d.cess, 0))}</span></span>
              <span className="text-gray-500">Grand Total: <span className="font-mono font-bold text-gray-900">{fmt(filtered.reduce((s, d) => s + d.total, 0))}</span></span>
            </div>
          </div>
        )}
      </div>

      <AddDocModal open={showAdd} onClose={() => setShowAdd(false)} onSaved={load} />
    </div>
  );
}
