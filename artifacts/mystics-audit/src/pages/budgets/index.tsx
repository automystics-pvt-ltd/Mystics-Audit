import { useListBudgets } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Plus } from "lucide-react";

export default function BudgetsList() {
  const { data } = useListBudgets({});
  const budgets: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <p className="text-muted-foreground text-sm">{budgets.length} budgets</p>
        </div>
        <Link href="/budgets/new"><Button><Plus className="w-4 h-4 mr-2" />New Budget</Button></Link>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Budget Name</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Total Budget</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((b: any) => {
              const spent = Number(b.totalSpent) || 0;
              const budget = Number(b.totalBudget) || 0;
              const remaining = budget - spent;
              const pct = budget > 0 ? (spent / budget * 100) : 0;
              return (
                <TableRow key={b.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/budgets/${b.id}/vs-actual`} className="font-medium text-primary hover:underline">{b.name}</Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.fiscalYear}</TableCell>
                  <TableCell>{b.department || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(budget)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(spent)}</TableCell>
                  <TableCell className={`text-right font-mono ${spent > budget ? "text-destructive font-semibold" : ""}`}>{formatCurrency(remaining)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 100 ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10">{isFinite(pct) ? pct.toFixed(0) : 0}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {budgets.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No budgets found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
