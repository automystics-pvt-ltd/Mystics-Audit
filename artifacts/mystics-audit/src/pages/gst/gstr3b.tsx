import { useGetGstr3bData } from "@workspace/api-client-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import {
  FileCheck, RefreshCw, TrendingUp, TrendingDown, Scale, Download,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function Gstr3b() {
  const today = new Date();
  const [month, setMonth]   = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [year, setYear]     = useState(String(today.getFullYear()));
  const [fileOpen, setFileOpen] = useState(false);
  const [filed, setFiled]   = useState(false);
  const { toast } = useToast();
  const period = `${year}-${month}`;

  const { data, refetch, isFetching } = useGetGstr3bData({ period });
  const d = (data as any) ?? {};

  function exportJson() {
    const payload = { period, outwardCgst: d.outwardCgst, outwardSgst: d.outwardSgst, outwardIgst: d.outwardIgst, itcCgst: d.itcCgst, itcSgst: d.itcSgst, itcIgst: d.itcIgst, netPayable: d.netPayable };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    a.download = `GSTR3B_${period}.json`; a.click();
  }

  function confirmFile() {
    setFiled(true);
    setFileOpen(false);
    toast({ title: "GSTR-3B Filed", description: `Successfully filed for ${MONTHS[parseInt(month) - 1]} ${year}` });
  }

  const outwardTax = (d.outwardCgst ?? 0) + (d.outwardSgst ?? 0) + (d.outwardIgst ?? 0);
  const itcAvail   = (d.itcCgst    ?? 0) + (d.itcSgst    ?? 0) + (d.itcIgst    ?? 0);
  const netPayable = d.netPayable ?? (outwardTax - itcAvail);
  const cashLiab   = Math.max(0, netPayable);
  const excessItc  = Math.max(0, itcAvail - outwardTax);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">GSTR-3B</h1>
          <p className="text-sm text-muted-foreground">Monthly Self-Assessment Return · {MONTHS[parseInt(month) - 1]} {year}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-32 rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24 rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["2024", "2025", "2026"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-xl">
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={exportJson}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          {!filed ? (
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-1.5" onClick={() => setFileOpen(true)}>
              <FileCheck className="h-3.5 w-3.5" /> File GSTR-3B
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-green-100 text-green-700 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Filed
            </span>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Outward Tax Liability", value: formatCurrency(outwardTax),             color: "from-violet-600 to-violet-700", Icon: TrendingUp },
          { label: "ITC Available",         value: formatCurrency(itcAvail),               color: "from-green-600 to-green-700",   Icon: TrendingDown },
          { label: "Net GST Payable",       value: formatCurrency(Math.abs(netPayable)),   color: netPayable > 0 ? "from-red-500 to-red-600" : "from-emerald-500 to-emerald-600", Icon: Scale },
          { label: "Cash Liability",        value: formatCurrency(cashLiab),               color: cashLiab > 0 ? "from-orange-500 to-orange-600" : "from-teal-500 to-teal-600",  Icon: cashLiab > 0 ? AlertTriangle : CheckCircle2 },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className={cn("rounded-2xl p-4 text-white bg-gradient-to-br", color)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/70">{label}</p>
                <p className="text-lg font-extrabold mt-1 font-mono">{value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Computation tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100 bg-violet-50/60 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-600" />
            <p className="text-sm font-bold text-gray-700">3.1 — Outward Tax Liability</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Nature", "Taxable", "CGST", "SGST", "IGST"].map(h => (
                  <th key={h} className={cn("px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide", h === "Nature" ? "text-left" : "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { nature: "Taxable Outward Supplies", tv: d.taxableValue ?? 0, cgst: d.outwardCgst ?? 0, sgst: d.outwardSgst ?? 0, igst: d.outwardIgst ?? 0 },
                { nature: "Zero-Rated (Export)",      tv: 0, cgst: 0, sgst: 0, igst: 0 },
                { nature: "Nil / Exempt",             tv: 0, cgst: 0, sgst: 0, igst: 0 },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{row.nature}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(row.tv)}</td>
                  <td className="px-4 py-2.5 text-right text-blue-600">{formatCurrency(row.cgst)}</td>
                  <td className="px-4 py-2.5 text-right text-cyan-600">{formatCurrency(row.sgst)}</td>
                  <td className="px-4 py-2.5 text-right text-indigo-600">{formatCurrency(row.igst)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-violet-50/50 border-t-2 border-violet-100">
              <tr>
                <td className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Total</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(d.taxableValue ?? 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(d.outwardCgst ?? 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-cyan-700">{formatCurrency(d.outwardSgst ?? 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-indigo-700">{formatCurrency(d.outwardIgst ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100 bg-green-50/60 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <p className="text-sm font-bold text-gray-700">4 — Input Tax Credit (ITC)</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["ITC Source", "CGST", "SGST", "IGST"].map(h => (
                  <th key={h} className={cn("px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide", h === "ITC Source" ? "text-left" : "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { type: "Inputs – Goods",    cgst: d.itcCgst ?? 0, sgst: d.itcSgst ?? 0, igst: d.itcIgst ?? 0 },
                { type: "Inputs – Services", cgst: 0, sgst: 0, igst: 0 },
                { type: "Capital Goods",     cgst: 0, sgst: 0, igst: 0 },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{row.type}</td>
                  <td className="px-4 py-2.5 text-right text-blue-600">{formatCurrency(row.cgst)}</td>
                  <td className="px-4 py-2.5 text-right text-cyan-600">{formatCurrency(row.sgst)}</td>
                  <td className="px-4 py-2.5 text-right text-indigo-600">{formatCurrency(row.igst)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-green-50/50 border-t-2 border-green-100">
              <tr>
                <td className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Total ITC</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(d.itcCgst ?? 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-cyan-700">{formatCurrency(d.itcSgst ?? 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-indigo-700">{formatCurrency(d.itcIgst ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Net payable banner */}
      <div className={cn(
        "rounded-2xl p-5 text-white",
        cashLiab > 0 ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-500",
      )}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-white/80 font-medium">
              {cashLiab > 0 ? "Net Tax Payable in Cash" : "No Cash Payment Required — ITC Sufficient"}
            </p>
            <p className="text-3xl font-extrabold mt-1 font-mono">{formatCurrency(cashLiab)}</p>
            {excessItc > 0 && (
              <p className="text-sm text-white/70 mt-1">Excess ITC to carry forward: {formatCurrency(excessItc)}</p>
            )}
          </div>
          {cashLiab > 0
            ? <AlertTriangle className="w-12 h-12 text-white/40" />
            : <CheckCircle2  className="w-12 h-12 text-white/40" />}
        </div>
      </div>

      {/* File GSTR-3B confirmation dialog */}
      <Dialog open={fileOpen} onOpenChange={o => !o && setFileOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-violet-600" /> File GSTR-3B
            </DialogTitle>
            <DialogDescription>
              You are about to file GSTR-3B for <strong>{MONTHS[parseInt(month) - 1]} {year}</strong>.
              Please verify the summary below before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Outward Tax</span><span className="font-mono font-semibold">{formatCurrency(outwardTax)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ITC Available</span><span className="font-mono font-semibold text-green-700">-{formatCurrency(itcAvail)}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="font-medium">Net Payable</span><span className={cn("font-mono font-bold", cashLiab > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(cashLiab)}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileOpen(false)}>Cancel</Button>
            <Button onClick={confirmFile} className="bg-violet-600 hover:bg-violet-700 text-white">Confirm & File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
