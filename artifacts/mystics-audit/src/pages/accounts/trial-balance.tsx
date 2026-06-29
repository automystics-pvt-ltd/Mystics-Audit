import { useGetTrialBalance } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";

export default function TrialBalance() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { data } = useGetTrialBalance({ date });

  const totalDebit = data?.totalDebit ?? 0;
  const totalCredit = data?.totalCredit ?? 0;
  const isBalanced = data?.isBalanced ?? false;
  const lines: any[] = (data as any)?.lines ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trial Balance</h1>
          <p className="text-muted-foreground text-sm">All account balances as of a given date</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>As of</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Debit</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-semibold">{formatCurrency(totalDebit)}</p></CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Credit</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-semibold">{formatCurrency(totalCredit)}</p></CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent><Badge variant={isBalanced ? "default" : "destructive"}>{isBalanced ? "Balanced" : "Unbalanced"}</Badge></CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm">{l.accountCode}</TableCell>
                <TableCell>{l.accountName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{l.group}</TableCell>
                <TableCell className="text-right font-mono">{l.debit > 0 ? formatCurrency(l.debit) : "—"}</TableCell>
                <TableCell className="text-right font-mono">{l.credit > 0 ? formatCurrency(l.credit) : "—"}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold border-t-2 bg-muted/30">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalDebit)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalCredit)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
