import { useGetItcLedger } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/format";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function ItcLedger() {
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [year, setYear]   = useState(String(today.getFullYear()));
  const period = `${year}-${month}`;

  const { data } = useGetItcLedger({ period });
  const d = data as any;
  const entries: any[] = d?.entries ?? [];
  const summary = d?.summary ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ITC Ledger</h1>
          <p className="text-muted-foreground text-sm">Input Tax Credit available and utilized · Period: {period}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-sm">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i)).map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "CGST Available", value: formatCurrency(summary.cgstAvailable ?? 0), bg: "bg-violet-600" },
          { label: "SGST Available", value: formatCurrency(summary.sgstAvailable ?? 0), bg: "bg-blue-600" },
          { label: "IGST Available", value: formatCurrency(summary.igstAvailable ?? 0), bg: "bg-indigo-600" },
          { label: "Total ITC", value: formatCurrency((summary.cgstAvailable ?? 0) + (summary.sgstAvailable ?? 0) + (summary.igstAvailable ?? 0)), bg: "bg-emerald-600" },
        ].map(({ label, value, bg }) => (
          <div key={label} className={`rounded-2xl px-5 py-5 text-white ${bg}`}>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="text-2xl font-bold font-mono mt-2">{value}</p>
          </div>
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
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No ITC entries found for {period}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
