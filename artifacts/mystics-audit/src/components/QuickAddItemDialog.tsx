/**
 * QuickAddItemDialog
 * A lightweight dialog for adding a new item to the Item Master without leaving
 * the current workflow (invoice/bill/PO entry). After creation, the caller
 * receives an ItemOption so it can immediately fill the line item.
 */
import { useState } from "react";
import { useCreateItem, getListItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PackagePlus, AlertCircle } from "lucide-react";
import type { ItemOption } from "@/components/ItemCombobox";

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS     = ["NOS", "KG", "MTR", "LTR", "BOX", "SET", "PCS", "HRS", "DAYS", "SQM", "SQF"];

interface Props {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (item: ItemOption) => void;
}

export function QuickAddItemDialog({ open, initialName = "", onClose, onCreated }: Props) {
  const qc      = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name:          initialName,
    type:          "GOODS",
    hsnSac:        "",
    unit:          "NOS",
    gstRate:       "18",
    purchaseRate:  "",
    sellingRate:   "",
  });

  // Sync initialName when dialog re-opens with a new name
  const [lastInitial, setLastInitial] = useState(initialName);
  if (initialName !== lastInitial) {
    setLastInitial(initialName);
    setForm(f => ({ ...f, name: initialName }));
  }

  const createMut = useCreateItem({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: getListItemsQueryKey() });
        const item: ItemOption = {
          id:           data.id,
          name:         data.name,
          itemCode:     data.itemCode ?? undefined,
          hsnSac:       data.hsnSac ?? undefined,
          unit:         data.unit ?? undefined,
          gstRate:      data.gstRate ?? 18,
          sellingRate:  data.sellingRate != null ? Number(data.sellingRate) : undefined,
          purchaseRate: data.purchaseRate != null ? Number(data.purchaseRate) : undefined,
          currentStock: 0,
          type:         data.type,
          isActive:     true,
        };
        toast({ title: "Item added to catalog", description: data.name });
        onCreated(item);
        onClose();
      },
      onError: (e: any) => {
        toast({ title: "Failed to add item", description: e.message ?? "Please try again", variant: "destructive" });
      },
    },
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function submit() {
    if (!form.name.trim()) {
      toast({ title: "Item name is required", variant: "destructive" }); return;
    }
    createMut.mutate({
      data: {
        name:            form.name.trim(),
        type:            form.type,
        hsnSac:          form.hsnSac.trim() || "000000",
        unit:            form.unit,
        gstRate:         Number(form.gstRate),
        purchaseRate:    form.purchaseRate   ? Number(form.purchaseRate)   : undefined,
        sellingRate:     form.sellingRate    ? Number(form.sellingRate)    : undefined,
        valuationMethod: form.type === "SERVICE" ? "NONE" : "WEIGHTED_AVERAGE",
      },
    } as any);
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="w-4 h-4 text-violet-600" />
            Add Item to Catalog
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            The new item will be saved to Inventory → Items and auto-filled in your line.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-1">
          {/* Item Name */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold">
              Item Name <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. Office Chair"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Type</Label>
            <Select value={form.type} onValueChange={v => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GOODS">Goods (Product)</SelectItem>
                <SelectItem value="SERVICE">Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Unit of Measure</Label>
            <Select value={form.unit} onValueChange={v => set("unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* HSN/SAC */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">HSN / SAC Code</Label>
            <Input
              placeholder={form.type === "SERVICE" ? "SAC code" : "HSN code"}
              value={form.hsnSac}
              onChange={e => set("hsnSac", e.target.value)}
              className="font-mono"
            />
          </div>

          {/* GST Rate */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">GST Rate</Label>
            <Select value={form.gstRate} onValueChange={v => set("gstRate", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Purchase Rate */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Purchase Rate (₹)</Label>
            <Input
              type="number" min="0" step="0.01"
              placeholder="0.00"
              value={form.purchaseRate}
              onChange={e => set("purchaseRate", e.target.value)}
            />
          </div>

          {/* Selling Rate */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Selling Rate (₹)</Label>
            <Input
              type="number" min="0" step="0.01"
              placeholder="0.00"
              value={form.sellingRate}
              onChange={e => set("sellingRate", e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          You can set more details (stock levels, valuation, etc.) later from Inventory → Items.
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={createMut.isPending} className="gap-1.5">
            <PackagePlus className="w-3.5 h-3.5" />
            {createMut.isPending ? "Adding…" : "Add & Select"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
