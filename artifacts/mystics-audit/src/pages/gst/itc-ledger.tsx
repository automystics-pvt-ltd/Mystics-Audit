import { useGetItcLedger } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";

export default function ItcLedger() {
  const { data } = useGetItcLedger({});
  const d = data as any;
  const entries: any[] = d?.entries ?? [];
  const summary = d?.summary ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ITC Ledger</h1>
        <p className="text-muted-foreground text-sm">Input Tax Credit available and utilized</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "CGST Available", value: formatCurrency(summary.cgstAvailable ?? 0), color: "" },
          { label: "SGST Available", value: formatCurrency(summary.sgstAvailable ?? 0), color: "" },
          { label: "IGST Available", value: formatCurrency(summary.igstAvailable ?? 0), color: "" },
          { label: "Total ITC", value: formatCurrency((summary.cgstAvailable ?? 0) + (summary.sgstAvailable ?? 0) + (summary.igstAvailable ?? 0)), color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent><p className={`text-xl font-mono font-semibold ${color}`}>{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Vendor GSTIN</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                <TableCell className="font-medium">{e.vendorName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.vendorGstin || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{e.invoiceNo}</TableCell>
                <TableCell className="text-right font-mono text-sm">{e.cgst > 0 ? formatCurrency(e.cgst) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{e.sgst > 0 ? formatCurrency(e.sgst) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{e.igst > 0 ? formatCurrency(e.igst) : "—"}</TableCell>
                <TableCell><Badge variant={e.status === "available" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No ITC entries found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
