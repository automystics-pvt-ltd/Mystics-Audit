import { useGetPurchaseOrder, useApprovePurchaseOrder, getGetPurchaseOrderQueryKey, getListPurchaseOrdersQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function PoDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: po } = useGetPurchaseOrder(Number(id));
  const approveMutation = useApprovePurchaseOrder();
  const p = po as any;

  const handleApprove = () => {
    approveMutation.mutate({ id: Number(id) } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(Number(id)) }); qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }); },
    });
  };

  if (!p) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  const STATUS_COLORS: Record<string, "default" | "secondary" | "outline"> = { approved: "default", draft: "secondary", closed: "outline" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases/orders"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold font-mono">{p.poNo}</h1>
            <p className="text-muted-foreground text-sm">{p.vendorName} · {formatDate(p.date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={STATUS_COLORS[p.status] ?? "secondary"}>{p.status}</Badge>
          {p.status === "draft" && (
            <Button onClick={handleApprove} disabled={approveMutation.isPending}><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Amount", value: formatCurrency(p.totalAmount) },
          { label: "Received", value: formatCurrency(p.receivedAmount) },
          { label: "Billed", value: formatCurrency(p.billedAmount) },
        ].map(({ label, value }) => (
          <Card key={label}><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader><CardContent><p className="text-xl font-mono font-semibold">{value}</p></CardContent></Card>
        ))}
      </div>
      {p.deliveryDate && <div className="text-sm text-muted-foreground">Expected delivery: <span className="font-medium text-foreground">{formatDate(p.deliveryDate)}</span></div>}
      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Description</TableHead><TableHead>HSN/SAC</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(p.lines ?? []).map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{l.description}</TableCell>
                <TableCell className="font-mono text-sm">{l.hsnSac}</TableCell>
                <TableCell className="text-right">{l.quantity} {l.unit}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(l.rate)}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{l.receivedQty}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(l.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
