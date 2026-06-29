import { useListExpenses } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default", submitted: "secondary", rejected: "destructive", paid: "outline",
};

export default function ExpensesList() {
  const [status, setStatus] = useState("");
  const { data } = useListExpenses(status ? { status } : {});
  const expenses: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expense Claims</h1>
          <p className="text-muted-foreground text-sm">{expenses.length} claims</p>
        </div>
        <div className="flex gap-2">
          <Link href="/expenses/analytics"><Button variant="outline">Analytics</Button></Link>
          <Link href="/expenses/new"><Button><Plus className="w-4 h-4 mr-2" />New Claim</Button></Link>
        </div>
      </div>
      <div className="flex gap-2">
        {["", "submitted", "approved", "rejected", "paid"].map(s => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" onClick={() => setStatus(s)}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim No</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Violations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e: any) => (
              <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell><Link href={`/expenses/${e.id}`} className="font-mono text-primary hover:underline">{e.claimNo}</Link></TableCell>
                <TableCell className="font-medium">{e.employeeName}</TableCell>
                <TableCell className="text-sm">{formatDate(e.submittedDate)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(e.totalAmount)}</TableCell>
                <TableCell><Badge variant={STATUS_COLORS[e.status] ?? "secondary"}>{e.status}</Badge></TableCell>
                <TableCell>
                  {e.policyViolations > 0
                    ? <span className="flex items-center gap-1 text-amber-600 text-sm"><AlertTriangle className="w-3 h-3" />{e.policyViolations}</span>
                    : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
              </TableRow>
            ))}
            {expenses.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No expense claims found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
