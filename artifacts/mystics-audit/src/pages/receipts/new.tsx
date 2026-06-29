import { useCreateReceipt, useListCustomers, useListBankAccounts, getListReceiptsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function NewReceipt() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: customersData } = useListCustomers({});
  const { data: banksData } = useListBankAccounts();
  const customers: any[] = customersData ?? [];
  const banks: any[] = banksData ?? [];
  const mutation = useCreateReceipt();

  const [form, setForm] = useState({ customerId: "", date: new Date().toISOString().split("T")[0], paymentMode: "Bank Transfer", bankAccountId: "", grossAmount: "", tdsDeducted: "0", referenceNo: "", narration: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ data: { ...form, customerId: parseInt(form.customerId), bankAccountId: parseInt(form.bankAccountId), grossAmount: parseFloat(form.grossAmount), tdsDeducted: parseFloat(form.tdsDeducted) } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListReceiptsQueryKey() }); navigate("/receipts"); },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/receipts"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">Record Receipt</h1>
      </div>
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader><CardTitle>Receipt Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Customer *</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, customerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Date *</Label><Input required type="date" value={form.date} onChange={set("date")} /></div>
            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select defaultValue="Bank Transfer" onValueChange={v => setForm(f => ({ ...f, paymentMode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Bank Transfer", "Cheque", "Cash", "UPI", "RTGS", "NEFT"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Bank Account *</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, bankAccountId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select bank..." /></SelectTrigger>
                <SelectContent>{banks.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.accountName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Gross Amount (₹) *</Label><Input required type="number" step="0.01" value={form.grossAmount} onChange={set("grossAmount")} /></div>
            <div className="space-y-1"><Label>TDS Deducted (₹)</Label><Input type="number" step="0.01" value={form.tdsDeducted} onChange={set("tdsDeducted")} /></div>
            <div className="space-y-1"><Label>Reference No</Label><Input value={form.referenceNo} onChange={set("referenceNo")} placeholder="UTR / Cheque No" /></div>
            <div className="space-y-1"><Label>Narration</Label><Input value={form.narration} onChange={set("narration")} placeholder="Being payment received..." /></div>
          </CardContent>
        </Card>
        <div className="flex gap-3 mt-4">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Record Receipt"}</Button>
          <Link href="/receipts"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
