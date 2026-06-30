import { useGetGstr1Data } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  FileCheck, Download, RefreshCw, TrendingUp, Users, Receipt, Globe,
  CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function Gstr1() {
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [year, setYear]   = useState(String(today.getFullYear()));
  const period = `${year}-${month}`;

  const { data, isLoading, refetch, isFetching } = useGetGstr1Data({ period });
  const d = data as any;
  const summary = {
    taxableValue: d?.totalTaxableValue ?? 0,
    cgst:         d?.totalCgst ?? 0,
    sgst:         d?.totalSgst ?? 0,
    igst:         d?.totalIgst ?? 0,
  };
  const b2b: any[] = d?.b2bInvoices ?? [];
  const b2c: any[] = d?.b2cInvoices ?? [];
  const totalInvoices = d?.totalInvoices ?? 0;
  const b2bCount = d?.b2bCount ?? b2b.length;
  const b2cCount = d?.b2cCount ?? b2c.length;
  const status  = d?.isFilingReady ? (d?.isFiled ? "filed" : "pending") : "pending";

  const totalGst = summary.cgst + summary.sgst + summary.igst;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">GSTR-1</h1>
          <p className="text-sm text-muted-foreground">Outward Supplies Return · {MONTHS[parseInt(month) - 1]} {year}</p>
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
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export JSON
          </Button>
          {status !== "filed" ? (
            <Button size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
              <FileCheck className="h-3.5 w-3.5" /> File GSTR-1
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-green-100 text-green-700 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Filed
            </span>
          )}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Taxable Value",   value: formatCurrency(summary.taxableValue ?? 0),  color: "from-violet-600 to-violet-700", Icon: TrendingUp },
          { label: "Total CGST",      value: formatCurrency(summary.cgst ?? 0),           color: "from-blue-600 to-blue-700",     Icon: Receipt },
          { label: "Total SGST",      value: formatCurrency(summary.sgst ?? 0),           color: "from-cyan-600 to-cyan-700",     Icon: Receipt },
          { label: "Total IGST",      value: formatCurrency(summary.igst ?? 0),           color: "from-indigo-600 to-indigo-700", Icon: Globe },
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

      {/* ── Total GST liability ── */}
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total GST Liability for {MONTHS[parseInt(month) - 1]} {year}</p>
          <p className="text-2xl font-extrabold text-violet-700 mt-1 font-mono">{formatCurrency(totalGst)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">B2B Invoices</p>
            <p className="font-bold text-gray-800">{b2bCount || totalInvoices}</p>
          </div>
          <div className="h-10 w-px bg-gray-200" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">B2C Invoices</p>
            <p className="font-bold text-gray-800">{b2cCount}</p>
          </div>
          <div className="h-10 w-px bg-gray-200" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className={cn("font-bold text-sm", status === "filed" ? "text-green-600" : "text-amber-600")}>
              {status === "filed" ? "Filed" : "Pending"}
            </p>
          </div>
        </div>
      </div>

      {/* ── B2B table ── */}
      {b2b.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            <p className="text-sm font-bold text-gray-700">B2B Supplies (Business Customers with GSTIN)</p>
            <span className="ml-auto text-xs text-muted-foreground">{b2b.length} invoices</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Customer", "GSTIN", "Invoice No", "Taxable", "CGST", "SGST", "IGST", "Total"].map(h => (
                  <th key={h} className={cn("px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide", h === "Customer" || h === "GSTIN" || h === "Invoice No" ? "text-left" : "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b2b.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{row.customerName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{row.customerGstin}</td>
                  <td className="px-4 py-2.5 font-mono text-sm text-violet-600">{row.invoiceNo}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(row.taxableValue)}</td>
                  <td className="px-4 py-2.5 text-right text-blue-600">{formatCurrency(row.cgst)}</td>
                  <td className="px-4 py-2.5 text-right text-cyan-600">{formatCurrency(row.sgst)}</td>
                  <td className="px-4 py-2.5 text-right text-indigo-600">{formatCurrency(row.igst)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">{formatCurrency(row.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-violet-50/50 border-t-2 border-violet-100">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">B2B Total</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(b2b.reduce((s: number, r: any) => s + (r.taxableValue || 0), 0))}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">{formatCurrency(b2b.reduce((s: number, r: any) => s + (r.cgst || 0), 0))}</td>
                <td className="px-4 py-3 text-right font-bold text-cyan-600">{formatCurrency(b2b.reduce((s: number, r: any) => s + (r.sgst || 0), 0))}</td>
                <td className="px-4 py-3 text-right font-bold text-indigo-600">{formatCurrency(b2b.reduce((s: number, r: any) => s + (r.igst || 0), 0))}</td>
                <td className="px-4 py-3 text-right font-bold text-violet-700">{formatCurrency(b2b.reduce((s: number, r: any) => s + (r.totalAmount || 0), 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── B2C table ── */}
      {b2c.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            <p className="text-sm font-bold text-gray-700">B2C Supplies (Without GSTIN)</p>
            <span className="ml-auto text-xs text-muted-foreground">{b2c.length} invoices</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Customer", "Invoice No", "Taxable", "CGST", "SGST", "IGST", "Total"].map(h => (
                  <th key={h} className={cn("px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide", h === "Customer" || h === "Invoice No" ? "text-left" : "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b2c.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-medium">{row.customerName}</td>
                  <td className="px-4 py-2.5 font-mono text-sm text-violet-600">{row.invoiceNo}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(row.taxableValue)}</td>
                  <td className="px-4 py-2.5 text-right text-blue-600">{formatCurrency(row.cgst)}</td>
                  <td className="px-4 py-2.5 text-right text-cyan-600">{formatCurrency(row.sgst)}</td>
                  <td className="px-4 py-2.5 text-right text-indigo-600">{formatCurrency(row.igst)}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{formatCurrency(row.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalInvoices === 0 && !isLoading && (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-muted-foreground">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No outward supplies found for {MONTHS[parseInt(month) - 1]} {year}</p>
          <p className="text-xs mt-1">Post invoices to see them here</p>
        </div>
      )}
    </div>
  );
}
