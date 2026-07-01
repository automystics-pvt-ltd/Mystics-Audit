import { useState, useMemo } from "react";
import {
  useGetBankTransactions,
  useAddBankTransaction,
  useCreateBankTransfer,
  useReconcileBankTransaction,
  useListBankAccounts,
  getGetBankTransactionsQueryKey,
  getListBankAccountsQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowLeft, Plus, CheckCircle, ArrowRightLeft, TrendingDown, TrendingUp,
  CreditCard, Banknote, RefreshCw, BookOpen, Filter,
} from "lucide-react";

/* ── Transaction type config ── */
const TX_TYPES: Record<string, { label: string; color: string; icon: React.ElementType; dir: "in" | "out" | "both" }> = {
  DEPOSIT:       { label: "Deposit",        color: "bg-emerald-100 text-emerald-700", icon: TrendingUp,    dir: "in"  },
  WITHDRAWAL:    { label: "Withdrawal",     color: "bg-rose-100 text-rose-700",       icon: TrendingDown,  dir: "out" },
  BANK_CHARGE:   { label: "Bank Charge",    color: "bg-amber-100 text-amber-700",     icon: CreditCard,    dir: "out" },
  INTEREST:      { label: "Interest",       color: "bg-blue-100 text-blue-700",       icon: Banknote,      dir: "in"  },
  TRANSFER_IN:   { label: "Transfer In",    color: "bg-violet-100 text-violet-700",   icon: ArrowRightLeft, dir: "in" },
  TRANSFER_OUT:  { label: "Transfer Out",   color: "bg-orange-100 text-orange-700",   icon: ArrowRightLeft, dir: "out"},
  RECEIPT:       { label: "Receipt",        color: "bg-emerald-100 text-emerald-700", icon: TrendingUp,    dir: "in"  },
  PAYMENT:       { label: "Payment",        color: "bg-rose-100 text-rose-700",       icon: TrendingDown,  dir: "out" },
};

