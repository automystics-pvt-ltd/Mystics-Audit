import fs from 'fs';
import path from 'path';

const pagesDir = path.join(process.cwd(), 'artifacts', 'mystics-audit', 'src', 'pages');

const pages = [
  {
    path: 'accounts/trial-balance.tsx',
    content: `import { useGetTrialBalance } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export default function TrialBalance() {
  const { data, isLoading } = useGetTrialBalance();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Trial Balance</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.lines?.map((line: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{line.accountName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.debit)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.credit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}`
  },
  {
    path: 'journals/index.tsx',
    content: `import { useListJournals } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function JournalsList() {
  const { data: journals, isLoading } = useListJournals({});
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Journals</h1>
        <Button asChild><Link href="/journals/new">New Journal</Link></Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journals?.map((journal: any) => (
                <TableRow key={journal.id}>
                  <TableCell><Link href={\`/journals/\${journal.id}\`} className="text-primary hover:underline">{journal.voucherNo}</Link></TableCell>
                  <TableCell>{formatDate(journal.date)}</TableCell>
                  <TableCell>{journal.narration}</TableCell>
                  <TableCell className="text-right">{formatCurrency(journal.totalDebit)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(journal.totalCredit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}`
  },
  {
    path: 'journals/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewJournal() { return <Card className="p-6">New Journal Form</Card>; }`
  },
  {
    path: 'journals/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function JournalDetail() { return <Card className="p-6">Journal Detail</Card>; }`
  },
  {
    path: 'customers/index.tsx',
    content: `import { useListCustomers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function CustomersList() {
  const { data: customers } = useListCustomers({});
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <Button asChild><Link href="/customers/new">New Customer</Link></Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>GSTIN</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
            <TableBody>
              {customers?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell><Link href={\`/customers/\${c.id}\`} className="text-primary hover:underline">{c.name}</Link></TableCell>
                  <TableCell>{c.gstin}</TableCell>
                  <TableCell>{c.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}`
  },
  {
    path: 'customers/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewCustomer() { return <Card className="p-6">New Customer</Card>; }`
  },
  {
    path: 'customers/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function CustomerDetail() { return <Card className="p-6">Customer Detail</Card>; }`
  },
  {
    path: 'customers/ar-aging.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ArAging() { return <Card className="p-6">AR Aging</Card>; }`
  },
  {
    path: 'receipts/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ReceiptsList() { return <Card className="p-6">Receipts List</Card>; }`
  },
  {
    path: 'receipts/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewReceipt() { return <Card className="p-6">New Receipt</Card>; }`
  },
  {
    path: 'receipts/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ReceiptDetail() { return <Card className="p-6">Receipt Detail</Card>; }`
  },
  {
    path: 'vendors/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function VendorsList() { return <Card className="p-6">Vendors List</Card>; }`
  },
  {
    path: 'vendors/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewVendor() { return <Card className="p-6">New Vendor</Card>; }`
  },
  {
    path: 'vendors/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function VendorDetail() { return <Card className="p-6">Vendor Detail</Card>; }`
  },
  {
    path: 'vendors/ap-aging.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ApAging() { return <Card className="p-6">AP Aging</Card>; }`
  },
  {
    path: 'bills/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function BillsList() { return <Card className="p-6">Bills List</Card>; }`
  },
  {
    path: 'bills/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewBill() { return <Card className="p-6">New Bill</Card>; }`
  },
  {
    path: 'bills/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function BillDetail() { return <Card className="p-6">Bill Detail</Card>; }`
  },
  {
    path: 'bank/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function BankList() { return <Card className="p-6">Bank List</Card>; }`
  },
  {
    path: 'bank/transactions.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function BankTransactions() { return <Card className="p-6">Bank Transactions</Card>; }`
  },
  {
    path: 'expenses/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ExpensesList() { return <Card className="p-6">Expenses List</Card>; }`
  },
  {
    path: 'expenses/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewExpense() { return <Card className="p-6">New Expense</Card>; }`
  },
  {
    path: 'expenses/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ExpenseDetail() { return <Card className="p-6">Expense Detail</Card>; }`
  },
  {
    path: 'expenses/analytics.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ExpenseAnalytics() { return <Card className="p-6">Expense Analytics</Card>; }`
  },
  {
    path: 'purchases/orders/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function PoList() { return <Card className="p-6">PO List</Card>; }`
  },
  {
    path: 'purchases/orders/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewPo() { return <Card className="p-6">New PO</Card>; }`
  },
  {
    path: 'purchases/orders/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function PoDetail() { return <Card className="p-6">PO Detail</Card>; }`
  },
  {
    path: 'purchases/grn/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function GrnList() { return <Card className="p-6">GRN List</Card>; }`
  },
  {
    path: 'purchases/grn/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewGrn() { return <Card className="p-6">New GRN</Card>; }`
  },
  {
    path: 'inventory/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function InventoryList() { return <Card className="p-6">Inventory List</Card>; }`
  },
  {
    path: 'inventory/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewInventory() { return <Card className="p-6">New Inventory</Card>; }`
  },
  {
    path: 'inventory/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function InventoryDetail() { return <Card className="p-6">Inventory Detail</Card>; }`
  },
  {
    path: 'inventory/valuation.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function InventoryValuation() { return <Card className="p-6">Inventory Valuation</Card>; }`
  },
  {
    path: 'gst/itc-ledger.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ItcLedger() { return <Card className="p-6">ITC Ledger</Card>; }`
  },
  {
    path: 'gst/gstr1.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function Gstr1() { return <Card className="p-6">GSTR-1</Card>; }`
  },
  {
    path: 'gst/gstr3b.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function Gstr3b() { return <Card className="p-6">GSTR-3B</Card>; }`
  },
  {
    path: 'gst/reconciliation.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function GstReconciliation() { return <Card className="p-6">GST Reconciliation</Card>; }`
  },
  {
    path: 'budgets/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function BudgetsList() { return <Card className="p-6">Budgets List</Card>; }`
  },
  {
    path: 'budgets/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewBudget() { return <Card className="p-6">New Budget</Card>; }`
  },
  {
    path: 'budgets/vs-actual.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function BudgetVsActual() { return <Card className="p-6">Budget Vs Actual</Card>; }`
  },
  {
    path: 'users/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function UsersList() { return <Card className="p-6">Users List</Card>; }`
  },
  {
    path: 'users/new.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function NewUser() { return <Card className="p-6">New User</Card>; }`
  },
  {
    path: 'users/detail.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function UserDetail() { return <Card className="p-6">User Detail</Card>; }`
  },
  {
    path: 'audit-logs/index.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function AuditLogsList() { return <Card className="p-6">Audit Logs</Card>; }`
  },
  {
    path: 'reports/profit-loss.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function ProfitLoss() { return <Card className="p-6">Profit & Loss</Card>; }`
  },
  {
    path: 'reports/balance-sheet.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function BalanceSheet() { return <Card className="p-6">Balance Sheet</Card>; }`
  },
  {
    path: 'reports/cash-flow.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function CashFlow() { return <Card className="p-6">Cash Flow</Card>; }`
  },
  {
    path: 'reports/day-book.tsx',
    content: `import { Card } from "@/components/ui/card"; export default function DayBook() { return <Card className="p-6">Day Book</Card>; }`
  }
];

for (const page of pages) {
  const fullPath = path.join(pagesDir, page.path);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, page.content);
}
console.log('Done');
