import { useParams } from "wouter";
import { useGetAccount } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/format";

export default function AccountLedger() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useGetAccount(Number(id));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-muted-foreground">Account not found.</div>;
  }

  const { account, openingBalance, closingBalance, totalDebit, totalCredit, entries } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/accounts">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {account.code} · {account.name}
          </h1>
          <p className="text-muted-foreground">Account Ledger</p>
        </div>
        <Badge variant="outline" className="ml-2">{account.type}</Badge>
        <Badge variant="secondary">{account.group}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Opening Balance</p>
            <p className={`text-xl font-semibold mt-1 ${openingBalance < 0 ? "text-destructive" : ""}`}>
              {formatCurrency(Math.abs(openingBalance))}
            </p>
            {openingBalance < 0 && <p className="text-xs text-muted-foreground">Cr</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Debit</p>
            <p className="text-xl font-semibold mt-1 text-blue-600">{formatCurrency(totalDebit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Credit</p>
            <p className="text-xl font-semibold mt-1 text-orange-600">{formatCurrency(totalCredit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Closing Balance</p>
            <p className={`text-xl font-semibold mt-1 ${closingBalance < 0 ? "text-destructive" : "text-green-600"}`}>
              {formatCurrency(Math.abs(closingBalance))}
            </p>
            {closingBalance < 0 && <p className="text-xs text-muted-foreground">Cr</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Voucher No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions for this account
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell className="font-mono text-sm">{entry.voucherNo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{entry.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {entry.narration || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-orange-600">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${entry.balance < 0 ? "text-destructive" : ""}`}>
                      {formatCurrency(Math.abs(entry.balance))}
                      {entry.balance < 0 && <span className="text-xs ml-1">Cr</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
