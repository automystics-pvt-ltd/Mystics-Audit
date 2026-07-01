import { useCreateGrn, useListPurchaseOrders, useGetPurchaseOrder, getListGrnsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function NewGrn() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: ordersData } = useListPurchaseOrders({ status: "approved" });
  const orders: any[] = ordersData ?? [];
  const mutation = useCreateGrn();

  const [poId, setPoId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [receivedQtys, setReceivedQtys] = useState<Record<number, string>>({});

  const { data: poData } = useGetPurchaseOrder(poId ? Number(poId) : 0);
  const po = poId ? (poData as any) : null;

  const totalLines  = (po?.lines ?? []).length;
  const filledLines = (po?.lines ?? []).filter((l: any) => parseFloat(receivedQtys[l.id] ?? "0") > 0).length;

  const handleSubmit = () => {
    const lines = (po?.lines ?? []).map((l: any) => ({
      poLineId: l.id,
      quantityReceived: parseFloat(receivedQtys[l.id] || "0"),
    }));
    mutation.mutate(
      { data: { poId: parseInt(poId), date, notes, lines } } as any,
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListGrnsQueryKey() });
          navigate("/purchases/grn");
        },
      },
    );
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/purchases/grn">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Goods Receipt</h1>
          <p className="text-sm text-muted-foreground">Record items received against an approved Purchase Order</p>
        </div>
      </div>

      {/* GRN details card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Truck className="w-4 h-4 text-violet-500" /> GRN Details
        </h2>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-500">Purchase Order *</Label>
          <Select
            value={poId}
            onValueChange={v => { setPoId(v); setReceivedQtys({}); }}
          >
            <SelectTrigger className="rounded-xl h-9 text-sm">
              <SelectValue placeholder="Select an approved PO…" />
            </SelectTrigger>
            <SelectContent>
              {orders.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">No approved POs found</div>
              ) : (
                orders.map((o: any) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    <span className="font-medium">{o.poNo}</span>
                    <span className="text-muted-foreground ml-2">— {o.vendorName}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {orders.length === 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Only approved Purchase Orders can be received. Go to Purchase Orders to approve one.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500">Receipt Date *</Label>
            <DateInput value={date} onChange={e => setDate(e.target.value)} className="rounded-xl h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500">Notes / Remarks</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Delivery note, condition remarks…"
              rows={1}
              className="rounded-xl resize-none text-sm"
            />
          </div>
        </div>

        {po && (
          <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-sm">
            <Package className="w-4 h-4 text-violet-600 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold text-violet-800">{po.poNo}</span>
              <span className="text-violet-600 ml-2">· {po.vendorName}</span>
            </div>
            <Badge className="bg-violet-100 text-violet-700 border-violet-200">
              {totalLines} line{totalLines !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}
      </div>

      {/* Line items card */}
      {po && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Receive Items</h2>
            <span className="text-xs text-muted-foreground">
              {filledLines} / {totalLines} lines filled
            </span>
          </div>

          {/* Column headers */}
          <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 grid grid-cols-[1fr_80px_100px_120px] gap-3 items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Item / Description</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Ordered</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Prev. Recv.</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Receiving Now *</span>
          </div>

          <div className="divide-y divide-gray-100">
            {(po.lines ?? []).map((l: any) => {
              const qty = parseFloat(receivedQtys[l.id] ?? "0");
              const remaining = l.quantity - (l.receivedQty ?? 0);
              const overReceiving = qty > remaining;
              return (
                <div
                  key={l.id}
                  className={cn(
                    "px-5 py-3 grid grid-cols-[1fr_80px_100px_120px] gap-3 items-center",
                    overReceiving ? "bg-amber-50/40" : "hover:bg-gray-50/50",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{l.description}</p>
                    {l.hsnSac && (
                      <p className="text-xs text-muted-foreground font-mono">HSN: {l.hsnSac}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-gray-700">{l.quantity}</p>
                    <p className="text-[10px] text-muted-foreground">{l.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-mono", l.receivedQty > 0 ? "text-green-600 font-semibold" : "text-gray-400")}>
                      {l.receivedQty ?? 0}
                    </p>
                    {remaining < l.quantity && (
                      <p className="text-[10px] text-muted-foreground">{remaining} remaining</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Input
                      className={cn(
                        "h-9 text-sm rounded-lg text-right font-mono w-full",
                        overReceiving ? "border-amber-400 bg-amber-50" : qty > 0 ? "border-emerald-300 bg-emerald-50/40" : "",
                      )}
                      placeholder="0"
                      type="number"
                      min={0}
                      max={remaining}
                      value={receivedQtys[l.id] ?? ""}
                      onChange={e => setReceivedQtys(prev => ({ ...prev, [l.id]: e.target.value }))}
                    />
                    {overReceiving && (
                      <p className="text-[10px] text-amber-600 font-semibold">Exceeds remaining ({remaining})</p>
                    )}
                    {qty > 0 && !overReceiving && (
                      <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> {qty} {l.unit}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Fill in quantities received. Leave blank to skip a line.
            </div>
            <div className="flex gap-3">
              <Link href="/purchases/grn">
                <Button variant="outline" className="rounded-xl">Cancel</Button>
              </Link>
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending || filledLines === 0}
                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold"
              >
                {mutation.isPending ? "Creating…" : "Create GRN"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions when no PO selected */}
      {!po && (
        <div className="flex gap-3">
          <Link href="/purchases/grn">
            <Button variant="outline" className="rounded-xl">Cancel</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
