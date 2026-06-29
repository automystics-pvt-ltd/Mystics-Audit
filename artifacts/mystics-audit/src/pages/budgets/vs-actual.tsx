import { useGetBudgetVsActual } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export default function BudgetVsActual() {
  const { id } = useParams<{ id: string }>();
  const { data } = useGetBudgetVsActual(Number(id));
  const d = data as any;
  const lines: any[] = d?.lines ?? [];

  const totalBudget = lines.reduce((s, l) => s + l.annualBudget, 0);
  const totalActual = lines.reduce((s, l) => s + l.actualSpend, 0);
  const variance = totalBudget - totalActual;

  const chartData = lines.slice(0, 10).map((l: any) => ({ name: l.accountName.length > 16 ? l.accountName.slice(0, 16) + "…" : l.accountName, Budget: l.annualBudget, Actual: l.actualSpend }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/budgets"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-semibold">{d?.name ?? "Budget"} — vs Actual</h1>
          <p className="text-muted-foreground text-sm">{d?.fiscalYear}{d?.department ? ` · ${d.department}` : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Budget", value: formatCurrency(totalBudget), color: "" },
          { label: "Total Actual", value: formatCurrency(totalActual), color: "" },
          { label: "Variance", value: formatCurrency(Math.abs(variance)), color: variance >= 0 ? "text-green-600" : "text-destructive" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className={`text-xl font-mono font-semibold ${color}`}>{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Budget" fill="#e2e8f0" />
              <Bar dataKey="Actual" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Annual Budget</TableHead>
              <TableHead className="text-right">YTD Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l: any) => {
              const var_ = l.annualBudget - l.actualSpend;
              const pct = l.annualBudget > 0 ? (l.actualSpend / l.annualBudget * 100) : 0;
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.accountName}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(l.annualBudget)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(l.actualSpend)}</TableCell>
                  <TableCell className={`text-right font-mono ${var_ < 0 ? "text-destructive" : "text-green-600"}`}>{var_ < 0 ? `(${formatCurrency(Math.abs(var_))})` : formatCurrency(var_)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 100 ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10">{pct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {lines.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No budget lines found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
