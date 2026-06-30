import { useState, useMemo } from "react";
import {
  useListAccounts, useCreateAccount, useUpdateAccount,
  useListBankAccounts,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Pencil, Scale, Landmark, TrendingUp, TrendingDown, BookOpen,
  X, Filter, ExternalLink, CreditCard, ChevronRight,
} from "lucide-react";

/* ── local types ── */
interface Account {
  id: number; code: string; name: string; type: string; group: string;
  subGroup?: string | null; normalBalance: string; isParty: boolean;
  isBank: boolean; isCash: boolean; isActive: boolean;
  openingBalance: number; currentBalance: number; description?: string | null;
}

/* ── constants ── */
const TYPES = ["Asset", "Liability", "Income", "Expense", "Equity"];

const GROUPS_BY_TYPE: Record<string, string[]> = {
  Asset:     ["Current Assets", "Fixed Assets"],
  Liability: ["Current Liabilities", "Long Term Liabilities"],
  Income:    ["Revenue"],
  Expense:   ["Operating Expenses"],
  Equity:    ["Equity"],
};

const NORMAL_BALANCE_OPTIONS = ["Debit", "Credit"];

const TYPE_META: Record<string, { dot: string; header: string; icon: React.ReactNode }> = {
  Asset:     { dot: "bg-blue-500",   header: "bg-blue-50/70 border-blue-100",   icon: <Landmark className="w-3.5 h-3.5 text-blue-600" />    },
  Liability: { dot: "bg-rose-500",   header: "bg-rose-50/70 border-rose-100",   icon: <Scale className="w-3.5 h-3.5 text-rose-600" />       },
  Income:    { dot: "bg-emerald-500",header: "bg-emerald-50/70 border-emerald-100",icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> },
  Expense:   { dot: "bg-amber-500",  header: "bg-amber-50/70 border-amber-100",  icon: <TrendingDown className="w-3.5 h-3.5 text-amber-600" />},
  Equity:    { dot: "bg-violet-500", header: "bg-violet-50/70 border-violet-100",icon: <BookOpen className="w-3.5 h-3.5 text-violet-600" />  },
};

const TYPE_TEXT: Record<string, string> = {
  Asset: "text-blue-700", Liability: "text-rose-700",
  Income: "text-emerald-700", Expense: "text-amber-700", Equity: "text-violet-700",
};

const EMPTY_NEW = {
  code: "", name: "", type: "Asset", group: "Current Assets",
  subGroup: "", normalBalance: "Debit", isParty: false,
  isBank: false, isCash: false, openingBalance: 0, description: "",
};

