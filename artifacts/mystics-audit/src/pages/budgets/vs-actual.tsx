import { useGetBudgetVsActual } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Wallet } from "lucide-react";

export default function BudgetVsActual() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useGetBudgetVsActual(Number(id));
  const d = data as any;
  const lines: any[] = d?.lines ?? [];

  const totalBudget  = d?.totalBudget ?? 0;
  const totalActual  = d?.totalActual ?? 0;
  const variance     = totalBudget - totalActual;
  const overallPct   = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;
  const overCount    = lines.filter(l => l.alertLevel === "over").length;
  const warnCount    = lines.filter(l => l.alertLevel === "warning").length;

  const chartData = lines
    .slice(0, 12)
    .map((l: any) => ({
      name: l.accountName.length > 18 ? l.accountName.slice(0, 18) + "…" : l.accountName,
      Budget: l.annualBudget,
      Actual: l.ytdActual,
      alert:  l.alertLevel,
    }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/budgets"><Button variant="ghost" size="sm" className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{d?.budgetName ?? "Budget"} — vs Actual</h1>
          <p className="text-sm text-gray-500">{d?.fiscalYear}{d?.monthsElapsed ? ` · ${d.monthsElapsed} months elapsed` : ""}</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Annual Budget",
            value: formatCurrency(totalBudget),
            icon: <Wallet className="w-5 h-5 text-violet-500" />,
            bg: "bg-violet-50 border-violet-100",
          },
          {
            label: "YTD Actual",
            value: formatCurrency(totalActual),
            sub: `${overallPct}% of budget`,
            icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
            bg: "bg-blue-50 border-blue-100",
          },
          {
            label: "Variance",
            value: formatCurrency(Math.abs(variance)),
            sub: variance >= 0 ? "Under budget ✓" : "Over budget ✗",
            icon: <TrendingDown className="w-5 h-5 text-emerald-500" />,
            bg: variance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100",
            valueColor: variance >= 0 ? "text-emerald-700" : "text-red-600",
          },
          {
            label: "Alerts",
            value: `${overCount} over · ${warnCount} warn`,
            sub: `${lines.length} budget lines`,
            icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
            bg: overCount > 0 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100",
          },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border px-5 py-4 flex items-start gap-3 ${k.bg}`}>
            <div className="p-2 bg-white rounded-xl shadow-sm shrink-0">{k.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{k.label}</p>
              <p className={`text-lg font-bold mt-0.5 font-mono ${(k as any).valueColor ?? "text-gray-900"}`}>{k.value}</p>
              {(k as any).sub && <p className="text-xs text-gray-400 mt-0.5">{(k as any).sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Overall bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Budget Utilisation</span>
          <span className={`text-sm font-bold ${overallPct > 100 ? "text-red-600" : overallPct > 80 ? "text-amber-600" : "text-violet-600"}`}>{overallPct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${overallPct > 100 ? "bg-red-500" : overallPct > 80 ? "bg-amber-500" : "bg-violet-500"}`}
            style={{ width: `${Math.min(overallPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Budget vs Actual by Account</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 30 }} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: any, name: string) => [formatCurrency(v), name]}
                contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="Budget" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" radius={[4, 4, 0, 0]}>
                {chartData.map((entry: any, i: number) => (
                  <Cell
                    key={i}
                    fill={entry.alert === "over" ? "#ef4444" : entry.alert === "warning" ? "#f59e0b" : "#6366f1"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Line-by-Line Breakdown</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dept</TableHead>
              <TableHead className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Annual Budget</TableHead>
              <TableHead className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">YTD Actual</TableHead>
              <TableHead className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Variance</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisation</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l: any, i: number) => {
              const isOver = l.alertLevel === "over";
              const isWarn = l.alertLevel === "warning";
              return (
                <TableRow key={l.accountCode ?? i} className={isOver ? "bg-red-50/30" : isWarn ? "bg-amber-50/20" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-gray-800">{l.accountName}</p>
                      <p className="text-xs text-gray-400 font-mono">{l.accountCode}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{l.department ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(l.annualBudget)}</TableCell>
                  <TableCell className={`text-right font-mono text-sm font-semibold ${isOver ? "text-red-600" : "text-gray-800"}`}>
                    {formatCurrency(l.ytdActual)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${l.ytdVariance < 0 ? "text-red-600 font-semibold" : "text-emerald-600"}`}>
                    {l.ytdVariance < 0 ? `(${formatCurrency(Math.abs(l.ytdVariance))})` : formatCurrency(l.ytdVariance)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-violet-500"}`}
                          style={{ width: `${Math.min(l.utilizationPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 shrink-0">{l.utilizationPct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOver && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full w-fit">
                        <AlertTriangle className="w-3 h-3" />Over
                      </span>
                    )}
                    {isWarn && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-fit">
                        <AlertTriangle className="w-3 h-3" />Warning
                      </span>
                    )}
                    {!isOver && !isWarn && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                        <CheckCircle2 className="w-3 h-3" />OK
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-400">No budget lines found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
