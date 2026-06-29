import { useCreateItem, getListItemsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function NewInventory() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mutation = useCreateItem();
  const [form, setForm] = useState({ name: "", sku: "", hsnCode: "", category: "", unit: "Nos", gstRate: "18", minimumStock: "0", openingStock: "0", openingCost: "0", valuationMethod: "Weighted Average", description: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setv = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ data: { ...form, gstRate: parseFloat(form.gstRate), minimumStock: parseFloat(form.minimumStock), openingStock: parseFloat(form.openingStock), openingCost: parseFloat(form.openingCost) } } as any, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListItemsQueryKey() }); navigate("/inventory"); },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/inventory"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-semibold">New Inventory Item</h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Item Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Name *</Label><Input required value={form.name} onChange={set("name")} placeholder="Product / Material name" /></div>
            <div className="space-y-1"><Label>SKU</Label><Input value={form.sku} onChange={set("sku")} placeholder="PROD-001" /></div>
            <div className="space-y-1"><Label>HSN Code</Label><Input value={form.hsnCode} onChange={set("hsnCode")} placeholder="8471" /></div>
            <div className="space-y-1"><Label>Category</Label><Input value={form.category} onChange={set("category")} placeholder="Electronics, Stationery..." /></div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Select defaultValue="Nos" onValueChange={setv("unit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Nos", "Kgs", "Litres", "Metres", "Boxes", "Sets", "Pairs", "Units"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>GST Rate %</Label>
              <Select defaultValue="18" onValueChange={setv("gstRate")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["0","5","12","18","28"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valuation Method</Label>
              <Select defaultValue="Weighted Average" onValueChange={setv("valuationMethod")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Weighted Average","FIFO","LIFO"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Min Stock Level</Label><Input type="number" value={form.minimumStock} onChange={set("minimumStock")} /></div>
            <div className="space-y-1"><Label>Opening Stock</Label><Input type="number" value={form.openingStock} onChange={set("openingStock")} /></div>
            <div className="space-y-1"><Label>Opening Cost (₹ per unit)</Label><Input type="number" step="0.01" value={form.openingCost} onChange={set("openingCost")} /></div>
            <div className="col-span-2 space-y-1"><Label>Description</Label><Input value={form.description} onChange={set("description")} /></div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Create Item"}</Button>
          <Link href="/inventory"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
