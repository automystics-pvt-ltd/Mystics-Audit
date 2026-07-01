import { useGetProfitLoss } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { useFY } from "@/contexts/fy-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";
import { printReportPage } from "@/lib/print-utils";

export default function ProfitLoss() {
  const { fy } = useFY();
  const [from, setFrom] = useState(fy.from);
  const [to, setTo] = useState(fy.to);
  useEffect(() => { setFrom(fy.from); setTo(fy.to); }, [fy.value]);
  const { data } = useGetProfitLoss({ from, to });
  const d = data as any;

  const totalRevenue  = d?.totalRevenue ?? 0;
  const netProfit     = d?.netProfit ?? 0;
  const totalExpenses = totalRevenue - netProfit;

  // Build line items from API response fields
  const revenue: any[] = d ? [
    ...(d.revenueFromOperations ? [{ name: "Revenue from Operations", amount: d.revenueFromOperations }] : []),
    ...(d.otherIncome ? [{ name: "Other Income", amount: d.otherIncome }] : []),
  ] : [];
  const expenses: any[] = d ? [
    ...(d.cogs > 0 ? [{ name: "Cost of Goods Sold", amount: d.cogs }] : []),
    ...(d.operatingExpenses > 0 ? [{ name: "Operating Expenses", amount: d.operatingExpenses }] : []),
    ...(d.depreciation > 0 ? [{ name: "Depreciation", amount: d.depreciation }] : []),
    ...(d.financeCharges > 0 ? [{ name: "Finance Charges", amount: d.financeCharges }] : []),
    ...(d.taxProvision > 0 ? [{ name: "Tax Provision", amount: d.taxProvision }] : []),
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profit & Loss Statement</h1>
          <p className="text-muted-foreground text-sm">Income and expenditure for the period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-sm">From</Label>
            <DateInput className="w-32" value={from} onChange={e => setFrom(e.target.value)} />
            <Label className="text-sm">To</Label>
            <DateInput className="w-32" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => printReportPage("Profit & Loss Statement")}>Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
