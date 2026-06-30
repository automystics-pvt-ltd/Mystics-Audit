import { useGetBill, usePayBill, usePostBill, getGetBillQueryKey, getListBillsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, DollarSign, CheckCircle } from "lucide-react";

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: bill } = useGetBill(Number(id));
  const payMutation  = usePayBill();
  const postMutation = usePostBill();
  const [payAmount, setPayAmount] = useState("");
  const [open, setOpen] = useState(false);
  const b = bill as any;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetBillQueryKey(Number(id)) });
    qc.invalidateQueries({ queryKey: getListBillsQueryKey() });
  };

  const handlePost = () => {
    postMutation.mutate({ id: Number(id) } as any, {
      onSuccess: () => invalidate(),
    });
  };

  const handlePay = () => {
    payMutation.mutate({ id: Number(id), data: { amount: parseFloat(payAmount) } } as any, {
      onSuccess: () => { invalidate(); setOpen(false); setPayAmount(""); },
    });
  };

  if (!b) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    posted: "default", draft: "secondary", paid: "outline", partial: "default",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bills"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold font-mono">{b.billNo}</h1>
            <p className="text-muted-foreground text-sm">{b.vendorName} · {formatDate(b.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {b.isMsmeVendor && <Badge className="bg-amber-500 text-white">MSME</Badge>}
          <Badge variant={STATUS_COLORS[b.status] ?? "secondary"}>{b.status}</Badge>

          {/* Post Bill — only for draft */}
          {b.status === "draft" && (
            <Button
              onClick={handlePost}
              disabled={postMutation.isPending}
              variant="default"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {postMutation.isPending ? "Posting…" : "Post Bill"}
            </Button>
          )}

          {/* Record Payment — for posted / partial */}
          {["posted", "partial"].includes(b.status) && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><DollarSign className="w-4 h-4 mr-2" />Record Payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Balance due: <span className="font-semibold font-mono">{formatCurrency(b.balanceDue)}</span>
                  </p>
                  <div className="space-y-1">
                    <Label>Payment Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      placeholder={String(b.balanceDue)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePay}
                    disabled={!payAmount || payMutation.isPending}
                  >
                    {payMutation.isPending ? "Saving..." : "Record Payment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Amount",  value: formatCurrency(b.totalAmount) },
          { label: "Paid Amount",   value: formatCurrency(b.paidAmount)  },
          { label: "Balance Due",   value: formatCurrency(b.balanceDue)  },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-mono font-semibold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* GST breakdown */}
      {(b.cgst > 0 || b.sgst > 0 || b.igst > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-sm">GST Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground">Taxable</p><p className="font-mono font-semibold">{formatCurrency(b.taxableAmount)}</p></div>
              {b.cgst > 0 && <div><p className="text-muted-foreground">CGST</p><p className="font-mono">{formatCurrency(b.cgst)}</p></div>}
              {b.sgst > 0 && <div><p className="text-muted-foreground">SGST</p><p className="font-mono">{formatCurrency(b.sgst)}</p></div>}
              {b.igst > 0 && <div><p className="text-muted-foreground">IGST</p><p className="font-mono">{formatCurrency(b.igst)}</p></div>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>HSN/SAC</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(b.lines ?? []).map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{l.description}</TableCell>
                <TableCell className="font-mono text-sm">{l.hsnSac}</TableCell>
                <TableCell className="text-right">{l.quantity} {l.unit}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(l.rate)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(l.taxableValue)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(l.cgst + l.sgst + l.igst)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(l.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {b.status === "draft" && (
        <p className="text-xs text-muted-foreground text-center">
          Posting this bill will create a double-entry journal: DR Purchases + DR GST Input Tax Credit, CR Accounts Payable.
        </p>
      )}
    </div>
  );
}
