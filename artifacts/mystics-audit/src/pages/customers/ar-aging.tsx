import { useGetArAging } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";

export default function ArAging() {
  const { data } = useGetArAging();
  const d = data as any;
  const totals = d?.totals ?? {};
  const customers: any[] = d?.customers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AR Aging Report</h1>
          <p className="text-muted-foreground text-sm">As of {d?.asOf ? formatDate(d.asOf) : "today"}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Current", value: totals.current },
          { label: "0-30 Days", value: totals.days0to30 },
          { label: "31-60 Days", value: totals.days31to60 },
          { label: "61+ Days", value: (totals.days61to90 || 0) + (totals.days91to180 || 0) + (totals.days180plus || 0) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-mono font-semibold">{formatCurrency(value || 0)}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">0-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61-90 Days</TableHead>
              <TableHead className="text-right">91+ Days</TableHead>
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c: any) => (
              <TableRow key={c.customerId} className={c.days180plus > 0 ? "bg-destructive/5" : ""}>
                <TableCell>
                  <Link href={`/customers/${c.customerId}`} className="font-medium text-primary hover:underline">{c.customerName}</Link>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(c.current)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(c.days0to30)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(c.days31to60)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-amber-600">{formatCurrency(c.days61to90)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-destructive">{formatCurrency((c.days91to180 || 0) + (c.days180plus || 0))}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(c.total)}</TableCell>
              </TableRow>
            ))}
            {customers.length > 0 && (
              <TableRow className="font-semibold bg-muted/30 border-t-2">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.current)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.days0to30)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.days31to60)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.days61to90)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency((totals.days91to180 || 0) + (totals.days180plus || 0))}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totals.total)}</TableCell>
              </TableRow>
            )}
            {customers.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No receivables data</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
