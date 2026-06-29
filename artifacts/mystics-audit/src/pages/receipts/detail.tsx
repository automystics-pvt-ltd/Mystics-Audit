import { useGetReceipt } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: receipt } = useGetReceipt(Number(id));
  const r = receipt as any;
  if (!r) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/receipts"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-semibold font-mono">{r.receiptNo}</h1>
          <p className="text-muted-foreground text-sm">{r.customerName} · {formatDate(r.date)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Receipt Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Customer", value: r.customerName },
              { label: "Date", value: formatDate(r.date) },
              { label: "Payment Mode", value: r.paymentMode },
              { label: "Bank Account", value: r.bankAccountName },
              { label: "Reference No", value: r.referenceNo || "—" },
              { label: "Narration", value: r.narration || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Amount Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Gross Amount", value: formatCurrency(r.grossAmount) },
              { label: "TDS Deducted", value: formatCurrency(r.tdsDeducted) },
              { label: "Settlement Discount", value: formatCurrency(r.settlementDiscount) },
              { label: "Net Amount", value: formatCurrency(r.netAmount) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold font-mono">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {(r.allocations ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Invoice Allocations</CardTitle></CardHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Invoice No</TableHead><TableHead className="text-right">Allocated Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {r.allocations.map((a: any) => (
                <TableRow key={a.id}><TableCell className="font-mono">{a.invoiceNo}</TableCell><TableCell className="text-right font-mono">{formatCurrency(a.allocatedAmount)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
