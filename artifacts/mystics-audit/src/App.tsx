import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { FYProvider } from "@/contexts/fy-context";
import { AuthProvider } from "@/contexts/auth-context";
import { CompanyProvider } from "@/contexts/company-context";

const Dashboard           = lazy(() => import("@/pages/dashboard"));
const NotFound            = lazy(() => import("@/pages/not-found"));
const LoginPage           = lazy(() => import("@/pages/login"));
const Register            = lazy(() => import("@/pages/register"));

const AccountsList        = lazy(() => import("@/pages/accounts/index"));
const TrialBalance        = lazy(() => import("@/pages/accounts/trial-balance"));
const AccountLedger       = lazy(() => import("@/pages/accounts/ledger"));

const JournalsList        = lazy(() => import("@/pages/journals/index"));
const NewJournal          = lazy(() => import("@/pages/journals/new"));
const JournalDetail       = lazy(() => import("@/pages/journals/detail"));

const CustomersList       = lazy(() => import("@/pages/customers/index"));
const NewCustomer         = lazy(() => import("@/pages/customers/new"));
const CustomerDetail      = lazy(() => import("@/pages/customers/detail"));
const ArAging             = lazy(() => import("@/pages/customers/ar-aging"));

const ReceiptsList        = lazy(() => import("@/pages/receipts/index"));
const NewReceipt          = lazy(() => import("@/pages/receipts/new"));
const ReceiptDetail       = lazy(() => import("@/pages/receipts/detail"));

const VendorsList         = lazy(() => import("@/pages/vendors/index"));
const NewVendor           = lazy(() => import("@/pages/vendors/new"));
const VendorDetail        = lazy(() => import("@/pages/vendors/detail"));
const ApAging             = lazy(() => import("@/pages/vendors/ap-aging"));

const BillsList           = lazy(() => import("@/pages/bills/index"));
const NewBill             = lazy(() => import("@/pages/bills/new"));
const BillDetail          = lazy(() => import("@/pages/bills/detail"));

const BankList            = lazy(() => import("@/pages/bank/index"));
const BankTransactions    = lazy(() => import("@/pages/bank/transactions"));

const ExpensesList        = lazy(() => import("@/pages/expenses/index"));
const NewExpense          = lazy(() => import("@/pages/expenses/new"));
const ExpenseDetail       = lazy(() => import("@/pages/expenses/detail"));
const ExpenseAnalytics    = lazy(() => import("@/pages/expenses/analytics"));

const PoList              = lazy(() => import("@/pages/purchases/orders/index"));
const NewPo               = lazy(() => import("@/pages/purchases/orders/new"));
const PoDetail            = lazy(() => import("@/pages/purchases/orders/detail"));

const GrnList             = lazy(() => import("@/pages/purchases/grn/index"));
const NewGrn              = lazy(() => import("@/pages/purchases/grn/new"));
const GrnDetail           = lazy(() => import("@/pages/purchases/grn/detail"));

const InventoryList       = lazy(() => import("@/pages/inventory/index"));
const NewInventory        = lazy(() => import("@/pages/inventory/new"));
const InventoryDetail     = lazy(() => import("@/pages/inventory/detail"));
const InventoryValuation  = lazy(() => import("@/pages/inventory/valuation"));

const ItcLedger           = lazy(() => import("@/pages/gst/itc-ledger"));
const Gstr1               = lazy(() => import("@/pages/gst/gstr1"));
const Gstr3b              = lazy(() => import("@/pages/gst/gstr3b"));
const GstReconciliation   = lazy(() => import("@/pages/gst/reconciliation"));
const GstDocuments        = lazy(() => import("@/pages/gst-documents/index"));

const BudgetsList         = lazy(() => import("@/pages/budgets/index"));
const NewBudget           = lazy(() => import("@/pages/budgets/new"));
const BudgetVsActual      = lazy(() => import("@/pages/budgets/vs-actual"));

