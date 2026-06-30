import { useState, useMemo } from "react";
import { useListAccounts, useCreateAccount, useUpdateAccount } from "@workspace/api-client-react";
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
  Plus, Search, Pencil, BookOpen, TrendingUp, TrendingDown,
  Landmark, Scale, ChevronRight, X, Filter,
} from "lucide-react";

/* ── types ── */
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

const TYPE_META: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
  Asset:     { color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   icon: <Landmark className="w-3.5 h-3.5"/>    },
  Liability: { color: "text-red-700",    bg: "bg-red-50 border-red-200",     icon: <Scale className="w-3.5 h-3.5"/>       },
  Income:    { color: "text-green-700",  bg: "bg-green-50 border-green-200", icon: <TrendingUp className="w-3.5 h-3.5"/> },
  Expense:   { color: "text-orange-700", bg: "bg-orange-50 border-orange-200",icon: <TrendingDown className="w-3.5 h-3.5"/>},
  Equity:    { color: "text-purple-700", bg: "bg-purple-50 border-purple-200",icon: <BookOpen className="w-3.5 h-3.5"/> },
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
    setForm(f => ({ ...f, type: t, group: groups[0] ?? "", normalBalance: (t === "Asset" || t === "Expense") ? "Debit" : "Credit" }));
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
          <DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4"/>New Account</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Code */}
          <div className="space-y-1.5">
            <Label>Account Code <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. 1010" value={form.code} onChange={e => set("code", e.target.value)}/>
          </div>
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Account Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. Cash in Hand" value={form.name} onChange={e => set("name", e.target.value)}/>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type <span className="text-destructive">*</span></Label>
            <Select value={form.type} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Group */}
          <div className="space-y-1.5">
            <Label>Group <span className="text-destructive">*</span></Label>
            <Select value={form.group} onValueChange={v => set("group", v)}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {(GROUPS_BY_TYPE[form.type] ?? []).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Sub-group */}
          <div className="space-y-1.5">
            <Label>Sub-Group <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. Receivables" value={form.subGroup} onChange={e => set("subGroup", e.target.value)}/>
          </div>

          {/* Normal Balance */}
          <div className="space-y-1.5">
            <Label>Normal Balance <span className="text-destructive">*</span></Label>
            <Select value={form.normalBalance} onValueChange={v => set("normalBalance", v)}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{NORMAL_BALANCE_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Opening Balance */}
          <div className="space-y-1.5 col-span-2">
            <Label>Opening Balance (₹)</Label>
            <Input type="number" placeholder="0.00" value={form.openingBalance} onChange={e => set("openingBalance", e.target.value)}/>
          </div>

          {/* Flags */}
          <div className="col-span-2 flex items-center gap-6 pt-1">
            {[
              { key: "isParty", label: "Party Account" },
              { key: "isBank",  label: "Bank Account" },
              { key: "isCash",  label: "Cash Account" },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                <Switch checked={(form as any)[f.key]} onCheckedChange={v => set(f.key, v)}/>
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>

          {/* Description */}
          <div className="space-y-1.5 col-span-2">
            <Label>Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Textarea placeholder="Brief description of this account…" rows={2} value={form.description} onChange={e => set("description", e.target.value)}/>
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

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4"/>Edit Account</DialogTitle>
          <p className="text-sm text-muted-foreground">{account.code} — {account.type} / {account.group}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Account Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)}/>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description…"/>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Switch checked={isActive} onCheckedChange={setIsActive}/>
            <div>
              <p className="text-sm font-medium">{isActive ? "Active" : "Inactive"}</p>
              <p className="text-xs text-muted-foreground">{isActive ? "This account is available for transactions" : "Account is hidden from transaction forms"}</p>
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
   MAIN PAGE
