import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateInvoice, useListCustomers, useListItems } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

interface LineItem {
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPct: number;
  gstRate: number;
}

const emptyLine = (): LineItem => ({
  description: "",
  hsnSac: "",
  quantity: 1,
  unit: "NOS",
  rate: 0,
  discountPct: 0,
  gstRate: 18,
});

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["NOS", "KG", "MTR", "LTR", "BOX", "SET", "PCS", "HRS", "DAYS"];
const STATES = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Gujarat", "Rajasthan", "Uttar Pradesh", "West Bengal", "Telangana", "Andhra Pradesh", "Kerala", "Madhya Pradesh", "Punjab", "Haryana", "Bihar"];

export default function NewInvoice() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: customers } = useListCustomers({});
  const { data: items } = useListItems({});

  const today = new Date().toISOString().split("T")[0];
  const due30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [customerId, setCustomerId] = useState<string>("");
  const [type, setType] = useState("TAX_INVOICE");
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(due30);
  const [placeOfSupply, setPlaceOfSupply] = useState("Maharashtra");
  const [poReference, setPoReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const createMutation = useCreateInvoice();

  const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const removeLine = (i: number) => {
    if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i));
  };

  const fillFromItem = (lineIdx: number, itemId: string) => {
    const item = items?.find(it => String(it.id) === itemId);
    if (!item) return;
    setLines(prev => prev.map((l, idx) =>
      idx === lineIdx
        ? { ...l, description: item.name, hsnSac: item.hsnSac || "", rate: Number(item.sellingRate) || 0, gstRate: Number(item.gstRate) || 18 }
        : l
    ));
  };

  const calcLine = (l: LineItem) => {
    const taxable = l.quantity * l.rate * (1 - (l.discountPct || 0) / 100);
    const gstAmt = taxable * l.gstRate / 100;
    return { taxable, gstAmt, total: taxable + gstAmt };
  };

  const totals = lines.reduce((acc, l) => {
    const c = calcLine(l);
    return { taxable: acc.taxable + c.taxable, gst: acc.gst + c.gstAmt, total: acc.total + c.total };
  }, { taxable: 0, gst: 0, total: 0 });

  const handleSubmit = () => {
    if (!customerId) { toast({ title: "Select a customer", variant: "destructive" }); return; }
    if (lines.some(l => !l.description)) { toast({ title: "All lines need a description", variant: "destructive" }); return; }

    createMutation.mutate({
      data: {
        type,
        date,
        dueDate,
        customerId: Number(customerId),
        placeOfSupply,
        poReference: poReference || undefined,
        notes: notes || undefined,
        lines: lines.map(l => ({
          description: l.description,
          hsnSac: l.hsnSac,
          quantity: l.quantity,
          unit: l.unit,
          rate: l.rate,
          discountPct: l.discountPct || undefined,
          gstRate: l.gstRate,
        })),
      }
    } as any, {
      onSuccess: (inv) => {
        toast({ title: "Invoice created" });
        navigate(`/invoices/${inv.id}`);
      },
      onError: () => toast({ title: "Failed to create invoice", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>
          <p className="text-muted-foreground">Create a new sales invoice.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/invoices")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create Invoice"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TAX_INVOICE">Tax Invoice</SelectItem>
                    <SelectItem value="PROFORMA">Proforma Invoice</SelectItem>
                    <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                    <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Place of Supply</Label>
                <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PO Reference</Label>
                <Input placeholder="PO number…" value={poReference} onChange={e => setPoReference(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable Amount</span>
              <span>{formatCurrency(totals.taxable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST</span>
              <span>{formatCurrency(totals.gst)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-3">
              <span>Total Amount</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLines(prev => [...prev, emptyLine()])}>
              <Plus className="h-4 w-4 mr-1" /> Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {items && items.length > 0 && <TableHead className="w-36">Item</TableHead>}
                <TableHead>Description</TableHead>
                <TableHead className="w-24">HSN/SAC</TableHead>
                <TableHead className="w-16">Qty</TableHead>
                <TableHead className="w-20">Unit</TableHead>
                <TableHead className="w-24">Rate (₹)</TableHead>
                <TableHead className="w-20">Disc%</TableHead>
                <TableHead className="w-20">GST%</TableHead>
                <TableHead className="text-right w-28">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, i) => {
                const c = calcLine(line);
                return (
                  <TableRow key={i}>
                    {items && items.length > 0 && (
                      <TableCell>
                        <Select onValueChange={v => fillFromItem(i, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick…" /></SelectTrigger>
                          <SelectContent>
                            {items.map(it => <SelectItem key={it.id} value={String(it.id)}>{it.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    <TableCell>
                      <Input className="h-8 text-sm" value={line.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Description" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm" value={line.hsnSac} onChange={e => updateLine(i, "hsnSac", e.target.value)} placeholder="HSN/SAC" />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm" type="number" min={0} value={line.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Select value={line.unit} onValueChange={v => updateLine(i, "unit", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm" type="number" min={0} value={line.rate} onChange={e => updateLine(i, "rate", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm" type="number" min={0} max={100} value={line.discountPct} onChange={e => updateLine(i, "discountPct", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Select value={String(line.gstRate)} onValueChange={v => updateLine(i, "gstRate", Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(c.total)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
