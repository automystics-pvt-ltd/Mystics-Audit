import { useListGrns } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

export default function GrnList() {
  const { data } = useListGrns({});
  const grns: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Goods Receipt Notes</h1>
          <p className="text-muted-foreground text-sm">{grns.length} GRNs</p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchases/orders"><Button variant="outline">Purchase Orders</Button></Link>
          <Link href="/purchases/grn/new"><Button><Plus className="w-4 h-4 mr-2" />New GRN</Button></Link>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN No</TableHead>
              <TableHead>PO No</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grns.map((g: any) => (
              <TableRow key={g.id} className="hover:bg-muted/50">
                <TableCell className="font-mono font-medium">{g.grnNo}</TableCell>
                <TableCell className="font-mono text-sm text-primary">{g.poNo}</TableCell>
                <TableCell>{g.vendorName}</TableCell>
                <TableCell className="text-sm">{formatDate(g.date)}</TableCell>
                <TableCell><Badge variant="default">{g.status}</Badge></TableCell>
              </TableRow>
            ))}
            {grns.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No GRNs found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
