import { useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateInvoice, useListCustomers, useListItems,
} from "@workspace/api-client-react";
import { QuickAddItemDialog } from "@/components/QuickAddItemDialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Trash2, Plus, ArrowLeft, SlidersHorizontal, AlertCircle,
  Info, Copy,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useDocSettings, DocCustomizerPanel } from "@/components/doc-customizer";
import { cn } from "@/lib/utils";
import { ItemCombobox } from "@/components/ItemCombobox";

/* ── Constants ── */
const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["NOS", "KG", "MTR", "LTR", "BOX", "SET", "PCS", "HRS", "DAYS", "SQM", "SQF"];
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
const COMPANY_STATE = "Maharashtra";

const DOC_TYPES = [
  { value: "TAX_INVOICE",    label: "Tax Invoice" },
  { value: "PROFORMA",       label: "Proforma Invoice" },
  { value: "CREDIT_NOTE",    label: "Credit Note" },
  { value: "DEBIT_NOTE",     label: "Debit Note" },
  { value: "BILL_OF_SUPPLY", label: "Bill of Supply" },
];

interface LineItem {
  itemId?: number;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPct: number;
  gstRate: number;
}

const emptyLine = (): LineItem => ({
  description: "", hsnSac: "", quantity: 1, unit: "NOS", rate: 0, discountPct: 0, gstRate: 18,
});

