import { useGetItem } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function InventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: item } = useGetItem(Number(id));
  const i = item as any;
  if (!i) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  const isLow = i.currentStock <= i.minimumStock;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold">{i.name}</h1>
            <p className="text-muted-foreground text-sm font-mono">{i.sku} · {i.hsnCode}</p>
          </div>
        </div>
        {isLow && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Current Stock", value: `${i.currentStock} ${i.unit}`, warn: isLow },
          { label: "Avg Cost", value: formatCurrency(i.averageCost), warn: false },
          { label: "Stock Value", value: formatCurrency(i.stockValue), warn: false },
          { label: "GST Rate", value: `${i.gstRate}%`, warn: false },
        ].map(({ label, value, warn }) => (
          <Card key={label}>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className={`text-xl font-mono font-semibold ${warn ? "text-destructive" : ""}`}>{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Item Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Category", value: i.category || "—" },
              { label: "Unit", value: i.unit },
              { label: "Min Stock", value: String(i.minimumStock) },
              { label: "Valuation Method", value: i.valuationMethod },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Opening Balance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Opening Stock", value: `${i.openingStock} ${i.unit}` },
              { label: "Opening Cost/unit", value: formatCurrency(i.openingCost) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold font-mono">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {(i.transactions ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Stock Movements</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">In</TableHead><TableHead className="text-right">Out</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Reference</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {i.transactions.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                  <TableCell><Badge variant="outline">{t.transactionType}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-green-600">{t.quantityIn > 0 ? t.quantityIn : "—"}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{t.quantityOut > 0 ? t.quantityOut : "—"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{t.balanceQty}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.referenceNo || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
