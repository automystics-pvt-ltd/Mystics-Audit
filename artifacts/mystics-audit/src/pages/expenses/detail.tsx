import { useGetExpense, useApproveExpense, getGetExpenseQueryKey, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Building2,
  FolderOpen, MapPin, Users2, Briefcase, Banknote, CreditCard,
  Clock, ChevronRight, Receipt, FileText,
} from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  submitted:  "bg-amber-50 text-amber-700 border-amber-200",
  approved:   "bg-blue-50 text-blue-700 border-blue-200",
  rejected:   "bg-red-50 text-red-700 border-red-200",
  reimbursed: "bg-violet-50 text-violet-700 border-violet-200",
  paid:       "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  submitted:  { label: "Submitted",  color: "text-gray-500",   icon: <Receipt className="w-4 h-4" /> },
  approved:   { label: "Approved",   color: "text-blue-600",   icon: <CheckCircle2 className="w-4 h-4" /> },
  rejected:   { label: "Rejected",   color: "text-red-600",    icon: <XCircle className="w-4 h-4" /> },
  forwarded:  { label: "Forwarded",  color: "text-amber-600",  icon: <ChevronRight className="w-4 h-4" /> },
  reimbursed: { label: "Reimbursed", color: "text-violet-600", icon: <Banknote className="w-4 h-4" /> },
  paid:       { label: "Paid",       color: "text-emerald-600",icon: <CheckCircle2 className="w-4 h-4" /> },
};

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: expense, isLoading } = useGetExpense(Number(id));
  const approveMutation = useApproveExpense();
  const [comment, setComment] = useState("");
  const [actorName, setActorName] = useState("Finance Manager");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const e = expense as any;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetExpenseQueryKey(Number(id)) });
    qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
  };

  const doAction = (action: string) => {
    approveMutation.mutate({
      id: Number(id),
      data: {
        action, comment, actorName,
        level: 1,
        ...(adjustedAmount && { adjustedAmount: parseFloat(adjustedAmount) }),
      }
    } as any, {
      onSuccess: () => { invalidate(); setOpenDialog(null); setComment(""); setAdjustedAmount(""); },
    });
  };

  if (isLoading) return <div className="p-12 text-center text-gray-400 animate-pulse">Loading claim…</div>;
  if (!e) return <div className="p-12 text-center text-gray-400">Claim not found</div>;

  const logs: any[] = e.approvalLogs ?? [];
  const lines: any[] = e.lines ?? [];
  const totalGst = lines.reduce((s: number, l: any) => s + (l.gstAmount ?? 0), 0);
  const isActionable = ["submitted","approved"].includes(e.status);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/expenses"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-gray-900">{e.claimNo}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLOR[e.status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{e.employeeName} · Submitted {formatDate(e.submittedDate)}</p>
          </div>
        </div>

        {/* Action buttons */}
        {isActionable && (
          <div className="flex items-center gap-2">
            {e.status === "submitted" && (
              <>
                {/* Approve */}
                <Dialog open={openDialog === "approve"} onOpenChange={o => setOpenDialog(o ? "approve" : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><CheckCircle2 className="w-4 h-4 mr-1.5" />Approve</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Approve Expense Claim</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm font-semibold text-blue-800">{e.claimNo} — {e.employeeName}</p>
                        <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(e.totalAmount)}</p>
                      </div>
                      <div className="space-y-1"><Label>Approved By</Label><Input value={actorName} onChange={ev => setActorName(ev.target.value)} /></div>
                      <div className="space-y-1">
                        <Label>Adjusted Amount (leave blank to approve full amount)</Label>
                        <Input value={adjustedAmount} onChange={ev => setAdjustedAmount(ev.target.value)} placeholder={formatCurrency(e.totalAmount)} className="font-mono" />
                      </div>
                      <div className="space-y-1"><Label>Comment</Label><Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Approval note…" /></div>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => doAction("approve")} disabled={approveMutation.isPending}>
                        {approveMutation.isPending ? "Approving…" : "Approve Claim"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Reject */}
                <Dialog open={openDialog === "reject"} onOpenChange={o => setOpenDialog(o ? "reject" : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive"><XCircle className="w-4 h-4 mr-1.5" />Reject</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Reject Expense Claim</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1"><Label>Rejected By</Label><Input value={actorName} onChange={ev => setActorName(ev.target.value)} /></div>
                      <div className="space-y-1"><Label>Reason for Rejection *</Label><Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Reason for rejection…" /></div>
                      <Button variant="destructive" className="w-full" onClick={() => doAction("reject")} disabled={!comment || approveMutation.isPending}>
                        {approveMutation.isPending ? "Rejecting…" : "Reject Claim"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {e.status === "approved" && (
              <>
                {/* Reimburse */}
                <Dialog open={openDialog === "reimburse"} onOpenChange={o => setOpenDialog(o ? "reimburse" : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700"><Banknote className="w-4 h-4 mr-1.5" />Reimburse</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Mark as Reimbursed</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="bg-violet-50 rounded-xl p-4">
                        <p className="text-sm font-semibold text-violet-800">Reimbursement Amount</p>
                        <p className="text-2xl font-bold text-violet-700 mt-1">{formatCurrency(e.approvedAmount ?? e.totalAmount)}</p>
                      </div>
                      <div className="space-y-1"><Label>Processed By</Label><Input value={actorName} onChange={ev => setActorName(ev.target.value)} /></div>
                      <div className="space-y-1"><Label>Reference / UTR</Label><Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Bank transfer UTR or reference…" /></div>
                      <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => doAction("reimburse")} disabled={approveMutation.isPending}>
                        {approveMutation.isPending ? "Processing…" : "Confirm Reimbursement"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Mark paid */}
                <Dialog open={openDialog === "pay"} onOpenChange={o => setOpenDialog(o ? "pay" : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><CreditCard className="w-4 h-4 mr-1.5" />Mark Paid</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1"><Label>Paid By</Label><Input value={actorName} onChange={ev => setActorName(ev.target.value)} /></div>
                      <div className="space-y-1"><Label>Payment Reference</Label><Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Cheque no / UPI ref…" /></div>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => doAction("pay")} disabled={approveMutation.isPending}>
                        {approveMutation.isPending ? "Processing…" : "Mark as Paid"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: lines + approval history */}
        <div className="col-span-2 space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Claimed Amount", value: formatCurrency(e.totalAmount), sub: `${lines.length} line${lines.length !== 1 ? "s" : ""}`, color: "text-gray-900" },
              { label: "Approved Amount", value: e.approvedAmount ? formatCurrency(e.approvedAmount) : "—", sub: e.approvedAmount && e.approvedAmount !== e.totalAmount ? "Adjusted" : "Full amount", color: "text-blue-700" },
              { label: "Policy Violations", value: String(e.policyViolations), sub: e.policyViolations > 0 ? "Requires review" : "All within limits", color: e.policyViolations > 0 ? "text-amber-600" : "text-emerald-600" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Expense lines table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" />Expense Lines</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Vendor</TableHead>
                  <TableHead className="text-xs">GST</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No expense lines</TableCell></TableRow>
                ) : lines.map((l: any) => (
                  <TableRow key={l.id} className={cn("hover:bg-gray-50/50 transition-colors", l.policyViolation && "bg-amber-50/40 hover:bg-amber-50/60")}>
                    <TableCell className="text-xs text-gray-500">{formatDate(l.date)}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{l.category}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 max-w-[200px] truncate">{l.description}</TableCell>
                    <TableCell>
                      <p className="text-xs text-gray-600">{l.vendorName || "—"}</p>
                      {l.vendorGstin && <p className="text-[10px] font-mono text-gray-400">{l.vendorGstin}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-blue-600 font-mono">
                      {l.gstAmount > 0 ? `${formatCurrency(l.gstAmount)} (${l.gstRate ?? "?"}%)` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-gray-900">{formatCurrency(l.amount)}</TableCell>
                    <TableCell>
                      {l.policyViolation && (
                        <div title={l.violationReason}>
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell colSpan={4} className="text-right text-sm text-gray-500 pr-4">Totals</TableCell>
                  <TableCell className="text-xs text-blue-600 font-mono">{formatCurrency(totalGst)}</TableCell>
                  <TableCell className="text-right font-mono text-base text-gray-900">{formatCurrency(e.totalAmount)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Approval timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500" />Approval History</h2>
            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No activity yet</p>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-4">
                  {logs.map((lg: any, i: number) => {
                    const cfg = ACTION_CONFIG[lg.action] ?? ACTION_CONFIG.submitted;
                    return (
                      <div key={lg.id ?? i} className="flex gap-4 relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          lg.action === "approved" || lg.action === "paid" || lg.action === "reimbursed" ? "bg-blue-100" :
                          lg.action === "rejected" ? "bg-red-100" : "bg-gray-100"
                        }`}>
                          <span className={cfg.color}>{cfg.icon}</span>
                        </div>
                        <div className="flex-1 pt-1.5">
                          <div className="flex items-baseline gap-2">
                            <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
                            {lg.amount && <p className="text-xs font-mono text-gray-500">{formatCurrency(Number(lg.amount))}</p>}
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">by <span className="font-medium">{lg.actorName}</span>
                            {lg.level > 0 && <span className="text-xs text-gray-400 ml-1">· Level {lg.level}</span>}
                          </p>
                          {lg.comment && <p className="text-xs text-gray-500 mt-1 italic">"{lg.comment}"</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(lg.createdAt).toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Claim details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Claim Details</h2>
            {[
              { label: "Employee", value: e.employeeName, icon: null },
              { label: "Department", value: e.department, icon: <Building2 className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Project", value: e.project, icon: <FolderOpen className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Branch", value: e.branch, icon: <MapPin className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Cost Center", value: e.costCenter, icon: <Users2 className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Client", value: e.clientName, icon: <Briefcase className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Reimbursement", value: e.reimbursementStatus, icon: <Banknote className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Payment", value: e.paymentMethod, icon: <CreditCard className="w-3.5 h-3.5 text-gray-400" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-1.5 text-gray-400 shrink-0">{icon}{label}</span>
                <span className="font-medium text-gray-700 text-right truncate">{value || "—"}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {e.notes && (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Notes</p>
              <p className="text-sm text-gray-700">{e.notes}</p>
            </div>
          )}

          {/* Policy violations detail */}
          {e.policyViolations > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="flex items-center gap-2 font-semibold text-amber-800 text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />{e.policyViolations} Policy Violation{e.policyViolations > 1 ? "s" : ""}
              </p>
              <div className="space-y-2">
                {lines.filter((l: any) => l.policyViolation).map((l: any) => (
                  <div key={l.id} className="text-xs text-amber-700">
                    <p className="font-medium">{l.category} — {formatCurrency(l.amount)}</p>
                    <p className="text-amber-600">{l.violationReason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
