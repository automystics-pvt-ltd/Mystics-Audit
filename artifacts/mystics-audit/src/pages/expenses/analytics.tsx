import { useGetExpenseAnalytics } from "@workspace/api-client-react";
import { useFY } from "@/contexts/fy-context";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, TrendingDown, CheckCircle2, Clock, Banknote } from "lucide-react";

const COLORS = ["#6366f1","#8b5cf6","#a78bfa","#06b6d4","#10b981","#f59e0b","#ef4444","#64748b","#ec4899","#84cc16"];

const fmt = (v: any) => formatCurrency(Number(v) || 0);

export default function ExpenseAnalytics() {
  const { fy } = useFY();
  const { data } = useGetExpenseAnalytics({ from: fy.from, to: fy.to } as any);
  const d = data as any;

  const byCategory: any[] = d?.byCategory ?? [];
  const byDept: any[]     = d?.byDepartment ?? [];
  const byProject: any[]  = d?.byProject ?? [];
  const byStatus: any[]   = d?.byStatus ?? [];

  const kpis = [
    { label: "Total Claimed",    value: fmt(d?.totalAmount),    sub: "All periods",         bg: "bg-gray-700",    Icon: TrendingDown },
    { label: "Pending Approval", value: fmt(d?.totalPending),   sub: "Awaiting review",     bg: "bg-amber-600",   Icon: Clock },
    { label: "Approved",         value: fmt(d?.totalApproved),  sub: "Cleared for payment", bg: "bg-blue-600",    Icon: CheckCircle2 },
    { label: "Rejected",         value: fmt(d?.totalRejected),  sub: "Claims denied",       bg: "bg-red-600",     Icon: AlertTriangle },
    { label: "Reimbursed",       value: fmt(d?.totalReimbursed),sub: "Paid to employees",   bg: "bg-violet-600",  Icon: Banknote },
    { label: "Policy Violations",value: String(d?.policyViolations ?? 0), sub: "Require review", bg: (d?.policyViolations ?? 0) > 0 ? "bg-amber-600" : "bg-emerald-600", Icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/expenses"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Analytics</h1>
          <p className="text-sm text-gray-500">Spending patterns, department budgets, and category breakdown</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        {kpis.map(({ label, value, sub, bg, Icon }) => (
          <div key={label} className={`rounded-2xl px-5 py-5 text-white ${bg}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium opacity-80">{label}</p>
              <Icon className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold font-mono mt-2">{value}</p>
            <p className="text-xs opacity-70 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By category — pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Spend by Category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                {byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By department — bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Spend vs Budget by Department</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDept} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="budget" name="Budget" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="amount" name="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Claims by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byStatus} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: any) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
              <Bar dataKey="amount" name="Amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By project */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Spend by Project</h2>
          {byProject.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No project data</p>
          ) : (
            <div className="space-y-3 mt-2">
              {byProject.slice(0, 8).map((p: any, i: number) => {
                const maxAmt = Math.max(...byProject.map((x: any) => x.amount));
                const pct = maxAmt > 0 ? Math.round((p.amount / maxAmt) * 100) : 0;
                return (
                  <div key={p.project} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">{p.project}</span>
                      <span className="font-mono font-semibold text-gray-800">{fmt(p.amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Category Detail Breakdown</h2>
        <div className="space-y-3">
          {byCategory.map((c: any, i: number) => (
            <div key={c.category} className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 truncate">{c.category}</span>
                  <div className="flex items-center gap-4 text-gray-500 shrink-0 ml-4">
                    <span className="text-xs">{c.count} claims</span>
                    <span className="font-mono font-semibold text-gray-800">{fmt(c.amount)}</span>
                    <span className="text-xs w-8 text-right">{c.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