/* ══════════════════════════════════════════
   NEW ACCOUNT DIALOG
══════════════════════════════════════════ */
function NewAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY_NEW });

  const createMut = useCreateAccount({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["accounts"] });
        toast({ title: "Account created", description: `${form.code} — ${form.name}` });
        setForm({ ...EMPTY_NEW });
        onClose();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function handleTypeChange(t: string) {
    const groups = GROUPS_BY_TYPE[t] ?? [];
    setForm(f => ({
      ...f, type: t, group: groups[0] ?? "",
      normalBalance: (t === "Asset" || t === "Expense") ? "Debit" : "Credit",
    }));
  }

  function submit() {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: "Code and Name are required", variant: "destructive" }); return;
    }
    createMut.mutate({ data: { ...form, openingBalance: Number(form.openingBalance) } } as any);
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />New Account</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Account Code <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. 1010" value={form.code} onChange={e => set("code", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Account Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. Cash in Hand" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Type <span className="text-destructive">*</span></Label>
            <Select value={form.type} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Group <span className="text-destructive">*</span></Label>
            <Select value={form.group} onValueChange={v => set("group", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(GROUPS_BY_TYPE[form.type] ?? []).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sub-Group <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. Receivables" value={form.subGroup} onChange={e => set("subGroup", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Normal Balance <span className="text-destructive">*</span></Label>
            <Select value={form.normalBalance} onValueChange={v => set("normalBalance", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{NORMAL_BALANCE_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Opening Balance (₹)</Label>
            <Input type="number" placeholder="0.00" value={form.openingBalance}
              onChange={e => set("openingBalance", e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-6 pt-1">
            {[
              { key: "isParty", label: "Party Account" },
              { key: "isBank",  label: "Bank Account" },
              { key: "isCash",  label: "Cash Account" },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                <Switch checked={(form as any)[f.key]} onCheckedChange={v => set(f.key, v)} />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Textarea placeholder="Brief description…" rows={2} value={form.description}
              onChange={e => set("description", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMut.isPending}>
            {createMut.isPending ? "Creating…" : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════
   EDIT ACCOUNT DIALOG
══════════════════════════════════════════ */
function EditAccountDialog({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [description, setDescription] = useState(account?.description ?? "");
  const [isActive, setIsActive] = useState(account?.isActive ?? true);

  const updateMut = useUpdateAccount({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["accounts"] });
        toast({ title: "Account updated" });
        onClose();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  if (!account) return null;

  function submit() {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    updateMut.mutate({ id: account!.id, data: { name, description, isActive } } as any);
  }

  const meta = TYPE_META[account.type];
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4" />Edit Account</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded", TYPE_TEXT[account.type], "bg-current/10")} style={{ backgroundColor: "rgb(0 0 0 / 0.05)" }}>
              {account.code}
            </span>
            <span className="text-xs text-muted-foreground">{account.type} / {account.group}</span>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Account Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional…" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <div>
              <p className="text-sm font-medium">{isActive ? "Active" : "Inactive"}</p>
              <p className="text-xs text-muted-foreground">
                {isActive ? "Available for transactions" : "Hidden from transaction forms"}
              </p>
            </div>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════
   ACCOUNT ROW
══════════════════════════════════════════ */
function AccountRow({
  account, bankId, onEdit,
}: {
  account: Account;
  bankId: number | null;
  onEdit: (a: Account) => void;
}) {
  const bal = account.currentBalance;
  const isNegative = bal < 0;

  return (
    <tr className="group border-b last:border-0 hover:bg-slate-50/60 transition-colors">
      {/* Code */}
      <td className="pl-5 pr-3 py-3 w-24">
        <Link href={`/accounts/${account.id}`}
          className={cn("font-mono text-sm font-bold hover:underline flex items-center gap-0.5", TYPE_TEXT[account.type])}>
          {account.code}
          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
        </Link>
      </td>

      {/* Name + badges */}
      <td className="px-3 py-3">
        <p className="font-medium text-gray-900 text-sm">{account.name}</p>
        {account.description && (
          <p className="text-xs text-muted-foreground truncate max-w-[260px] mt-0.5">{account.description}</p>
        )}
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {account.isBank && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
              <CreditCard className="w-2.5 h-2.5" />Bank
            </span>
          )}
          {account.isCash && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">Cash</span>
          )}
          {account.isParty && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Party</span>
          )}
        </div>
      </td>

      {/* Group */}
      <td className="px-3 py-3 hidden md:table-cell text-xs text-gray-500 whitespace-nowrap">
        {account.group}{account.subGroup ? <span className="text-gray-400"> / {account.subGroup}</span> : ""}
      </td>

      {/* Normal Bal */}
      <td className="px-3 py-3 hidden lg:table-cell text-center">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-white text-gray-600">
          {account.normalBalance}
        </span>
      </td>

      {/* Balance */}
      <td className="px-3 py-3 text-right font-mono text-sm font-semibold tabular-nums">
        <span className={isNegative ? "text-rose-600" : "text-gray-900"}>
          {formatCurrency(Math.abs(bal))}{isNegative ? " Cr" : ""}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-3 hidden sm:table-cell text-center">
        <span className={cn(
          "inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
          account.isActive
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-gray-100 text-gray-500 border border-gray-200",
        )}>
          {account.isActive ? "Active" : "Inactive"}
        </span>
      </td>

      {/* Actions */}
      <td className="pl-2 pr-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {/* Banking link for bank accounts */}
          {account.isBank && bankId && (
            <Link href={`/bank/${bankId}/transactions`}>
              <button
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors"
                title="View bank transactions"
              >
                <ExternalLink className="w-3 h-3" />Txns
              </button>
            </Link>
          )}
          {/* Edit */}
          <button
            onClick={() => onEdit(account)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function AccountsList() {
  const { data: accounts = [], isLoading } = useListAccounts({});
  const { data: bankAccounts = [] } = useListBankAccounts();

  const [newOpen, setNewOpen]         = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [search, setSearch]           = useState("");
  const [fType, setFType]             = useState("");
  const [fGroup, setFGroup]           = useState("");

  /* accountId → bankId map */
  const accountIdToBankId = useMemo(() => {
    const m = new Map<number, number>();
    for (const b of (bankAccounts as any[])) {
      if (b.accountId) m.set(b.accountId, b.id);
    }
    return m;
  }, [bankAccounts]);

  /* group options for active type filter */
  const groupOptions = fType ? (GROUPS_BY_TYPE[fType] ?? []) : [];

  /* filtered accounts */
  const filtered = useMemo(() => {
    let list = accounts as Account[];
    if (fType)  list = list.filter(a => a.type === fType);
    if (fGroup) list = list.filter(a => a.group === fGroup);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }
    return list;
  }, [accounts, fType, fGroup, search]);

  /* grouped by type for display */
  const grouped = useMemo(() => {
    const order = ["Asset", "Liability", "Income", "Expense", "Equity"];
    const map: Record<string, Account[]> = {};
    for (const a of filtered) { (map[a.type] ??= []).push(a); }
    return order.filter(t => map[t]?.length).map(t => ({ type: t, rows: map[t] }));
  }, [filtered]);

  /* KPI totals */
  const totals = useMemo(() => {
    const list = accounts as Account[];
    return {
      total:    list.length,
      active:   list.filter(a => a.isActive).length,
      assets:   list.filter(a => a.type === "Asset").length,
      liability:list.filter(a => a.type === "Liability").length,
      income:   list.filter(a => a.type === "Income").length,
      expense:  list.filter(a => a.type === "Expense").length,
    };
  }, [accounts]);

  const hasFilter = !!fType || !!fGroup || !!search;

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">General ledger — all accounts, balances &amp; banking links</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/accounts/trial-balance">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Scale className="w-3.5 h-3.5" />Trial Balance
            </Button>
          </Link>
          <Button size="sm" className="gap-2" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4" />New Account
          </Button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Total",     value: totals.total,     color: "text-gray-800",   filter: "",          bg: "hover:bg-gray-50" },
          { label: "Active",    value: totals.active,    color: "text-emerald-700",filter: "",          bg: "hover:bg-emerald-50" },
          { label: "Assets",    value: totals.assets,    color: "text-blue-700",   filter: "Asset",     bg: "hover:bg-blue-50" },
          { label: "Liability", value: totals.liability, color: "text-rose-700",   filter: "Liability", bg: "hover:bg-rose-50" },
          { label: "Income",    value: totals.income,    color: "text-emerald-700",filter: "Income",    bg: "hover:bg-emerald-50" },
          { label: "Expense",   value: totals.expense,   color: "text-amber-700",  filter: "Expense",   bg: "hover:bg-amber-50" },
        ].map(k => (
          <button
            key={k.label}
            onClick={() => { setFType(p => (k.filter && p !== k.filter) ? k.filter : ""); setFGroup(""); }}
            className={cn(
              "bg-white border rounded-xl px-3 py-2.5 text-left transition-all",
              k.bg,
              fType === k.filter && k.filter ? "ring-2 ring-primary/30 border-primary/40 bg-primary/5" : "",
            )}
          >
            <p className={cn("text-2xl font-black", k.color)}>{k.value}</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{k.label}</p>
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 bg-white border rounded-xl px-4 py-2.5">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Search by code or name…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={fType || "all"} onValueChange={v => { setFType(v === "all" ? "" : v); setFGroup(""); }}>
          <SelectTrigger className="h-8 w-36 text-xs border-gray-200"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {fType && groupOptions.length > 0 && (
          <Select value={fGroup || "all"} onValueChange={v => setFGroup(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-44 text-xs border-gray-200"><SelectValue placeholder="All Groups" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Groups</SelectItem>
              {groupOptions.map(g => <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {hasFilter && (
          <button onClick={() => { setFType(""); setFGroup(""); setSearch(""); }}
            className="text-xs text-primary hover:underline font-medium ml-auto">
            Clear
          </button>
        )}
      </div>

      {/* ── Account groups ── */}
      {isLoading ? (
        <div className="bg-white border rounded-xl divide-y">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 animate-pulse">
              <div className="h-4 w-14 bg-muted rounded" />
              <div className="h-4 w-52 bg-muted rounded" />
              <div className="h-4 w-28 bg-muted rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border rounded-xl py-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm font-semibold text-gray-700">
            {hasFilter ? "No accounts match your filters" : "No accounts yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {hasFilter ? "Try adjusting your search or filters." : "Create your first account."}
          </p>
          {!hasFilter && (
            <Button size="sm" className="mt-4 gap-2" onClick={() => setNewOpen(true)}>
              <Plus className="w-4 h-4" />New Account
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ type, rows }) => {
            const meta = TYPE_META[type];
            const typeColor = TYPE_TEXT[type];
            const typeTotal = rows.reduce((s, a) => s + a.currentBalance, 0);

            return (
              <div key={type} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                {/* Section header */}
                <div className={cn("flex items-center gap-2.5 px-5 py-2.5 border-b", meta.header)}>
                  <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
                  {meta.icon}
                  <span className={cn("text-xs font-bold uppercase tracking-widest", typeColor)}>{type}</span>
                  <span className="text-xs text-muted-foreground ml-1">{rows.length} account{rows.length !== 1 ? "s" : ""}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className={cn("text-sm font-black font-mono tabular-nums", typeColor)}>
                      {formatCurrency(Math.abs(typeTotal))}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50/60">
                        <th className="pl-5 pr-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-24">Code</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Account Name</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Group</th>
                        <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell w-24">Normal Bal.</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-36">Balance</th>
                        <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell w-20">Status</th>
                        <th className="pl-2 pr-4 py-2 w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(account => (
                        <AccountRow
                          key={account.id}
                          account={account}
                          bankId={accountIdToBankId.get(account.id) ?? null}
                          onEdit={setEditAccount}
                        />
                      ))}
                    </tbody>
                    {/* Group total footer */}
                    <tfoot>
                      <tr className="border-t bg-gray-50/40">
                        <td colSpan={4} className="pl-5 pr-3 py-2 text-xs font-semibold text-gray-500 hidden md:table-cell">
                          {type} Total
                        </td>
                        <td colSpan={4} className="table-cell md:hidden pl-5 pr-3 py-2 text-xs font-semibold text-gray-500">
                          {type} Total
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-bold tabular-nums hidden md:table-cell">
                          <span className={cn(typeColor)}>{formatCurrency(Math.abs(typeTotal))}</span>
                        </td>
                        <td colSpan={2} className="pr-4 py-2 hidden md:table-cell" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialogs ── */}
      <NewAccountDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <EditAccountDialog account={editAccount} onClose={() => setEditAccount(null)} />
    </div>
  );
}
