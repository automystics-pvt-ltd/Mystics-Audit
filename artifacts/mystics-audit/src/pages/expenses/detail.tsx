import { useGetExpense, useApproveExpense, getGetExpenseQueryKey, getListExpensesQueryKey } from "@workspace/api-client-react";
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
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: expense } = useGetExpense(Number(id));
  const approveMutation = useApproveExpense();
  const [comment, setComment] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const e = expense as any;

  const handleApprove = () => {
    approveMutation.mutate({ id: Number(id), data: { action: "approve", comment } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetExpenseQueryKey(Number(id)) }); qc.invalidateQueries({ queryKey: getListExpensesQueryKey() }); setApproveOpen(false); },
    });
  };
  const handleReject = () => {
    approveMutation.mutate({ id: Number(id), data: { action: "reject", comment } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetExpenseQueryKey(Number(id)) }); qc.invalidateQueries({ queryKey: getListExpensesQueryKey() }); setRejectOpen(false); },
    });
  };

  if (!e) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = { approved: "default", submitted: "secondary", rejected: "destructive" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/expenses"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold font-mono">{e.claimNo}</h1>
            <p className="text-muted-foreground text-sm">{e.employeeName} · {formatDate(e.submittedDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_COLORS[e.status] ?? "secondary"}>{e.status}</Badge>
          {e.status === "submitted" && (
            <>
              <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogTrigger asChild><Button variant="default"><CheckCircle className="w-4 h-4 mr-2" />Approve</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Approve Claim</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1"><Label>Comment</Label><Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Approval note..." /></div>
                    <Button className="w-full" onClick={handleApprove} disabled={approveMutation.isPending}>Approve</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogTrigger asChild><Button variant="destructive"><XCircle className="w-4 h-4 mr-2" />Reject</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reject Claim</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1"><Label>Reason *</Label><Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Reason for rejection..." /></div>
                    <Button variant="destructive" className="w-full" onClick={handleReject} disabled={approveMutation.isPending}>Reject</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Total Amount</CardTitle></CardHeader><CardContent><p className="text-xl font-mono font-semibold">{formatCurrency(e.totalAmount)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Policy Violations</CardTitle></CardHeader><CardContent><p className={`text-xl font-semibold flex items-center gap-1 ${e.policyViolations > 0 ? "text-amber-600" : ""}`}>{e.policyViolations > 0 && <AlertTriangle className="w-4 h-4" />}{e.policyViolations}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Approved Amount</CardTitle></CardHeader><CardContent><p className="text-xl font-mono font-semibold">{e.approvedAmount != null ? formatCurrency(e.approvedAmount) : "—"}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Expense Lines</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Vendor</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Violation</TableHead></TableRow></TableHeader>
          <TableBody>
            {(e.lines ?? []).map((l: any) => (
              <TableRow key={l.id} className={l.policyViolation ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                <TableCell className="text-sm">{formatDate(l.date)}</TableCell>
                <TableCell><Badge variant="outline">{l.category}</Badge></TableCell>
                <TableCell className="text-sm">{l.description}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.vendorName || "—"}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(l.amount)}</TableCell>
                <TableCell>{l.policyViolation ? <span className="text-amber-600 text-sm flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{l.violationReason || "Policy exceeded"}</span> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
