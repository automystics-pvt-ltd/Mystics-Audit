import { useListGrns } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, Package, ClipboardList, FileText } from "lucide-react";

const STATUS_PILL: Record<string, string> = {
  received:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  partial:   "bg-amber-50 text-amber-700 border border-amber-200",
  pending:   "bg-gray-100 text-gray-600 border border-gray-200",
  rejected:  "bg-red-50 text-red-700 border border-red-200",
};

export default function GrnDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: grns, isLoading } = useListGrns();

  const grnList: any[] = Array.isArray(grns) ? grns : [];
  const g = grnList.find((x: any) => String(x.id) === id);
  const lines: any[] = g?.lines ?? [];

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!g) return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Goods Receipt not found.</p>
      <Link href="/purchases/grn"><Button variant="outline" size="sm" className="mt-3">Back to GRNs</Button></Link>
    </div>
  );

  const totalQtyOrdered  = lines.reduce((s: number, l: any) => s + (l.qtyOrdered  ?? 0), 0);
  const totalQtyReceived = lines.reduce((s: number, l: any) => s + (l.qtyReceived ?? 0), 0);
  const totalValue       = lines.reduce((s: number, l: any) => s + (l.lineTotal   ?? (l.qtyReceived ?? 0) * (l.rate ?? 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases/grn">
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold font-mono">{g.grnNo}</h1>
            <p className="text-muted-foreground text-sm">
              {g.vendorName} · {formatDate(g.date)}
              {g.poNo && <> · PO: <Link href={`/purchases/orders/${g.poId}`} className="text-violet-600 hover:underline">{g.poNo}</Link></>}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_PILL[g.status] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
          {g.status}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-violet-600 text-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-violet-100">Items in Receipt</p>
            <ClipboardList className="w-5 h-5 text-violet-200" />
          </div>
          <p className="text-3xl font-bold mt-2">{lines.length}</p>
          <p className="text-xs text-violet-100 mt-0.5">Line items</p>
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-emerald-600 text-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-100">Qty Received</p>
            <Package className="w-5 h-5 text-emerald-200" />
          </div>
          <p className="text-3xl font-bold mt-2">{totalQtyReceived}</p>
          {totalQtyOrdered > 0 && (
            <p className="text-xs text-emerald-100 mt-0.5">of {totalQtyOrdered} ordered</p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-blue-600 text-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-100">Total Value</p>
            <FileText className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold font-mono mt-2">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-blue-100 mt-0.5">Received value</p>
        </div>
      </div>

      {/* GRN Info */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Receipt Information</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {[
              { label: "GRN Number",    value: g.grnNo },
              { label: "Receipt Date",  value: formatDate(g.date) },
              { label: "Vendor",        value: g.vendorName },
              { label: "Purchase Order",value: g.poNo  || "—" },
              { label: "Status",        value: g.status.charAt(0).toUpperCase() + g.status.slice(1) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            {g.notes ? (
              <p className="text-sm text-foreground">{g.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card className="rounded-2xl border border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" /> Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lines.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No line items recorded for this receipt</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[2fr_120px_100px_100px_120px_120px] gap-3 px-6 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div>Description</div>
                <div>HSN/SAC</div>
                <div className="text-right">Qty Ordered</div>
                <div className="text-right">Qty Received</div>
                <div className="text-right">Rate</div>
                <div className="text-right">Line Total</div>
              </div>
              {lines.map((l: any, i: number) => (
                <div key={l.id ?? i} className="grid grid-cols-[2fr_120px_100px_100px_120px_120px] gap-3 px-6 py-3.5 border-b border-gray-50 last:border-0 items-center text-sm">
                  <span className="font-medium">{l.description ?? l.itemName ?? "—"}</span>
                  <span className="font-mono text-muted-foreground text-xs">{l.hsnSac ?? "—"}</span>
                  <span className="text-right font-mono">{l.qtyOrdered ?? "—"} {l.unit ?? ""}</span>
                  <span className={`text-right font-mono font-semibold ${(l.qtyReceived ?? 0) < (l.qtyOrdered ?? 0) ? "text-amber-600" : "text-emerald-600"}`}>
                    {l.qtyReceived ?? 0} {l.unit ?? ""}
                  </span>
                  <span className="text-right font-mono">{l.rate != null ? formatCurrency(l.rate) : "—"}</span>
                  <span className="text-right font-mono font-semibold">
                    {l.lineTotal != null ? formatCurrency(l.lineTotal) : (l.qtyReceived != null && l.rate != null ? formatCurrency(l.qtyReceived * l.rate) : "—")}
                  </span>
                </div>
              ))}
              {/* Footer total */}
              {lines.length > 0 && totalValue > 0 && (
                <div className="grid grid-cols-[2fr_120px_100px_100px_120px_120px] gap-3 px-6 py-3 bg-gray-50 border-t text-sm font-semibold">
                  <div className="col-span-4">Totals</div>
                  <div />
                  <div className="text-right font-mono text-violet-700">{formatCurrency(totalValue)}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
