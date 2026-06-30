import { useCreateBill, useListVendors, getListBillsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Plus, Trash2, ArrowLeft, AlertCircle, SlidersHorizontal,
  Building2, Info, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["NOS", "KG", "MTR", "LTR", "BOX", "SET", "PCS", "HRS", "DAYS"];
const TDS_SECTIONS = ["None", "194C – Contractor (1%)", "194J – Professional (10%)", "194I – Rent (10%)", "194H – Commission (5%)", "194A – Interest (10%)", "194Q – Purchase (0.1%)"];

type Line = {
  description: string; hsnSac: string;
  quantity: number; unit: string;
  rate: number; gstRate: number;
};

function emptyLine(): Line {
  return { description: "", hsnSac: "", quantity: 1, unit: "NOS", rate: 0, gstRate: 18 };
}

function calcLine(l: Line) {
  const taxable = l.quantity * l.rate;
  const gst     = taxable * l.gstRate / 100;
  return { taxable, gst, total: taxable + gst };
}

const TDS_RATES: Record<string, number> = {
  "194C – Contractor (1%)": 0.01, "194J – Professional (10%)": 0.1,
  "194I – Rent (10%)": 0.1, "194H – Commission (5%)": 0.05,
  "194A – Interest (10%)": 0.1, "194Q – Purchase (0.1%)": 0.001,
};

export default function NewBill() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: vendorsData } = useListVendors({});
  const vendors: any[] = vendorsData ?? [];
  const mutation = useCreateBill();

  const [vendorId, setVendorId]           = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [date, setDate]                   = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate]             = useState("");
  const [tdsSection, setTdsSection]       = useState("None");
  const [notes, setNotes]                 = useState("");
  const [lines, setLines]                 = useState<Line[]>([emptyLine()]);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  const selectedVendor = vendors.find((v: any) => String(v.id) === vendorId);

  const updateLine = useCallback((i: number, field: keyof Line, val: string | number) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }, []);

  const totals = lines.reduce((acc, l) => {
    const c = calcLine(l);
    return { taxable: acc.taxable + c.taxable, gst: acc.gst + c.gst, total: acc.total + c.total };
  }, { taxable: 0, gst: 0, total: 0 });

  const tdsRate = TDS_RATES[tdsSection] ?? 0;
  const tdsAmt  = totals.taxable * tdsRate;
  const netPayable = totals.total - tdsAmt;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!vendorId)                          e.vendor = "Select a vendor";
    if (!vendorInvoiceNo)                   e.invNo = "Vendor invoice number required";
    if (!dueDate)                           e.dueDate = "Due date required";
    if (lines.some(l => !l.description))    e.lines = "All lines need a description";
    if (lines.some(l => l.rate <= 0))       e.rates = "All rates must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate({
      data: {
        vendorId: parseInt(vendorId),
        vendorInvoiceNo, date, dueDate, notes,
        lines: lines.map(l => ({
          description: l.description, hsnSac: l.hsnSac,
          quantity: l.quantity, unit: l.unit,
          rate: l.rate, gstRate: l.gstRate,
        })),
      },
    } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
        toast({ title: "✓ Bill created" });
        navigate("/bills");
      },
      onError: () => toast({ title: "Failed to create bill", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/bills">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">New Vendor Bill</h1>
          <p className="text-sm text-muted-foreground">Record a supplier invoice for AP tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Bill details */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">Bill Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Vendor *</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger className={cn("rounded-xl", errors.vendor && "border-red-400")}>
                    <SelectValue placeholder="Select vendor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} {v.isMsme ? "🔷" : ""} {v.gstin ? `· ${v.gstin}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendor && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.vendor}</p>}
              </div>

              {/* Vendor chip */}
              {selectedVendor && (
                <div className="col-span-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-800">{selectedVendor.name}</p>
                      {selectedVendor.gstin && <p className="text-xs text-blue-500 font-mono">GSTIN: {selectedVendor.gstin}</p>}
                      {selectedVendor.isMsme && (
                        <span className="text-[10px] bg-blue-200 text-blue-700 rounded-full px-2 py-0.5 font-bold mt-1 inline-block">MSME Vendor</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Vendor Invoice No *</Label>
                <Input value={vendorInvoiceNo} onChange={e => setVendorInvoiceNo(e.target.value)}
                  placeholder="INV/2026/001" className={cn("rounded-xl", errors.invNo && "border-red-400")} />
                {errors.invNo && <p className="text-xs text-red-500">{errors.invNo}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Bill Date *</Label>
                <DateInput value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Due Date *</Label>
                <DateInput value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className={cn("rounded-xl", errors.dueDate && "border-red-400")} />
                {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">TDS Section</Label>
                <Select value={tdsSection} onValueChange={setTdsSection}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TDS_SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} className="rounded-xl resize-none text-sm" placeholder="Additional notes…" />
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card className="rounded-2xl border-gray-200 overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500">Description</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-gray-500 w-24">HSN/SAC</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-gray-500 w-16 text-right">Qty</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-gray-500 w-20">Unit</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-gray-500 w-28 text-right">Rate (₹)</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-gray-500 w-20 text-right">GST%</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-gray-500 w-28 text-right">Amount</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const c = calcLine(l);
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 group">
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm rounded-lg" value={l.description}
                            onChange={e => updateLine(i, "description", e.target.value)} placeholder="Description…" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-xs rounded-lg font-mono" value={l.hsnSac}
                            onChange={e => updateLine(i, "hsnSac", e.target.value)} placeholder="998313" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm rounded-lg text-right" type="number" min={0}
                            value={l.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select value={l.unit} onValueChange={v => updateLine(i, "unit", v)}>
                            <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input className="h-8 text-sm rounded-lg text-right" type="number" min={0} step="0.01"
                            value={l.rate} onChange={e => updateLine(i, "rate", Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Select value={String(l.gstRate)} onValueChange={v => updateLine(i, "gstRate", Number(v))}>
                            <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-sm">{formatCurrency(c.total)}</td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => lines.length > 1 && setLines(p => p.filter((_, idx) => idx !== i))}
                            className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <button onClick={() => setLines(p => [...p, emptyLine()])}
                className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add another line
              </button>
            </div>
          </Card>
        </div>

        {/* Right: Summary */}
        <div>
          <Card className="rounded-2xl border-gray-200 sticky top-4">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <SumRow label="Taxable Amount" value={totals.taxable} />
              <SumRow label="GST"            value={totals.gst} />
              <Separator />
              <SumRow label="Gross Total"    value={totals.total} />
              {tdsAmt > 0 && (
                <>
                  <SumRow label={`TDS (${tdsSection.split("(")[1]?.replace(")", "") ?? ""})`} value={-tdsAmt} color="text-red-600" />
                  <Separator />
                  <SumRow label="Net Payable" value={netPayable} bold color="text-blue-700" />
                  <div className="flex items-start gap-1.5 text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    TDS to be deducted before payment
                  </div>
                </>
              )}
              {selectedVendor?.isMsme && (
                <div className="flex items-start gap-1.5 text-xs bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-blue-700">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  MSME vendor — payment due within 45 days
                </div>
              )}
              <div className="pt-2 space-y-2">
                <Button onClick={handleSubmit} disabled={mutation.isPending}
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold">
                  {mutation.isPending ? "Creating…" : "Create Bill"}
                </Button>
                <Link href="/bills">
                  <Button variant="outline" className="w-full rounded-xl">Cancel</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SumRow({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <div className={cn("flex justify-between", bold && "font-bold text-base")}>
      <span className={cn("text-muted-foreground", bold && "text-gray-800")}>{label}</span>
      <span className={cn("font-medium", color ?? "text-gray-800")}>{formatCurrency(Math.abs(value))}</span>
    </div>
  );
}
