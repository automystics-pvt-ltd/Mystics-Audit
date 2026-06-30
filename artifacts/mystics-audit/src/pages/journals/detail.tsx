import { useGetJournal, usePostJournal, useReverseJournal, getGetJournalQueryKey, getListJournalsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, CheckCircle, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: journal } = useGetJournal(Number(id));
  const postMutation = usePostJournal();
  const reverseMutation = useReverseJournal();
  const [confirm, setConfirm] = useState<"post" | "reverse" | null>(null);

  const j = journal as any;

  const handlePost = () => setConfirm("post");
  const handleReverse = () => setConfirm("reverse");

  const doPost = () => {
    postMutation.mutate({ id: Number(id) } as any, {
      onSuccess: () => { setConfirm(null); qc.invalidateQueries({ queryKey: getGetJournalQueryKey(Number(id)) }); qc.invalidateQueries({ queryKey: getListJournalsQueryKey() }); },
    });
  };

  const doReverse = () => {
    reverseMutation.mutate({ id: Number(id) } as any, {
      onSuccess: () => { setConfirm(null); qc.invalidateQueries({ queryKey: getListJournalsQueryKey() }); },
    });
  };

  if (!j) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/journals"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold font-mono">{j.voucherNo}</h1>
            <p className="text-muted-foreground text-sm">{j.voucherType} · {formatDate(j.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={j.status === "posted" ? "default" : "secondary"}>{j.status}</Badge>
              {j.status === "draft" && (
            <Button onClick={handlePost} disabled={!j.isBalanced || postMutation.isPending}>
              <CheckCircle className="w-4 h-4 mr-2" />Post
            </Button>
          )}
          {j.status === "posted" && (
            <Button variant="outline" onClick={handleReverse} disabled={reverseMutation.isPending}>
              <RotateCcw className="w-4 h-4 mr-2" />Reverse
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Date", value: formatDate(j.date) },
          { label: "Total Debit", value: formatCurrency(j.totalDebit) },
          { label: "Total Credit", value: formatCurrency(j.totalCredit) },
          { label: "Balanced", value: j.isBalanced ? "Yes" : "No" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className="font-semibold font-mono text-sm">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      {j.narration && (
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Narration: <span className="text-foreground">{j.narration}</span></p></CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Narration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(j.lines ?? []).map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-sm">{l.accountCode} — {l.accountName}</TableCell>
                <TableCell className="text-right font-mono">{l.debit > 0 ? formatCurrency(l.debit) : "—"}</TableCell>
                <TableCell className="text-right font-mono">{l.credit > 0 ? formatCurrency(l.credit) : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.narration || "—"}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold bg-muted/30 border-t-2">
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(j.totalDebit)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(j.totalCredit)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={confirm === "post"}
        onOpenChange={o => !o && setConfirm(null)}
        title="Post Journal Entry"
        description="Posting will finalise this journal entry and create immutable ledger records. This action cannot be undone."
        confirmLabel="Post Journal"
        variant="warning"
        onConfirm={doPost}
        loading={postMutation.isPending}
      />
      <ConfirmDialog
        open={confirm === "reverse"}
        onOpenChange={o => !o && setConfirm(null)}
        title="Reverse Journal Entry"
        description="This will create an equal and opposite journal entry to cancel the effects of this posting."
        confirmLabel="Reverse Journal"
        variant="warning"
        onConfirm={doReverse}
        loading={reverseMutation.isPending}
      />
    </div>
  );
}
