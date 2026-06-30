import { useGetCashFlow } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { printReportPage } from "@/lib/print-utils";

export default function CashFlow() {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-04-01`);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const { data } = useGetCashFlow({ from, to });
  const d = data as any;

  const totalOperating = d?.operatingCashFlow ?? d?.totalOperating ?? 0;
  const totalInvesting = d?.investingCashFlow ?? d?.totalInvesting ?? 0;
  const totalFinancing = d?.financingCashFlow ?? d?.totalFinancing ?? 0;
  const netCashFlow    = d?.netCashChange ?? (totalOperating + totalInvesting + totalFinancing);

  // Build line items from API response
  const operating: any[] = d ? [
    ...(d.netProfit ? [{ name: "Net Profit", amount: d.netProfit }] : []),
    ...(d.adjustments ? [{ name: "Add: Non-cash Adjustments (Depreciation etc.)", amount: d.adjustments }] : []),
    ...(d.workingCapitalChange != null ? [{ name: "Working Capital Changes", amount: d.workingCapitalChange }] : []),
  ] : [];
  const investing: any[] = d ? [
    ...(d.capitalExpenditure ? [{ name: "Capital Expenditure", amount: d.capitalExpenditure }] : []),
    ...(d.assetSales ? [{ name: "Proceeds from Asset Sales", amount: d.assetSales }] : []),
    ...(totalInvesting !== 0 && !d.capitalExpenditure ? [{ name: "Net Investing Activities", amount: totalInvesting }] : []),
  ] : [];
  const financing: any[] = d ? [
    ...(d.loanDrawdown ? [{ name: "Loan Proceeds", amount: d.loanDrawdown }] : []),
    ...(d.loanRepayment ? [{ name: "Loan Repayments", amount: d.loanRepayment }] : []),
    ...(totalFinancing !== 0 && !d.loanDrawdown && !d.loanRepayment ? [{ name: "Net Financing Activities", amount: totalFinancing }] : []),
  ] : [];

  function Section({ title, items, total }: { title: string; items: any[]; total: number }) {
    const icon = total > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : total < 0 ? <TrendingDown className="w-4 h-4 text-destructive" /> : <Minus className="w-4 h-4 text-muted-foreground" />;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            <div className="flex items-center gap-1">
              {icon}
              <span className={`font-mono font-semibold ${total > 0 ? "text-green-600" : total < 0 ? "text-destructive" : ""}`}>{formatCurrency(Math.abs(total))}</span>
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableBody>
            {items.map((item: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="text-sm pl-4">{item.name}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${item.amount < 0 ? "text-destructive" : "text-green-600"}`}>{formatCurrency(item.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold border-t-2">
              <TableCell>Net {title}</TableCell>
              <TableCell className={`text-right font-mono ${total > 0 ? "text-green-600" : total < 0 ? "text-destructive" : ""}`}>{formatCurrency(total)}</TableCell>
            </TableRow>
            {items.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">No data</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cash Flow Statement</h1>
          <p className="text-muted-foreground text-sm">Sources and uses of cash for the period</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">From</Label>
            <Input type="date" className="w-36" value={from} onChange={e => setFrom(e.target.value)} />
            <Label className="text-sm">To</Label>
            <Input type="date" className="w-36" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => printReportPage("Cash Flow Statement")}>Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Operating Activities", value: totalOperating },
          { label: "Investing Activities", value: totalInvesting },
          { label: "Financing Activities", value: totalFinancing },
          { label: "Net Cash Flow", value: netCashFlow },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className={`text-lg font-mono font-bold ${value > 0 ? "text-green-600" : value < 0 ? "text-destructive" : ""}`}>{formatCurrency(value)}</p></CardContent>
          </Card>
        ))}
      </div>

      <Section title="Operating Activities" items={operating} total={totalOperating} />
      <Section title="Investing Activities" items={investing} total={totalInvesting} />
      <Section title="Financing Activities" items={financing} total={totalFinancing} />

      <Card className={netCashFlow >= 0 ? "bg-green-50 dark:bg-green-950/20 border-green-200" : "bg-destructive/5"}>
        <CardContent className="pt-4 flex justify-between items-center">
          <p className="font-semibold text-lg">Net Change in Cash</p>
          <p className={`text-2xl font-mono font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(netCashFlow)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
