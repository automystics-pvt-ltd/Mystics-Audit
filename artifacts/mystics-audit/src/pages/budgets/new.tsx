import { useCreateBudget, useListAccounts, getListBudgetsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type BudgetLine = { accountId: string; annualBudget: string };

export default function NewBudget() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: accountsData } = useListAccounts({});
  const accounts: any[] = (accountsData ?? []).filter((a: any) => a.type === "Expense" || a.type === "Income");
  const mutation = useCreateBudget();

  const [name, setName] = useState("");
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [department, setDepartment] = useState("");
  const [lines, setLines] = useState<BudgetLine[]>([{ accountId: "", annualBudget: "" }]);

  const total = lines.reduce((s, l) => s + (parseFloat(l.annualBudget) || 0), 0);
  const update = (i: number, field: keyof BudgetLine, value: string) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleSubmit = () => {
    const validLines = lines.filter(l => l.accountId && parseFloat(l.annualBudget) > 0);
    mutation.mutate({ data: { name, fiscalYear, department, lines: validLines.map(l => ({ accountId: parseInt(l.accountId), annualBudget: parseFloat(l.annualBudget) })) } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListBudgetsQueryKey() }); navigate("/budgets"); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/budgets"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Budget</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Budget Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="col-span-3 space-y-1"><Label>Budget Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="FY2025 Operating Budget" /></div>
          <div className="space-y-1"><Label>Fiscal Year</Label><Input value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} /></div>
          <div className="space-y-1"><Label>Department</Label><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Engineering, Sales, etc." /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Account Allocations</CardTitle>
            <span className="text-sm font-medium">Total Budget: <span className="font-mono">{formatCurrency(total)}</span></span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Account</TableHead><TableHead className="text-right">Annual Budget (₹)</TableHead><TableHead className="w-10"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Select value={l.accountId} onValueChange={v => update(i, "accountId", v)}>
                      <SelectTrigger className="w-64"><SelectValue placeholder="Select account..." /></SelectTrigger>
                      <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input className="w-36 text-right font-mono" value={l.annualBudget} onChange={e => update(i, "annualBudget", e.target.value)} /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setLines(p => p.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setLines(p => [...p, { accountId: "", annualBudget: "" }])}><Plus className="w-4 h-4 mr-2" />Add Account</Button>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={!name || mutation.isPending}>{mutation.isPending ? "Saving..." : "Create Budget"}</Button>
        <Link href="/budgets"><Button variant="outline">Cancel</Button></Link>
      </div>
    </div>
  );
}
