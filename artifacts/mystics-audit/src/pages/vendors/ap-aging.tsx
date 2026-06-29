import { useGetApAging } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function ApAging() {
  const { data } = useGetApAging();
  const d = data as any;
  const totals = d?.totals ?? {};
  const vendors: any[] = d?.vendors ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AP Aging Report</h1>
        <p className="text-muted-foreground text-sm">As of {d?.asOf ? formatDate(d.asOf) : "today"}</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Current", value: totals.current },
          { label: "0-30 Days", value: totals.days0to30 },
          { label: "31-60 Days", value: totals.days31to60 },
          { label: "61+ Days", value: (totals.days61to90 || 0) + (totals.days180plus || 0) },
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
              <TableHead>Vendor</TableHead>
              <TableHead>MSME</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">0-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61+ Days</TableHead>
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v: any) => (
              <TableRow key={v.vendorId} className={v.msmeBreachRisk ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                <TableCell>
                  <Link href={`/vendors/${v.vendorId}`} className="font-medium text-primary hover:underline">{v.vendorName}</Link>
                  {v.msmeBreachRisk && <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" />MSME breach risk</p>}
                </TableCell>
                <TableCell>{v.isMsme ? <Badge className="bg-amber-500 text-white text-xs">MSME</Badge> : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(v.current)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(v.days0to30)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(v.days31to60)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-amber-600">{formatCurrency(v.days61to90 || 0)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(v.total)}</TableCell>
              </TableRow>
            ))}
            {vendors.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No payables data</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