const UsersList           = lazy(() => import("@/pages/users/index"));
const NewUser             = lazy(() => import("@/pages/users/new"));
const UserDetail          = lazy(() => import("@/pages/users/detail"));

const AuditLogsList       = lazy(() => import("@/pages/audit-logs/index"));

const ProfitLoss          = lazy(() => import("@/pages/reports/profit-loss"));
const BalanceSheet        = lazy(() => import("@/pages/reports/balance-sheet"));
const CashFlow            = lazy(() => import("@/pages/reports/cash-flow"));
const DayBook             = lazy(() => import("@/pages/reports/day-book"));
const GstSalesRegister    = lazy(() => import("@/pages/reports/gst-sales-register"));
const GstPurchaseRegister = lazy(() => import("@/pages/reports/gst-purchase-register"));
const ExpenseReport       = lazy(() => import("@/pages/reports/expense-report"));
const VendorPayments      = lazy(() => import("@/pages/reports/vendor-payments"));
const CustomerCollections = lazy(() => import("@/pages/reports/customer-collections"));
const BudgetVarianceReport= lazy(() => import("@/pages/reports/budget-variance"));

const InvoicesList        = lazy(() => import("@/pages/invoices/index"));
const NewInvoice          = lazy(() => import("@/pages/invoices/new"));
const InvoiceDetail       = lazy(() => import("@/pages/invoices/detail"));

const TemplateBuilder     = lazy(() => import("@/pages/template-builder/index"));
const CompanySettings     = lazy(() => import("@/pages/settings/index"));
const Documents           = lazy(() => import("@/pages/documents/index"));
const FinanceOverview     = lazy(() => import("@/pages/finance/overview"));
const BillingPage         = lazy(() => import("@/pages/billing"));

const AuditorCollaboration= lazy(() => import("@/pages/auditor/index"));
const AuditClientDetail   = lazy(() => import("@/pages/auditor/client-detail"));

