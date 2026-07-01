import { useCreateJournal, useListAccounts, getListJournalsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { EntityCombobox } from "@/components/EntityCombobox";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, ArrowLeft, BookOpen, Scale, Copy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Line = { accountId: string; debit: string; credit: string; narration: string };

const VOUCHER_TYPES = [
  "Journal", "Payment", "Receipt", "Contra", "Debit Note", "Credit Note",
];

export default function NewJournal() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: accountsData } = useListAccounts({});
  const accounts: any[] = accountsData ?? [];
  const mutation = useCreateJournal();

  const [voucherType, setVoucherType] = useState("Journal");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { accountId: "", debit: "", credit: "", narration: "" },
    { accountId: "", debit: "", credit: "", narration: "" },
  ]);

  const accountOptions = accounts.map((a: any) => ({
    id: a.id,
    label: a.name,
    sublabel: a.code,
    meta: a.type,
  }));

  const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const updateLine = (i: number, field: keyof Line, value: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const addLine = () =>
    setLines(prev => [...prev, { accountId: "", debit: "", credit: "", narration: "" }]);

  const removeLine = (i: number) =>
    setLines(prev => prev.filter((_, idx) => idx !== i));

  const duplicateLine = (i: number) =>
    setLines(prev => { const copy = [...prev]; copy.splice(i + 1, 0, { ...prev[i] }); return copy; });

  const handleSubmit = () => {
    const validLines = lines.filter(
      l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0),
    );
    mutation.mutate(
      {
        data: {
          voucherType, date, narration,
          lines: validLines.map(l => ({
            accountId: parseInt(l.accountId),
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            narration: l.narration,
          })),
        },
      } as any,
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListJournalsQueryKey() });
          navigate("/journals");
        },
        onError: () => toast({ title: "Failed to save journal entry", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/journals">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">New Journal Entry</h1>
          <p className="text-sm text-muted-foreground">Record a double-entry accounting voucher</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors",
            isBalanced
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : totalDebit > 0 || totalCredit > 0
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-gray-50 border-gray-200 text-gray-400",
          )}>
            <Scale className="w-3.5 h-3.5" />
            {isBalanced ? "Balanced" : totalDebit > 0 || totalCredit > 0 ? "Unbalanced" : "Draft"}
          </div>
        </div>
      </div>

      {/* Entry details card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-500" /> Voucher Details
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500">Voucher Type</Label>
            <Select value={voucherType} onValueChange={setVoucherType}>
              <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOUCHER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500">Date</Label>
            <DateInput value={date} onChange={e => setDate(e.target.value)} className="rounded-xl h-9 text-sm" />
          </div>
          <div className="space-y-1.5 col-span-3">
            <Label className="text-xs font-semibold text-gray-500">Narration</Label>
            <Textarea
              value={narration}
              onChange={e => setNarration(e.target.value)}
              placeholder="Being payment / receipt for services rendered…"
              rows={2}
              className="rounded-xl resize-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Line items card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Line Items</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              Dr: <span className="font-mono font-bold text-gray-800">{formatCurrency(totalDebit)}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              Cr: <span className="font-mono font-bold text-gray-800">{formatCurrency(totalCredit)}</span>
            </span>
            {totalDebit > 0 && !isBalanced && (
              <span className="text-xs text-red-500 font-semibold">
                Diff: {formatCurrency(Math.abs(totalDebit - totalCredit))}
              </span>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 grid grid-cols-[20px_1fr_140px_140px_1fr_72px] gap-3 items-center">
          <span />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Account</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Debit (₹)</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Credit (₹)</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Line Narration</span>
          <span />
        </div>

        {/* Lines */}
        <div className="divide-y divide-gray-100">
          {lines.map((line, i) => {
            const hasDebit  = parseFloat(line.debit)  > 0;
            const hasCredit = parseFloat(line.credit) > 0;
            const both      = hasDebit && hasCredit;
            return (
              <div
                key={i}
                className={cn(
                  "px-5 py-3 grid grid-cols-[20px_1fr_140px_140px_1fr_72px] gap-3 items-center group",
                  both ? "bg-red-50/30" : i % 2 === 1 ? "bg-gray-50/30" : "bg-white",
                )}
              >
                <span className="text-xs font-bold text-gray-300 select-none text-center">{i + 1}</span>

                {/* Account — searchable combobox */}
                <EntityCombobox
                  options={accountOptions}
                  selectedId={line.accountId ? Number(line.accountId) : null}
                  onSelect={opt => updateLine(i, "accountId", String(opt.id))}
                  onClear={() => updateLine(i, "accountId", "")}
                  placeholder="Select account…"
                  searchPlaceholder="Search by name or code…"
                  emptyText="No matching accounts"
                />

                {/* Debit */}
                <Input
                  className={cn("h-9 text-sm rounded-lg text-right font-mono", hasDebit && "border-emerald-300 bg-emerald-50/40")}
                  placeholder="0.00"
                  value={line.debit}
                  onChange={e => updateLine(i, "debit", e.target.value)}
                  type="number"
                  min={0}
                  step="0.01"
                />

                {/* Credit */}
                <Input
                  className={cn("h-9 text-sm rounded-lg text-right font-mono", hasCredit && "border-blue-300 bg-blue-50/40")}
                  placeholder="0.00"
                  value={line.credit}
                  onChange={e => updateLine(i, "credit", e.target.value)}
                  type="number"
                  min={0}
                  step="0.01"
                />

                {/* Line narration */}
                <Input
                  className="h-9 text-sm rounded-lg"
                  placeholder="Line narration…"
                  value={line.narration}
                  onChange={e => updateLine(i, "narration", e.target.value)}
                />

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateLine(i)}
                    title="Duplicate line"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 2}
                    title="Remove line"
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add line footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={addLine}
            className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add another line
          </button>
          {!isBalanced && totalDebit > 0 && (
            <p className="text-xs text-red-500">
              Difference of <span className="font-mono font-bold">{formatCurrency(Math.abs(totalDebit - totalCredit))}</span> — debit and credit must match
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!isBalanced || mutation.isPending}
          className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold px-6"
        >
          {mutation.isPending ? "Saving…" : "Post Journal Entry"}
        </Button>
        <Link href="/journals">
          <Button variant="outline" className="rounded-xl">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}
