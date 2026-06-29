import { useCreateJournal, useListAccounts } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListJournalsQueryKey } from "@workspace/api-client-react";

type Line = { accountId: string; debit: string; credit: string; narration: string };

export default function NewJournal() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
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

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const updateLine = (i: number, field: keyof Line, value: string) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };
  const addLine = () => setLines(prev => [...prev, { accountId: "", debit: "", credit: "", narration: "" }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    const validLines = lines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    mutation.mutate({ data: { voucherType, date, narration, lines: validLines.map(l => ({ accountId: parseInt(l.accountId), debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0, narration: l.narration })) } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListJournalsQueryKey() }); navigate("/journals"); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/journals"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-semibold">New Journal Entry</h1>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Entry Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Voucher Type</Label>
            <Select value={voucherType} onValueChange={setVoucherType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Journal", "Payment", "Receipt", "Contra", "Debit Note", "Credit Note"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-3">
            <Label>Narration</Label>
            <Input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Being payment / receipt for..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm">Debit: <span className="font-mono font-semibold">{formatCurrency(totalDebit)}</span></span>
              <span className="text-sm">Credit: <span className="font-mono font-semibold">{formatCurrency(totalCredit)}</span></span>
              <Badge variant={isBalanced ? "default" : "destructive"}>{isBalanced ? "Balanced" : "Unbalanced"}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Select value={line.accountId} onValueChange={v => updateLine(i, "accountId", v)}>
                      <SelectTrigger className="w-64"><SelectValue placeholder="Select account..." /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input className="w-32 text-right font-mono" placeholder="0.00" value={line.debit} onChange={e => updateLine(i, "debit", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="w-32 text-right font-mono" placeholder="0.00" value={line.credit} onChange={e => updateLine(i, "credit", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input placeholder="Line narration" value={line.narration} onChange={e => updateLine(i, "narration", e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => removeLine(i)} disabled={lines.length <= 2}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t">
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-2" />Add Line</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={!isBalanced || mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save Journal"}
        </Button>
        <Link href="/journals"><Button variant="outline">Cancel</Button></Link>
      </div>
    </div>
  );
}
