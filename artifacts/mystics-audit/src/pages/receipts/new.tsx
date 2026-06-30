import { useState } from "react";
import {
  useCreateReceipt, useListCustomers, useListBankAccounts, useListInvoices,
  getListReceiptsQueryKey,
} from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, AlertCircle, CheckSquare, Square, SlidersHorizontal,
  Info, CreditCard, Banknote, Building2, Smartphone,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useDocSettings, DocCustomizerPanel } from "@/components/doc-customizer";
import { cn } from "@/lib/utils";

const PAYMENT_MODES = [
  { value: "NEFT",          label: "NEFT",          icon: Building2, hint: "National Electronic Funds Transfer" },
  { value: "RTGS",          label: "RTGS",          icon: Building2, hint: "Real Time Gross Settlement" },
  { value: "UPI",           label: "UPI",           icon: Smartphone, hint: "Unified Payments Interface" },
  { value: "Cheque",        label: "Cheque",        icon: CreditCard, hint: "Bank Cheque" },
  { value: "Cash",          label: "Cash",          icon: Banknote, hint: "Cash payment" },
  { value: "Bank Transfer", label: "Bank Transfer", icon: Building2, hint: "Direct bank transfer" },
  { value: "IMPS",          label: "IMPS",          icon: Smartphone, hint: "Immediate Payment Service" },
];

const TDS_SECTIONS = ["None", "194C – Contractor", "194J – Professional", "194A – Interest", "194I – Rent", "194H – Commission", "194Q – Purchase"];

