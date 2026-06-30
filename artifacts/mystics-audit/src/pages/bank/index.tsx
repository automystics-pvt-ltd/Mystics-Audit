import { useState } from "react";
import { useListBankAccounts, useCreateBankAccount } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Building2, Plus, CreditCard, Landmark, BookOpen, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPES = ["Savings", "Current", "Cash Credit", "Overdraft", "Fixed Deposit"];

const EMPTY = {
  accountName: "", bankName: "", accountNo: "", ifsc: "",
  accountType: "Current", branch: "", openingBalance: "0",
};

/* ══════════════════════════════════════════
   ADD BANK ACCOUNT DIALOG
══════════════════════════════════════════ */
function AddBankAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY });

  const createMut = useCreateBankAccount({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: ["bank-accounts"] });
        qc.invalidateQueries({ queryKey: ["accounts"] });
        toast({
          title: "Bank account added",
          description: data.glAccountCode
            ? `GL account ${data.glAccountCode} created automatically`
            : `${form.accountName} at ${form.bankName}`,
        });
        setForm({ ...EMPTY });
        onClose();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function submit() {
    if (!form.accountName.trim() || !form.bankName.trim() || !form.accountNo.trim() || !form.ifsc.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    createMut.mutate({
      data: {
        accountName: form.accountName,
        bankName: form.bankName,
        accountNo: form.accountNo,
        ifsc: form.ifsc.toUpperCase(),
        accountType: form.accountType,
        branch: form.branch || undefined,
        openingBalance: Number(form.openingBalance) || 0,
      },
    } as any);
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Add Bank Account
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            A matching GL account will be created automatically in the Chart of Accounts.
          </p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Account Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. HDFC Current Account" value={form.accountName} onChange={e => set("accountName", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bank Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. HDFC Bank" value={form.bankName} onChange={e => set("bankName", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Account Type <span className="text-destructive">*</span></Label>
            <Select value={form.accountType} onValueChange={v => set("accountType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Account Number <span className="text-destructive">*</span></Label>
            <Input placeholder="50100012345678" value={form.accountNo} onChange={e => set("accountNo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>IFSC Code <span className="text-destructive">*</span></Label>
            <Input placeholder="HDFC0001234" value={form.ifsc} onChange={e => set("ifsc", e.target.value.toUpperCase())} className="font-mono uppercase" />
          </div>
          <div className="space-y-1.5">
            <Label>Branch <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. Connaught Place" value={form.branch} onChange={e => set("branch", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Opening Balance (₹)</Label>
            <Input type="number" placeholder="0.00" value={form.openingBalance} onChange={e => set("openingBalance", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMut.isPending}>
            {createMut.isPending ? "Adding…" : "Add Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════
   BANK CARD
══════════════════════════════════════════ */
function BankCard({ b }: { b: any }) {
  const colorMap: Record<string, string> = {
    "Current":      "from-blue-600 to-blue-700",
    "Savings":      "from-emerald-600 to-emerald-700",
    "Overdraft":    "from-rose-600 to-rose-700",
    "Cash Credit":  "from-amber-500 to-amber-600",
    "Fixed Deposit":"from-violet-600 to-violet-700",
  };
  const gradient = colorMap[b.accountType] ?? "from-gray-600 to-gray-700";

  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br text-white shadow-md overflow-hidden", gradient)}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full border-4 border-white" />
        <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full border-4 border-white" />
      </div>

      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">{b.accountType}</p>
            <h3 className="font-bold text-lg leading-tight mt-0.5">{b.accountName}</h3>
            <p className="text-sm text-white/70">{b.bankName}</p>
          </div>
          <Building2 className="w-7 h-7 text-white/30 shrink-0" />
        </div>

        {/* Balance */}
        <div>
          <p className="text-[11px] text-white/60 font-medium">Current Balance</p>
          <p className="text-2xl font-black font-mono mt-0.5">{formatCurrency(b.balance)}</p>
        </div>

        {/* Details row */}
        <div className="space-y-1 text-xs text-white/70">
          <div className="flex justify-between">
            <span>A/C No.</span>
            <span className="font-mono text-white/90 font-medium">{b.accountNo}</span>
          </div>
          <div className="flex justify-between">
            <span>IFSC</span>
            <span className="font-mono text-white/90 font-medium">{b.ifsc}</span>
          </div>
          {b.branch && (
            <div className="flex justify-between">
              <span>Branch</span>
              <span className="text-white/90">{b.branch}</span>
            </div>
          )}
          {b.lastReconciled && (
            <div className="flex justify-between">
              <span>Last Reconciled</span>
              <span className="text-white/90">{b.lastReconciled}</span>
            </div>
          )}
        </div>

        {/* GL Account pill */}
        {b.glAccountCode && (
          <div className="bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
            <BookOpen className="w-3 h-3 text-white/60" />
            <span className="text-white/60">GL Account</span>
            <Link href={`/accounts/${b.accountId}`}>
              <span className="font-mono font-bold text-white hover:underline cursor-pointer">
                {b.glAccountCode}
              </span>
            </Link>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Link href={`/bank/${b.id}/transactions`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <CreditCard className="w-3.5 h-3.5" />Transactions
            </button>
          </Link>
          {b.accountId && (
            <Link href={`/accounts/${b.accountId}`}>
              <button className="flex items-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-white/20 hover:bg-white/30 transition-colors whitespace-nowrap">
                <ArrowUpRight className="w-3.5 h-3.5" />View Ledger
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function BankList() {
  const { data } = useListBankAccounts();
  const [addOpen, setAddOpen] = useState(false);
  const banks: any[] = data ?? [];
  const totalBalance = banks.reduce((s, b) => s + Number(b.balance), 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank & Cash</h1>
          <p className="text-sm text-muted-foreground">
            Total balance:{" "}
            <span className="font-mono font-bold text-foreground">{formatCurrency(totalBalance)}</span>
            {" · "}{banks.length} account{banks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />Add Account
        </Button>
      </div>

      {/* Bank cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {banks.map((b: any) => <BankCard key={b.id} b={b} />)}

        {/* Add placeholder */}
        <button
          onClick={() => setAddOpen(true)}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/20 p-10 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors min-h-[240px]"
        >
          <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">Add Bank Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">GL account auto-created</p>
          </div>
        </button>
      </div>

      {banks.length === 0 && (
        <div className="bg-white border rounded-2xl py-16 text-center text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No bank accounts yet</p>
          <p className="text-sm mt-1">Add your first account to get started.</p>
          <Button className="mt-4 gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />Add Account
          </Button>
        </div>
      )}

      <AddBankAccountDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
