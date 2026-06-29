import { useCreateExpense, getListExpensesQueryKey } from "@workspace/api-client-react";
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
import { Plus, Trash2, ArrowLeft } from "lucide-react";

const CATEGORIES = ["Travel", "Meals", "Accommodation", "Office Supplies", "Training", "Communication", "Medical", "Other"];

type ExpLine = { date: string; category: string; amount: string; description: string; vendorName: string };

export default function NewExpense() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateExpense();
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ExpLine[]>([{ date: new Date().toISOString().split("T")[0], category: "Travel", amount: "", description: "", vendorName: "" }]);

  const total = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const update = (i: number, field: keyof ExpLine, value: string) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleSubmit = () => {
    mutation.mutate({ data: { notes, lines: lines.map(l => ({ ...l, amount: parseFloat(l.amount) || 0, currency: "INR", gstAmount: 0 })) } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListExpensesQueryKey() }); navigate("/expenses"); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/expenses"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">Submit Expense Claim</h1>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Expense Lines</CardTitle>
            <span className="text-sm font-medium">Total: <span className="font-mono">{formatCurrency(total)}</span></span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell><Input type="date" className="w-36" value={l.date} onChange={e => update(i, "date", e.target.value)} /></TableCell>
                  <TableCell>
                    <Select value={l.category} onValueChange={v => update(i, "category", v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input value={l.description} onChange={e => update(i, "description", e.target.value)} placeholder="Purpose..." /></TableCell>
                  <TableCell><Input value={l.vendorName} onChange={e => update(i, "vendorName", e.target.value)} placeholder="Restaurant / Hotel..." /></TableCell>
                  <TableCell><Input className="w-28 text-right font-mono" value={l.amount} onChange={e => update(i, "amount", e.target.value)} /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setLines(prev => [...prev, { date: new Date().toISOString().split("T")[0], category: "Travel", amount: "", description: "", vendorName: "" }])}>
              <Plus className="w-4 h-4 mr-2" />Add Line
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-1 max-w-md">
        <Label>Notes</Label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." />
      </div>
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={mutation.isPending}>{mutation.isPending ? "Submitting..." : "Submit Claim"}</Button>
        <Link href="/expenses"><Button variant="outline">Cancel</Button></Link>
      </div>
    </div>
  );
}
