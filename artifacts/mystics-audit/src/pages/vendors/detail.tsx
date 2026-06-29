import { useGetVendor } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: vendor } = useGetVendor(Number(id));
  const v = vendor as any;
  if (!v) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vendors"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-semibold">{v.name}</h1>
            <p className="text-muted-foreground text-sm">{v.city}{v.state ? `, ${v.state}` : ""}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {v.isMsme && <Badge className="bg-amber-500 text-white">MSME</Badge>}
          <Badge variant={v.isActive ? "default" : "secondary"}>{v.isActive ? "Active" : "Inactive"}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "GSTIN", value: v.gstin || "—" },
              { label: "PAN", value: v.pan || "—" },
              { label: "Email", value: v.email || "—" },
              { label: "Phone", value: v.phone || "—" },
              { label: "TDS Section", value: v.tdsSection || "—" },
              { label: "Payment Terms", value: v.paymentTerms },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Financial</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Current Balance", value: formatCurrency(v.currentBalance) },
              { label: "Opening Balance", value: formatCurrency(v.openingBalance) },
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
    </div>
  );
}
