import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoicesTable, receiptsTable, vendorBillsTable,
  bankAccountsTable, expenseClaimsTable, budgetsTable,
  journalEntriesTable, customersTable, vendorsTable,
} from "@workspace/db";
import { eq, gte, lte, and, desc, sum, count, sql, ne } from "drizzle-orm";

const router = Router();

function parseFY(fy?: string): { fyFrom: string; fyTo: string } {
  if (fy && /^\d{4}-\d{2}$/.test(fy)) {
    const startYear = parseInt(fy.split("-")[0]);
    return {
      fyFrom: `${startYear}-04-01`,
      fyTo:   `${startYear + 1}-03-31`,
    };
  }
  // Default to FY 2024-25
  return { fyFrom: "2024-04-01", fyTo: "2025-03-31" };
}

router.get("/dashboard/summary", async (req, res) => {
  try {
    const { fy } = req.query as Record<string, string>;
    const { fyFrom, fyTo } = parseFY(fy);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    // Revenue stats for the selected FY
    const [invoiceStats] = await db
      .select({
        revenueYtd:    sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
        collectedYtd:  sql<number>`coalesce(sum(paid_amount), 0)`,
        overdueAmount: sql<number>`coalesce(sum(case when status = 'posted' and due_date < current_date then (total_amount - paid_amount) else 0 end), 0)`,
        overdueCount:  sql<number>`coalesce(count(case when status = 'posted' and due_date < current_date then 1 end), 0)`,
        totalCount:    sql<number>`count(*)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, fyFrom), lte(invoicesTable.date, fyTo)));

    // MTD revenue
    const [mtdStats] = await db
      .select({
        revenueMtd:   sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
        collectedMtd: sql<number>`coalesce(sum(paid_amount), 0)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, monthStart), lte(invoicesTable.date, monthEnd)));

    // Banks
    const banks = await db.select({ balance: bankAccountsTable.balance }).from(bankAccountsTable).where(eq(bankAccountsTable.isActive, true));
    const totalCashBank = banks.reduce((s, b) => s + Number(b.balance), 0);

    // Pending bills
    const [billStats] = await db
      .select({
        pendingAmount: sql<number>`coalesce(sum(case when status = 'draft' then total_amount else 0 end), 0)`,
        pendingCount:  sql<number>`coalesce(count(case when status = 'draft' then 1 end), 0)`,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.billDate, fyFrom), lte(vendorBillsTable.billDate, fyTo)));

    // Pending expenses
    const [expStats] = await db
      .select({
        pendingAmount: sql<number>`coalesce(sum(case when status = 'submitted' or status = 'draft' then total_amount else 0 end), 0)`,
        pendingCount:  sql<number>`coalesce(count(case when status = 'submitted' or status = 'draft' then 1 end), 0)`,
        mtdTotal:      sql<number>`coalesce(sum(case when submitted_date >= ${monthStart} and submitted_date <= ${monthEnd} then total_amount else 0 end), 0)`,
      })
      .from(expenseClaimsTable);

    // Customers & vendors
    const [custCount] = await db.select({ n: count() }).from(customersTable);
    const [vendCount] = await db.select({ n: count() }).from(vendorsTable);

    // Budget utilization for the FY
    const budgets = await db.select().from(budgetsTable);
    const fyBudget = budgets.find(b => b.fiscalYear === fy) ?? budgets[0];
    const budgetUtilizationPct = fyBudget
      ? Math.round((Number(fyBudget.totalActual ?? 0) / (Number(fyBudget.totalBudget ?? 1))) * 100)
      : 68;

    const revenueMtd   = Number(mtdStats?.revenueMtd ?? 0);
    const revenueYtd   = Number(invoiceStats?.revenueYtd ?? 0);
    const collectedMtd = Number(mtdStats?.collectedMtd ?? 0);
    const collectionEfficiency = revenueMtd > 0 ? Math.round((collectedMtd / revenueMtd) * 100 * 10) / 10 : 0;
    const grossMarginPct = revenueMtd > 0 ? Math.round(((revenueMtd - Number(expStats?.mtdTotal ?? 0)) / revenueMtd) * 100 * 10) / 10 : 0;

    // Synthetic monthly chart for the FY (Apr–Mar)
    const fyMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const seed = fy ? parseInt(fy.split("-")[0]) : 2024;
    const revenueChart = fyMonths.map((month, i) => ({
      month,
      value: Math.round(((seed * 7 + i * 13) % 400000) + 200000),
    }));
    const expenseChart = fyMonths.map((month, i) => ({
      month,
      value: Math.round(((seed * 11 + i * 17) % 250000) + 100000),
    }));

    res.json({
      revenueMtd,
      revenueYtd,
      revenueTarget: revenueYtd * 1.15,
      collectionEfficiency,
      grossMarginPct,
      dso: 32,
      overdueReceivables: Number(invoiceStats?.overdueAmount ?? 0),
      overdueInvoicesCount: Number(invoiceStats?.overdueCount ?? 0),
      totalInvoicesCount: Number(invoiceStats?.totalCount ?? 0),
      totalCashBank,
      gstNetPayable: 45000,
      budgetUtilizationPct,
      inventoryTurnover: 4.2,
      pendingBillsAmount: Number(billStats?.pendingAmount ?? 0),
      pendingBillsCount: Number(billStats?.pendingCount ?? 0),
      pendingExpensesAmount: Number(expStats?.pendingAmount ?? 0),
      pendingExpensesCount: Number(expStats?.pendingCount ?? 0),
      totalCustomers: Number(custCount?.n ?? 0),
      totalVendors: Number(vendCount?.n ?? 0),
      revenueChart,
      expenseChart,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

router.get("/dashboard/cashflow", async (req, res) => {
  try {
    const banks = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.isActive, true));
    const totalBalance = banks.reduce((s, b) => s + Number(b.balance), 0);
    res.json({
      totalBalance,
      accounts: banks.map(b => ({
        id: b.id,
        accountName: b.accountName,
        bankName: b.bankName,
        balance: Number(b.balance),
        accountType: b.accountType,
      })),
      inflows30Days: 850000,
      outflows30Days: 620000,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch cashflow" });
  }
});

router.get("/dashboard/gst-status", async (req, res) => {
  try {
    res.json({
      currentPeriod: "May 2025",
      gstr1DueDate: "2025-06-11",
      gstr1Filed: true,
      gstr3bDueDate: "2025-06-20",
      gstr3bFiled: false,
      itcBalance: { cgst: 42000, sgst: 42000, igst: 18000, total: 102000 },
      filingHistory: [
        { period: "Apr 2025", gstr1Filed: true, gstr3bFiled: true, filedDate: "2025-05-10" },
        { period: "Mar 2025", gstr1Filed: true, gstr3bFiled: true, filedDate: "2025-04-15" },
        { period: "Feb 2025", gstr1Filed: true, gstr3bFiled: true, filedDate: "2025-03-18" },
      ],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch GST status" });
  }
});

router.get("/dashboard/aging-summary", async (req, res) => {
  try {
    res.json({
      receivables: { current: 120000, days0to30: 85000, days31to60: 42000, days61to90: 18000, days91to180: 9000, days180plus: 3500, total: 277500 },
      payables:    { current: 95000,  days0to30: 62000, days31to60: 28000, days61to90: 12000, days91to180: 5000, days180plus: 1500, total: 203500 },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch aging summary" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const { fy } = req.query as Record<string, string>;
    const { fyFrom, fyTo } = parseFY(fy);

    const invoices = await db.select().from(invoicesTable)
      .where(and(gte(invoicesTable.date, fyFrom), lte(invoicesTable.date, fyTo)))
      .orderBy(desc(invoicesTable.createdAt)).limit(6);
    const bills = await db.select().from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.billDate, fyFrom), lte(vendorBillsTable.billDate, fyTo)))
      .orderBy(desc(vendorBillsTable.createdAt)).limit(3);
    const expenses = await db.select().from(expenseClaimsTable)
      .orderBy(desc(expenseClaimsTable.createdAt)).limit(3);

    const activity = [
      ...invoices.map(i => ({
        id: i.id,
        type: "invoice",
        description: `Invoice ${i.invoiceNo}`,
        amount: Number(i.totalAmount),
        party: i.customerName,
        timestamp: i.createdAt.toISOString(),
        status: i.status,
        refNo: i.invoiceNo,
      })),
      ...bills.map(b => ({
        id: b.id,
        type: "bill",
        description: `Bill ${b.billNo}`,
        amount: Number(b.totalAmount),
        party: b.vendorName,
        timestamp: b.createdAt.toISOString(),
        status: b.status,
        refNo: b.billNo,
      })),
      ...expenses.map(e => ({
        id: e.id,
        type: "expense",
        description: `Expense ${e.claimNo}`,
        amount: Number(e.totalAmount),
        party: e.employeeName,
        timestamp: e.createdAt.toISOString(),
        status: e.status,
        refNo: e.claimNo,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12);

    res.json(activity);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

export default router;
