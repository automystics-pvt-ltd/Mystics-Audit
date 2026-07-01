import { useCreateItem, getListItemsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GST_RATES = ["0", "5", "12", "18", "28"];
const UNITS = ["NOS", "KG", "MTR", "LTR", "BOX", "SET", "PCS", "HRS", "DAYS", "SQM", "SQF", "Nos", "Kgs", "Litres", "Metres", "Boxes", "Pairs"];
const VALUATION_METHODS = ["Weighted Average", "FIFO", "LIFO"];

export default function NewInventory() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const mutation = useCreateItem();

  const [form, setForm] = useState({
    name: "",
    itemCode: "",
    hsnSac: "",
    type: "GOODS",
    group: "",
    unit: "NOS",
    gstRate: "18",
    purchaseRate: "",
    sellingRate: "",
    mrp: "",
    minimumStock: "0",
    reorderQty: "",
    openingStock: "0",
    openingCost: "0",
    valuationMethod: "Weighted Average",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const setv = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())   e.name = "Item name is required";
    if (!form.hsnSac.trim()) e.hsnSac = "HSN/SAC code is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      data: {
        name: form.name,
        itemCode: form.itemCode || undefined,
        hsnSac: form.hsnSac,
        type: form.type,
        group: form.group || undefined,
        unit: form.unit,
        gstRate: parseFloat(form.gstRate),
        purchaseRate: form.purchaseRate ? parseFloat(form.purchaseRate) : undefined,
        sellingRate: form.sellingRate ? parseFloat(form.sellingRate) : undefined,
        mrp: form.mrp ? parseFloat(form.mrp) : undefined,
        minimumStock: parseFloat(form.minimumStock) || 0,
        reorderQty: form.reorderQty ? parseFloat(form.reorderQty) : undefined,
        openingStock: parseFloat(form.openingStock) || 0,
        openingCost: parseFloat(form.openingCost) || 0,
        valuationMethod: form.valuationMethod,
        description: form.description || undefined,
      },
    } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListItemsQueryKey() });
        toast({ title: "✓ Item created" });
        navigate("/inventory");
      },
      onError: () => toast({ title: "Failed to create item", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/inventory">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">New Item</h1>
          <p className="text-sm text-muted-foreground">Add an item to the Item Master for use in invoices, bills and purchase orders.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">

        {/* Basic Info */}
        <Card className="rounded-2xl border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Package className="w-4 h-4 text-violet-600" /> Item Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 gap-4">

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Item Name *</Label>
              <Input
                required
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Office Chair, Consulting Services"
                className={cn("rounded-xl", errors.name && "border-red-400")}
              />
              {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Item Code / SKU</Label>
              <Input
                value={form.itemCode}
                onChange={set("itemCode")}
                placeholder="PROD-001"
                className="rounded-xl font-mono"
              />
              <p className="text-[10px] text-gray-400">Auto-generated if left blank</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">HSN / SAC Code *</Label>
              <Input
                value={form.hsnSac}
                onChange={set("hsnSac")}
                placeholder="8471 (Goods) / 998313 (Service)"
                className={cn("rounded-xl font-mono", errors.hsnSac && "border-red-400")}
              />
              {errors.hsnSac && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.hsnSac}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Item Type</Label>
              <Select value={form.type} onValueChange={setv("type")}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOODS">Goods (Physical item)</SelectItem>
                  <SelectItem value="SERVICE">Service (No stock tracking)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Category / Group</Label>
              <Input
                value={form.group}
                onChange={set("group")}
                placeholder="Electronics, Stationery…"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Unit of Measure</Label>
              <Select value={form.unit} onValueChange={setv("unit")}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">GST Rate %</Label>
              <Select value={form.gstRate} onValueChange={setv("gstRate")}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GST_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="rounded-2xl border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-700">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Purchase Rate (₹)</Label>
              <Input
                type="number" min={0} step="0.01"
                value={form.purchaseRate}
                onChange={set("purchaseRate")}
                placeholder="0.00"
                className="rounded-xl text-right"
              />
              <p className="text-[10px] text-gray-400">Used in bills & purchase orders</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Selling Rate (₹)</Label>
              <Input
                type="number" min={0} step="0.01"
                value={form.sellingRate}
                onChange={set("sellingRate")}
                placeholder="0.00"
                className="rounded-xl text-right"
              />
              <p className="text-[10px] text-gray-400">Used in invoices</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">MRP (₹)</Label>
              <Input
                type="number" min={0} step="0.01"
                value={form.mrp}
                onChange={set("mrp")}
                placeholder="0.00"
                className="rounded-xl text-right"
              />
              <p className="text-[10px] text-gray-400">Maximum retail price</p>
            </div>
          </CardContent>
        </Card>

        {/* Stock (only for Goods) */}
        {form.type === "GOODS" && (
          <Card className="rounded-2xl border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-700">Stock & Valuation</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Valuation Method</Label>
                <Select value={form.valuationMethod} onValueChange={setv("valuationMethod")}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VALUATION_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Opening Stock</Label>
                <Input
                  type="number" min={0} step="0.001"
                  value={form.openingStock}
                  onChange={set("openingStock")}
                  className="rounded-xl text-right"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Opening Cost (₹ / unit)</Label>
                <Input
                  type="number" min={0} step="0.01"
                  value={form.openingCost}
                  onChange={set("openingCost")}
                  className="rounded-xl text-right"
                />
              </div>

              <Separator className="col-span-2" />

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Minimum Stock Level</Label>
                <Input
                  type="number" min={0} step="0.001"
                  value={form.minimumStock}
                  onChange={set("minimumStock")}
                  placeholder="0"
                  className="rounded-xl text-right"
                />
                <p className="text-[10px] text-gray-400">Triggers low stock alert</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Reorder Quantity</Label>
                <Input
                  type="number" min={0} step="0.001"
                  value={form.reorderQty}
                  onChange={set("reorderQty")}
                  placeholder="0"
                  className="rounded-xl text-right"
                />
                <p className="text-[10px] text-gray-400">Suggested qty to reorder</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card className="rounded-2xl border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-700">Additional Info</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Description</Label>
              <Input
                value={form.description}
                onChange={set("description")}
                placeholder="Optional notes about this item"
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-6">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold px-6"
          >
            {mutation.isPending ? "Creating…" : "Create Item"}
          </Button>
          <Link href="/inventory">
            <Button variant="outline" type="button" className="rounded-xl">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
