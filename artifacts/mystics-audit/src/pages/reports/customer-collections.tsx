import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, RefreshCw, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

function inr(n: number) { return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(n); }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"; }

const STATUS_COLORS: Record<string,string> = { draft:"bg-gray-100 text-gray-700", posted:"bg-amber-100 text-amber-700", paid:"bg-green-100 text-green-700" };

function exportCSV(rows: any[]) {
  const h = "Invoice No,Date,Due Date,Customer,Total,Collected,Outstanding,Status";
  const ls = rows.map((r:any)=>[r.invoiceNo,r.date,r.dueDate,r.customerName,r.totalAmount.toFixed(2),r.paidAmount.toFixed(2),r.outstanding.toFixed(2),r.status].join(","));
  const blob = new Blob([h+"\n"+ls.join("\n")], { type:"text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "customer-collections.csv"; a.click();
}

export default function CustomerCollections() {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-04-01`);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE = 20;

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["customer-collections", from, to],
    queryFn: () => fetch(`/api/reports/customer-collections?from=${from}&to=${to}`).then(r=>r.json()),
  });

  const rows: any[] = (data?.rows ?? []).filter((r:any) => !search || r.customerName?.toLowerCase().includes(search.toLowerCase()) || r.invoiceNo?.toLowerCase().includes(search.toLowerCase()));
  const totals = data?.totals ?? { billed:0, collected:0, outstanding:0 };
  const byCustomer: any[] = (data?.byCustomer ?? []).slice(0,8);
  const totalPages = Math.ceil(rows.length / PAGE);
  const pageRows = rows.slice((page-1)*PAGE, page*PAGE);
  const collectionRate = totals.billed > 0 ? ((totals.collected / totals.billed) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 space-y-5 bg-gray-50/40 min-h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Collection Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">AR collections, outstanding dues, and collection efficiency by customer</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={()=>refetch()}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          {data && <Button variant="outline" size="sm" onClick={()=>exportCSV(data.rows)}><Download className="w-4 h-4 mr-1.5" />Export CSV</Button>}
          <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
        </div>
      </div>

      <Card><CardContent className="py-3">
        <div className="flex items-end gap-4">
          <div><Label className="text-xs">From</Label><DateInput className="mt-1 w-36" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1); }} /></div>
          <div><Label className="text-xs">To</Label><DateInput className="mt-1 w-36" value={to} onChange={e=>{ setTo(e.target.value); setPage(1); }} /></div>
          <div className="flex-1"><Label className="text-xs">Search</Label><Input className="mt-1" placeholder="Customer, invoice no…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} /></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"Total Invoiced",     value:inr(totals.billed),      sub:`${rows.length} invoices`, color:"text-gray-900" },
          { label:"Total Collected",    value:inr(totals.collected),   sub:`${collectionRate}% rate`, color:"text-green-700" },
          { label:"Outstanding AR",     value:inr(totals.outstanding), sub:"Yet to collect",          color:"text-red-700" },
          { label:"Collection Rate",    value:`${collectionRate}%`,    sub:"Efficiency metric",       color:parseFloat(collectionRate)>=80?"text-green-700":"text-amber-700" },
        ].map(k => (
          <div key={k.label} className="bg-white border rounded-xl p-3">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={cn("text-xl font-bold", k.color)}>{k.value}</p>
            <p className="text-xs text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {byCustomer.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Customers — Billed vs Collected</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byCustomer} layout="vertical" margin={{left:8,right:24}}>
                <XAxis type="number" tickFormatter={v=>`₹${(v/100_000).toFixed(1)}L`} tick={{fontSize:10}} />
                <YAxis type="category" dataKey="customerName" tick={{fontSize:10}} width={120} />
                <Tooltip formatter={(v:any)=>inr(v)} />
                <Legend />
                <Bar dataKey="totalBilled" name="Invoiced" fill="#7c3aed" />
                <Bar dataKey="totalCollected" name="Collected" fill="#10b981" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
          {isLoading ? <div className="text-center py-10 text-gray-400">Loading…</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left px-3 py-2">Invoice No</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Due</th>
                  <th className="text-left px-3 py-2">Customer</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-right px-3 py-2">Collected</th>
                  <th className="text-right px-3 py-2">Outstanding</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr></thead>
                <tbody>
                  {pageRows.map((r:any, i:number) => {
                    const overdue = r.status==="posted" && r.dueDate < new Date().toISOString().split("T")[0];
                    return (
                      <tr key={r.id} className={cn("border-b last:border-0 hover:bg-gray-50", i%2===1?"bg-gray-50/30":"")}>
                        <td className="px-3 py-2 font-medium text-primary">{r.invoiceNo}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className={cn("px-3 py-2 whitespace-nowrap", overdue?"text-red-600 font-medium":"")}>
                          {fmtDate(r.dueDate)}{overdue&&<AlertCircle className="w-3 h-3 inline ml-1" />}
                        </td>
                        <td className="px-3 py-2 max-w-[160px] truncate">{r.customerName}</td>
                        <td className="px-3 py-2 text-right font-semibold">{inr(r.totalAmount)}</td>
                        <td className="px-3 py-2 text-right text-green-700">{inr(r.paidAmount)}</td>
                        <td className={cn("px-3 py-2 text-right font-semibold", r.outstanding>0?"text-red-600":"text-gray-400")}>{inr(r.outstanding)}</td>
                        <td className="px-3 py-2"><Badge className={cn("text-xs", STATUS_COLORS[r.status]||"bg-gray-100")}>{r.status}</Badge></td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold border-t-2">
                    <td colSpan={4} className="px-3 py-2 text-right">TOTAL</td>
                    <td className="px-3 py-2 text-right">{inr(totals.billed)}</td>
                    <td className="px-3 py-2 text-right text-green-700">{inr(totals.collected)}</td>
                    <td className="px-3 py-2 text-right text-red-700">{inr(totals.outstanding)}</td>
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
