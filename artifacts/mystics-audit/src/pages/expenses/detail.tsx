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
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Building2,
  FolderOpen, MapPin, Users2, Briefcase, Banknote, CreditCard,
  Clock, ChevronRight, Receipt, FileText, Paperclip, Lock,
  ShieldAlert, Link2, MessageSquareQuote, UserCheck, CalendarCheck,
  BadgeCheck,
} from "lucide-react";

/* ── Workflow steps ─────────────────────────────────────────────── */
const STEPS = [
  { key: "submitted",  label: "Submitted",  icon: Receipt },
  { key: "review",     label: "Under Review",icon: Clock },
  { key: "decided",    label: "Approved / Rejected", icon: BadgeCheck },
  { key: "reimbursed", label: "Reimbursed", icon: Banknote },
  { key: "paid",       label: "Paid",        icon: CheckCircle2 },
];

function getStepIndex(status: string, isRejected: boolean): number {
  if (status === "submitted") return 1;         // past step 0, on step 1
  if (status === "approved")  return 2;         // past step 2
  if (status === "reimbursed") return 3;
  if (status === "paid")       return 4;
  if (isRejected)             return 2;         // stopped at decision
  return 0;
}

function StatusStepper({ status, logs }: { status: string; logs: any[] }) {
  const isRejected = status === "rejected";
  const activeStep = getStepIndex(status, isRejected);

  const timestamps: Record<string, string> = {};
  for (const lg of logs) {
    if (lg.action === "submitted" && !timestamps["submitted"])   timestamps["submitted"]  = lg.createdAt;
    if (lg.action === "approved"  && !timestamps["decided"])     timestamps["decided"]    = lg.createdAt;
    if (lg.action === "rejected"  && !timestamps["decided"])     timestamps["decided"]    = lg.createdAt;
    if (lg.action === "reimbursed" && !timestamps["reimbursed"]) timestamps["reimbursed"] = lg.createdAt;
    if (lg.action === "paid"       && !timestamps["paid"])       timestamps["paid"]       = lg.createdAt;
  }
  timestamps["submitted"] = timestamps["submitted"] ?? logs[0]?.createdAt ?? "";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone    = i < activeStep;
          const isActive  = i === activeStep;
          const isDecision = step.key === "decided";
          const rejected  = isDecision && isRejected;
          const ts = timestamps[step.key] ?? timestamps["submitted"];

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1 relative">
              {/* Connector line */}
              {i > 0 && (
                <div className={`absolute left-0 top-5 -translate-y-1/2 h-0.5 w-1/2 ${isDone || isActive ? (rejected && isDecision ? "bg-red-300" : "bg-indigo-300") : "bg-gray-200"}`} />
              )}
              {i < STEPS.length - 1 && (
                <div className={`absolute right-0 top-5 -translate-y-1/2 h-0.5 w-1/2 ${isDone ? (rejected && isDecision ? "bg-red-300" : "bg-indigo-300") : "bg-gray-200"}`} />
              )}

              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all",
                isDone  ? "bg-indigo-600 border-indigo-600 text-white" :
                isActive && rejected ? "bg-red-600 border-red-600 text-white" :
                isActive ? "bg-indigo-600 border-indigo-600 text-white" :
                "bg-white border-gray-200 text-gray-300"
              )}>
                {isDone && !isDecision ? <CheckCircle2 className="w-4 h-4" /> :
                 isActive && rejected  ? <XCircle className="w-4 h-4" /> :
                 <Icon className="w-4 h-4" />}
              </div>

              {/* Label */}
              <p className={cn(
                "text-[11px] font-semibold text-center leading-tight mt-1",
                isDone ? "text-indigo-700" :
                isActive && rejected ? "text-red-600" :
                isActive ? "text-indigo-700" : "text-gray-400"
              )}>
                {isDecision && isActive && isRejected ? "Rejected" :
                 isDecision && isDone ? "Approved" : step.label}
              </p>

              {/* Timestamp */}
              {(isDone || isActive) && ts && (
                <p className="text-[9px] text-gray-400 text-center leading-tight">
                  {new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Action config ──────────────────────────────────────────────── */
const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  submitted:  { label: "Submitted",  color: "text-gray-600",   bg: "bg-gray-100",    icon: <Receipt className="w-4 h-4" /> },
  approved:   { label: "Approved",   color: "text-indigo-700", bg: "bg-indigo-100",  icon: <CheckCircle2 className="w-4 h-4" /> },
  rejected:   { label: "Rejected",   color: "text-red-700",    bg: "bg-red-100",     icon: <XCircle className="w-4 h-4" /> },
  forwarded:  { label: "Forwarded",  color: "text-amber-700",  bg: "bg-amber-100",   icon: <ChevronRight className="w-4 h-4" /> },
  reimbursed: { label: "Reimbursed", color: "text-violet-700", bg: "bg-violet-100",  icon: <Banknote className="w-4 h-4" /> },
  paid:       { label: "Paid",       color: "text-emerald-700",bg: "bg-emerald-100", icon: <CheckCircle2 className="w-4 h-4" /> },
};

function docIcon(fileType: string) {
  if (fileType === "image") return "🖼️";
  if (fileType === "pdf") return "📄";
  if (fileType === "excel") return "📊";
  return "📎";
}

/* ── Main component ─────────────────────────────────────────────── */
export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: expense, isLoading, refetch } = useGetExpense(Number(id));
  const approveMutation = useApproveExpense();

  const [comment, setComment]               = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [openDialog, setOpenDialog]         = useState<string | null>(null);
  const [docIdInput, setDocIdInput]         = useState("");
  const [linkingDoc, setLinkingDoc]         = useState(false);

  const canApprove = !!user && user.roleLevel <= 3;
  const e = expense as any;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetExpenseQueryKey(Number(id)) });
    qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
  };

  const doAction = (action: string) => {
    approveMutation.mutate({
      id: Number(id),
      data: {
        action, comment,
        actorName:  user?.name     ?? "Manager",
        actorRole:  user?.role     ?? "Manager",
        actorLevel: user?.roleLevel ?? 3,
        level: 1,
        ...(adjustedAmount && { adjustedAmount: parseFloat(adjustedAmount) }),
      }
    } as any, {
      onSuccess: () => { invalidate(); setOpenDialog(null); setComment(""); setAdjustedAmount(""); },
    });
  };

  const linkDocument = async () => {
    const ids = docIdInput.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (!ids.length) return;
    setLinkingDoc(true);
    try {
      const res = await fetch(`/api/expenses/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ids }),
      });
      if (!res.ok) throw new Error("Failed");
      setDocIdInput("");
      refetch();
      toast({ title: "Document linked successfully" });
    } catch {
      toast({ title: "Failed to link document", variant: "destructive" });
    } finally {
      setLinkingDoc(false);
    }
  };

  if (isLoading) return <div className="p-12 text-center text-gray-400 animate-pulse">Loading claim…</div>;
  if (!e) return <div className="p-12 text-center text-gray-400">Claim not found</div>;

  const logs: any[]       = e.approvalLogs ?? [];
  const lines: any[]      = e.lines ?? [];
  const documents: any[]  = e.documents ?? [];
  const totalGst = lines.reduce((s: number, l: any) => s + (l.gstAmount ?? 0), 0);
  const isActionable = ["submitted", "approved"].includes(e.status);
  const receiptLines = lines.filter((l: any) => l.receiptUrl);

  // Derive the decisive approval/rejection log entry for the Approver card
  const approvalLog  = logs.find(l => l.action === "approved");
  const rejectionLog = logs.find(l => l.action === "rejected");
  const decisionLog  = approvalLog ?? rejectionLog;
  const reimbursedLog = logs.find(l => l.action === "reimbursed");
  const paidLog       = logs.find(l => l.action === "paid");

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/expenses"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-gray-900">{e.claimNo}</h1>
              <StatusBadge status={e.status} className="text-sm px-3 py-1" />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{e.employeeName} · Submitted {formatDate(e.submittedDate)}</p>
          </div>
        </div>

        {/* Actions — approvers only */}
        {isActionable && canApprove && (
          <div className="flex items-center gap-2 shrink-0">
            {e.status === "submitted" && (
              <>
                <Dialog open={openDialog === "approve"} onOpenChange={o => setOpenDialog(o ? "approve" : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><CheckCircle2 className="w-4 h-4 mr-1.5" />Approve</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Approve Expense Claim</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="bg-indigo-50 rounded-xl p-4">
                        <p className="text-sm font-semibold text-indigo-800">{e.claimNo} — {e.employeeName}</p>
                        <p className="text-2xl font-bold text-indigo-700 mt-1">{formatCurrency(e.totalAmount)}</p>
                      </div>
                      {/* Approver identity */}
                      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user?.avatar ?? user?.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.role} · {user?.orgName}</p>
                        </div>
                        <ShieldAlert className="w-4 h-4 text-indigo-500 shrink-0" />
                      </div>
                      <div className="space-y-1">
                        <Label>Adjusted Amount <span className="text-gray-400 font-normal text-xs">(blank = approve full amount)</span></Label>
                        <Input value={adjustedAmount} onChange={ev => setAdjustedAmount(ev.target.value)} placeholder={formatCurrency(e.totalAmount)} className="font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label>Approval Comment <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                        <Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Notes for the employee…" />
                      </div>
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => doAction("approve")} disabled={approveMutation.isPending}>
                        {approveMutation.isPending ? "Approving…" : "Approve Claim"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={openDialog === "reject"} onOpenChange={o => setOpenDialog(o ? "reject" : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive"><XCircle className="w-4 h-4 mr-1.5" />Reject</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Reject Expense Claim</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user?.avatar ?? user?.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.role} · {user?.orgName}</p>
                        </div>
                        <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                      </div>
                      <div className="space-y-1">
                        <Label>Reason for Rejection <span className="text-red-500">*</span></Label>
                        <Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Reason visible to employee…" />
                      </div>
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
                      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user?.avatar ?? user?.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.role} · {user?.orgName}</p>
                        </div>
                        <ShieldAlert className="w-4 h-4 text-violet-500 shrink-0" />
                      </div>
                      <div className="space-y-1"><Label>Reference / UTR</Label><Input value={comment} onChange={ev => setComment(ev.target.value)} placeholder="Bank transfer UTR or reference…" /></div>
                      <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => doAction("reimburse")} disabled={approveMutation.isPending}>
                        {approveMutation.isPending ? "Processing…" : "Confirm Reimbursement"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={openDialog === "pay"} onOpenChange={o => setOpenDialog(o ? "pay" : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><CreditCard className="w-4 h-4 mr-1.5" />Mark Paid</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user?.avatar ?? user?.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.role} · {user?.orgName}</p>
                        </div>
                        <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>
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

        {isActionable && !canApprove && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 shrink-0">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Awaiting manager approval</span>
          </div>
        )}
      </div>

      {/* ── Workflow stepper ──────────────────────────────────────── */}
      <StatusStepper status={e.status} logs={logs} />

      {/* ── Status banners ───────────────────────────────────────── */}
      {e.status === "submitted" && !canApprove && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Pending Approval</p>
            <p className="text-xs text-amber-700 mt-0.5">Submitted and awaiting review by a Manager or Admin. You will be notified once processed.</p>
          </div>
        </div>
      )}

      {e.status === "rejected" && rejectionLog && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Claim Rejected by {rejectionLog.actorName}</p>
            {rejectionLog.comment && (
              <p className="text-xs text-red-700 mt-1 italic">"{rejectionLog.comment}"</p>
            )}
            <p className="text-[10px] text-red-500 mt-0.5">{new Date(rejectionLog.createdAt).toLocaleString("en-IN")}</p>
          </div>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        {/* ── Left column ────────────────────────────────────────── */}
        <div className="col-span-2 space-y-5">

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Claimed Amount",   value: formatCurrency(e.totalAmount),        sub: `${lines.length} line${lines.length !== 1 ? "s" : ""}`, color: "text-gray-900" },
              { label: "Approved Amount",  value: e.approvedAmount ? formatCurrency(e.approvedAmount) : "—", sub: e.approvedAmount && e.approvedAmount !== e.totalAmount ? "Adjusted by approver" : "Full amount", color: "text-indigo-700" },
              { label: "Policy Violations",value: String(e.policyViolations),          sub: e.policyViolations > 0 ? "Requires review" : "All within limits", color: e.policyViolations > 0 ? "text-amber-600" : "text-emerald-600" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Expense lines */}
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
                  <TableHead className="text-xs w-12"></TableHead>
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
                    <TableCell className="text-sm text-gray-700 max-w-[180px] truncate">{l.description}</TableCell>
                    <TableCell>
                      <p className="text-xs text-gray-600">{l.vendorName || "—"}</p>
                      {l.vendorGstin && <p className="text-[10px] font-mono text-gray-400">{l.vendorGstin}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-indigo-600 font-mono">
                      {l.gstAmount > 0 ? `${formatCurrency(l.gstAmount)} (${l.gstRate ?? "?"}%)` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-gray-900">{formatCurrency(l.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {l.receiptUrl && (
                          <a href={l.receiptUrl} target="_blank" rel="noopener noreferrer"
                            title="View receipt"
                            className="text-indigo-400 hover:text-indigo-600 transition-colors">
                            <Paperclip className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {l.policyViolation && (
                          <div title={l.violationReason}>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell colSpan={4} className="text-right text-sm text-gray-500 pr-4">Totals</TableCell>
                  <TableCell className="text-xs text-indigo-600 font-mono">{formatCurrency(totalGst)}</TableCell>
                  <TableCell className="text-right font-mono text-base text-gray-900">{formatCurrency(e.totalAmount)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Approval History — enhanced */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />Approval History
              <span className="ml-auto text-xs font-normal text-gray-400">{logs.length} event{logs.length !== 1 ? "s" : ""}</span>
            </h2>
            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No activity yet</p>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-5">
                  {logs.map((lg: any, i: number) => {
                    const cfg = ACTION_CONFIG[lg.action] ?? ACTION_CONFIG.submitted;
                    return (
                      <div key={lg.id ?? i} className="flex gap-4 relative">
                        {/* Icon bubble */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${cfg.bg}`}>
                          <span className={cfg.color}>{cfg.icon}</span>
                        </div>

                        <div className="flex-1 pt-1 pb-1">
                          {/* Action + amount */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
                            {lg.amount && (
                              <span className="text-xs font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                {formatCurrency(Number(lg.amount))}
                              </span>
                            )}
                            {lg.level > 0 && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-medium">
                                Level {lg.level}
                              </span>
                            )}
                          </div>

                          {/* Actor identity */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <UserCheck className="w-3 h-3 text-gray-400 shrink-0" />
                            <p className="text-sm text-gray-700 font-medium">{lg.actorName}</p>
                          </div>

                          {/* Comment callout — prominent */}
                          {lg.comment && (
                            <div className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 border ${
                              lg.action === "rejected"
                                ? "bg-red-50 border-red-100 text-red-700"
                                : lg.action === "approved"
                                ? "bg-indigo-50 border-indigo-100 text-indigo-700"
                                : "bg-gray-50 border-gray-100 text-gray-700"
                            }`}>
                              <MessageSquareQuote className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" />
                              <p className="text-xs leading-relaxed">"{lg.comment}"</p>
                            </div>
                          )}

                          {/* Timestamp */}
                          <div className="flex items-center gap-1 mt-1.5">
                            <CalendarCheck className="w-3 h-3 text-gray-300 shrink-0" />
                            <p className="text-[11px] text-gray-400">{new Date(lg.createdAt).toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ───────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Approver Verification Card — shown once decision is made */}
          {decisionLog && (
            <div className={`rounded-xl border p-4 space-y-3 ${
              approvalLog ? "bg-indigo-50 border-indigo-200" : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                <BadgeCheck className={`w-4 h-4 ${approvalLog ? "text-indigo-600" : "text-red-600"}`} />
                <p className={`text-sm font-semibold ${approvalLog ? "text-indigo-800" : "text-red-800"}`}>
                  {approvalLog ? "Approval Verification" : "Rejection Record"}
                </p>
              </div>

              {/* Actor */}
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${approvalLog ? "bg-indigo-600" : "bg-red-600"}`}>
                  {decisionLog.actorName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{decisionLog.actorName}</p>
                  <p className="text-xs text-gray-500">Level {decisionLog.level} approver</p>
                </div>
                <ShieldAlert className={`w-4 h-4 ml-auto ${approvalLog ? "text-indigo-400" : "text-red-400"}`} />
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Decision</span>
                  <span className={`font-semibold ${approvalLog ? "text-indigo-700" : "text-red-700"}`}>
                    {approvalLog ? "Approved" : "Rejected"}
                  </span>
                </div>
                {approvalLog && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount approved</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {formatCurrency(e.approvedAmount ?? e.totalAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Timestamp</span>
                  <span className="text-gray-700">{new Date(decisionLog.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="text-gray-700">{new Date(decisionLog.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              {/* Approver's comment */}
              {decisionLog.comment && (
                <div className={`rounded-lg px-3 py-2 border ${
                  approvalLog ? "bg-white border-indigo-100" : "bg-white border-red-100"
                }`}>
                  <p className="text-[10px] font-semibold text-gray-400 mb-1">Approver Comment</p>
                  <p className={`text-xs leading-relaxed ${approvalLog ? "text-indigo-700" : "text-red-700"}`}>
                    "{decisionLog.comment}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Reimbursement/Payment tracking */}
          {(reimbursedLog || paidLog) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Banknote className="w-4 h-4" />Payment Record
              </p>
              {reimbursedLog && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reimbursed by</span>
                    <span className="font-semibold text-gray-800">{reimbursedLog.actorName}</span>
                  </div>
                  {reimbursedLog.comment && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ref / UTR</span>
                      <span className="font-mono text-gray-800">{reimbursedLog.comment}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="text-gray-700">{new Date(reimbursedLog.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
              )}
              {paidLog && (
                <div className="text-xs space-y-1 border-t border-emerald-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid by</span>
                    <span className="font-semibold text-gray-800">{paidLog.actorName}</span>
                  </div>
                  {paidLog.comment && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment ref</span>
                      <span className="font-mono text-gray-800">{paidLog.comment}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Claim Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Claim Details</h2>
            {[
              { label: "Employee",      value: e.employeeName,        icon: null },
              { label: "Department",    value: e.department,          icon: <Building2 className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Project",       value: e.project,             icon: <FolderOpen className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Branch",        value: e.branch,              icon: <MapPin className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Cost Center",   value: e.costCenter,          icon: <Users2 className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Client",        value: e.clientName,          icon: <Briefcase className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Reimbursement", value: e.reimbursementStatus, icon: <Banknote className="w-3.5 h-3.5 text-gray-400" /> },
              { label: "Payment",       value: e.paymentMethod,       icon: <CreditCard className="w-3.5 h-3.5 text-gray-400" /> },
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

          {/* Documents & Receipts */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-indigo-500" />
              Documents & Receipts
              <span className="ml-auto text-xs font-normal text-gray-400">{documents.length + receiptLines.length}</span>
            </h2>

            {/* Linked documents from documents table */}
            {documents.length === 0 && receiptLines.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No attachments linked yet.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {documents.map((doc: any) => (
                  <a key={doc.id}
                    href={doc.fileUrl ?? "#"}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 transition-colors group">
                    <span className="text-lg">{docIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate group-hover:text-indigo-700">{doc.originalName || doc.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{doc.docCategory} · {doc.uploadedBy}</p>
                    </div>
                  </a>
                ))}
                {receiptLines.map((l: any) => (
                  <a key={`r-${l.id}`}
                    href={l.receiptUrl}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 transition-colors group">
                    <span className="text-lg">🧾</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate group-hover:text-indigo-700">Receipt — {l.category}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(l.date)}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Link document by ID */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Link2 className="w-3 h-3" />Link document by ID
              </p>
              <div className="flex gap-2">
                <Input
                  value={docIdInput}
                  onChange={e => setDocIdInput(e.target.value)}
                  placeholder="Doc ID (e.g. 12, 15)"
                  className="text-xs h-8 font-mono"
                  onKeyDown={ev => { if (ev.key === "Enter") linkDocument(); }}
                />
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs shrink-0"
                  onClick={linkDocument} disabled={!docIdInput.trim() || linkingDoc}>
                  {linkingDoc ? "…" : "Link"}
                </Button>
              </div>
              <p className="text-[10px] text-gray-400">
                Find document IDs in the <Link href="/documents" className="text-indigo-500 hover:underline">Documents module</Link>.
              </p>
            </div>
          </div>

          {/* Policy violations */}
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
