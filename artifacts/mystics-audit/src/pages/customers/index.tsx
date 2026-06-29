import { useListCustomers } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Plus, Search } from "lucide-react";

export default function CustomersList() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const { data } = useListCustomers(search ? { search } : type ? { type } : {});
  const customers: any[] = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm">{customers.length} customers</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers/ar-aging"><Button variant="outline">AR Aging</Button></Link>
          <Link href="/customers/new"><Button><Plus className="w-4 h-4 mr-2" />New Customer</Button></Link>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {["", "Business", "Individual"].map(t => (
          <Button key={t} variant={type === t ? "default" : "outline"} size="sm" onClick={() => setType(t)}>
            {t || "All"}
          </Button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Credit Limit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Payment Terms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c: any) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </TableCell>
                <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{c.gstin || "—"}</TableCell>
                <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(c.creditLimit)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(c.currentBalance)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.paymentTerms}</TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No customers found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
