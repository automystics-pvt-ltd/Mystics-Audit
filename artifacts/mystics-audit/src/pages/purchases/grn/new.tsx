import { useCreateGrn, useListPurchaseOrders, useGetPurchaseOrder, getListGrnsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function NewGrn() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: ordersData } = useListPurchaseOrders({ status: "approved" });
  const orders: any[] = ordersData ?? [];
  const mutation = useCreateGrn();

  const [poId, setPoId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [receivedQtys, setReceivedQtys] = useState<Record<number, string>>({});

  const { data: poData } = useGetPurchaseOrder(poId ? Number(poId) : 0);
  const po = poId ? poData as any : null;

  const handleSubmit = () => {
    const lines = (po?.lines ?? []).map((l: any) => ({
      poLineId: l.id,
      quantityReceived: parseFloat(receivedQtys[l.id] || "0"),
    }));
    mutation.mutate({ data: { poId: parseInt(poId), date, notes, lines } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListGrnsQueryKey() }); navigate("/purchases/grn"); },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/purchases/grn"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Goods Receipt</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>GRN Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Purchase Order *</Label>
            <Select value={poId} onValueChange={v => { setPoId(v); setReceivedQtys({}); }}>
              <SelectTrigger><SelectValue placeholder="Select approved PO..." /></SelectTrigger>
              <SelectContent>{orders.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.poNo} — {o.vendorName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Receipt Date *</Label><DateInput value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </CardContent>
      </Card>

      {po && (
        <Card>
          <CardHeader><CardTitle>Receive Items</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Description</TableHead><TableHead className="text-right">Ordered</TableHead><TableHead className="text-right">Already Received</TableHead><TableHead className="text-right">Receiving Now</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(po.lines ?? []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.description}</TableCell>
                  <TableCell className="text-right font-mono">{l.quantity} {l.unit}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{l.receivedQty}</TableCell>
                  <TableCell className="text-right">
                    <Input className="w-24 text-right font-mono" placeholder="0" value={receivedQtys[l.id] ?? ""} onChange={e => setReceivedQtys(prev => ({ ...prev, [l.id]: e.target.value }))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t flex gap-3">
            <Button onClick={handleSubmit} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Create GRN"}</Button>
            <Link href="/purchases/grn"><Button variant="outline">Cancel</Button></Link>
          </div>
        </Card>
      )}
    </div>
  );
}