const PlatformAdminDashboard  = lazy(() => import("@/pages/platform-admin/index"));
const PlatformOrganizations   = lazy(() => import("@/pages/platform-admin/organizations"));
const OrgDetail               = lazy(() => import("@/pages/platform-admin/org-detail"));
const PlatformUsers           = lazy(() => import("@/pages/platform-admin/platform-users"));
const PlatformSubscriptions   = lazy(() => import("@/pages/platform-admin/subscriptions"));
const PlatformAnalytics       = lazy(() => import("@/pages/platform-admin/analytics"));
const BillingPayments         = lazy(() => import("@/pages/platform-admin/billing-payments"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000,
      gcTime:               10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry:                1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 w-full">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={Register} />

        <Route path="/platform-admin/organizations/:id" component={OrgDetail} />
        <Route path="/platform-admin/organizations" component={PlatformOrganizations} />
        <Route path="/platform-admin/subscriptions" component={PlatformSubscriptions} />
        <Route path="/platform-admin/billing" component={BillingPayments} />
        <Route path="/platform-admin/users" component={PlatformUsers} />
        <Route path="/platform-admin/analytics" component={PlatformAnalytics} />
        <Route path="/platform-admin">
          {(params) => params ? <PlatformAdminDashboard /> : <PlatformAdminDashboard />}
        </Route>

        <Route>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/">
                  <Redirect to="/dashboard" />
                </Route>
                <Route path="/dashboard" component={Dashboard} />

                <Route path="/accounts" component={AccountsList} />
                <Route path="/accounts/trial-balance" component={TrialBalance} />
                <Route path="/accounts/:id" component={AccountLedger} />

                <Route path="/invoices" component={InvoicesList} />
                <Route path="/invoices/new" component={NewInvoice} />
                <Route path="/invoices/:id" component={InvoiceDetail} />

                <Route path="/journals" component={JournalsList} />
                <Route path="/journals/new" component={NewJournal} />
                <Route path="/journals/:id" component={JournalDetail} />

                <Route path="/customers" component={CustomersList} />
                <Route path="/customers/new" component={NewCustomer} />
                <Route path="/customers/ar-aging" component={ArAging} />
                <Route path="/customers/:id" component={CustomerDetail} />

                <Route path="/receipts" component={ReceiptsList} />
                <Route path="/receipts/new" component={NewReceipt} />
                <Route path="/receipts/:id" component={ReceiptDetail} />

                <Route path="/vendors" component={VendorsList} />
                <Route path="/vendors/new" component={NewVendor} />
                <Route path="/vendors/ap-aging" component={ApAging} />
                <Route path="/vendors/:id" component={VendorDetail} />

                <Route path="/bills" component={BillsList} />
                <Route path="/bills/new" component={NewBill} />
                <Route path="/bills/:id" component={BillDetail} />

                <Route path="/bank" component={BankList} />
                <Route path="/bank/:id/transactions" component={BankTransactions} />

                <Route path="/expenses" component={ExpensesList} />
                <Route path="/expenses/new" component={NewExpense} />
                <Route path="/expenses/analytics" component={ExpenseAnalytics} />
                <Route path="/expenses/:id" component={ExpenseDetail} />

                <Route path="/purchases/orders" component={PoList} />
                <Route path="/purchases/orders/new" component={NewPo} />
                <Route path="/purchases/orders/:id" component={PoDetail} />

                <Route path="/purchases/grn" component={GrnList} />
                <Route path="/purchases/grn/new" component={NewGrn} />
                <Route path="/purchases/grn/:id" component={GrnDetail} />

                <Route path="/inventory" component={InventoryList} />
                <Route path="/inventory/new" component={NewInventory} />
                <Route path="/inventory/valuation" component={InventoryValuation} />
                <Route path="/inventory/:id" component={InventoryDetail} />

                <Route path="/gst/itc-ledger" component={ItcLedger} />
                <Route path="/gst/gstr1" component={Gstr1} />
                <Route path="/gst/gstr3b" component={Gstr3b} />
                <Route path="/gst/reconciliation" component={GstReconciliation} />
                <Route path="/gst/documents" component={GstDocuments} />

                <Route path="/budgets" component={BudgetsList} />
                <Route path="/budgets/new" component={NewBudget} />
                <Route path="/budgets/:id/vs-actual" component={BudgetVsActual} />

                <Route path="/users" component={UsersList} />
                <Route path="/users/new" component={NewUser} />
                <Route path="/users/:id" component={UserDetail} />

                <Route path="/audit-logs" component={AuditLogsList} />
                <Route path="/billing" component={BillingPage} />
                <Route path="/settings" component={CompanySettings} />
                <Route path="/template-builder" component={TemplateBuilder} />

                <Route path="/documents" component={Documents} />
                <Route path="/finance/overview" component={FinanceOverview} />
                <Route path="/auditor" component={AuditorCollaboration} />
                <Route path="/auditor/clients/:id" component={AuditClientDetail} />

                <Route path="/reports/gst-sales-register" component={GstSalesRegister} />
                <Route path="/reports/gst-purchase-register" component={GstPurchaseRegister} />
                <Route path="/reports/expense-report" component={ExpenseReport} />
                <Route path="/reports/vendor-payments" component={VendorPayments} />
                <Route path="/reports/customer-collections" component={CustomerCollections} />
                <Route path="/reports/budget-variance" component={BudgetVarianceReport} />
                <Route path="/reports/profit-loss" component={ProfitLoss} />
                <Route path="/reports/balance-sheet" component={BalanceSheet} />
                <Route path="/reports/cash-flow" component={CashFlow} />
                <Route path="/reports/day-book" component={DayBook} />

                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
  );
}

const BASE_URL = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FYProvider>
          <CompanyProvider>
            <TooltipProvider>
              <WouterRouter base={BASE_URL}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </CompanyProvider>
        </FYProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
