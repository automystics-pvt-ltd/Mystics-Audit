import { useGetBankTransactions, useReconcileBankTransaction, getGetBankTransactionsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function BankTransactions() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data } = useGetBankTransactions(Number(id));
  const reconcileMutation = useReconcileBankTransaction();
  const transactions: any[] = (data as any) ?? [];

  const handleReconcile = (txnId: number) => {
    reconcileMutation.mutate({ id: Number(id), data: { bankTransactionId: txnId } } as any, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetBankTransactionsQueryKey(Number(id)) }),
    });
  };

  const unreconciled = transactions.filter(t => t.status !== "reconciled").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bank"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold">Bank Transactions</h1>
            <p className="text-muted-foreground text-sm">{transactions.length} transactions · {unreconciled} unreconciled</p>
          </div>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Match</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t: any) => (
              <TableRow key={t.id} className={t.status === "reconciled" ? "opacity-60" : ""}>
                <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                <TableCell className="text-sm max-w-48 truncate">{t.description}</TableCell>
                <TableCell className="text-right font-mono text-sm text-destructive">{t.debit > 0 ? formatCurrency(t.debit) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm text-green-600">{t.credit > 0 ? formatCurrency(t.credit) : "—"}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(t.balance)}</TableCell>
                <TableCell><Badge variant={t.status === "reconciled" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.matchConfidence ? `${t.matchConfidence}%` : "—"}
                </TableCell>
                <TableCell>
                  {t.status !== "reconciled" && (
                    <Button variant="ghost" size="sm" onClick={() => handleReconcile(t.id)} disabled={reconcileMutation.isPending}>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No transactions found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
