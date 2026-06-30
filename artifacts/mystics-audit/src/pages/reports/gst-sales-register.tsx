import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Download, Printer, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

function inr(n: number) { return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(n); }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"; }

function exportCSV(rows: any[], totals: any) {
  const header = "Invoice No,Date,Customer,GSTIN,Place of Supply,Taxable Amount,CGST,SGST,IGST,Total Amount,Status";
  const lines = rows.map((r:any) =>
    [r.invoiceNo, r.date, r.customerName, r.customerGstin||"", r.placeOfSupply, r.taxableAmount.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.igst.toFixed(2), r.totalAmount.toFixed(2), r.status].join(",")
  );
  lines.push(["TOTAL","","","","", totals.taxable.toFixed(2), totals.cgst.toFixed(2), totals.sgst.toFixed(2), totals.igst.toFixed(2), totals.total.toFixed(2), ""].join(","));
  const blob = new Blob([header+"\n"+lines.join("\n")], { type:"text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gst-sales-register.csv"; a.click();
}

export default function GstSalesRegister() {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-04-01`);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE = 25;

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["gst-sales-register", from, to],
    queryFn: () => fetch(`/api/reports/gst-sales-register?from=${from}&to=${to}`).then(r=>r.json()),
  });

  const rows: any[] = (data?.rows ?? []).filter((r:any) =>
    !search || r.customerName?.toLowerCase().includes(search.toLowerCase()) || r.invoiceNo?.toLowerCase().includes(search.toLowerCase())
  );
  const totals = data?.totals ?? { taxable:0, cgst:0, sgst:0, igst:0, total:0 };
  const totalPages = Math.ceil(rows.length / PAGE);
  const pageRows = rows.slice((page-1)*PAGE, page*PAGE);

  /* chart data: monthly breakdown */
  const monthly: Record<string, { month:string; taxable:number; cgst:number; sgst:number; igst:number }> = {};
  (data?.rows ?? []).forEach((r:any) => {
    const m = r.date?.slice(0,7) ?? "";
    if (!monthly[m]) monthly[m] = { month:m, taxable:0, cgst:0, sgst:0, igst:0 };
    monthly[m].taxable += r.taxableAmount; monthly[m].cgst += r.cgst;
    monthly[m].sgst += r.sgst; monthly[m].igst += r.igst;
  });
  const chartData = Object.values(monthly).sort((a,b)=>a.month.localeCompare(b.month));

  return (
    <div className="p-6 space-y-5 bg-gray-50/40 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Sales Register</h1>
          <p className="text-sm text-gray-500 mt-0.5">GSTR-1 source data — all outward supplies with tax breakdown</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>refetch()}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          {data && <Button variant="outline" size="sm" onClick={()=>exportCSV(data.rows, totals)}><Download className="w-4 h-4 mr-1.5" />Export CSV</Button>}
          <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
        </div>
      </div>

      {/* filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-end gap-4">
            <div><Label className="text-xs">From</Label><Input type="date" className="mt-1 w-36" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1); }} /></div>
            <div><Label className="text-xs">To</Label><Input type="date" className="mt-1 w-36" value={to} onChange={e=>{ setTo(e.target.value); setPage(1); }} /></div>
            <div className="flex-1"><Label className="text-xs">Search</Label><Input className="mt-1" placeholder="Invoice no, customer…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} /></div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label:"Taxable Amount", value:totals.taxable, color:"text-gray-900" },
          { label:"CGST",           value:totals.cgst,    color:"text-blue-700" },
          { label:"SGST",           value:totals.sgst,    color:"text-purple-700" },
          { label:"IGST",           value:totals.igst,    color:"text-orange-700" },
          { label:"Total Tax",      value:totals.cgst+totals.sgst+totals.igst, color:"text-primary" },
        ].map(k => (
          <div key={k.label} className="bg-white border rounded-xl p-3">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={cn("text-lg font-bold", k.color)}>₹{(k.value/100_000).toFixed(2)}L</p>
            <p className="text-xs text-gray-400">{rows.length} invoices</p>
          </div>
        ))}
      </div>

      {/* chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Monthly GST Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{fontSize:11}} /><YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v:any)=>inr(v)} /><Legend />
                <Bar dataKey="cgst" name="CGST" fill="#3b82f6" stackId="a" />
                <Bar dataKey="sgst" name="SGST" fill="#8b5cf6" stackId="a" />
                <Bar dataKey="igst" name="IGST" fill="#f59e0b" stackId="a" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* table */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{rows.length} Invoices</CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>←</Button>
              <span>{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>→</Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Invoice No</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Customer</th>
                  <th className="text-left px-3 py-2">GSTIN</th>
                  <th className="text-left px-3 py-2">Place</th>
                  <th className="text-right px-3 py-2">Taxable</th>
                  <th className="text-right px-3 py-2">CGST</th>
                  <th className="text-right px-3 py-2">SGST</th>
                  <th className="text-right px-3 py-2">IGST</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr></thead>
                <tbody>
                  {pageRows.map((r:any, i:number) => (
                    <tr key={r.id} className={cn("border-b last:border-0 hover:bg-gray-50", i%2===1?"bg-gray-50/30":"")}>
                      <td className="px-3 py-2 text-gray-400">{(page-1)*PAGE+i+1}</td>
                      <td className="px-3 py-2 font-medium text-primary">{r.invoiceNo}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate">{r.customerName}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{r.customerGstin||"—"}</td>
                      <td className="px-3 py-2 text-xs">{r.placeOfSupply}</td>
                      <td className="px-3 py-2 text-right">{inr(r.taxableAmount)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{inr(r.cgst)}</td>
                      <td className="px-3 py-2 text-right text-purple-700">{inr(r.sgst)}</td>
                      <td className="px-3 py-2 text-right text-orange-700">{inr(r.igst)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{inr(r.totalAmount)}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-xs capitalize">{r.status}</Badge></td>
                    </tr>
                  ))}
                  {/* totals */}
                  <tr className="bg-gray-100 font-semibold border-t-2">
                    <td colSpan={6} className="px-3 py-2 text-right text-gray-700">TOTAL</td>
                    <td className="px-3 py-2 text-right">{inr(totals.taxable)}</td>
                    <td className="px-3 py-2 text-right text-blue-700">{inr(totals.cgst)}</td>
                    <td className="px-3 py-2 text-right text-purple-700">{inr(totals.sgst)}</td>
                    <td className="px-3 py-2 text-right text-orange-700">{inr(totals.igst)}</td>
                    <td className="px-3 py-2 text-right">{inr(totals.total)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
