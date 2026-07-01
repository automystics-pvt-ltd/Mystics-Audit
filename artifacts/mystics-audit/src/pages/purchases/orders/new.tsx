import { useCreatePurchaseOrder, useListVendors, useListItems, getListPurchaseOrdersQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { QuickAddItemDialog } from "@/components/QuickAddItemDialog";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, ArrowLeft, AlertCircle, Building2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ItemCombobox } from "@/components/ItemCombobox";

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["NOS", "KG", "MTR", "LTR", "BOX", "SET", "PCS", "HRS", "DAYS", "SQM", "SQF"];

type POLine = {
  itemId?: number;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
};

function emptyLine(): POLine {
  return { description: "", hsnSac: "", quantity: 1, unit: "NOS", rate: 0, gstRate: 18 };
}

function calcLine(l: POLine) {
  const taxable = l.quantity * l.rate;
  const gst = taxable * l.gstRate / 100;
  return { taxable, gst, total: taxable + gst };
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

export default function NewPo() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: vendorsData } = useListVendors({});
  const { data: itemsData } = useListItems({});
  const vendors: any[] = vendorsData ?? [];
  const items: any[] = itemsData ?? [];
  const mutation = useCreatePurchaseOrder();

  const [vendorId, setVendorId]           = useState("");
  const [date, setDate]                   = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate]   = useState("");
  const [notes, setNotes]                 = useState("");
  const [lines, setLines]                 = useState<POLine[]>([emptyLine()]);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  const selectedVendor = vendors.find((v: any) => String(v.id) === vendorId);

  const [quickAdd, setQuickAdd] = useState<{ lineIdx: number; name: string } | null>(null);

  const updateLine = useCallback((i: number, field: keyof POLine, value: string | number) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }, []);

  const fillFromItem = (lineIdx: number, item: any) => {
    setLines(prev => prev.map((l, idx) => idx === lineIdx ? {
      ...l,
      itemId: item.id,
      description: item.name,
      hsnSac: item.hsnSac || item.hsnCode || "",
      unit: item.unit || "NOS",
      rate: Number(item.purchaseRate) || 0,
      gstRate: Number(item.gstRate) || 18,
    } : l));
  };

  const clearItem = (lineIdx: number) => {
    setLines(prev => prev.map((l, idx) => idx === lineIdx ? emptyLine() : l));
  };

  const removeLine = (i: number) => {
    if (lines.length > 1) setLines(p => p.filter((_, idx) => idx !== i));
  };

  const duplicateLine = (i: number) => {
    setLines(prev => [...prev.slice(0, i + 1), { ...prev[i] }, ...prev.slice(i + 1)]);
  };

  const totals = lines.reduce((acc, l) => {
    const c = calcLine(l);
    return { taxable: acc.taxable + c.taxable, gst: acc.gst + c.gst, total: acc.total + c.total };
  }, { taxable: 0, gst: 0, total: 0 });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!vendorId)                       e.vendor = "Select a vendor";
    if (lines.some(l => !l.description)) e.lines  = "All lines need a description";
    if (lines.some(l => l.rate <= 0))    e.rates  = "All rates must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate({
      data: {
        vendorId: parseInt(vendorId),
        date,
        deliveryDate: deliveryDate || undefined,
        notes: notes || undefined,
        lines: lines.map(l => ({
          description: l.description,
          hsnSac: l.hsnSac,
          quantity: l.quantity,
          unit: l.unit,
          rate: l.rate,
          gstRate: l.gstRate,
        })),
      },
    } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
        toast({ title: "✓ Purchase Order created" });
        navigate("/purchases/orders");
      },
      onError: () => toast({ title: "Failed to create PO", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/purchases/orders">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">New Purchase Order</h1>
          <p className="text-sm text-muted-foreground">Create a PO to send to your supplier</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* PO Details */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">PO Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">

              <div className="col-span-2">
                <Field label="Vendor *" error={errors.vendor}>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger className={cn("rounded-xl", errors.vendor && "border-red-400")}>
                      <SelectValue placeholder="Select vendor…" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v: any) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.name} {v.gstin ? `· ${v.gstin}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {selectedVendor && (
                <div className="col-span-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-800">{selectedVendor.name}</p>
                      {selectedVendor.gstin && (
                        <p className="text-xs text-blue-500 font-mono">GSTIN: {selectedVendor.gstin}</p>
                      )}
                      {selectedVendor.isMsme && (
                        <span className="text-[10px] bg-blue-200 text-blue-700 rounded-full px-2 py-0.5 font-bold mt-1 inline-block">
                          MSME Vendor
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Field label="PO Date *">
                <DateInput value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
              </Field>

              <Field label="Delivery Date">
                <DateInput value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="rounded-xl" />
              </Field>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Notes / Terms</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-xl resize-none text-sm"
                  placeholder="Payment terms, delivery instructions…"
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-700">Line Items</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setLines(p => [...p, emptyLine()])} className="rounded-xl h-8">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
              </Button>
            </CardHeader>
            {(errors.lines || errors.rates) && (
              <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5" />{errors.lines || errors.rates}
              </div>
            )}
            <div>
              <table className="w-full text-sm table-fixed">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-2 py-2.5 text-center text-xs font-bold text-gray-400 w-6">#</th>
                    <th className="px-2 py-2.5 text-left text-xs font-bold text-gray-500 w-32">Item</th>
                    <th className="px-2 py-2.5 text-left text-xs font-bold text-gray-500">Description</th>
                    <th className="px-2 py-2.5 text-xs font-bold text-gray-500 w-14 text-center">HSN/SAC</th>
                    <th className="px-2 py-2.5 text-xs font-bold text-gray-500 w-10 text-right">Qty</th>
                    <th className="px-2 py-2.5 text-xs font-bold text-gray-500 w-14">Unit</th>
                    <th className="px-2 py-2.5 text-xs font-bold text-gray-500 w-16 text-right">Rate (₹)</th>
                    <th className="px-2 py-2.5 text-xs font-bold text-gray-500 w-14 text-right">GST%</th>
                    <th className="px-2 py-2.5 text-xs font-bold text-gray-500 w-16 text-right">Amount</th>
                    <th className="px-2 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const c = calcLine(l);
                    return (
                      <tr key={i} className={cn("border-b border-gray-100 hover:bg-blue-50/20 group", i % 2 === 1 && "bg-gray-50/40")}>
                        <td className="px-2 py-2 text-center text-xs text-gray-400 font-medium select-none">{i + 1}</td>
                        <td className="px-1.5 py-2">
                          <ItemCombobox
                            items={items}
                            selectedId={l.itemId}
                            onSelect={item => fillFromItem(i, item)}
                            onClear={() => clearItem(i)}
                            rateMode="purchase"
                            onCreateNew={name => setQuickAdd({ lineIdx: i, name })}
                          />
                        </td>
                        <td className="px-1.5 py-2">
                          <Input className="h-8 text-xs rounded-lg" value={l.description}
                            onChange={e => updateLine(i, "description", e.target.value)} placeholder="Description…" />
                        </td>
                        <td className="px-1.5 py-2">
                          <Input className="h-8 text-xs rounded-lg font-mono text-center" value={l.hsnSac}
                            onChange={e => updateLine(i, "hsnSac", e.target.value)} placeholder="998313" />
                        </td>
                        <td className="px-1.5 py-2">
                          <Input className="h-8 text-xs rounded-lg text-right" type="number" min={0}
                            value={l.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} />
                        </td>
                        <td className="px-1.5 py-2">
                          <Select value={l.unit} onValueChange={v => updateLine(i, "unit", v)}>
                            <SelectTrigger className="h-8 text-xs rounded-lg px-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1.5 py-2">
                          <Input className="h-8 text-xs rounded-lg text-right" type="number" min={0} step="0.01"
                            value={l.rate} onChange={e => updateLine(i, "rate", Number(e.target.value))} />
                        </td>
                        <td className="px-1.5 py-2">
                          <Select value={String(l.gstRate)} onValueChange={v => updateLine(i, "gstRate", Number(v))}>
                            <SelectTrigger className="h-8 text-xs rounded-lg px-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-gray-800 text-xs whitespace-nowrap">{formatCurrency(c.total)}</td>
                        <td className="px-1.5 py-2">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => duplicateLine(i)} title="Duplicate line"
                              className="p-1 rounded hover:bg-gray-100 text-transparent group-hover:text-gray-400 hover:!text-gray-600 transition-colors">
                              <Copy className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeLine(i)} title="Remove line"
                              className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setLines(p => [...p, emptyLine()])}
                className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add another line
              </button>
            </div>
          </Card>
        </div>

        {/* Right: Summary */}
        <div>
          <Card className="rounded-2xl border-gray-200 sticky top-4">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">PO Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <SumRow label="Subtotal (ex-GST)" value={totals.taxable} />
              <SumRow label="Total GST" value={totals.gst} />
              <Separator />
              <div className="flex justify-between font-bold text-base text-gray-900">
                <span>Total PO Value</span>
                <span className="text-violet-700">{formatCurrency(totals.total)}</span>
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold"
                >
                  {mutation.isPending ? "Creating…" : "Create Purchase Order"}
                </Button>
                <Link href="/purchases/orders">
                  <Button variant="outline" className="w-full rounded-xl">Cancel</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <QuickAddItemDialog
        open={quickAdd !== null}
        initialName={quickAdd?.name ?? ""}
        onClose={() => setQuickAdd(null)}
        onCreated={item => {
          if (quickAdd !== null) fillFromItem(quickAdd.lineIdx, item);
          setQuickAdd(null);
        }}
      />
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-gray-800">{formatCurrency(value)}</span>
    </div>
  );
}