function TypeBadge({ type }: { type?: string | null }) {
  if (!type) return <span className="text-xs text-muted-foreground">—</span>;
  const cfg = TX_TYPES[type];
  if (!cfg) return <Badge variant="outline" className="text-xs">{type}</Badge>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

/* ══════════════════════════════════════════
   ADD TRANSACTION DIALOG
══════════════════════════════════════════ */
const TX_ENTRY_TYPES = [
  { value: "DEPOSIT",     label: "Deposit",      desc: "Cash or cheque deposit",    dir: "in"  },
  { value: "WITHDRAWAL",  label: "Withdrawal",   desc: "Cash withdrawal",            dir: "out" },
  { value: "BANK_CHARGE", label: "Bank Charge",  desc: "Bank fee or service charge", dir: "out" },
  { value: "INTEREST",    label: "Interest",     desc: "Interest earned on account", dir: "in"  },
];

const EMPTY_TXN = { type: "DEPOSIT", description: "", amount: "", date: new Date().toISOString().split("T")[0], referenceNo: "" };
const EMPTY_TRANSFER = { toAccountId: "", amount: "", date: new Date().toISOString().split("T")[0], description: "", referenceNo: "" };

function AddTransactionDialog({ open, onClose, accountId, bankName }: {
  open: boolean; onClose: () => void; accountId: number; bankName: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"entry" | "transfer">("entry");
  const [form, setForm] = useState({ ...EMPTY_TXN });
  const [transfer, setTransfer] = useState({ ...EMPTY_TRANSFER });

  const { data: allAccounts } = useListBankAccounts();
  const otherAccounts: any[] = (allAccounts ?? []).filter((a: any) => a.id !== accountId);

  const addMut = useAddBankTransaction({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBankTransactionsQueryKey(accountId) });
        qc.invalidateQueries({ queryKey: getListBankAccountsQueryKey() });
        toast({ title: "Transaction added", description: `${form.type} of ${formatCurrency(Number(form.amount))} recorded` });
        setForm({ ...EMPTY_TXN });
        onClose();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const transferMut = useCreateBankTransfer({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBankTransactionsQueryKey(accountId) });
        qc.invalidateQueries({ queryKey: getListBankAccountsQueryKey() });
        toast({ title: "Transfer completed", description: `${formatCurrency(Number(transfer.amount))} transferred` });
        setTransfer({ ...EMPTY_TRANSFER });
        onClose();
      },
      onError: (e: any) => toast({ title: "Transfer failed", description: e.message, variant: "destructive" }),
    },
  });

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function setT(k: string, v: string) { setTransfer(t => ({ ...t, [k]: v })); }

  const selectedType = TX_ENTRY_TYPES.find(t => t.value === form.type);

  function submitEntry() {
    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    addMut.mutate({ id: accountId, data: { type: form.type, description: form.description, amount: Number(form.amount), date: form.date, referenceNo: form.referenceNo || undefined } } as any);
  }

  function submitTransfer() {
    if (!transfer.toAccountId || !transfer.amount || Number(transfer.amount) <= 0 || !transfer.description.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    transferMut.mutate({
      data: {
        fromAccountId: accountId,
        toAccountId: Number(transfer.toAccountId),
        amount: Number(transfer.amount),
        date: transfer.date,
        description: transfer.description,
        referenceNo: transfer.referenceNo || undefined,
      },
    } as any);
  }

  const isPending = addMut.isPending || transferMut.isPending;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Transaction — {bankName}
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="entry" className="flex-1 gap-1.5"><CreditCard className="w-3.5 h-3.5" />Direct Entry</TabsTrigger>
            <TabsTrigger value="transfer" className="flex-1 gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" />Fund Transfer</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "entry" ? (
          <div className="space-y-4 pt-1">
            {/* Type selection */}
            <div className="grid grid-cols-2 gap-2">
              {TX_ENTRY_TYPES.map(t => {
                const Icon = TX_TYPES[t.value]?.icon ?? CreditCard;
                const isSelected = form.type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setF("type", t.value)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? "text-primary" : ""}`}>{t.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* GL journal note */}
            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              {selectedType?.dir === "in"
                ? "✓ DR Bank GL  /  CR Income account — posted automatically"
                : "✓ DR Expense account  /  CR Bank GL — posted automatically"}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.date} onChange={e => setF("date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setF("amount", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Input placeholder={`e.g. ${form.type === "BANK_CHARGE" ? "Annual maintenance charge" : form.type === "INTEREST" ? "Interest for June 2025" : "Cash deposit"}`}
                  value={form.description} onChange={e => setF("description", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Reference No. <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input placeholder="e.g. UTR123456" value={form.referenceNo} onChange={e => setF("referenceNo", e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={submitEntry} disabled={isPending}>
                {isPending ? "Saving…" : `Record ${selectedType?.label ?? "Entry"}`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              ✓ DR destination bank GL  /  CR this bank GL — posted and reconciled automatically
            </p>

            <div className="space-y-1.5">
              <Label>Transfer To <span className="text-destructive">*</span></Label>
              <Select value={transfer.toAccountId} onValueChange={v => setT("toAccountId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {otherAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.accountName} — {a.bankName}
                    </SelectItem>
                  ))}
                  {otherAccounts.length === 0 && (
                    <SelectItem value="__none__" disabled>No other accounts</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={transfer.date} onChange={e => setT("date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={transfer.amount} onChange={e => setT("amount", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Fund transfer for vendor payment" value={transfer.description} onChange={e => setT("description", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Reference No. <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input placeholder="e.g. NEFT/UTR number" value={transfer.referenceNo} onChange={e => setT("referenceNo", e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={submitTransfer} disabled={isPending || !transfer.toAccountId || transfer.toAccountId === "__none__"}>
                {isPending ? "Transferring…" : "Transfer Funds"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function BankTransactions() {
  const { id } = useParams<{ id: string }>();
  const accountId = Number(id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "unreconciled" | "reconciled">("all");
  const [search, setSearch] = useState("");

  const { data: allAccounts } = useListBankAccounts();
  const account: any = (allAccounts ?? []).find((a: any) => a.id === accountId);

  const { data, isLoading } = useGetBankTransactions(accountId);
  const reconcileMut = useReconcileBankTransaction();

  const transactions: any[] = data as any ?? [];

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (statusFilter !== "all") list = list.filter(t => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.referenceNo?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, statusFilter, search]);

  const unreconciledCount = transactions.filter(t => t.status !== "reconciled").length;

  function handleReconcile(txnId: number) {
    reconcileMut.mutate({ id: accountId, data: { bankTransactionId: txnId } } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBankTransactionsQueryKey(accountId) });
        toast({ title: "Marked as reconciled" });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  const totalCredits = filtered.reduce((s: number, t: any) => s + Number(t.credit), 0);
  const totalDebits  = filtered.reduce((s: number, t: any) => s + Number(t.debit),  0);

  return (
    <TooltipProvider>
      <div className="space-y-5 pb-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/bank">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="w-4 h-4" />Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {account?.accountName ?? "Bank Transactions"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {account?.bankName} · A/C {account?.accountNo}
                {account?.glAccountCode && (
                  <span> · GL <Link href={`/accounts/${account.accountId}`}>
                    <span className="font-mono text-primary hover:underline cursor-pointer">{account.glAccountCode}</span>
                  </Link></span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {account?.accountId && (
              <Link href={`/accounts/${account.accountId}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />Ledger
                </Button>
              </Link>
            )}
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" />Add Transaction
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Current Balance", value: formatCurrency(account?.balance ?? 0), cls: "text-foreground font-black" },
            { label: "Total In (shown)", value: formatCurrency(totalCredits), cls: "text-emerald-600 font-bold" },
            { label: "Total Out (shown)", value: formatCurrency(totalDebits), cls: "text-destructive font-bold" },
            { label: "Unreconciled", value: String(unreconciledCount), cls: unreconciledCount > 0 ? "text-amber-600 font-bold" : "text-muted-foreground" },
          ].map(k => (
            <Card key={k.label} className="px-4 py-3">
              <p className="text-[11px] text-muted-foreground font-medium">{k.label}</p>
              <p className={`text-lg font-mono mt-0.5 ${k.cls}`}>{k.value}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
              <TabsTrigger value="unreconciled" className="gap-1">
                <Filter className="w-3 h-3" />Unreconciled ({unreconciledCount})
              </TabsTrigger>
              <TabsTrigger value="reconciled">Reconciled ({transactions.length - unreconciledCount})</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search description or reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-60 text-sm"
          />
        </div>

        {/* Transaction table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit (Out)</TableHead>
                <TableHead className="text-right">Credit (In)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && filtered.map((t: any) => (
                <TableRow key={t.id} className={t.status === "reconciled" ? "opacity-60" : ""}>
                  <TableCell className="text-sm tabular-nums">{formatDate(t.date)}</TableCell>
                  <TableCell><TypeBadge type={t.type} /></TableCell>
                  <TableCell className="text-sm max-w-44 truncate">{t.description}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{t.referenceNo ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {t.debit > 0 ? <span className="text-destructive">{formatCurrency(t.debit)}</span> : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {t.credit > 0 ? <span className="text-emerald-600">{formatCurrency(t.credit)}</span> : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-sm">
                    {formatCurrency(t.balance)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={t.status === "reconciled" ? "default" : "secondary"}
                      className={t.status === "reconciled"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-[11px]"
                        : "text-[11px]"
                      }
                    >
                      {t.status === "reconciled" ? "✓ Reconciled" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.status !== "reconciled" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 hover:text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleReconcile(t.id)}
                            disabled={reconcileMut.isPending}
                          >
                            {reconcileMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark as reconciled</TooltipContent>
                      </Tooltip>
                    )}
                    {t.matchedJournalId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground/40 hover:text-primary cursor-default">
                            <BookOpen className="w-3 h-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Journal #{t.matchedJournalId}</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="font-medium">No transactions found</p>
                    {statusFilter !== "all" || search
                      ? <p className="text-sm mt-1">Try changing your filters</p>
                      : <p className="text-sm mt-1">Click <strong>Add Transaction</strong> to record your first entry</p>
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <AddTransactionDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          accountId={accountId}
          bankName={account?.accountName ?? "Account"}
        />
      </div>
    </TooltipProvider>
  );
}
