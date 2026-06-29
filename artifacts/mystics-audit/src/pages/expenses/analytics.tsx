import { useGetExpenseAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/format";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export default function ExpenseAnalytics() {
  const { data } = useGetExpenseAnalytics({});
  const d = data as any;

  const byCategory: any[] = d?.byCategory ?? [];
  const byDept: any[] = d?.byDepartment ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Expense Analytics</h1>
        <p className="text-muted-foreground text-sm">Spending patterns and budget utilization</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Amount", value: formatCurrency(d?.totalAmount ?? 0) },
          { label: "Approved", value: formatCurrency(d?.totalApproved ?? 0) },
          { label: "Pending Approval", value: formatCurrency(d?.totalPending ?? 0) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-mono font-semibold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, pct }: any) => `${category} ${pct}%`}>
                  {byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byDept} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#e2e8f0" />
                <Bar dataKey="amount" name="Actual" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {byCategory.map((c: any) => (
            <div key={c.category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{c.category}</span>
                <span className="font-mono font-medium">{formatCurrency(c.amount)} ({c.pct}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
