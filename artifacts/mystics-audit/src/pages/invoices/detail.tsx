import { useParams, useLocation } from "wouter";
import { useGetInvoice, useUpdateInvoice, useDeleteInvoice } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoice, isLoading } = useGetInvoice(Number(id));
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();

  const handlePost = () => {
    updateMutation.mutate({ id: Number(id), data: {} } as any, {
      onSuccess: () => toast({ title: "Invoice posted" }),
      onError: () => toast({ title: "Failed to post invoice", variant: "destructive" }),
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    deleteMutation.mutate({ id: Number(id) } as any, {
      onSuccess: () => { toast({ title: "Invoice deleted" }); navigate("/invoices"); },
      onError: () => toast({ title: "Failed to delete invoice", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="text-muted-foreground">Invoice not found.</div>;
  }

  const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "secondary",
    POSTED: "default",
    CANCELLED: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{invoice.invoiceNo}</h1>
            <p className="text-muted-foreground">{invoice.type.replace(/_/g, " ")} · {invoice.customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusColor[invoice.status] ?? "secondary"}>{invoice.status}</Badge>
          {invoice.status === "DRAFT" && (
            <Button size="sm" onClick={handlePost} disabled={updateMutation.isPending}>Post Invoice</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          {invoice.status === "DRAFT" && (
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Invoice Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="text-muted-foreground">Customer</div>
              <div className="font-medium">{invoice.customerName}</div>

              {invoice.customerGstin && (
                <>
                  <div className="text-muted-foreground">Customer GSTIN</div>
                  <div className="font-mono">{invoice.customerGstin}</div>
                </>
              )}

              <div className="text-muted-foreground">Invoice Date</div>
              <div>{formatDate(invoice.date)}</div>

              <div className="text-muted-foreground">Due Date</div>
              <div>{formatDate(invoice.dueDate)}</div>

              <div className="text-muted-foreground">Place of Supply</div>
              <div>{invoice.placeOfSupply}</div>

              {invoice.poReference && (
                <>
                  <div className="text-muted-foreground">PO Reference</div>
                  <div>{invoice.poReference}</div>
                </>
              )}

              {invoice.notes && (
                <>
                  <div className="text-muted-foreground">Notes</div>
                  <div>{invoice.notes}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Amount Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable Amount</span>
              <span>{formatCurrency(invoice.taxableAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CGST</span>
              <span>{formatCurrency(invoice.cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGST</span>
              <span>{formatCurrency(invoice.sgst)}</span>
            </div>
            {invoice.igst > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGST</span>
                <span>{formatCurrency(invoice.igst)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total Amount</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid</span>
              <span>{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-destructive">
              <span>Balance Due</span>
              <span>{formatCurrency(invoice.balanceDue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {invoice.lines && invoice.lines.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>HSN/SAC</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Disc%</TableHead>
                  <TableHead className="text-right">GST%</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="font-mono text-xs">{line.hsnSac}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell>{line.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.rate)}</TableCell>
                    <TableCell className="text-right">{line.discountPct}%</TableCell>
                    <TableCell className="text-right">{line.gstRate}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.taxableValue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.cgst + line.sgst + line.igst)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(line.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
