import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

function inr(n: number) { return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(n); }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"; }

function exportCSV(rows: any[], totals: any) {
  const header = "Bill No,Vendor Invoice No,Date,Vendor,Taxable Amount,CGST,SGST,IGST,TDS,Total Amount,Status,MSME";
  const lines = rows.map((r:any) =>
    [r.billNo, r.vendorInvoiceNo||"", r.date, r.vendorName, r.taxableAmount.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.igst.toFixed(2), r.tdsAmount.toFixed(2), r.totalAmount.toFixed(2), r.status, r.isMsme?"Yes":"No"].join(",")
  );
  lines.push(["TOTAL","","","", totals.taxable.toFixed(2), totals.cgst.toFixed(2), totals.sgst.toFixed(2), totals.igst.toFixed(2), totals.tds.toFixed(2), totals.total.toFixed(2), "", ""].join(","));
  const blob = new Blob([header+"\n"+lines.join("\n")], { type:"text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gst-purchase-register.csv"; a.click();
}

export default function GstPurchaseRegister() {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-04-01`);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE = 25;

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["gst-purchase-register", from, to],
    queryFn: () => fetch(`/api/reports/gst-purchase-register?from=${from}&to=${to}`).then(r=>r.json()),
  });

  const rows: any[] = (data?.rows ?? []).filter((r:any) =>
    !search || r.vendorName?.toLowerCase().includes(search.toLowerCase()) || r.billNo?.toLowerCase().includes(search.toLowerCase())
  );
  const totals = data?.totals ?? { taxable:0, cgst:0, sgst:0, igst:0, tds:0, total:0 };
  const totalPages = Math.ceil(rows.length / PAGE);
  const pageRows = rows.slice((page-1)*PAGE, page*PAGE);

  const monthly: Record<string, any> = {};
  (data?.rows ?? []).forEach((r:any) => {
    const m = r.date?.slice(0,7) ?? "";
    if (!monthly[m]) monthly[m] = { month:m, taxable:0, cgst:0, sgst:0, igst:0, tds:0 };
    monthly[m].taxable += r.taxableAmount; monthly[m].cgst += r.cgst;
    monthly[m].sgst += r.sgst; monthly[m].igst += r.igst; monthly[m].tds += r.tdsAmount;
  });
  const chartData = Object.values(monthly).sort((a,b)=>a.month.localeCompare(b.month));

  return (
    <div className="p-6 space-y-5 bg-gray-50/40 min-h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Purchase Register</h1>
          <p className="text-sm text-gray-500 mt-0.5">GSTR-2 / ITC source data — all inward supplies with tax breakdown</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={()=>refetch()}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          {data && <Button variant="outline" size="sm" onClick={()=>exportCSV(data.rows, totals)}><Download className="w-4 h-4 mr-1.5" />Export CSV</Button>}
          <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
        </div>
      </div>

      <Card><CardContent className="py-3">
        <div className="flex items-end gap-4">
          <div><Label className="text-xs">From</Label><DateInput className="mt-1 w-36" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1); }} /></div>
          <div><Label className="text-xs">To</Label><DateInput className="mt-1 w-36" value={to} onChange={e=>{ setTo(e.target.value); setPage(1); }} /></div>
          <div className="flex-1"><Label className="text-xs">Search</Label><Input className="mt-1" placeholder="Bill no, vendor…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} /></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-6 gap-3">
        {[
          { label:"Taxable Amount", value:totals.taxable,                              bg:"bg-gray-700" },
          { label:"CGST (Input)",   value:totals.cgst,                                 bg:"bg-blue-600" },
          { label:"SGST (Input)",   value:totals.sgst,                                 bg:"bg-violet-600" },
          { label:"IGST (Input)",   value:totals.igst,                                 bg:"bg-orange-600" },
          { label:"TDS Deducted",   value:totals.tds,                                  bg:"bg-red-600" },
          { label:"Total ITC",      value:totals.cgst+totals.sgst+totals.igst,         bg:"bg-emerald-600" },
        ].map(k => (
          <div key={k.label} className={cn("rounded-2xl px-4 py-4 text-white", k.bg)}>
            <p className="text-xs font-medium opacity-80">{k.label}</p>
            <p className="text-lg font-bold font-mono mt-1.5">₹{(k.value/100_000).toFixed(2)}L</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Monthly ITC Trend</CardTitle></CardHeader>
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

      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{rows.length} Bills</CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>←</Button>
              <span>{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>→</Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="text-center py-10 text-gray-400">Loading…</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Bill No</th>
                  <th className="text-left px-3 py-2">Vendor Invoice</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Vendor</th>
                  <th className="text-right px-3 py-2">Taxable</th>
                  <th className="text-right px-3 py-2">CGST</th>
                  <th className="text-right px-3 py-2">SGST</th>
                  <th className="text-right px-3 py-2">IGST</th>
                  <th className="text-right px-3 py-2">TDS</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">MSME</th>
                </tr></thead>
                <tbody>
                  {pageRows.map((r:any, i:number) => (
                    <tr key={r.id} className={cn("border-b last:border-0 hover:bg-gray-50", i%2===1?"bg-gray-50/30":"")}>
                      <td className="px-3 py-2 text-gray-400">{(page-1)*PAGE+i+1}</td>
                      <td className="px-3 py-2 font-medium text-primary">{r.billNo}</td>
                      <td className="px-3 py-2 text-gray-500">{r.vendorInvoiceNo||"—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate">{r.vendorName}</td>
                      <td className="px-3 py-2 text-right">{inr(r.taxableAmount)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{inr(r.cgst)}</td>
                      <td className="px-3 py-2 text-right text-purple-700">{inr(r.sgst)}</td>
                      <td className="px-3 py-2 text-right text-orange-700">{inr(r.igst)}</td>
                      <td className="px-3 py-2 text-right text-red-700">{inr(r.tdsAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{inr(r.totalAmount)}</td>
                      <td className="px-3 py-2">{r.isMsme?<Badge className="bg-blue-100 text-blue-700 text-xs">MSME</Badge>:"—"}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold border-t-2">
                    <td colSpan={5} className="px-3 py-2 text-right">TOTAL</td>
                    <td className="px-3 py-2 text-right">{inr(totals.taxable)}</td>
                    <td className="px-3 py-2 text-right text-blue-700">{inr(totals.cgst)}</td>
                    <td className="px-3 py-2 text-right text-purple-700">{inr(totals.sgst)}</td>
                    <td className="px-3 py-2 text-right text-orange-700">{inr(totals.igst)}</td>
                    <td className="px-3 py-2 text-right text-red-700">{inr(totals.tds)}</td>
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
