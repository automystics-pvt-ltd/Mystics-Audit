import { useListBudgets } from "@workspace/api-client-react";
import { useFY } from "@/contexts/fy-context";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  Plus, AlertTriangle, TrendingUp, TrendingDown,
  Wallet, CheckCircle2, BarChart3, ArrowUpRight,
} from "lucide-react";

export default function BudgetsList() {
  const { fy } = useFY();
  const { data, isLoading } = useListBudgets({ fiscalYear: fy.value } as any);
  const budgets: any[] = data ?? [];

  const totalBudget    = budgets.reduce((s, b) => s + Number(b.totalBudget), 0);
  const totalActual    = budgets.reduce((s, b) => s + Number(b.totalActual), 0);
  const totalRemaining = totalBudget - totalActual;
  const overBudget     = budgets.filter(b => Number(b.utilizationPct) > 100);
  const warningBudgets = budgets.filter(b => Number(b.utilizationPct) > 80 && Number(b.utilizationPct) <= 100);
  const overallPct     = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{budgets.length} budget{budgets.length !== 1 ? "s" : ""} · {fy.label}</p>
        </div>
        <Link href="/budgets/new">
          <Button className="rounded-xl">
            <Plus className="w-4 h-4 mr-1.5" />New Budget
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Budget",
            value: formatCurrency(totalBudget),
            sub: `${fy.label}`,
            icon: <Wallet className="w-5 h-5 text-violet-500" />,
            bg: "bg-violet-50 border-violet-100",
          },
          {
            label: "Total Spent",
            value: formatCurrency(totalActual),
            sub: `${overallPct}% utilised`,
            icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
            bg: "bg-blue-50 border-blue-100",
          },
          {
            label: "Remaining",
            value: formatCurrency(Math.max(0, totalRemaining)),
            sub: totalRemaining < 0 ? "Over budget!" : "Available",
            icon: <TrendingDown className="w-5 h-5 text-emerald-500" />,
            bg: totalRemaining < 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100",
            valueColor: totalRemaining < 0 ? "text-red-600" : "text-emerald-700",
          },
          {
            label: "Alerts",
            value: overBudget.length + warningBudgets.length,
            sub: `${overBudget.length} over · ${warningBudgets.length} warning`,
            icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
            bg: overBudget.length > 0 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100",
          },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border px-5 py-4 flex items-start gap-3 ${k.bg}`}>
            <div className="p-2 bg-white rounded-xl shadow-sm shrink-0">{k.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{k.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${(k as any).valueColor ?? "text-gray-900"}`}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Overall utilisation bar */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Overall Budget Utilisation</span>
            <span className={`text-sm font-bold ${overallPct > 100 ? "text-red-600" : overallPct > 80 ? "text-amber-600" : "text-gray-900"}`}>{overallPct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overallPct > 100 ? "bg-red-500" : overallPct > 80 ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-400">
            <span>{formatCurrency(totalActual)} spent</span>
            <span>{formatCurrency(totalBudget)} budgeted</span>
          </div>
        </div>
      )}

      {/* Budget cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500 mb-1">No budgets for {fy.label}</p>
          <p className="text-sm text-gray-400 mb-4">Create a budget to track planned vs actual spending</p>
          <Link href="/budgets/new"><Button className="rounded-xl"><Plus className="w-4 h-4 mr-1.5" />Create Budget</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map((b: any) => {
            const spent     = Number(b.totalActual) || 0;
            const budget    = Number(b.totalBudget) || 0;
            const remaining = budget - spent;
            const pct       = Number(b.utilizationPct) || (budget > 0 ? (spent / budget * 100) : 0);
            const isOver    = pct > 100;
            const isWarn    = pct > 80 && pct <= 100;

            return (
              <div key={b.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-5 space-y-4 ${isOver ? "border-red-200" : isWarn ? "border-amber-200" : "border-gray-100"}`}>
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 leading-tight">{b.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{b.fiscalYear} · {b.type}</p>
                  </div>
                  {isOver && (
                    <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />Over
                    </span>
                  )}
                  {isWarn && !isOver && (
                    <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />Warning
                    </span>
                  )}
                  {!isOver && !isWarn && (
                    <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />On Track
                    </span>
                  )}
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 mb-0.5 font-medium">Budget</p>
                    <p className="text-xs font-bold text-gray-900 font-mono truncate">{formatCurrency(budget)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 mb-0.5 font-medium">Spent</p>
                    <p className={`text-xs font-bold font-mono truncate ${isOver ? "text-red-600" : "text-gray-700"}`}>{formatCurrency(spent)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 mb-0.5 font-medium">Remaining</p>
                    <p className={`text-xs font-bold font-mono truncate ${remaining < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(Math.abs(remaining))}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-violet-500"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{isFinite(pct) ? pct.toFixed(1) : 0}% utilised</span>
                    {b.department && <span>{b.department}</span>}
                  </div>
                </div>

                {/* CTA */}
                <Link href={`/budgets/${b.id}/vs-actual`} className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                  <BarChart3 className="w-3.5 h-3.5" />View vs Actual<ArrowUpRight className="w-3 h-3 ml-auto" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
