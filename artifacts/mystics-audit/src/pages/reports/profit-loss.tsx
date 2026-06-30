import { useGetProfitLoss } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function ProfitLoss() {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-04-01`);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const { data } = useGetProfitLoss({ from, to });
  const d = data as any;

  const revenue: any[] = Array.isArray(d?.revenue) ? d.revenue : [];
  const expenses: any[] = Array.isArray(d?.expenses) ? d.expenses : [];
  const totalRevenue = d?.totalRevenue ?? 0;
  const totalExpenses = d?.totalExpenses ?? 0;
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profit & Loss Statement</h1>
          <p className="text-muted-foreground text-sm">Income and expenditure for the period</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">From</Label>
            <Input type="date" className="w-36" value={from} onChange={e => setFrom(e.target.value)} />
            <Label className="text-sm">To</Label>
            <Input type="date" className="w-36" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-green-600">{formatCurrency(totalRevenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total Expenses</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-destructive">{formatCurrency(totalExpenses)}</p></CardContent>
        </Card>
        <Card className={netProfit >= 0 ? "border-green-500" : "border-destructive"}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Net {netProfit >= 0 ? "Profit" : "Loss"}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {netProfit >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
              <p className={`text-2xl font-mono font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(Math.abs(netProfit))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-green-700">Revenue</CardTitle></CardHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {revenue.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{r.name}</TableCell>
                  <TableCell className="text-right font-mono text-green-600 font-medium">{formatCurrency(r.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-green-50 dark:bg-green-950/20 border-t-2">
                <TableCell>Total Revenue</TableCell>
                <TableCell className="text-right font-mono text-green-600">{formatCurrency(totalRevenue)}</TableCell>
              </TableRow>
              {revenue.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">No revenue</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-destructive">Expenses</CardTitle></CardHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {expenses.map((e: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{e.name}</TableCell>
                  <TableCell className="text-right font-mono text-destructive font-medium">{formatCurrency(e.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-destructive/5 border-t-2">
                <TableCell>Total Expenses</TableCell>
                <TableCell className="text-right font-mono text-destructive">{formatCurrency(totalExpenses)}</TableCell>
              </TableRow>
              {expenses.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">No expenses</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Card className={netProfit >= 0 ? "bg-green-50 dark:bg-green-950/20 border-green-200" : "bg-destructive/5 border-destructive/20"}>
        <CardContent className="pt-4 flex justify-between items-center">
          <p className="font-semibold text-lg">Net {netProfit >= 0 ? "Profit" : "Loss"} for the period</p>
          <p className={`text-2xl font-mono font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(Math.abs(netProfit))}</p>
        </CardContent>
      </Card>
    </div>
  );
}
