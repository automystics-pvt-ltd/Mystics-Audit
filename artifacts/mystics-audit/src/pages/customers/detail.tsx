import { useGetCustomer, useGetCustomerAging } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, CreditCard, TrendingUp, AlertTriangle, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

function AgingBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono font-semibold text-gray-800">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading, isError } = useGetCustomer(Number(id));
  const { data: aging } = useGetCustomerAging(Number(id));

  const c = customer as any;
  const a = aging as any;

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="w-10 h-10 text-amber-400" />
      <p className="text-gray-500 font-medium">Customer not found</p>
      <Link href="/customers"><Button variant="outline" size="sm"><ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Customers</Button></Link>
    </div>
  );

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-3 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (!c) return <div className="p-8 text-center text-gray-400">Customer not found</div>;

  const totalAging = a?.total ?? 0;
  const creditUsed = c.creditLimit > 0 ? Math.min(((c.currentBalance ?? 0) / c.creditLimit) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="sm" className="rounded-xl h-8">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{c.type} · {c.city}, {c.state}</p>
          </div>
        </div>
        <Badge variant={c.isActive ? "default" : "secondary"} className="h-7 px-3">
          {c.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Current Balance", value: formatCurrency(c.currentBalance ?? 0), sub: "Outstanding AR", icon: TrendingUp, bg: "bg-violet-600" },
          { label: "Credit Limit",    value: formatCurrency(c.creditLimit ?? 0),    sub: `${creditUsed.toFixed(0)}% utilised`,  icon: CreditCard,  bg: "bg-blue-600" },
          { label: "Opening Balance", value: formatCurrency(c.openingBalance ?? 0), sub: "At period start",   icon: Building2,   bg: "bg-gray-500" },
          { label: "Total Aging",     value: formatCurrency(totalAging),            sub: "Receivable outstanding", icon: AlertTriangle, bg: totalAging > 0 ? "bg-amber-600" : "bg-emerald-600" },
        ].map(({ label, value, sub, icon: Icon, bg }) => (
          <div key={label} className={cn("rounded-2xl px-5 py-5 text-white", bg)}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium opacity-80">{label}</p>
              <Icon className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold font-mono mt-2">{value}</p>
            <p className="text-xs opacity-70 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <User2 className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Contact Details</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "GSTIN",          value: c.gstin || "—" },
              { label: "PAN",            value: c.pan || "—" },
              { label: "Email",          value: c.email || "—" },
              { label: "Phone",          value: c.phone || "—" },
              { label: "WhatsApp",       value: c.whatsapp || "—" },
              { label: "Address",        value: c.billingAddress || "—" },
              { label: "City",           value: c.city || "—" },
              { label: "Pincode",        value: c.pincode || "—" },
              { label: "Currency",       value: c.currency || "INR" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <span className="text-gray-500 shrink-0">{label}</span>
                <span className="font-medium text-gray-800 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <CreditCard className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Credit Profile</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            {[
              { label: "Payment Terms",  value: c.paymentTerms || "—" },
              { label: "TDS Category",   value: c.tdsCategory || "—" },
              { label: "Customer Group", value: c.customerGroup || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800">{value}</span>
              </div>
            ))}
            {/* Credit utilisation bar */}
            <div className="pt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Credit Utilisation</span>
                <span className="font-semibold text-gray-800">{creditUsed.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", creditUsed > 80 ? "bg-red-500" : creditUsed > 50 ? "bg-amber-400" : "bg-emerald-500")}
                  style={{ width: `${creditUsed}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{formatCurrency(c.currentBalance ?? 0)} of {formatCurrency(c.creditLimit ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AR Aging */}
      {a && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-800 text-sm">AR Aging Breakdown</h2>
            <span className="ml-auto font-mono font-bold text-gray-700 text-sm">{formatCurrency(a.total)}</span>
          </div>
          <div className="px-5 py-5 space-y-4">
            {[
              { label: "Current (not due)",  value: a.current,     color: "bg-emerald-500" },
              { label: "1–30 days",          value: a.days0to30,   color: "bg-yellow-400" },
              { label: "31–60 days",         value: a.days31to60,  color: "bg-orange-400" },
              { label: "61–90 days",         value: a.days61to90,  color: "bg-red-400" },
              { label: "91–180 days",        value: a.days91to180, color: "bg-red-600" },
              { label: "180+ days",          value: a.days180plus, color: "bg-red-800" },
            ].map(({ label, value, color }) => (
              <AgingBar key={label} label={label} value={value} total={a.total} color={color} />
            ))}
            <div className="flex justify-between font-bold text-sm pt-3 border-t border-gray-100">
              <span className="text-gray-700">Total Outstanding</span>
              <span className="font-mono text-gray-900">{formatCurrency(a.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
