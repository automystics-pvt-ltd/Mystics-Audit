import { useGetGstReconciliation } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function GstReconciliation() {
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(today.getFullYear()));
  const period = `${year}-${month}`;
  const { data } = useGetGstReconciliation({ period });
  const d = data as any;
  const items: any[] = d?.items ?? [];
  const mismatchCount = items.filter((i: any) => i.status === "mismatch").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">GST Reconciliation</h1>
          <p className="text-muted-foreground text-sm">Books vs GSTN portal · Period: {period}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Month</Label>
          <Input type="number" min={1} max={12} className="w-16" value={month} onChange={e => setMonth(e.target.value.padStart(2, "0"))} />
          <Label className="text-sm">Year</Label>
          <Input type="number" min={2020} className="w-24" value={year} onChange={e => setYear(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total in Books</CardTitle></CardHeader><CardContent><p className="text-xl font-mono font-semibold">{formatCurrency(d?.booksTotal ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Total in GSTN</CardTitle></CardHeader><CardContent><p className="text-xl font-mono font-semibold">{formatCurrency(d?.gstnTotal ?? 0)}</p></CardContent></Card>
        <Card className={mismatchCount > 0 ? "border-amber-500" : "border-green-500"}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Mismatches</CardTitle></CardHeader>
          <CardContent><p className={`text-xl font-semibold ${mismatchCount > 0 ? "text-amber-600" : "text-green-600"}`}>{mismatchCount}</p></CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor / Customer</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead className="text-right">Books Amount</TableHead>
              <TableHead className="text-right">GSTN Amount</TableHead>
              <TableHead className="text-right">Difference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any, i: number) => (
              <TableRow key={i} className={item.status === "mismatch" ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                <TableCell className="font-medium">{item.partyName}</TableCell>
                <TableCell className="font-mono text-xs">{item.gstin}</TableCell>
                <TableCell className="font-mono text-sm">{item.invoiceNo}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(item.booksAmount)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(item.gstnAmount)}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${item.difference !== 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                  {item.difference !== 0 ? formatCurrency(Math.abs(item.difference)) : "—"}
                </TableCell>
                <TableCell>
                  {item.status === "matched"
                    ? <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle className="w-3 h-3" />Matched</span>
                    : <span className="flex items-center gap-1 text-amber-600 text-sm"><AlertTriangle className="w-3 h-3" />Mismatch</span>}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No reconciliation data</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
