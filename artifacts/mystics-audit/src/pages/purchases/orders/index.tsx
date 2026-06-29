import { useListPurchaseOrders } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  approved: "default", draft: "secondary", closed: "outline", cancelled: "destructive",
};

export default function PoList() {
  const [status, setStatus] = useState("");
  const { data } = useListPurchaseOrders(status ? { status } : {});
  const orders: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm">{orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchases/grn"><Button variant="outline">Goods Receipts</Button></Link>
          <Link href="/purchases/orders/new"><Button><Plus className="w-4 h-4 mr-2" />New PO</Button></Link>
        </div>
      </div>
      <div className="flex gap-2">
        {["", "draft", "approved", "closed", "cancelled"].map(s => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" onClick={() => setStatus(s)}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO No</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o: any) => (
              <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell><Link href={`/purchases/orders/${o.id}`} className="font-mono text-primary hover:underline">{o.poNo}</Link></TableCell>
                <TableCell className="font-medium">{o.vendorName}</TableCell>
                <TableCell className="text-sm">{formatDate(o.date)}</TableCell>
                <TableCell className="text-sm">{o.deliveryDate ? formatDate(o.deliveryDate) : "—"}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(o.totalAmount)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(o.receivedAmount)}</TableCell>
                <TableCell><Badge variant={STATUS_COLORS[o.status] ?? "secondary"}>{o.status}</Badge></TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No purchase orders found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
