import { useGetVendor, useListBills } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";

function AgingBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const STATUS_PILL: Record<string, string> = {
  draft:   "bg-amber-50 text-amber-700 border border-amber-200",
  posted:  "bg-blue-50 text-blue-700 border border-blue-200",
  partial: "bg-purple-50 text-purple-700 border border-purple-200",
  paid:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: vendor } = useGetVendor(Number(id));
  const { data: billsData } = useListBills({ vendorId: Number(id) });

  const v = vendor as any;
  const bills: any[] = Array.isArray(billsData) ? billsData : (billsData as any)?.data ?? [];

  if (!v) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  // Compute AP aging from bills
  const today = new Date();
  const aging = { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d91_180: 0, d180plus: 0 };
  let totalOutstanding = 0;
  for (const b of bills) {
    const due = b.balanceDue ?? 0;
    if (due <= 0) continue;
    totalOutstanding += due;
    const diff = Math.floor((today.getTime() - new Date(b.dueDate).getTime()) / 86400000);
    if (diff <= 0)        aging.current  += due;
    else if (diff <= 30)  aging.d0_30    += due;
    else if (diff <= 60)  aging.d31_60   += due;
    else if (diff <= 90)  aging.d61_90   += due;
    else if (diff <= 180) aging.d91_180  += due;
    else                  aging.d180plus += due;
  }

  const agingBuckets = [
    { label: "Not Yet Due",   value: aging.current,  color: "bg-emerald-500" },
    { label: "0-30 days",     value: aging.d0_30,    color: "bg-amber-400"  },
    { label: "31-60 days",    value: aging.d31_60,   color: "bg-orange-500" },
    { label: "61-90 days",    value: aging.d61_90,   color: "bg-red-500"    },
    { label: "91-180 days",   value: aging.d91_180,  color: "bg-red-700"    },
    { label: "180+ days",     value: aging.d180plus, color: "bg-gray-800"   },
  ];

  const hasOverdue = (aging.d0_30 + aging.d31_60 + aging.d61_90 + aging.d91_180 + aging.d180plus) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vendors">
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{v.name}</h1>
            <p className="text-muted-foreground text-sm">
              {v.city}{v.state ? `, ${v.state}` : ""}
              {v.isMsme && " · MSME Registered"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {v.isMsme && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              MSME
            </span>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${v.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {v.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-violet-600 text-white px-5 py-5">
          <p className="text-xs font-medium opacity-80">Current Balance</p>
          <p className="text-2xl font-bold font-mono mt-2">{formatCurrency(v.currentBalance)}</p>
          <p className="text-xs opacity-70 mt-0.5">Payable balance</p>
        </div>
        <div className="rounded-2xl bg-amber-600 text-white px-5 py-5">
          <p className="text-xs font-medium opacity-80">Outstanding AP</p>
          <p className="text-2xl font-bold font-mono mt-2">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs opacity-70 mt-0.5">Balance due</p>
        </div>
        <div className={`rounded-2xl text-white px-5 py-5 ${hasOverdue ? "bg-red-600" : "bg-emerald-600"}`}>
          <p className="text-xs font-medium opacity-80">{hasOverdue ? "Overdue Amount" : "No Overdue"}</p>
          <p className="text-2xl font-bold font-mono mt-2">
            {formatCurrency(aging.d0_30 + aging.d31_60 + aging.d61_90 + aging.d91_180 + aging.d180plus)}
          </p>
          <p className="text-xs opacity-70 mt-0.5">{hasOverdue ? "Past due date" : "All bills current"}</p>
        </div>
      </div>

      {/* Contact + Financial */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {[
              { label: "GSTIN",          value: v.gstin || "—" },
              { label: "PAN",            value: v.pan || "—" },
              { label: "Email",          value: v.email || "—" },
              { label: "Phone",          value: v.phone || "—" },
              { label: "TDS Section",    value: v.tdsSection || "—" },
              { label: "Payment Terms",  value: v.paymentTerms ? (String(v.paymentTerms).includes("day") ? String(v.paymentTerms) : `${v.paymentTerms} days`) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium font-mono">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Financial Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {[
              { label: "Opening Balance", value: formatCurrency(v.openingBalance) },
              { label: "Current Balance", value: formatCurrency(v.currentBalance) },
              { label: "Total Bills",     value: String(bills.length) },
              { label: "Unpaid Bills",    value: String(bills.filter((b: any) => ["posted","partial"].includes(b.status)).length) },
              ...(v.isMsme ? [{ label: "MSME Reg No", value: v.msmeRegistrationNo || "—" }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold font-mono">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AP Aging */}
      {bills.length > 0 && (
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">AP Aging Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {agingBuckets.map(({ label, value, color }) => (
              <AgingBar key={label} label={label} value={value} total={totalOutstanding || 1} color={color} />
            ))}
            <div className="flex justify-between font-semibold text-sm pt-2 border-t">
              <span>Total Outstanding</span>
              <span className="font-mono">{formatCurrency(totalOutstanding)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Bills */}
      <Card className="rounded-2xl border border-gray-100 shadow-sm">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" /> Bills
          </CardTitle>
          <Link href={`/bills?vendorId=${id}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No bills found for this vendor</p>
          ) : (
            <div>
              {/* Header row */}
              <div className="grid grid-cols-[1fr_120px_100px_110px_110px_90px] gap-3 px-6 py-2 border-b bg-gray-50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div>Bill No</div>
                <div>Date</div>
                <div>Due Date</div>
                <div className="text-right">Total</div>
                <div className="text-right">Balance Due</div>
                <div className="text-center">Status</div>
              </div>
              {bills.slice(0, 8).map((b: any) => (
                <Link key={b.id} href={`/bills/${b.id}`}>
                  <div className="grid grid-cols-[1fr_120px_100px_110px_110px_90px] gap-3 px-6 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer items-center text-sm">
                    <span className="font-mono font-semibold text-violet-600">{b.billNo}</span>
                    <span className="text-muted-foreground">{formatDate(b.date)}</span>
                    <span className={`text-muted-foreground ${new Date(b.dueDate) < new Date() && b.balanceDue > 0 ? "text-red-600 font-medium" : ""}`}>
                      {formatDate(b.dueDate)}
                    </span>
                    <span className="text-right font-mono">{formatCurrency(b.totalAmount)}</span>
                    <span className={`text-right font-mono font-semibold ${b.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {b.balanceDue > 0 ? formatCurrency(b.balanceDue) : "✓ Paid"}
                    </span>
                    <div className="flex justify-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[b.status] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
