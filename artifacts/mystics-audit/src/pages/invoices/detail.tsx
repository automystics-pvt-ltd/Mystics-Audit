import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetInvoice, useUpdateInvoice, useDeleteInvoice, useListReceipts,
} from "@workspace/api-client-react";
import { useCompany } from "@/contexts/company-context";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Printer, Trash2, SlidersHorizontal, Send, Download,
  CheckCircle2, Clock, AlertCircle, Receipt, FileText, Copy,
  CreditCard,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useDocSettings, DocCustomizerPanel } from "@/components/doc-customizer";
import { InvoicePrint, printInvoice } from "@/components/invoice-print";
import { cn } from "@/lib/utils";

const STATUS_CONFIGS = {
  draft:     { color: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock,         label: "Draft" },
  posted:    { color: "bg-blue-100 text-blue-700 border-blue-200",      icon: CheckCircle2,  label: "Posted" },
  paid:      { color: "bg-green-100 text-green-700 border-green-200",   icon: CheckCircle2,  label: "Paid" },
  partial:   { color: "bg-violet-100 text-violet-700 border-violet-200", icon: Receipt,      label: "Partial" },
  cancelled: { color: "bg-red-100 text-red-700 border-red-200",         icon: AlertCircle,   label: "Cancelled" },
  overdue:   { color: "bg-red-100 text-red-700 border-red-200",         icon: AlertCircle,   label: "Overdue" },
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const { data: invoice, isLoading } = useGetInvoice(Number(id));
  const { data: receipts } = useListReceipts({});
  const updateMutation = useUpdateInvoice();
  const { company } = useCompany();
  const deleteMutation = useDeleteInvoice();

  const { settings, update: updateSettings, reset: resetSettings } = useDocSettings("invoice");
  const [confirm, setConfirm] = useState<"post" | "delete" | null>(null);

  const relatedReceipts = receipts?.filter((r: any) => r.customerId === invoice?.customerId) ?? [];

  const handlePost = () => setConfirm("post");
  const handleDelete = () => setConfirm("delete");

  const doPost = () => {
    updateMutation.mutate({ id: Number(id), data: {} } as any, {
      onSuccess: () => { setConfirm(null); toast({ title: "✓ Invoice posted", description: "Journal entries created" }); },
      onError: () => toast({ title: "Failed to post invoice", variant: "destructive" }),
    });
  };

  const doDelete = () => {
    deleteMutation.mutate({ id: Number(id) } as any, {
      onSuccess: () => { setConfirm(null); toast({ title: "Invoice deleted" }); navigate("/invoices"); },
      onError: () => toast({ title: "Failed to delete invoice", variant: "destructive" }),
    });
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => { printInvoice(invoice?.invoiceNo); setShowPrint(false); }, 300);
  };

  const handlePdf = () => {
    setShowPrint(true);
    setTimeout(() => { printInvoice(invoice?.invoiceNo); setShowPrint(false); }, 300);
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-40 col-span-2" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!invoice) return <div className="text-muted-foreground p-8 text-center">Invoice not found.</div>;

  const statusKey = (invoice.status || "draft") as keyof typeof STATUS_CONFIGS;
  const statusCfg = STATUS_CONFIGS[statusKey] ?? STATUS_CONFIGS.draft;
  const StatusIcon = statusCfg.icon;
  const isInterState = invoice.igst > 0;
  const paidPct = invoice.totalAmount > 0 ? Math.round((invoice.paidAmount / invoice.totalAmount) * 100) : 0;

  return (
    <>
      <div className="space-y-5">
        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-start gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{invoice.invoiceNo}</h1>
              <span className={cn("flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border", statusCfg.color)}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoice.type?.replace(/_/g, " ")} · {invoice.customerName} · Due {formatDate(invoice.dueDate)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {invoice.status === "draft" && (
              <Button size="sm" onClick={handlePost} disabled={updateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {updateMutation.isPending ? "Posting…" : "Post Invoice"}
              </Button>
            )}
            {invoice.status === "posted" && invoice.balanceDue > 0 && (
              <Link href="/receipts/new">
                <Button size="sm" variant="outline" className="rounded-xl border-green-300 text-green-700 hover:bg-green-50">
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Record Payment
                </Button>
              </Link>
            )}
            <Button size="sm" variant="outline" onClick={handlePrint} className="rounded-xl">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={handlePdf} className="rounded-xl">
              <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl">
              <Send className="h-3.5 w-3.5 mr-1.5" /> Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCustomizer(true)} className="rounded-xl">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Customize
            </Button>
            {invoice.status === "draft" && (
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleteMutation.isPending}
                className="rounded-xl text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Payment progress bar ── */}
        {invoice.status !== "draft" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Payment Progress</span>
              <span className="text-sm font-bold text-violet-600">{paidPct}% collected</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${paidPct}%`, background: paidPct === 100 ? "#059669" : "linear-gradient(90deg, #7c3aed, #06b6d4)" }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Paid: <span className="font-semibold text-green-600">{formatCurrency(invoice.paidAmount)}</span></span>
              <span>Balance: <span className={cn("font-semibold", invoice.balanceDue > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(invoice.balanceDue)}</span></span>
              <span>Total: <span className="font-semibold text-gray-800">{formatCurrency(invoice.totalAmount)}</span></span>
            </div>
          </div>
        )}

        {/* ── Details + Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 rounded-2xl border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-500" /> Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <InfoRow label="Customer"      value={invoice.customerName} />
                {invoice.customerGstin && <InfoRow label="Customer GSTIN" value={invoice.customerGstin} mono />}
                <InfoRow label="Invoice Date"  value={formatDate(invoice.date)} />
                <InfoRow label="Due Date"      value={formatDate(invoice.dueDate)} />
                <InfoRow label="Place of Supply" value={invoice.placeOfSupply} />
                {invoice.poReference && <InfoRow label="PO Reference" value={invoice.poReference} />}
                {invoice.notes && <InfoRow label="Notes" value={invoice.notes} colSpan />}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700">Amount Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <AmtRow label="Taxable Amount" value={invoice.taxableAmount} />
              {isInterState
                ? <AmtRow label="IGST" value={invoice.igst} />
                : <><AmtRow label="CGST" value={invoice.cgst} /><AmtRow label="SGST" value={invoice.sgst} /></>}
              <Separator />
              <AmtRow label="Total Amount" value={invoice.totalAmount} bold />
              <AmtRow label="Paid" value={invoice.paidAmount} color="text-green-600" />
              <AmtRow label="Balance Due" value={invoice.balanceDue} color={invoice.balanceDue > 0 ? "text-red-600" : "text-green-600"} bold />
            </CardContent>
          </Card>
        </div>

        {/* ── Line items ── */}
        {invoice.lines?.length > 0 && (
          <Card className="rounded-2xl border-gray-200 overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">Line Items</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["#", "Description", "HSN/SAC", "Qty", "Unit", "Rate", "Disc%", "GST%", "Taxable", isInterState ? "IGST" : "CGST", !isInterState && "SGST", "Total"].filter(Boolean).map(h => (
                      <th key={h as string} className={cn("px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide", h === "#" ? "text-left" : h === "Description" ? "text-left" : "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line: any, i: number) => {
                    const gstAmt = line.cgst + line.sgst + line.igst;
                    return (
                      <tr key={line.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{line.description}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">{line.hsnSac || "—"}</td>
                        <td className="px-4 py-3 text-right">{line.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{line.unit}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(line.rate)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{line.discountPct || 0}%</td>
                        <td className="px-4 py-3 text-right text-gray-500">{line.gstRate}%</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(line.taxableValue)}</td>
                        {isInterState
                          ? <td className="px-4 py-3 text-right">{formatCurrency(line.igst)}</td>
                          : <><td className="px-4 py-3 text-right">{formatCurrency(line.cgst)}</td><td className="px-4 py-3 text-right">{formatCurrency(line.sgst)}</td></>}
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(line.lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-violet-50/50 border-t-2 border-violet-100">
                  <tr>
                    <td colSpan={8} className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Totals</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(invoice.taxableAmount)}</td>
                    {isInterState
                      ? <td className="px-4 py-3 text-right font-bold">{formatCurrency(invoice.igst)}</td>
                      : <><td className="px-4 py-3 text-right font-bold">{formatCurrency(invoice.cgst)}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(invoice.sgst)}</td></>}
                    <td className="px-4 py-3 text-right font-bold text-violet-700">{formatCurrency(invoice.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}

        {/* ── Related receipts ── */}
        {relatedReceipts.length > 0 && (
          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-green-500" /> Payment Receipts ({relatedReceipts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Receipt No", "Date", "Mode", "Gross Amount", "TDS", "Net Amount"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-xs font-bold text-gray-500 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relatedReceipts.slice(0, 5).map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/receipts/${r.id}`}>
                          <span className="text-violet-600 hover:underline font-medium cursor-pointer">{r.receiptNo}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{formatDate(r.date)}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{r.paymentMode}</span></td>
                      <td className="px-4 py-2.5 font-medium">{formatCurrency(r.grossAmount)}</td>
                      <td className="px-4 py-2.5 text-red-600">{r.tdsDeducted > 0 ? formatCurrency(r.tdsDeducted) : "—"}</td>
                      <td className="px-4 py-2.5 font-bold text-green-700">{formatCurrency(r.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Document Customizer Panel ── */}
      <DocCustomizerPanel
        docType="invoice"
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        settings={settings}
        onUpdate={updateSettings}
        onReset={resetSettings}
      />

      {/* ── Confirmation dialogs ── */}
      <ConfirmDialog
        open={confirm === "post"}
        onOpenChange={o => !o && setConfirm(null)}
        title="Post Invoice"
        description="Posting will generate journal entries and lock this invoice for editing. This action cannot be undone."
        confirmLabel="Post Invoice"
        variant="warning"
        onConfirm={doPost}
        loading={updateMutation.isPending}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={o => !o && setConfirm(null)}
        title="Delete Draft Invoice"
        description="This will permanently delete the invoice. This action cannot be undone."
        confirmLabel="Delete Invoice"
        variant="destructive"
        onConfirm={doDelete}
        loading={deleteMutation.isPending}
      />

      {/* ── Print view (hidden, shown on print) ── */}
      {showPrint && (
        <div className="fixed inset-0 z-[100] bg-white overflow-auto p-8" id="invoice-print-area">
          <InvoicePrint
            invoice={{
              invoiceNo: invoice.invoiceNo,
              type: invoice.type,
              date: invoice.date,
              dueDate: invoice.dueDate,
              customerName: invoice.customerName,
              customerGstin: invoice.customerGstin,
              placeOfSupply: invoice.placeOfSupply,
              poReference: invoice.poReference,
              notes: invoice.notes,
              taxableAmount: invoice.taxableAmount,
              cgst: invoice.cgst,
              sgst: invoice.sgst,
              igst: invoice.igst,
              totalAmount: invoice.totalAmount,
              paidAmount: invoice.paidAmount,
              balanceDue: invoice.balanceDue,
              status: invoice.status,
              lines: invoice.lines ?? [],
            }}
            settings={settings}
            company={company ? {
              name:    company.legalName,
              gstin:   company.gstin ?? "",
              address: [company.address, company.city, company.state, company.pincode].filter(Boolean).join(", "),
              phone:   company.phone ?? "",
              email:   company.email ?? "",
              website: company.website ?? undefined,
              logoUrl: company.logoUrl ?? null,
            } : undefined}
          />
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value, mono, colSpan }: { label: string; value?: string | null; mono?: boolean; colSpan?: boolean }) {
  if (!value) return null;
  return (
    <>
      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className={cn("font-medium text-gray-800", mono && "font-mono text-xs", colSpan && "col-span-1")}>{value}</div>
    </>
  );
}

function AmtRow({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <div className={cn("flex justify-between", bold && "font-semibold text-base")}>
      <span className={cn("text-muted-foreground", bold && "text-gray-800")}>{label}</span>
      <span className={cn(color)}>{formatCurrency(value)}</span>
    </div>
  );
}
