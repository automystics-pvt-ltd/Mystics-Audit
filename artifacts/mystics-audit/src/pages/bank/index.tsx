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
import { Building2, Plus, CreditCard, Landmark } from "lucide-react";

const ACCOUNT_TYPES = ["Savings", "Current", "Cash Credit", "Overdraft", "Fixed Deposit"];

const EMPTY = {
  accountName: "", bankName: "", accountNo: "", ifsc: "",
  accountType: "Current", branch: "", openingBalance: "0",
};

function AddBankAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY });

  const createMut = useCreateBankAccount({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["bank-accounts"] });
        toast({ title: "Bank account added", description: `${form.accountName} at ${form.bankName}` });
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
            <Input placeholder="e.g. 50100012345678" value={form.accountNo} onChange={e => set("accountNo", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>IFSC Code <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. HDFC0001234" value={form.ifsc} onChange={e => set("ifsc", e.target.value.toUpperCase())} className="font-mono" />
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

export default function BankList() {
  const { data } = useListBankAccounts();
  const [addOpen, setAddOpen] = useState(false);
  const banks: any[] = data ?? [];
  const totalBalance = banks.reduce((s, b) => s + Number(b.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bank & Cash</h1>
          <p className="text-muted-foreground text-sm">
            Total balance: <span className="font-mono font-semibold text-foreground">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Add Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks.map((b: any) => (
          <Link key={b.id} href={`/bank/${b.id}/transactions`}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{b.accountType}</span>
                </div>
                <CardTitle className="text-base mt-2">{b.accountName}</CardTitle>
                <p className="text-sm text-muted-foreground">{b.bankName}</p>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono font-bold">{formatCurrency(b.balance)}</p>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p>A/C: <span className="font-mono">{b.accountNo}</span></p>
                  <p>IFSC: <span className="font-mono">{b.ifsc}</span></p>
                  {b.branch && <p>Branch: {b.branch}</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Add Account card */}
        <button
          onClick={() => setAddOpen(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
        >
          <CreditCard className="w-8 h-8" />
          <span className="text-sm font-medium">Add Bank Account</span>
        </button>

        {banks.length === 0 && (
          <Card className="col-span-3 p-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No bank accounts yet — add your first one above.</p>
          </Card>
        )}
      </div>

      <AddBankAccountDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