function calcLine(l: LineItem) {
  const taxable = l.quantity * l.rate * (1 - (l.discountPct || 0) / 100);
  const gstAmt  = taxable * l.gstRate / 100;
  return { taxable, gstAmt, total: taxable + gstAmt };
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

export default function NewInvoice() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: customers } = useListCustomers({});
  const { data: itemsData } = useListItems({});
  const items: any[] = itemsData ?? [];
  const { settings, update: updateSettings, reset: resetSettings } = useDocSettings("invoice");

  const today = new Date().toISOString().split("T")[0];
  const due30  = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [customerId, setCustomerId]       = useState("");
  const [type, setType]                   = useState("TAX_INVOICE");
  const [date, setDate]                   = useState(today);
  const [dueDate, setDueDate]             = useState(due30);
  const [placeOfSupply, setPlaceOfSupply] = useState(COMPANY_STATE);
  const [poReference, setPoReference]     = useState("");
  const [notes, setNotes]                 = useState("");
  const [terms, setTerms]                 = useState(settings.termsText);
  const [roundOff, setRoundOff]           = useState(false);
  const [lines, setLines]                 = useState<LineItem[]>([emptyLine()]);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [quickAdd, setQuickAdd]           = useState<{ lineIdx: number; name: string } | null>(null);

  const qc = useQueryClient();
  const createMutation = useCreateInvoice();

  const selectedCustomer = customers?.find((c: any) => String(c.id) === customerId);
  const isInterState = placeOfSupply !== COMPANY_STATE;

  const updateLine = useCallback((i: number, field: keyof LineItem, value: string | number) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }, []);

  const removeLine = (i: number) => {
    if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i));
  };

  const duplicateLine = (i: number) => {
    setLines(prev => [...prev.slice(0, i + 1), { ...prev[i] }, ...prev.slice(i + 1)]);
  };

  const fillFromItem = (lineIdx: number, item: any) => {
    setLines(prev => prev.map((l, idx) => idx === lineIdx ? {
      ...l,
      itemId: item.id,
      description: item.name,
      hsnSac: item.hsnSac || item.hsnCode || "",
      unit: item.unit || "NOS",
      rate: Number(item.sellingRate) || 0,
      gstRate: Number(item.gstRate) || 18,
    } : l));
  };

  const clearItem = (lineIdx: number) => {
    setLines(prev => prev.map((l, idx) => idx === lineIdx ? { ...emptyLine() } : l));
  };

  const totals = lines.reduce((acc, l) => {
    const c = calcLine(l);
    return { taxable: acc.taxable + c.taxable, gst: acc.gst + c.gstAmt, total: acc.total + c.total };
  }, { taxable: 0, gst: 0, total: 0 });

  const roundedTotal = roundOff ? Math.round(totals.total) : totals.total;
  const roundOffAmt  = roundedTotal - totals.total;

  /* per-rate GST breakdown */
  const gstBreakdown = lines.reduce<Record<number, { taxable: number; tax: number }>>((acc, l) => {
    const c = calcLine(l);
    if (!acc[l.gstRate]) acc[l.gstRate] = { taxable: 0, tax: 0 };
    acc[l.gstRate].taxable += c.taxable;
    acc[l.gstRate].tax     += c.gstAmt;
    return acc;
  }, {});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerId)               e.customer = "Select a customer";
    if (!date)                     e.date = "Invoice date required";
    if (lines.some(l => !l.description)) e.lines = "All lines need a description";
    if (lines.some(l => l.rate <= 0))    e.rates = "All line rates must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (andPost = false) => {
    if (!validate()) return;
    createMutation.mutate({
      data: {
        type, date, dueDate,
        customerId: Number(customerId),
        placeOfSupply,
        poReference: poReference || undefined,
        notes: notes || undefined,
        lines: lines.map(l => ({
          description: l.description, hsnSac: l.hsnSac,
          quantity: l.quantity, unit: l.unit,
          rate: l.rate, discountPct: l.discountPct || undefined,
          gstRate: l.gstRate,
        })),
      },
    } as any, {
      onSuccess: (inv: any) => {
        toast({ title: andPost ? "Invoice created & posted" : "Invoice saved as draft" });
        navigate(`/invoices/${inv.id}`);
      },
      onError: () => toast({ title: "Failed to create invoice", variant: "destructive" }),
    });
  };

  return (
    <>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">New Invoice</h1>
            <p className="text-sm text-muted-foreground">Fill in the details below to create a tax invoice.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCustomizer(true)} className="rounded-xl">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Customize Layout
          </Button>
        </div>

        {/* ── Main form ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-5">

            {/* Document info */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-700">Document Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <Field label="Document Type">
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Customer *" error={errors.customer}>
                  <Select value={customerId} onValueChange={v => {
                    setCustomerId(v);
                    const c = customers?.find((x: any) => String(x.id) === v);
                    if (c?.state && c.state !== COMPANY_STATE) setPlaceOfSupply(c.state);
                  }}>
                    <SelectTrigger className={cn("rounded-xl", errors.customer && "border-red-400")}>
                      <SelectValue placeholder="Select customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} {c.gstin ? `(${c.gstin})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Customer preview */}
                {selectedCustomer && (
                  <div className="col-span-2 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-violet-700">{selectedCustomer.name}</p>
                        {selectedCustomer.gstin && <p className="text-xs text-violet-500 font-mono mt-0.5">GSTIN: {selectedCustomer.gstin}</p>}
                        {(selectedCustomer as any).address && <p className="text-xs text-violet-400 mt-0.5">{(selectedCustomer as any).address}</p>}
                      </div>
                      {isInterState && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-bold">
                          Inter-state · IGST applies
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <Field label="Invoice Date *" error={errors.date}>
                  <DateInput value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
                </Field>
                <Field label="Due Date *">
                  <DateInput value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-xl" />
                </Field>
                <Field label="Place of Supply">
                  <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="PO Reference">
                  <Input placeholder="PO-2026-001" value={poReference} onChange={e => setPoReference(e.target.value)} className="rounded-xl" />
                </Field>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Notes</Label>
                  <Textarea placeholder="Additional notes printed on the invoice…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="rounded-xl resize-none" />
                </div>
              </CardContent>
            </Card>

            {/* Line items */}
            <Card className="rounded-2xl border-gray-200 overflow-x-auto">
              <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-700">Line Items</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setLines(prev => [...prev, emptyLine()])} className="rounded-xl h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              </CardHeader>
              {errors.lines || errors.rates ? (
                <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.lines || errors.rates}
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-400 w-8">#</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 w-40">Item</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-500">Description</th>
                      {settings.showHsn && <th className="px-3 py-3 text-xs font-bold text-gray-500 w-24">HSN/SAC</th>}
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 w-16 text-right">Qty</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 w-20">Unit</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 w-28 text-right">Rate (₹)</th>
                      {settings.showDiscount && <th className="px-3 py-3 text-xs font-bold text-gray-500 w-16 text-right">Disc%</th>}
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 w-20 text-right">GST%</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-500 w-28 text-right">Total</th>
                      <th className="px-3 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => {
                      const c = calcLine(line);
                      return (
                        <tr key={i} className={cn("border-b border-gray-100 hover:bg-blue-50/20 group", i % 2 === 1 && "bg-gray-50/40")}>
                          <td className="px-2 py-2.5 text-center text-xs text-gray-400 font-medium select-none">{i + 1}</td>
                          <td className="px-2 py-2.5">
                            <ItemCombobox
                              items={items}
                              selectedId={line.itemId}
                              onSelect={item => fillFromItem(i, item)}
                              onClear={() => clearItem(i)}
                              rateMode="selling"
                              onCreateNew={name => setQuickAdd({ lineIdx: i, name })}
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            <Input className="h-9 text-sm rounded-lg" value={line.description}
                              onChange={e => updateLine(i, "description", e.target.value)} placeholder="Description…" />
                          </td>
                          {settings.showHsn && (
                            <td className="px-2 py-2.5">
                              <Input className="h-9 text-xs rounded-lg font-mono" value={line.hsnSac}
                                onChange={e => updateLine(i, "hsnSac", e.target.value)} placeholder="998313" />
                            </td>
                          )}
                          <td className="px-2 py-2.5">
                            <Input className="h-9 text-sm rounded-lg text-right" type="number" min={0}
                              value={line.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} />
                          </td>
                          <td className="px-2 py-2.5">
                            <Select value={line.unit} onValueChange={v => updateLine(i, "unit", v)}>
                              <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-2.5">
                            <Input className="h-9 text-sm rounded-lg text-right" type="number" min={0} step="0.01"
                              value={line.rate} onChange={e => updateLine(i, "rate", Number(e.target.value))} />
                          </td>
                          {settings.showDiscount && (
                            <td className="px-2 py-2.5">
                              <Input className="h-9 text-sm rounded-lg text-right" type="number" min={0} max={100}
                                value={line.discountPct} onChange={e => updateLine(i, "discountPct", Number(e.target.value))} />
                            </td>
                          )}
                          <td className="px-2 py-2.5">
                            <Select value={String(line.gstRate)} onValueChange={v => updateLine(i, "gstRate", Number(v))}>
                              <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-800 text-sm whitespace-nowrap">{formatCurrency(c.total)}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => duplicateLine(i)} title="Duplicate line"
                                className="p-1.5 rounded hover:bg-gray-100 text-transparent group-hover:text-gray-400 hover:!text-gray-600 transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removeLine(i)} title="Remove line"
                                className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
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
                <button onClick={() => setLines(prev => [...prev, emptyLine()])}
                  className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1 transition-colors">
                  <Plus className="w-3 h-3" /> Add another line
                </button>
              </div>
            </Card>

            {/* Terms */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-700">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} className="rounded-xl resize-none text-xs" placeholder="Enter terms and conditions…" />
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            <Card className="rounded-2xl border-gray-200 sticky top-4">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-700">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <SummaryRow label="Taxable Amount" value={totals.taxable} />
                <Separator className="my-1" />

                {/* GST breakdown by rate */}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GST Breakdown</p>
                {Object.entries(gstBreakdown).map(([rate, b]) => (
                  <div key={rate} className="space-y-0.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>@ {rate}% on {formatCurrency(b.taxable)}</span>
                      <span>{formatCurrency(b.tax)}</span>
                    </div>
                    {isInterState ? (
                      <div className="flex justify-between text-xs text-blue-600 pl-2">
                        <span>  IGST {rate}%</span><span>{formatCurrency(b.tax)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-xs text-violet-600 pl-2">
                          <span>  CGST {Number(rate) / 2}%</span><span>{formatCurrency(b.tax / 2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-violet-600 pl-2">
                          <span>  SGST {Number(rate) / 2}%</span><span>{formatCurrency(b.tax / 2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <Separator className="my-1" />

                <SummaryRow label="Total GST" value={totals.gst} />

                {/* Round-off */}
                <div className="flex items-center justify-between">
                  <button onClick={() => setRoundOff(r => !r)}
                    className={cn("flex items-center gap-2 text-xs font-medium transition-colors", roundOff ? "text-violet-600" : "text-muted-foreground")}>
                    <div className={cn("w-8 h-4 rounded-full relative transition-colors", roundOff ? "bg-violet-600" : "bg-gray-200")}>
                      <div className={cn("w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform", roundOff ? "translate-x-4" : "translate-x-0.5")} style={{ left: roundOff ? "auto" : "2px", right: roundOff ? "2px" : "auto" }} />
                    </div>
                    Round off
                  </button>
                  {roundOff && (
                    <span className={cn("text-xs font-semibold", roundOffAmt >= 0 ? "text-green-600" : "text-red-600")}>
                      {roundOffAmt >= 0 ? "+" : ""}{formatCurrency(Math.abs(roundOffAmt))}
                    </span>
                  )}
                </div>

                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>Total Invoice Value</span>
                  <span className="text-violet-700">{formatCurrency(roundedTotal)}</span>
                </div>

                {isInterState && (
                  <div className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    Inter-state supply — IGST applied
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <Button onClick={() => handleSave(false)} disabled={createMutation.isPending}
                    variant="outline" className="w-full rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50">
                    {createMutation.isPending ? "Saving…" : "Save as Draft"}
                  </Button>
                  <Button onClick={() => handleSave(true)} disabled={createMutation.isPending}
                    className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold">
                    Create & Post Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customizer panel */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-2 border-b border-gray-100">
                <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">Display Options</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {[
                  { key: "showHsn", label: "Show HSN/SAC" },
                  { key: "showDiscount", label: "Show Discount column" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => updateSettings({ [key]: !settings[key as keyof typeof settings] })}
                    className={cn(
                      "w-full flex items-center justify-between text-xs rounded-lg px-3 py-2 transition-colors",
                      settings[key as keyof typeof settings]
                        ? "bg-violet-50 text-violet-700 font-semibold"
                        : "text-muted-foreground hover:bg-gray-50",
                    )}
                  >
                    {label}
                    <div className={cn("w-7 h-3.5 rounded-full relative transition-colors", settings[key as keyof typeof settings] ? "bg-violet-600" : "bg-gray-200")}>
                      <div className={cn("w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-transform", settings[key as keyof typeof settings] ? "right-0.5" : "left-0.5")} />
                    </div>
                  </button>
                ))}
                <button onClick={resetSettings} className="text-[10px] text-gray-400 hover:text-gray-600 w-full text-right pt-1 transition-colors">
                  Reset defaults
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showCustomizer && (
        <DocCustomizerPanel
          docType="invoice"
          isOpen={showCustomizer}
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      <QuickAddItemDialog
        open={quickAdd !== null}
        initialName={quickAdd?.name ?? ""}
        onClose={() => setQuickAdd(null)}
        onCreated={item => {
          if (quickAdd !== null) fillFromItem(quickAdd.lineIdx, item);
          setQuickAdd(null);
        }}
      />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-gray-800">{formatCurrency(value)}</span>
    </div>
  );
}
