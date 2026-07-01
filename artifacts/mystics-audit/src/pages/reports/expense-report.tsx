import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, RefreshCw, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

function inr(n: number) { return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(n); }
function fmtDate(s: string) { return s ? new Date(s).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"; }

const STATUS_COLORS: Record<string,string> = { submitted:"bg-amber-100 text-amber-700", approved:"bg-blue-100 text-blue-700", rejected:"bg-red-100 text-red-700", reimbursed:"bg-emerald-100 text-emerald-700", paid:"bg-green-100 text-green-700" };
const PIE_COLORS = ["#7c3aed","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#3b82f6","#ec4899","#f97316","#14b8a6"];

const DEPARTMENTS = ["","Finance","Operations","HR","Sales","Marketing","Technology","Admin","Legal","Projects"];
const PROJECTS = ["","Project Alpha","Project Beta","Infra Upgrade","Client Onboarding","Internal Ops"];

function exportCSV(rows: any[]) {
  const header = "Claim No,Date,Employee,Category,Department,Project,Total Amount,GST,Status,Violations";
  const lines = rows.map((r:any) => [r.claimNo, r.submittedDate, r.employeeName, r.category, r.department||"", r.project||"", r.totalAmount.toFixed(2), r.gstAmount.toFixed(2), r.status, r.policyViolations&&r.policyViolations!=="[]"?"Yes":"No"].join(","));
  const blob = new Blob([header+"\n"+lines.join("\n")], { type:"text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "expense-report.csv"; a.click();
}

export default function ExpenseReport() {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-04-01`);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const [dept, setDept] = useState("");
  const [proj, setProj] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE = 20;

  const queryParams = new URLSearchParams({ from, to });
  if (dept) queryParams.set("department", dept);
  if (proj) queryParams.set("project", proj);
  if (status) queryParams.set("status", status);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["expense-report", from, to, dept, proj, status],
    queryFn: () => fetch(`/api/reports/expense-report?${queryParams}`).then(r=>r.json()),
  });

  const rows: any[] = (data?.rows ?? []).filter((r:any) =>
    !search || r.employeeName?.toLowerCase().includes(search.toLowerCase()) || r.claimNo?.toLowerCase().includes(search.toLowerCase()) || r.category?.toLowerCase().includes(search.toLowerCase())
  );
  const totals = data?.totals ?? { totalAmount:0, totalGst:0, count:0, violations:0 };
  const byCategory: any[] = data?.byCategory ?? [];
  const byDept: any[] = data?.byDept ?? [];
  const byStatus: any[] = data?.byStatus ?? [];
  const totalPages = Math.ceil(rows.length / PAGE);
  const pageRows = rows.slice((page-1)*PAGE, page*PAGE);

  return (
    <div className="p-6 space-y-5 bg-gray-50/40 min-h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Detailed expense claims with category, department and policy analysis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={()=>refetch()}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          {data && <Button variant="outline" size="sm" onClick={()=>exportCSV(data.rows)}><Download className="w-4 h-4 mr-1.5" />Export CSV</Button>}
          <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
        </div>
      </div>

      <Card><CardContent className="py-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div><Label className="text-xs">From</Label><DateInput className="mt-1 w-36" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1); }} /></div>
          <div><Label className="text-xs">To</Label><DateInput className="mt-1 w-36" value={to} onChange={e=>{ setTo(e.target.value); setPage(1); }} /></div>
          <div className="w-36">
            <Label className="text-xs">Department</Label>
            <Select value={dept} onValueChange={v=>{ setDept(v); setPage(1); }}>
              <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="All depts" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map(d=><SelectItem key={d} value={d}>{d||"All Departments"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={v=>{ setStatus(v); setPage(1); }}>
              <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {["submitted","approved","rejected","reimbursed","paid"].map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1"><Label className="text-xs">Search</Label><Input className="mt-1" placeholder="Claim no, employee, category…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} /></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"Total Claimed",     value:inr(totals.totalAmount),               sub:`${totals.count} claims`, bg:"bg-gray-700" },
          { label:"GST Component",     value:inr(totals.totalGst),                  sub:"Input tax",              bg:"bg-amber-600" },
          { label:"Net Expense",       value:inr(totals.totalAmount-totals.totalGst),sub:"Excl. GST",             bg:"bg-violet-600" },
          { label:"Policy Violations", value:String(totals.violations),             sub:"Claims with breach",     bg:totals.violations>0?"bg-red-600":"bg-emerald-600" },
        ].map(k => (
          <div key={k.label} className={cn("rounded-2xl px-5 py-5 text-white", k.bg)}>
            <p className="text-xs font-medium opacity-80">{k.label}</p>
            <p className="text-2xl font-bold font-mono mt-2">{k.value}</p>
            <p className="text-xs opacity-70 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Category pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Category</CardTitle></CardHeader>
          <CardContent>
            {byCategory.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">No data</div> : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {byCategory.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v:any)=>inr(v)} /></PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {byCategory.slice(0,6).map((c,i)=>(
                    <div key={c.category} className="flex justify-between text-xs">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{background:PIE_COLORS[i%PIE_COLORS.length]}} /><span className="truncate max-w-[100px]">{c.category}</span></div>
                      <span className="font-medium">₹{(c.total/1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dept bar */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Department</CardTitle></CardHeader>
          <CardContent>
            {byDept.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">No data</div> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byDept.slice(0,6)} layout="vertical" margin={{left:4,right:16}}>
                  <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} tick={{fontSize:10}} />
                  <YAxis type="category" dataKey="department" tick={{fontSize:10}} width={60} />
                  <Tooltip formatter={(v:any)=>inr(v)} />
                  <Bar dataKey="total" name="Expenses" fill="#7c3aed" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byStatus.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">No data</div> : byStatus.map(s => (
              <div key={s.status} className="flex items-center justify-between">
                <Badge className={cn("text-xs capitalize", STATUS_COLORS[s.status]||"bg-gray-100 text-gray-700")}>{s.status}</Badge>
                <div className="text-right">
                  <p className="text-sm font-semibold">{inr(s.total)}</p>
                  <p className="text-xs text-gray-400">{s.count} claims</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{rows.length} Expense Claims</CardTitle>
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
                  <th className="text-left px-3 py-2">Claim No</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Employee</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-left px-3 py-2">Dept</th>
                  <th className="text-left px-3 py-2">Project</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-right px-3 py-2">GST</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Policy</th>
                </tr></thead>
                <tbody>
                  {pageRows.map((r:any, i:number) => {
                    const hasViolations = r.policyViolations && r.policyViolations !== "[]";
                    return (
                      <tr key={r.id} className={cn("border-b last:border-0 hover:bg-gray-50", i%2===1?"bg-gray-50/30":"")}>
                        <td className="px-3 py-2 font-medium text-primary">{r.claimNo}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.submittedDate)}</td>
                        <td className="px-3 py-2">{r.employeeName}</td>
                        <td className="px-3 py-2 text-gray-600">{r.category}</td>
                        <td className="px-3 py-2 text-gray-500">{r.department||"—"}</td>
                        <td className="px-3 py-2 text-gray-500">{r.project||"—"}</td>
                        <td className="px-3 py-2 text-right font-semibold">{inr(r.totalAmount)}</td>
                        <td className="px-3 py-2 text-right text-amber-700">{inr(r.gstAmount)}</td>
                        <td className="px-3 py-2"><Badge className={cn("text-xs capitalize", STATUS_COLORS[r.status]||"bg-gray-100")}>{r.status}</Badge></td>
                        <td className="px-3 py-2">{hasViolations?<span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3 h-3" />Breach</span>:"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
