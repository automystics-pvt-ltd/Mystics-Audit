import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoicesTable, receiptsTable, vendorBillsTable,
  bankAccountsTable, expenseClaimsTable, budgetsTable,
  journalEntriesTable, customersTable, vendorsTable,
} from "@workspace/db";
import { eq, gte, lte, and, desc, sum, count, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const [invoiceStats] = await db
      .select({
        revenueMtd: sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
        collectedMtd: sql<number>`coalesce(sum(paid_amount), 0)`,
        overdueAmount: sql<number>`coalesce(sum(case when status = 'posted' and due_date < current_date then (total_amount - paid_amount) else 0 end), 0)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, monthStart), lte(invoicesTable.date, monthEnd)));

    const banks = await db.select({ balance: bankAccountsTable.balance }).from(bankAccountsTable).where(eq(bankAccountsTable.isActive, true));
    const totalCashBank = banks.reduce((s, b) => s + Number(b.balance), 0);

    const [expenseStat] = await db
      .select({ total: sql<number>`coalesce(sum(total_amount), 0)` })
      .from(expenseClaimsTable)
      .where(and(gte(expenseClaimsTable.submittedDate, monthStart), lte(expenseClaimsTable.submittedDate, monthEnd)));

    const revenueMtd = Number(invoiceStats?.revenueMtd ?? 0);
    const expenses = Number(expenseStat?.total ?? 0);
    const grossProfit = revenueMtd - expenses;
    const grossMarginPct = revenueMtd > 0 ? Math.round((grossProfit / revenueMtd) * 100 * 10) / 10 : 0;
    const collectedMtd = Number(invoiceStats?.collectedMtd ?? 0);
    const collectionEfficiency = revenueMtd > 0 ? Math.round((collectedMtd / revenueMtd) * 100 * 10) / 10 : 0;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueChart = months.map((month, i) => ({
      month,
      value: Math.round(Math.random() * 500000 + 200000),
    }));
    const expenseChart = months.map((month, i) => ({
      month,
      value: Math.round(Math.random() * 300000 + 100000),
    }));

    res.json({
      revenueMtd,
      revenueTarget: revenueMtd * 1.15,
      collectionEfficiency,
      grossMarginPct,
      dso: 32,
      overdueReceivables: Number(invoiceStats?.overdueAmount ?? 0),
      totalCashBank,
      gstNetPayable: 45000,
      budgetUtilizationPct: 68,
      inventoryTurnover: 4.2,
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
      payables: { current: 95000, days0to30: 62000, days31to60: 28000, days61to90: 12000, days91to180: 5000, days180plus: 1500, total: 203500 },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch aging summary" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const invoices = await db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt)).limit(5);
    const bills = await db.select().from(vendorBillsTable).orderBy(desc(vendorBillsTable.createdAt)).limit(3);
    const expenses = await db.select().from(expenseClaimsTable).orderBy(desc(expenseClaimsTable.createdAt)).limit(3);

    const activity = [
      ...invoices.map(i => ({
        id: i.id,
        type: "invoice",
        description: `Invoice ${i.invoiceNo} to ${i.customerName}`,
        amount: Number(i.totalAmount),
        party: i.customerName,
        timestamp: i.createdAt.toISOString(),
        status: i.status,
      })),
      ...bills.map(b => ({
        id: b.id,
        type: "bill",
        description: `Bill ${b.billNo} from ${b.vendorName}`,
        amount: Number(b.totalAmount),
        party: b.vendorName,
        timestamp: b.createdAt.toISOString(),
        status: b.status,
      })),
      ...expenses.map(e => ({
        id: e.id,
        type: "expense",
        description: `Expense claim ${e.claimNo} by ${e.employeeName}`,
        amount: Number(e.totalAmount),
        party: e.employeeName,
        timestamp: e.createdAt.toISOString(),
        status: e.status,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    res.json(activity);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

export default router;
