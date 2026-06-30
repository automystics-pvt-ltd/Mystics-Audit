import { useGetBalanceSheet } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { printReportPage } from "@/lib/print-utils";

export default function BalanceSheet() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { data } = useGetBalanceSheet({ date });
  const d = data as any;

  const totalAssets      = d?.totalAssets      ?? 0;
  const totalLiabilities = d?.totalLiabilities ?? 0;
  const totalEquity      = d?.totalEquity      ?? 0;
  const isBalanced       = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  /* Build line arrays from flat API response */
  const assets: { name: string; amount: number }[] = d
    ? [
        { name: "Fixed Assets",          amount: d.fixedAssets      ?? 0 },
        { name: "Current Assets",        amount: d.currentAssets    ?? 0 },
        { name: "Bank & Cash",           amount: d.bankCash         ?? 0 },
        { name: "Trade Receivables (AR)", amount: d.tradeReceivables ?? 0 },
        { name: "Inventory",             amount: d.inventory        ?? 0 },
      ].filter(r => r.amount !== 0)
    : [];

  const liabilities: { name: string; amount: number }[] = d
    ? [
        { name: "Long-Term Liabilities",  amount: d.longTermLiabilities ?? 0 },
        { name: "Current Liabilities",    amount: d.currentLiabilities  ?? 0 },
        { name: "Trade Payables (AP)",    amount: d.tradePayables       ?? 0 },
        { name: "GST Payable",            amount: d.gstPayable          ?? 0 },
      ].filter(r => r.amount !== 0)
    : [];

  const equity: { name: string; amount: number }[] = d
    ? [
        { name: "Owner's Equity",   amount: d.equity ?? totalEquity },
      ].filter(r => r.amount !== 0)
    : [];

  function Section({ title, items, total, colorClass }: { title: string; items: { name: string; amount: number }[]; total: number; colorClass: string }) {
    return (
      <div>
        <h3 className={`font-semibold mb-2 ${colorClass}`}>{title}</h3>
        <Table>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground text-sm pl-4 py-2">No entries</TableCell>
              </TableRow>
            )}
            {items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm pl-4">{item.name}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${colorClass}`}>{formatCurrency(item.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold border-t-2">
              <TableCell>Total {title}</TableCell>
              <TableCell className={`text-right font-mono ${colorClass}`}>{formatCurrency(total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Balance Sheet</h1>
          <p className="text-muted-foreground text-sm">Statement of financial position as of {date}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">As of</Label>
            <DateInput className="w-32" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Badge variant={isBalanced ? "default" : "destructive"}>{isBalanced ? "Balanced" : "Unbalanced"}</Badge>
          <Button variant="outline" size="sm" onClick={() => printReportPage("Balance Sheet")}>Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Assets",      value: formatCurrency(totalAssets),      color: "text-primary" },
          { label: "Total Liabilities", value: formatCurrency(totalLiabilities), color: "text-destructive" },
          { label: "Total Equity",      value: formatCurrency(totalEquity),       color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className={`text-xl font-mono font-bold ${color}`}>{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent>
            <Section title="Assets" items={assets} total={totalAssets} colorClass="text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Liabilities & Equity</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <Section title="Liabilities" items={liabilities} total={totalLiabilities} colorClass="text-destructive" />
            <Section title="Equity" items={equity} total={totalEquity} colorClass="text-green-600" />
            <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
              <span>Total Liabilities + Equity</span>
              <span className="font-mono">{formatCurrency(totalLiabilities + totalEquity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
