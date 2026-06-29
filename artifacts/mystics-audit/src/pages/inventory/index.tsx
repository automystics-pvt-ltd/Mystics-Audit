import { useListItems } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Plus, Search, AlertTriangle } from "lucide-react";

export default function InventoryList() {
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const { data } = useListItems(lowStock ? { lowStock: true } : search ? { search } : {});
  const items: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-muted-foreground text-sm">{items.length} items</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/valuation"><Button variant="outline">Valuation Report</Button></Link>
          <Link href="/inventory/new"><Button><Plus className="w-4 h-4 mr-2" />New Item</Button></Link>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={lowStock ? "destructive" : "outline"} size="sm" onClick={() => setLowStock(!lowStock)}>
          <AlertTriangle className="w-4 h-4 mr-2" />Low Stock
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>HSN</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any) => {
              const isLow = item.currentStock <= item.minimumStock;
              return (
                <TableRow key={item.id} className={isLow ? "bg-destructive/5" : "hover:bg-muted/50"}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell>
                    <Link href={`/inventory/${item.id}`} className="font-medium text-primary hover:underline">{item.name}</Link>
                    {isLow && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low stock</p>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.hsnCode}</TableCell>
                  <TableCell><Badge variant="outline">{item.category || "—"}</Badge></TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${isLow ? "text-destructive" : ""}`}>{item.currentStock} {item.unit}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">{item.minimumStock}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(item.averageCost)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.stockValue)}</TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No inventory items found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