export default function NewReceipt() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: customersData } = useListCustomers({});
  const { data: banksData }     = useListBankAccounts();
  const customers: any[] = customersData ?? [];
  const banks: any[]     = banksData ?? [];

  const [customerId, setCustomerId]         = useState("");
  const [date, setDate]                     = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode]       = useState("NEFT");
  const [bankAccountId, setBankAccountId]   = useState("");
  const [grossAmount, setGrossAmount]       = useState("");
  const [tdsDeducted, setTdsDeducted]       = useState("0");
  const [tdsSection, setTdsSection]         = useState("None");
  const [settlementDiscount, setSettlement] = useState("0");
  const [referenceNo, setReferenceNo]       = useState("");
  const [chequeDate, setChequeDate]         = useState("");
  const [bankName, setBankName]             = useState("");
  const [narration, setNarration]           = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [showCustomizer, setShowCustomizer] = useState(false);

  const { settings, update: updateSettings, reset: resetSettings } = useDocSettings("receipt");
  const { data: invoicesData } = useListInvoices({ customerId: customerId ? Number(customerId) : undefined } as any);
  const mutation = useCreateReceipt();

  const outstandingInvoices = (invoicesData ?? []).filter(
    (inv: any) => (inv.status === "posted" || inv.status === "partial") && inv.balanceDue > 0,
  );

  const gross  = parseFloat(grossAmount) || 0;
  const tds    = parseFloat(tdsDeducted) || 0;
  const disc   = parseFloat(settlementDiscount) || 0;
  const net    = gross - tds - disc;

  const toggleInvoice = (id: number) => {
    setSelectedInvoices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const autoAllocate = () => {
    let remaining = gross;
    const allocated = new Set<number>();
    for (const inv of outstandingInvoices) {
      if (remaining <= 0) break;
      if (inv.balanceDue <= remaining) {
        allocated.add(inv.id);
        remaining -= inv.balanceDue;
      }
    }
    setSelectedInvoices(allocated);
  };

  const selectedTotal = outstandingInvoices
    .filter((inv: any) => selectedInvoices.has(inv.id))
    .reduce((s: number, inv: any) => s + inv.balanceDue, 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerId)    e.customer = "Select a customer";
    if (!bankAccountId) e.bank = "Select a bank account";
    if (gross <= 0)     e.amount = "Enter a valid amount";
    if (!referenceNo && paymentMode !== "Cash") e.ref = "Reference number required for this payment mode";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate({
      data: {
        customerId: parseInt(customerId),
        date,
        paymentMode,
        bankAccountId: parseInt(bankAccountId),
        grossAmount: gross,
        tdsDeducted: tds,
        settlementDiscount: disc,
        referenceNo: referenceNo || undefined,
        narration: narration || undefined,
        invoiceIds: Array.from(selectedInvoices),
      },
    } as any, {
      onSuccess: (r: any) => {
        qc.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
        toast({ title: "✓ Receipt recorded", description: `Receipt ${r.receiptNo} created` });
        navigate(`/receipts/${r.id}`);
      },
      onError: () => toast({ title: "Failed to record receipt", variant: "destructive" }),
    });
  };

  const modeConfig = PAYMENT_MODES.find(m => m.value === paymentMode);

  return (
    <>
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/receipts">
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Record Payment Receipt</h1>
            <p className="text-sm text-muted-foreground">Record an incoming payment from a customer</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCustomizer(true)} className="rounded-xl">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Customize Receipt
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            {/* Customer & Date */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-700">Receipt Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <FieldWrap label="Customer *" error={errors.customer}>
                  <Select onValueChange={v => { setCustomerId(v); setSelectedInvoices(new Set()); }}>
                    <SelectTrigger className={cn("rounded-xl", errors.customer && "border-red-400")}>
                      <SelectValue placeholder="Select customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>

                <FieldWrap label="Receipt Date *">
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
                </FieldWrap>

                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-gray-600 mb-2 block">Payment Mode *</Label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_MODES.map(m => {
                      const Icon = m.icon;
                      return (
                        <button key={m.value} onClick={() => setPaymentMode(m.value)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all",
                            paymentMode === m.value
                              ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
                              : "border-gray-200 text-gray-500 hover:border-violet-300 hover:bg-violet-50/50",
                          )}>
                          <Icon className="w-3.5 h-3.5" />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                  {modeConfig && <p className="text-xs text-muted-foreground mt-1.5">{modeConfig.hint}</p>}
                </div>

                <FieldWrap label="Bank Account *" error={errors.bank}>
                  <Select onValueChange={setBankAccountId}>
                    <SelectTrigger className={cn("rounded-xl", errors.bank && "border-red-400")}>
                      <SelectValue placeholder="Select bank account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b: any) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.accountName} — {b.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>

                <FieldWrap
                  label={paymentMode === "Cheque" ? "Cheque Number *" : paymentMode === "Cash" ? "Voucher No." : "UTR / Reference No *"}
                  error={errors.ref}
                >
                  <Input
                    value={referenceNo}
                    onChange={e => setReferenceNo(e.target.value)}
                    placeholder={paymentMode === "Cheque" ? "012345" : paymentMode === "Cash" ? "Optional" : "UTR/NEFT reference…"}
                    className={cn("rounded-xl", errors.ref && "border-red-400")}
                  />
                </FieldWrap>

                {paymentMode === "Cheque" && (
                  <>
                    <FieldWrap label="Cheque Date">
                      <Input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} className="rounded-xl" />
                    </FieldWrap>
                    <FieldWrap label="Drawee Bank">
                      <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="HDFC Bank, Chennai…" className="rounded-xl" />
                    </FieldWrap>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Amount & TDS */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-700">Amount & Deductions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <FieldWrap label="Gross Amount Received (₹) *" error={errors.amount}>
                  <Input
                    type="number" step="0.01" value={grossAmount}
                    onChange={e => setGrossAmount(e.target.value)}
                    placeholder="0.00" className={cn("rounded-xl font-mono text-right", errors.amount && "border-red-400")}
                  />
                </FieldWrap>

                <FieldWrap label="TDS Deducted (₹)">
                  <Input type="number" step="0.01" value={tdsDeducted}
                    onChange={e => setTdsDeducted(e.target.value)}
                    placeholder="0.00" className="rounded-xl font-mono text-right" />
                </FieldWrap>

                <FieldWrap label="TDS Section">
                  <Select value={tdsSection} onValueChange={setTdsSection}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TDS_SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWrap>

                <FieldWrap label="Settlement Discount (₹)">
                  <Input type="number" step="0.01" value={settlementDiscount}
                    onChange={e => setSettlement(e.target.value)}
                    placeholder="0.00" className="rounded-xl font-mono text-right" />
                </FieldWrap>

                <div className="col-span-2">
                  <Separator />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm font-semibold text-gray-700">Net Amount Received</span>
                    <span className={cn("text-lg font-bold", net >= 0 ? "text-green-700" : "text-red-600")}>
                      {formatCurrency(net)}
                    </span>
                  </div>
                  {net < 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Net amount cannot be negative. Check deductions.
                    </div>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Narration</Label>
                  <Textarea value={narration} onChange={e => setNarration(e.target.value)}
                    placeholder={`Being payment received from customer via ${paymentMode}…`}
                    rows={2} className="rounded-xl resize-none text-sm" />
                </div>
              </CardContent>
            </Card>

            {/* Invoice allocation */}
            {customerId && outstandingInvoices.length > 0 && (
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-700">Invoice Allocation</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Select invoices this payment settles</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={autoAllocate} className="rounded-xl h-8 text-xs">
                    Auto-allocate
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-2.5 w-8"></th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Invoice No</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Date</th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500">Total</th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500">Paid</th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingInvoices.map((inv: any) => {
                        const selected = selectedInvoices.has(inv.id);
                        return (
                          <tr key={inv.id}
                            onClick={() => toggleInvoice(inv.id)}
                            className={cn("border-b border-gray-50 cursor-pointer transition-colors", selected ? "bg-violet-50/70" : "hover:bg-gray-50")}
                          >
                            <td className="px-4 py-2.5 text-center">
                              {selected
                                ? <CheckSquare className="w-4 h-4 text-violet-600" />
                                : <Square className="w-4 h-4 text-gray-300" />}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-violet-600">{inv.invoiceNo}</td>
                            <td className="px-4 py-2.5 text-gray-500">{formatDate(inv.date)}</td>
                            <td className="px-4 py-2.5 text-right">{formatCurrency(inv.totalAmount)}</td>
                            <td className="px-4 py-2.5 text-right text-green-600">{formatCurrency(inv.paidAmount)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(inv.balanceDue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {selectedInvoices.size > 0 && (
                    <div className="px-4 py-3 border-t border-violet-100 bg-violet-50/50 flex justify-between items-center">
                      <span className="text-xs text-violet-600 font-semibold">{selectedInvoices.size} invoice(s) selected</span>
                      <span className="text-sm font-bold text-violet-700">
                        Allocated: {formatCurrency(selectedTotal)}
                        {selectedTotal > gross && (
                          <span className="ml-2 text-xs text-red-600 font-normal">(exceeds payment)</span>
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {customerId && outstandingInvoices.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <Info className="w-4 h-4" />
                No outstanding invoices for this customer.
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div>
            <Card className="rounded-2xl border-gray-200 sticky top-4">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-700">Receipt Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <SumRow label="Gross Amount"        value={gross} />
                {tds > 0 && <SumRow label={`TDS (${tdsSection !== "None" ? tdsSection.split("–")[0].trim() : ""})`} value={-tds} color="text-red-600" />}
                {disc > 0 && <SumRow label="Settlement Discount" value={-disc} color="text-amber-600" />}
                <Separator />
                <SumRow label="Net Amount Received" value={net} bold color={net >= 0 ? "text-green-700" : "text-red-600"} />
                {selectedInvoices.size > 0 && (
                  <>
                    <Separator />
                    <SumRow label="Invoices Allocated" value={selectedTotal} />
                    {selectedTotal < net && (
                      <SumRow label="Unapplied Balance" value={net - selectedTotal} color="text-amber-600" />
                    )}
                  </>
                )}
                <div className="pt-3 space-y-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={mutation.isPending || net <= 0}
                    className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    {mutation.isPending ? "Recording…" : "Record Receipt"}
                  </Button>
                  <Link href="/receipts">
                    <Button variant="outline" className="w-full rounded-xl">Cancel</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <DocCustomizerPanel
        docType="receipt"
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        settings={settings}
        onUpdate={updateSettings}
        onReset={resetSettings}
      />
    </>
  );
}

function FieldWrap({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
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
