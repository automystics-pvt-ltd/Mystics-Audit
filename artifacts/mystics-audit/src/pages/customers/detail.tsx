import { useGetCustomer, useGetCustomerAging } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

function AgingBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: customer } = useGetCustomer(Number(id));
  const { data: aging } = useGetCustomerAging(Number(id));

  const c = customer as any;
  const a = aging as any;

  if (!c) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold">{c.name}</h1>
            <p className="text-muted-foreground text-sm">{c.type} · {c.state}</p>
          </div>
        </div>
        <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Active" : "Inactive"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "GSTIN", value: c.gstin || "—" },
              { label: "PAN", value: c.pan || "—" },
              { label: "Email", value: c.email || "—" },
              { label: "Phone", value: c.phone || "—" },
              { label: "City", value: c.city || "—" },
              { label: "State", value: c.state || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium font-mono">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Credit Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Credit Limit", value: formatCurrency(c.creditLimit) },
              { label: "Current Balance", value: formatCurrency(c.currentBalance) },
              { label: "Payment Terms", value: c.paymentTerms },
              { label: "Opening Balance", value: formatCurrency(c.openingBalance) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold font-mono">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {a && (
        <Card>
          <CardHeader><CardTitle>Aging Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Current", value: a.current },
              { label: "0-30 days", value: a.days0to30 },
              { label: "31-60 days", value: a.days31to60 },
              { label: "61-90 days", value: a.days61to90 },
              { label: "91-180 days", value: a.days91to180 },
              { label: "180+ days", value: a.days180plus },
            ].map(({ label, value }) => (
              <AgingBar key={label} label={label} value={value} total={a.total} />
            ))}
            <div className="flex justify-between font-semibold text-sm pt-2 border-t">
              <span>Total Outstanding</span>
              <span className="font-mono">{formatCurrency(a.total)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
