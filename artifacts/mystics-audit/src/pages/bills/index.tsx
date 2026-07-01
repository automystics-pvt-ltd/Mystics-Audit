import { useListBills } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { useFY } from "@/contexts/fy-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  posted: "default", draft: "secondary", paid: "outline", partial: "default",
};

export default function BillsList() {
  const { fy } = useFY();
  const [status, setStatus] = useState("");
  const { data } = useListBills({ from: fy.from, to: fy.to, ...(status ? { status } : {}) } as any);
  const bills: any[] = data ?? [];
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Bills</h1>
          <p className="text-muted-foreground text-sm">{bills.length} bills</p>
        </div>
        <Link href="/bills/new"><Button><Plus className="w-4 h-4 mr-2" />New Bill</Button></Link>
      </div>
      <div className="flex gap-2">
        {["", "draft", "posted", "partial", "paid"].map(s => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" onClick={() => setStatus(s)}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill No</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((b: any) => {
              const isOverdue = b.status === "posted" && b.dueDate < today && b.balanceDue > 0;
              return (
                <TableRow key={b.id} className={isOverdue ? "bg-destructive/5" : "hover:bg-muted/50"}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/bills/${b.id}`} className="font-mono text-primary hover:underline">{b.billNo}</Link>
                      {b.isMsmeVendor && <Badge className="bg-amber-500 text-white text-xs">MSME</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{b.vendorName}</TableCell>
                  <TableCell className="text-sm">{formatDate(b.date)}</TableCell>
                  <TableCell className={`text-sm ${isOverdue ? "text-destructive font-medium" : ""}`}>
                    {formatDate(b.dueDate)} {isOverdue && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(b.totalAmount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(b.paidAmount)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(b.balanceDue)}</TableCell>
                  <TableCell><Badge variant={STATUS_COLORS[b.status] ?? "secondary"}>{b.status}</Badge></TableCell>
                </TableRow>
              );
            })}
            {bills.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No bills found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
