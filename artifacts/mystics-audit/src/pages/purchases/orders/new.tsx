import { useCreatePurchaseOrder, useListVendors, getListPurchaseOrdersQueryKey } from "@workspace/api-client-react";
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
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

type POLine = { description: string; hsnSac: string; quantity: string; unit: string; rate: string; gstRate: string };

export default function NewPo() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: vendorsData } = useListVendors({});
  const vendors: any[] = vendorsData ?? [];
  const mutation = useCreatePurchaseOrder();

  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLine[]>([{ description: "", hsnSac: "", quantity: "1", unit: "Nos", rate: "", gstRate: "18" }]);

  const totalAmount = lines.reduce((s, l) => s + ((parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0)), 0);
  const update = (i: number, field: keyof POLine, value: string) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleSubmit = () => {
    mutation.mutate({ data: { vendorId: parseInt(vendorId), date, deliveryDate, notes, lines: lines.map(l => ({ ...l, quantity: parseFloat(l.quantity), rate: parseFloat(l.rate), gstRate: parseFloat(l.gstRate) })) } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }); navigate("/purchases/orders"); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchases/orders"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Purchase Order</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>PO Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Vendor *</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
              <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>PO Date *</Label><DateInput value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>Delivery Date</Label><DateInput value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
          <div className="col-span-2 space-y-1"><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Line Items</CardTitle>
            <span className="text-sm font-medium">Total: <span className="font-mono">{formatCurrency(totalAmount)}</span></span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead><TableHead>HSN/SAC</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Rate (₹)</TableHead><TableHead>GST%</TableHead><TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell><Input value={l.description} onChange={e => update(i, "description", e.target.value)} placeholder="Item..." /></TableCell>
                  <TableCell><Input className="w-24" value={l.hsnSac} onChange={e => update(i, "hsnSac", e.target.value)} /></TableCell>
                  <TableCell><Input className="w-20 text-right" value={l.quantity} onChange={e => update(i, "quantity", e.target.value)} /></TableCell>
                  <TableCell><Input className="w-16" value={l.unit} onChange={e => update(i, "unit", e.target.value)} /></TableCell>
                  <TableCell><Input className="w-28 text-right font-mono" value={l.rate} onChange={e => update(i, "rate", e.target.value)} /></TableCell>
                  <TableCell>
                    <Select value={l.gstRate} onValueChange={v => update(i, "gstRate", v)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>{["0","5","12","18","28"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setLines(p => p.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setLines(p => [...p, { description: "", hsnSac: "", quantity: "1", unit: "Nos", rate: "", gstRate: "18" }])}><Plus className="w-4 h-4 mr-2" />Add Line</Button>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={!vendorId || mutation.isPending}>{mutation.isPending ? "Saving..." : "Create PO"}</Button>
        <Link href="/purchases/orders"><Button variant="outline">Cancel</Button></Link>
      </div>
    </div>
  );
}
