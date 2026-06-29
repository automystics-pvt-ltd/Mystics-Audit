import { useListVendors } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Plus, Search } from "lucide-react";

export default function VendorsList() {
  const [search, setSearch] = useState("");
  const [isMsme, setIsMsme] = useState(false);
  const { data } = useListVendors(isMsme ? { isMsme: true } : search ? { search } : {});
  const vendors: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendors</h1>
          <p className="text-muted-foreground text-sm">{vendors.length} vendors</p>
        </div>
        <div className="flex gap-2">
          <Link href="/vendors/ap-aging"><Button variant="outline">AP Aging</Button></Link>
          <Link href="/vendors/new"><Button><Plus className="w-4 h-4 mr-2" />New Vendor</Button></Link>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={isMsme ? "default" : "outline"} size="sm" onClick={() => setIsMsme(!isMsme)}>
          MSME Only
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>MSME</TableHead>
              <TableHead>TDS Section</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v: any) => (
              <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/vendors/${v.id}`} className="font-medium text-primary hover:underline">{v.name}</Link>
                  {v.email && <p className="text-xs text-muted-foreground">{v.email}</p>}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{v.gstin || "—"}</TableCell>
                <TableCell>
                  {v.isMsme ? <Badge className="bg-amber-500 text-white hover:bg-amber-600">MSME</Badge> : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.tdsSection || "—"}</TableCell>
                <TableCell className="text-sm">{v.paymentTerms}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(v.currentBalance)}</TableCell>
              </TableRow>
            ))}
            {vendors.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No vendors found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
