import { useGetInventoryValuation } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export default function InventoryValuation() {
  const { data } = useGetInventoryValuation({});
  const d = data as any;
  const items: any[] = d?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory Valuation</h1>
        <p className="text-muted-foreground text-sm">Stock valuation at cost</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Stock Value", value: formatCurrency(d?.totalValue ?? 0) },
          { label: "Total Items", value: String(items.length) },
          { label: "Low Stock Items", value: String(d?.lowStockCount ?? 0) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-mono font-semibold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Valuation Method</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Stock Value</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.valuationMethod}</TableCell>
                <TableCell className="text-right font-mono">{item.currentStock} {item.unit}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(item.averageCost)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.stockValue)}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {d?.totalValue > 0 ? ((item.stockValue / d.totalValue) * 100).toFixed(1) + "%" : "—"}
                </TableCell>
              </TableRow>
            ))}
            {items.length > 0 && (
              <TableRow className="font-semibold bg-muted/30 border-t-2">
                <TableCell colSpan={5}>Total</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(d?.totalValue ?? 0)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            )}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No inventory items</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
