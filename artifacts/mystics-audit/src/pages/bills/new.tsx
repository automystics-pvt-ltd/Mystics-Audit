import { useCreateBill, useListVendors, getListBillsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

type Line = { description: string; hsnSac: string; quantity: string; unit: string; rate: string; gstRate: string };

export default function NewBill() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: vendorsData } = useListVendors({});
  const vendors: any[] = vendorsData ?? [];
  const mutation = useCreateBill();

  const [vendorId, setVendorId] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", hsnSac: "", quantity: "1", unit: "Nos", rate: "", gstRate: "18" }]);

  const totalAmount = lines.reduce((s, l) => {
    const taxable = (parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0);
    return s + taxable * (1 + (parseFloat(l.gstRate) || 0) / 100);
  }, 0);

  const updateLine = (i: number, field: keyof Line, value: string) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleSubmit = () => {
    mutation.mutate({ data: { vendorId: parseInt(vendorId), vendorInvoiceNo, date, dueDate, notes, lines: lines.map(l => ({ ...l, quantity: parseFloat(l.quantity), rate: parseFloat(l.rate), gstRate: parseFloat(l.gstRate) })) } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListBillsQueryKey() }); navigate("/bills"); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bills"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Vendor Bill</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Bill Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Vendor *</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
              <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Vendor Invoice No</Label><Input value={vendorInvoiceNo} onChange={e => setVendorInvoiceNo(e.target.value)} /></div>
          <div className="space-y-1"><Label>Date *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>Due Date *</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
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
                <TableHead>Description</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>GST %</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell><Input value={l.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Item description" /></TableCell>
                  <TableCell><Input className="w-24" value={l.hsnSac} onChange={e => updateLine(i, "hsnSac", e.target.value)} /></TableCell>
                  <TableCell><Input className="w-20 text-right" value={l.quantity} onChange={e => updateLine(i, "quantity", e.target.value)} /></TableCell>
                  <TableCell><Input className="w-16" value={l.unit} onChange={e => updateLine(i, "unit", e.target.value)} /></TableCell>
                  <TableCell><Input className="w-28 text-right font-mono" value={l.rate} onChange={e => updateLine(i, "rate", e.target.value)} /></TableCell>
                  <TableCell>
                    <Select value={l.gstRate} onValueChange={v => updateLine(i, "gstRate", v)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>{["0","5","12","18","28"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setLines(prev => [...prev, { description: "", hsnSac: "", quantity: "1", unit: "Nos", rate: "", gstRate: "18" }])}><Plus className="w-4 h-4 mr-2" />Add Line</Button>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={!vendorId || mutation.isPending}>{mutation.isPending ? "Saving..." : "Create Bill"}</Button>
        <Link href="/bills"><Button variant="outline">Cancel</Button></Link>
      </div>
    </div>
  );
}
