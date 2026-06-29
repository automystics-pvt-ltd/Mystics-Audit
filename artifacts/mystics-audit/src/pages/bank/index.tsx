import { useListBankAccounts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { Building2, Plus } from "lucide-react";

export default function BankList() {
  const { data } = useListBankAccounts();
  const banks: any[] = data ?? [];
  const totalBalance = banks.reduce((s, b) => s + Number(b.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bank & Cash</h1>
          <p className="text-muted-foreground text-sm">Total balance: <span className="font-mono font-semibold text-foreground">{formatCurrency(totalBalance)}</span></p>
        </div>
        <Button variant="outline"><Plus className="w-4 h-4 mr-2" />Add Account</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks.map((b: any) => (
          <Link key={b.id} href={`/bank/${b.id}/transactions`}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{b.accountType}</span>
                </div>
                <CardTitle className="text-base mt-2">{b.accountName}</CardTitle>
                <p className="text-sm text-muted-foreground">{b.bankName}</p>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono font-bold">{formatCurrency(b.balance)}</p>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p>A/C: <span className="font-mono">{b.accountNo}</span></p>
                  <p>IFSC: <span className="font-mono">{b.ifsc}</span></p>
                  {b.branch && <p>Branch: {b.branch}</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {banks.length === 0 && (
          <Card className="col-span-3 p-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No bank accounts found</p>
          </Card>
        )}
      </div>
    </div>
  );
}
