import { useGetGstr3bData } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { FileCheck } from "lucide-react";

export default function Gstr3b() {
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(today.getFullYear()));
  const period = `${year}-${month}`;
  const { data } = useGetGstr3bData({ period });
  const d = data as any;
  const liability = d?.liability ?? {};
  const itc = d?.itc ?? {};
  const netPayable = (liability.cgst ?? 0) + (liability.sgst ?? 0) + (liability.igst ?? 0) - (itc.cgst ?? 0) - (itc.sgst ?? 0) - (itc.igst ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">GSTR-3B</h1>
          <p className="text-muted-foreground text-sm">Monthly Summary Return · Period: {period}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Month</Label>
            <Input type="number" min={1} max={12} className="w-16" value={month} onChange={e => setMonth(e.target.value.padStart(2, "0"))} />
            <Label className="text-sm">Year</Label>
            <Input type="number" min={2020} className="w-24" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          {d?.status !== "filed" && (
            <Button variant="default"><FileCheck className="w-4 h-4 mr-2" />File GSTR-3B</Button>
          )}
          {d?.status === "filed" && <Badge variant="default">Filed</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>GST Liability (Output Tax)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Taxable Value", value: formatCurrency(liability.taxableValue ?? 0) },
              { label: "CGST", value: formatCurrency(liability.cgst ?? 0) },
              { label: "SGST", value: formatCurrency(liability.sgst ?? 0) },
              { label: "IGST", value: formatCurrency(liability.igst ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-semibold">{value}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total Liability</span>
              <span className="font-mono">{formatCurrency((liability.cgst ?? 0) + (liability.sgst ?? 0) + (liability.igst ?? 0))}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>ITC Available (Input Tax)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "CGST ITC", value: formatCurrency(itc.cgst ?? 0) },
              { label: "SGST ITC", value: formatCurrency(itc.sgst ?? 0) },
              { label: "IGST ITC", value: formatCurrency(itc.igst ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-semibold text-green-600">{value}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total ITC</span>
              <span className="font-mono text-green-600">{formatCurrency((itc.cgst ?? 0) + (itc.sgst ?? 0) + (itc.igst ?? 0))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={netPayable > 0 ? "border-destructive" : "border-green-500"}>
        <CardHeader><CardTitle>Net Tax Payable</CardTitle></CardHeader>
        <CardContent>
          <p className={`text-3xl font-mono font-bold ${netPayable > 0 ? "text-destructive" : "text-green-600"}`}>{formatCurrency(Math.abs(netPayable))}</p>
          <p className="text-sm text-muted-foreground mt-1">{netPayable > 0 ? "Payable to government" : "Credit carried forward"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
