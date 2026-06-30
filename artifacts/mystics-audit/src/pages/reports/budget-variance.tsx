import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import { FY_OPTIONS, detectCurrentFY } from "@/contexts/fy-context";

function inr(n: number) { return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(n); }
function inrL(n: number) { return `₹${(n/100_000).toFixed(2)}L`; }

function exportCSV(budgets: any[]) {
  const h = "Budget,Account,Budget Amount,Actual Amount,Variance,Variance %";
  const ls: string[] = [];
  budgets.forEach((b:any) => {
    ls.push([b.name,"",b.totalBudget.toFixed(2),b.totalActual.toFixed(2),b.variance.toFixed(2),((b.variance/b.totalBudget)*100).toFixed(1)].join(","));
    (b.lines||[]).forEach((l:any) => ls.push(["",l.accountName,l.annualAmount.toFixed(2),l.actualAmount.toFixed(2),l.variance.toFixed(2),l.variancePct.toFixed(1)].join(",")));
  });
  const blob = new Blob([h+"\n"+ls.join("\n")], { type:"text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "budget-variance.csv"; a.click();
}

export default function BudgetVariance() {
  const [fy, setFy] = useState(() => detectCurrentFY().value);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["budget-variance", fy],
    queryFn: () => fetch(`/api/reports/budget-variance?fy=${fy}`).then(r=>r.json()),
  });

  const budgets: any[] = data?.budgets ?? [];
  const grand = data?.grandTotals ?? { budget:0, actual:0 };
  const grandVariance = grand.budget - grand.actual;

  const chartData = budgets.map((b:any) => ({ name:b.name.length>12?b.name.slice(0,12)+"…":b.name, budget:b.totalBudget, actual:b.totalActual, variance:b.variance }));

  function toggle(id: number) {
    const s = new Set(expanded); s.has(id)?s.delete(id):s.add(id); setExpanded(s);
  }

  return (
    <div className="p-6 space-y-5 bg-gray-50/40 min-h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Variance Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Budget vs actual spending with account-level drill-down</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{FY_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={()=>refetch()}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          {data && <Button variant="outline" size="sm" onClick={()=>exportCSV(budgets)}><Download className="w-4 h-4 mr-1.5" />Export CSV</Button>}
          <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"Total Budget",  value:inr(grand.budget),     sub:`${budgets.length} budgets`, color:"text-gray-900" },
          { label:"Total Actual",  value:inr(grand.actual),     sub:"Spent so far",              color:"text-primary" },
          { label:"Total Variance",value:inr(grandVariance),    sub:grandVariance>=0?"Under budget":"Over budget", color:grandVariance>=0?"text-green-700":"text-red-700" },
          { label:"Utilization",   value:`${grand.budget>0?((grand.actual/grand.budget)*100).toFixed(1):0}%`, sub:"Of total budget", color:"text-amber-700" },
        ].map(k => (
          <div key={k.label} className="bg-white border rounded-xl p-3">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={cn("text-xl font-bold", k.color)}>{k.value}</p>
            <p className="text-xs text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Budget vs Actual by Budget</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{top:0,right:16,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{fontSize:10}} />
                <YAxis tickFormatter={inrL} tick={{fontSize:10}} />
                <Tooltip formatter={(v:any)=>inr(v)} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#e2e8f0" />
                <Bar dataKey="actual" name="Actual" radius={[2,2,0,0]}>
                  {chartData.map((d:any,i:number) => <Cell key={i} fill={d.actual>d.budget?"#ef4444":d.actual/d.budget>0.8?"#f59e0b":"#10b981"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-gray-400">Loading…</div>
      ) : budgets.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-400">No budgets found for FY {fy}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {budgets.map((b:any) => {
            const pct = b.totalBudget > 0 ? Math.min((b.totalActual/b.totalBudget)*100,100) : 0;
            const over = b.totalActual > b.totalBudget;
            const isOpen = expanded.has(b.id);
            return (
              <Card key={b.id} className={cn("overflow-hidden", over&&"border-red-200")}>
                <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={()=>toggle(b.id)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isOpen?<ChevronDown className="w-4 h-4 text-gray-400"/>:<ChevronRight className="w-4 h-4 text-gray-400"/>}
                      <span className="font-semibold text-gray-900">{b.name}</span>
                      <Badge variant="outline" className="text-xs">{b.type}</Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right"><p className="text-xs text-gray-500">Budget</p><p className="font-semibold">{inrL(b.totalBudget)}</p></div>
                      <div className="text-right"><p className="text-xs text-gray-500">Actual</p><p className="font-semibold text-primary">{inrL(b.totalActual)}</p></div>
                      <div className="text-right"><p className="text-xs text-gray-500">Variance</p><p className={cn("font-semibold", b.variance>=0?"text-green-700":"text-red-700")}>{inrL(b.variance)}</p></div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Used</p>
                        <Badge className={cn("text-xs", over?"bg-red-100 text-red-700":pct>80?"bg-amber-100 text-amber-700":"bg-green-100 text-green-700")}>
                          {b.utilization.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", over?"bg-red-500":pct>80?"bg-amber-500":"bg-emerald-500")} style={{width:`${Math.min(pct,100)}%`}} />
                  </div>
                </div>

                {isOpen && b.lines && b.lines.length > 0 && (
                  <div className="border-t">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                        <th className="text-left px-6 py-2">Account</th>
                        <th className="text-left px-4 py-2">Code</th>
                        <th className="text-left px-4 py-2">Dept</th>
                        <th className="text-right px-4 py-2">Budget</th>
                        <th className="text-right px-4 py-2">Actual</th>
                        <th className="text-right px-4 py-2">Variance</th>
                        <th className="text-right px-4 py-2">%</th>
                        <th className="text-left px-4 py-2">Alert</th>
                      </tr></thead>
                      <tbody>
                        {b.lines.map((l:any) => (
                          <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-6 py-2">{l.accountName}</td>
                            <td className="px-4 py-2 text-gray-400">{l.accountCode}</td>
                            <td className="px-4 py-2 text-gray-500">{l.department||"—"}</td>
                            <td className="px-4 py-2 text-right">{inr(l.annualAmount)}</td>
                            <td className="px-4 py-2 text-right text-primary">{inr(l.actualAmount)}</td>
                            <td className={cn("px-4 py-2 text-right font-medium", l.variance>=0?"text-green-700":"text-red-600")}>{inr(l.variance)}</td>
                            <td className="px-4 py-2 text-right">
                              <span className={cn("text-xs", l.variancePct>=0?"text-green-600":"text-red-600")}>{l.variancePct.toFixed(1)}%</span>
                            </td>
                            <td className="px-4 py-2">
                              {l.alertLevel ? <Badge variant="outline" className={cn("text-xs", l.alertLevel==="critical"?"border-red-400 text-red-600":"border-amber-400 text-amber-600")}>{l.alertLevel}</Badge> : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
