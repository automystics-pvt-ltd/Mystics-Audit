import { useGetDayBook } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { printReportPage } from "@/lib/print-utils";

export default function DayBook() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { data } = useGetDayBook({ date });
  const d = data as any;
  const entries: any[] = Array.isArray(d?.entries) ? d.entries : [];
  const totalDebit = d?.totalDebit ?? 0;
  const totalCredit = d?.totalCredit ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Day Book</h1>
          <p className="text-muted-foreground text-sm">All transactions for {formatDate(date)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Date</Label>
            <Input type="date" className="w-36" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => printReportPage("Day Book")}>Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Transactions", value: String(entries.length) },
          { label: "Total Debit", value: formatCurrency(totalDebit) },
          { label: "Total Credit", value: formatCurrency(totalCredit) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-mono font-semibold mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher No</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e: any, i: number) => (
              <TableRow key={i}>
                <TableCell>
                  <Link href={`/journals/${e.journalId}`} className="font-mono text-primary hover:underline text-sm">{e.voucherNo}</Link>
                </TableCell>
                <TableCell><Badge variant="outline">{e.voucherType}</Badge></TableCell>
                <TableCell className="text-sm">{e.accountCode} — {e.accountName}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{e.narration || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{e.debit > 0 ? formatCurrency(e.debit) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{e.credit > 0 ? formatCurrency(e.credit) : "—"}</TableCell>
              </TableRow>
            ))}
            {entries.length > 0 && (
              <TableRow className="font-semibold bg-muted/30 border-t-2">
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totalCredit)}</TableCell>
              </TableRow>
            )}
            {entries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No transactions for {formatDate(date)}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
