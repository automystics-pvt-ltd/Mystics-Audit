import { useGetTrialBalance } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
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
          <DateInput value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-2xl px-5 py-5 text-white bg-blue-600">
          <p className="text-xs font-medium opacity-80">Total Debit</p>
          <p className="text-2xl font-bold font-mono mt-2">{formatCurrency(totalDebit)}</p>
        </div>
        <div className="flex-1 rounded-2xl px-5 py-5 text-white bg-emerald-600">
          <p className="text-xs font-medium opacity-80">Total Credit</p>
          <p className="text-2xl font-bold font-mono mt-2">{formatCurrency(totalCredit)}</p>
        </div>
        <div className={`flex-1 rounded-2xl px-5 py-5 text-white ${isBalanced ? "bg-emerald-700" : "bg-red-600"}`}>
          <p className="text-xs font-medium opacity-80">Status</p>
          <p className="text-xl font-bold mt-2">{isBalanced ? "Balanced ✓" : "Unbalanced"}</p>
        </div>
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
