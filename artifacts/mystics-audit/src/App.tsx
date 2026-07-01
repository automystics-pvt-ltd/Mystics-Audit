import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { FYProvider } from "@/contexts/fy-context";
import { AuthProvider } from "@/contexts/auth-context";
import { CompanyProvider } from "@/contexts/company-context";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

import AccountsList from "@/pages/accounts/index";
import TrialBalance from "@/pages/accounts/trial-balance";

import JournalsList from "@/pages/journals/index";
import NewJournal from "@/pages/journals/new";
import JournalDetail from "@/pages/journals/detail";

import CustomersList from "@/pages/customers/index";
import NewCustomer from "@/pages/customers/new";
import CustomerDetail from "@/pages/customers/detail";
import ArAging from "@/pages/customers/ar-aging";

import ReceiptsList from "@/pages/receipts/index";
import NewReceipt from "@/pages/receipts/new";
import ReceiptDetail from "@/pages/receipts/detail";

import VendorsList from "@/pages/vendors/index";
import NewVendor from "@/pages/vendors/new";
import VendorDetail from "@/pages/vendors/detail";
import ApAging from "@/pages/vendors/ap-aging";

import BillsList from "@/pages/bills/index";
import NewBill from "@/pages/bills/new";
import BillDetail from "@/pages/bills/detail";

import BankList from "@/pages/bank/index";
import BankTransactions from "@/pages/bank/transactions";

import ExpensesList from "@/pages/expenses/index";
import NewExpense from "@/pages/expenses/new";
import ExpenseDetail from "@/pages/expenses/detail";
import ExpenseAnalytics from "@/pages/expenses/analytics";

import PoList from "@/pages/purchases/orders/index";
import NewPo from "@/pages/purchases/orders/new";
import PoDetail from "@/pages/purchases/orders/detail";

import GrnList from "@/pages/purchases/grn/index";
import NewGrn from "@/pages/purchases/grn/new";
import GrnDetail from "@/pages/purchases/grn/detail";

import InventoryList from "@/pages/inventory/index";
import NewInventory from "@/pages/inventory/new";
import InventoryDetail from "@/pages/inventory/detail";
import InventoryValuation from "@/pages/inventory/valuation";

import ItcLedger from "@/pages/gst/itc-ledger";
import Gstr1 from "@/pages/gst/gstr1";
import Gstr3b from "@/pages/gst/gstr3b";
import GstReconciliation from "@/pages/gst/reconciliation";

import BudgetsList from "@/pages/budgets/index";
import NewBudget from "@/pages/budgets/new";
import BudgetVsActual from "@/pages/budgets/vs-actual";

import UsersList from "@/pages/users/index";
import NewUser from "@/pages/users/new";
import UserDetail from "@/pages/users/detail";
import Register from "@/pages/register";

import AuditLogsList from "@/pages/audit-logs/index";

import ProfitLoss from "@/pages/reports/profit-loss";
import BalanceSheet from "@/pages/reports/balance-sheet";
import CashFlow from "@/pages/reports/cash-flow";
import DayBook from "@/pages/reports/day-book";

import InvoicesList from "@/pages/invoices/index";
import NewInvoice from "@/pages/invoices/new";
import InvoiceDetail from "@/pages/invoices/detail";

import AccountLedger from "@/pages/accounts/ledger";
import TemplateBuilder from "@/pages/template-builder/index";

import PlatformAdminDashboard from "@/pages/platform-admin/index";
import PlatformOrganizations from "@/pages/platform-admin/organizations";
import OrgDetail from "@/pages/platform-admin/org-detail";
import PlatformUsers from "@/pages/platform-admin/platform-users";
import PlatformSubscriptions from "@/pages/platform-admin/subscriptions";
import PlatformAnalytics from "@/pages/platform-admin/analytics";
import BillingPayments from "@/pages/platform-admin/billing-payments";
import BillingPage from "@/pages/billing";
import CompanySettings from "@/pages/settings/index";
import GstDocuments from "@/pages/gst-documents/index";
import Documents from "@/pages/documents/index";
import FinanceOverview from "@/pages/finance/overview";
import AuditorCollaboration from "@/pages/auditor/index";
import AuditClientDetail from "@/pages/auditor/client-detail";
import GstSalesRegister from "@/pages/reports/gst-sales-register";
import GstPurchaseRegister from "@/pages/reports/gst-purchase-register";
import ExpenseReport from "@/pages/reports/expense-report";
import VendorPayments from "@/pages/reports/vendor-payments";
import CustomerCollections from "@/pages/reports/customer-collections";
import BudgetVarianceReport from "@/pages/reports/budget-variance";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Auth / registration — no layout */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={Register} />

      {/* Platform admin — own layout (dark) */}
      <Route path="/platform-admin/organizations/:id" component={OrgDetail} />
      <Route path="/platform-admin/organizations" component={PlatformOrganizations} />
      <Route path="/platform-admin/subscriptions" component={PlatformSubscriptions} />
      <Route path="/platform-admin/billing" component={BillingPayments} />
      <Route path="/platform-admin/users" component={PlatformUsers} />
      <Route path="/platform-admin/analytics" component={PlatformAnalytics} />
      <Route path="/platform-admin">
        {(params) => params ? <PlatformAdminDashboard /> : <PlatformAdminDashboard />}
      </Route>

      {/* Main app — standard layout */}
      <Route>
        <Layout>
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
        </Layout>
      </Route>
    </Switch>
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
