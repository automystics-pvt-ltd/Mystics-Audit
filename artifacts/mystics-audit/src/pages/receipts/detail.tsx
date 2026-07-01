import { useState } from "react";
import { useGetReceipt } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowLeft, Printer, Download, Send, SlidersHorizontal,
  CheckCircle2, Building2, Smartphone, Banknote, CreditCard,
} from "lucide-react";
import { useDocSettings, DocCustomizerPanel } from "@/components/doc-customizer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { printReportPage } from "@/lib/print-utils";

const MODE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  NEFT: Building2, RTGS: Building2, UPI: Smartphone,
  Cheque: CreditCard, Cash: Banknote, "Bank Transfer": Building2, IMPS: Smartphone,
};

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: receipt, isLoading } = useGetReceipt(Number(id));
  const [showCustomizer, setShowCustomizer] = useState(false);
  const { settings, update: updateSettings, reset: resetSettings } = useDocSettings("receipt");
  const r = receipt as any;

  if (isLoading) return (
    <div className="space-y-6 p-2">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-3 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
  if (!r) return <div className="flex items-center justify-center h-48 text-muted-foreground">Receipt not found</div>;

  const ModeIcon = MODE_ICONS[r.paymentMode] ?? Building2;
  const paidPct = r.grossAmount > 0 ? 100 : 0;

  const handlePrint = () => printReportPage(`Receipt – ${r?.receiptNo ?? ""}`);

  return (
    <>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start gap-3">
          <Link href="/receipts">
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-gray-900">{r.receiptNo}</h1>
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3 h-3" /> Posted
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {r.customerName} · {formatDate(r.date)} · {r.paymentMode}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handlePrint} className="rounded-xl">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="rounded-xl">
              <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl">
              <Send className="h-3.5 w-3.5 mr-1.5" /> Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCustomizer(true)} className="rounded-xl">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Customize
            </Button>
          </div>
        </div>

        {/* ── Amount banner ── */}
        <div
          className="rounded-2xl p-5 text-white flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)" }}
        >
          <div>
            <p className="text-sm text-green-100 font-medium">Net Amount Received</p>
            <p className="text-3xl font-extrabold mt-1">{formatCurrency(r.netAmount)}</p>
            <p className="text-sm text-green-200 mt-1">
              via <span className="font-semibold">{r.paymentMode}</span>
              {r.referenceNo && <> · Ref: <span className="font-mono">{r.referenceNo}</span></>}
            </p>
          </div>
          <div className="text-right">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ModeIcon className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* ── Details grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Receipt info */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              {[
                { label: "Customer",     value: r.customerName },
                { label: "Receipt Date", value: formatDate(r.date) },
                { label: "Payment Mode", value: r.paymentMode },
                { label: "Bank Account", value: r.bankAccountName },
                { label: "Reference No", value: r.referenceNo || "—" },
                { label: "Narration",    value: r.narration || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</span>
                  <span className="font-medium text-gray-800 text-right">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Amount summary */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">Amount Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Amount</span>
                <span className="font-semibold">{formatCurrency(r.grossAmount)}</span>
              </div>
              {r.tdsDeducted > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Less: TDS Deducted</span>
                  <span className="text-red-600 font-medium">- {formatCurrency(r.tdsDeducted)}</span>
                </div>
              )}
              {r.settlementDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Less: Settlement Discount</span>
                  <span className="text-amber-600 font-medium">- {formatCurrency(r.settlementDiscount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span className="text-gray-800">Net Amount Received</span>
                <span className="text-green-700">{formatCurrency(r.netAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Invoice allocations ── */}
        {(r.allocations ?? []).length > 0 && (
          <Card className="rounded-2xl border-gray-200 overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">
                Invoice Allocations ({r.allocations.length})
              </CardTitle>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Invoice No</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500">Allocated Amount</th>
                </tr>
              </thead>
              <tbody>
                {r.allocations.map((a: any) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-violet-600">{a.invoiceNo}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(a.allocatedAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-50/60 border-t-2 border-green-100">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Total Allocated</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {formatCurrency(r.allocations.reduce((s: number, a: any) => s + a.allocatedAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )}
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
