import { useGetGstr1Data, getGetGstr1DataQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { FileCheck } from "lucide-react";

export default function Gstr1() {
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(today.getFullYear()));
  const period = `${year}-${month}`;
  const { data } = useGetGstr1Data({ period });
  const d = data as any;
  const summary = d?.summary ?? {};
  const b2b: any[] = d?.b2b ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">GSTR-1</h1>
          <p className="text-muted-foreground text-sm">Outward Supplies Return · Period: {period}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Month</Label>
            <Input type="number" min={1} max={12} className="w-16" value={month} onChange={e => setMonth(e.target.value.padStart(2, "0"))} />
            <Label className="text-sm">Year</Label>
            <Input type="number" min={2020} className="w-24" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          {d?.status !== "filed" && (
            <Button variant="default"><FileCheck className="w-4 h-4 mr-2" />File GSTR-1</Button>
          )}
          {d?.status === "filed" && <Badge variant="default">Filed</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Taxable Value", value: formatCurrency(summary.taxableValue ?? 0) },
          { label: "Total CGST", value: formatCurrency(summary.cgst ?? 0) },
          { label: "Total SGST", value: formatCurrency(summary.sgst ?? 0) },
          { label: "Total IGST", value: formatCurrency(summary.igst ?? 0) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-mono font-semibold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>B2B Invoices</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {b2b.map((row: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.customerName}</TableCell>
                <TableCell className="font-mono text-xs">{row.customerGstin}</TableCell>
                <TableCell className="font-mono text-sm">{row.invoiceNo}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(row.taxableValue)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(row.cgst)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(row.sgst)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(row.igst)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(row.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {b2b.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No B2B invoices for this period</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
