import { useListReceipts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

export default function ReceiptsList() {
  const { data } = useListReceipts({});
  const receipts: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payment Receipts</h1>
          <p className="text-muted-foreground text-sm">{receipts.length} receipts</p>
        </div>
        <Link href="/receipts/new"><Button><Plus className="w-4 h-4 mr-2" />Record Receipt</Button></Link>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment Mode</TableHead>
              <TableHead className="text-right">Gross Amount</TableHead>
              <TableHead className="text-right">TDS</TableHead>
              <TableHead className="text-right">Net Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((r: any) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell><Link href={`/receipts/${r.id}`} className="font-mono text-primary hover:underline">{r.receiptNo}</Link></TableCell>
                <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                <TableCell className="font-medium">{r.customerName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.paymentMode}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(r.grossAmount)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">{r.tdsDeducted > 0 ? formatCurrency(r.tdsDeducted) : "—"}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(r.netAmount)}</TableCell>
                <TableCell><Badge variant="default">{r.status}</Badge></TableCell>
              </TableRow>
            ))}
            {receipts.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No receipts found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