══════════════════════════════════════════ */
export default function AccountsList() {
  const { data: accounts = [], isLoading } = useListAccounts({});
  const [newOpen, setNewOpen]         = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [search, setSearch]           = useState("");
  const [fType, setFType]             = useState("");
  const [fGroup, setFGroup]           = useState("");

  /* groups available for the selected type filter */
  const groupOptions = fType ? (GROUPS_BY_TYPE[fType] ?? []) : [];

  /* filtered + sorted accounts */
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

  /* group by type for display */
  const grouped = useMemo(() => {
    const order = ["Asset", "Liability", "Income", "Expense", "Equity"];
    const map: Record<string, Account[]> = {};
    for (const a of filtered) { (map[a.type] ??= []).push(a); }
    return order.filter(t => map[t]?.length).map(t => ({ type: t, rows: map[t] }));
  }, [filtered]);

  /* totals strip */
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
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage your general ledger accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/accounts/trial-balance">
            <Button variant="outline" size="sm" className="gap-1.5"><Scale className="w-3.5 h-3.5"/>Trial Balance</Button>
          </Link>
          <Button size="sm" className="gap-2" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4"/>New Account
          </Button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "Total",     value: totals.total,     color: "text-gray-700",   filter: "" },
          { label: "Active",    value: totals.active,    color: "text-green-700",  filter: "" },
          { label: "Assets",    value: totals.assets,    color: "text-blue-700",   filter: "Asset" },
          { label: "Liability", value: totals.liability, color: "text-red-700",    filter: "Liability" },
          { label: "Income",    value: totals.income,    color: "text-green-700",  filter: "Income" },
          { label: "Expense",   value: totals.expense,   color: "text-orange-700", filter: "Expense" },
        ].map(k => (
          <button key={k.label}
            onClick={() => { setFType(p => p === k.filter ? "" : k.filter); setFGroup(""); }}
            className={cn("bg-white border rounded-xl px-4 py-3 text-left transition-all hover:shadow-sm",
              fType === k.filter && k.filter ? "border-primary/40 bg-primary/5" : "")}>
            <p className={cn("text-xl font-bold", k.color)}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0"/>

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
          <Input className="pl-8 h-8 text-sm" placeholder="Search by code or name…" value={search} onChange={e => setSearch(e.target.value)}/>
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5"/></button>}
        </div>

        {/* Type filter */}
        <Select value={fType || "all"} onValueChange={v => { setFType(v === "all" ? "" : v); setFGroup(""); }}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Types"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Group filter (only when type is selected) */}
        {fType && groupOptions.length > 0 && (
          <Select value={fGroup || "all"} onValueChange={v => setFGroup(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All Groups"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Groups</SelectItem>
              {groupOptions.map(g => <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {hasFilter && (
          <button onClick={() => { setFType(""); setFGroup(""); setSearch(""); }}
            className="text-xs text-primary hover:underline font-medium ml-auto">
            Clear filters
          </button>
        )}
      </div>

      {/* ── Account table grouped by type ── */}
      {isLoading ? (
        <div className="bg-white border rounded-xl divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 animate-pulse">
              <div className="h-4 w-12 bg-muted rounded"/>
              <div className="h-4 w-48 bg-muted rounded"/>
              <div className="h-4 w-24 bg-muted rounded ml-auto"/>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border rounded-xl py-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3"/>
          <p className="text-sm font-medium text-gray-700">{hasFilter ? "No accounts match your filters" : "No accounts yet"}</p>
          <p className="text-xs text-muted-foreground mt-1">{hasFilter ? "Try adjusting your search or filters." : "Create your first account to get started."}</p>
          {!hasFilter && <Button size="sm" className="mt-4 gap-2" onClick={() => setNewOpen(true)}><Plus className="w-4 h-4"/>New Account</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ type, rows }) => {
            const meta = TYPE_META[type] ?? TYPE_META.Asset;
            return (
              <div key={type} className="bg-white border rounded-xl overflow-hidden">
                {/* Type header */}
                <div className={cn("px-5 py-2.5 flex items-center gap-2 border-b", meta.bg)}>
                  <span className={meta.color}>{meta.icon}</span>
                  <span className={cn("text-xs font-bold uppercase tracking-widest", meta.color)}>{type}</span>
                  <span className={cn("text-[10px] font-semibold ml-auto", meta.color)}>{rows.length} account{rows.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left px-5 py-2 font-semibold w-24">Code</th>
                        <th className="text-left px-3 py-2 font-semibold">Name</th>
                        <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Group</th>
                        <th className="text-left px-3 py-2 font-semibold hidden lg:table-cell">Normal Bal.</th>
                        <th className="text-right px-3 py-2 font-semibold">Balance</th>
                        <th className="text-center px-3 py-2 font-semibold hidden sm:table-cell">Status</th>
                        <th className="px-4 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map(account => (
                        <tr key={account.id} className="group hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <Link href={`/accounts/${account.id}`}
                              className="font-mono font-semibold text-primary hover:underline flex items-center gap-1">
                              {account.code}<ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"/>
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-900">{account.name}</p>
                            {account.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{account.description}</p>}
                            <div className="flex gap-1 mt-0.5">
                              {account.isBank && <span className="text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200 px-1.5 rounded font-medium">Bank</span>}
                              {account.isCash && <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 rounded font-medium">Cash</span>}
                              {account.isParty && <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 rounded font-medium">Party</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">{account.group}{account.subGroup ? ` / ${account.subGroup}` : ""}</span>
                          </td>
                          <td className="px-3 py-3 hidden lg:table-cell">
                            <Badge variant="outline" className="text-xs">{account.normalBalance}</Badge>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-sm font-semibold">
                            <span className={account.currentBalance < 0 ? "text-red-600" : "text-gray-900"}>
                              {formatCurrency(account.currentBalance)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center hidden sm:table-cell">
                            <Badge className={cn("text-xs", account.isActive
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-500 border-gray-200")}>
                              {account.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setEditAccount(account)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                              title="Edit account">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      <NewAccountDialog open={newOpen} onClose={() => setNewOpen(false)}/>
      <EditAccountDialog account={editAccount} onClose={() => setEditAccount(null)}/>
    </div>
  );
}
