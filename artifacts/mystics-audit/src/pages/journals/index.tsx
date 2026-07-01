import { useListJournals } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { useFY } from "@/contexts/fy-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  posted: "default",
  draft: "secondary",
};

export default function JournalsList() {
  const { fy } = useFY();
  const [status, setStatus] = useState("");
  const { data } = useListJournals({ from: fy.from, to: fy.to, ...(status ? { status } : {}) } as any);
  const journals: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Journal Entries</h1>
          <p className="text-muted-foreground text-sm">{journals.length} entries</p>
        </div>
        <Link href="/journals/new">
          <Button><Plus className="w-4 h-4 mr-2" />New Journal</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        {["", "draft", "posted"].map(s => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" onClick={() => setStatus(s)}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {journals.map((j: any) => (
              <TableRow key={j.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/journals/${j.id}`} className="font-mono text-primary hover:underline">{j.voucherNo}</Link>
                </TableCell>
                <TableCell className="text-sm">{formatDate(j.date)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.voucherType}</TableCell>
                <TableCell className="text-sm max-w-48 truncate">{j.narration || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(j.totalDebit)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(j.totalCredit)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[j.status] ?? "secondary"}>{j.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {journals.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No journal entries found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
