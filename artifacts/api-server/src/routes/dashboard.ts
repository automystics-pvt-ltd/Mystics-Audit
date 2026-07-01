import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoicesTable, receiptsTable, vendorBillsTable,
  bankAccountsTable, bankTransactionsTable,
  expenseClaimsTable, budgetsTable,
  gstDocumentsTable,
  customersTable, vendorsTable,
} from "@workspace/db";
import { eq, gte, lte, and, desc, sum, count, sql, lt } from "drizzle-orm";

const router = Router();

function parseFY(fy?: string): { fyFrom: string; fyTo: string; fyStartYear: number } {
  if (fy && /^\d{4}-\d{2}$/.test(fy)) {
    const startYear = parseInt(fy.split("-")[0]);
    return {
      fyFrom:       `${startYear}-04-01`,
      fyTo:         `${startYear + 1}-03-31`,
      fyStartYear:  startYear,
    };
  }
  return { fyFrom: "2024-04-01", fyTo: "2025-03-31", fyStartYear: 2024 };
}

// Indian FY months in display order Apr→Mar
const FY_MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
// JS month numbers corresponding to FY_MONTHS (1-indexed)
const FY_MONTH_NUMS = [4,5,6,7,8,9,10,11,12,1,2,3];

router.get("/dashboard/summary", async (req, res) => {
  try {
    const { fy } = req.query as Record<string, string>;
    const { fyFrom, fyTo } = parseFY(fy);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    // Revenue + overdue stats for the selected FY
    const [invoiceStats] = await db
      .select({
        revenueYtd:    sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
        collectedYtd:  sql<number>`coalesce(sum(paid_amount), 0)`,
        outputTax:     sql<number>`coalesce(sum(case when status != 'draft' then cgst + sgst + igst else 0 end), 0)`,
        overdueAmount: sql<number>`coalesce(sum(case when status = 'posted' and due_date < current_date then (total_amount - paid_amount) else 0 end), 0)`,
        overdueCount:  sql<number>`coalesce(count(case when status = 'posted' and due_date < current_date then 1 end), 0)`,
        totalCount:    sql<number>`count(*)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, fyFrom), lte(invoicesTable.date, fyTo)));

    // MTD revenue (always current calendar month)
    const [mtdStats] = await db
      .select({
        revenueMtd:   sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
        collectedMtd: sql<number>`coalesce(sum(paid_amount), 0)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, monthStart), lte(invoicesTable.date, monthEnd)));

    // Input tax (ITC) from bills in the FY
    const [billStats] = await db
      .select({
        pendingAmount: sql<number>`coalesce(sum(case when status = 'draft' then total_amount else 0 end), 0)`,
        pendingCount:  sql<number>`coalesce(count(case when status = 'draft' then 1 end), 0)`,
        inputTax:      sql<number>`coalesce(sum(cgst + sgst + igst), 0)`,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, fyFrom), lte(vendorBillsTable.date, fyTo)));

    // Pending expenses filtered by FY (using submitted_date)
    const [expStats] = await db
      .select({
        pendingAmount: sql<number>`coalesce(sum(case when status in ('submitted','draft') then total_amount else 0 end), 0)`,
        pendingCount:  sql<number>`coalesce(count(case when status in ('submitted','draft') then 1 end), 0)`,
        mtdTotal:      sql<number>`coalesce(sum(case when submitted_date >= ${monthStart} and submitted_date <= ${monthEnd} then total_amount else 0 end), 0)`,
      })
      .from(expenseClaimsTable)
      .where(and(gte(expenseClaimsTable.submittedDate, fyFrom), lte(expenseClaimsTable.submittedDate, fyTo)));

    // Bank balances (always current — balance is a live figure)
    const banks = await db.select({ balance: bankAccountsTable.balance }).from(bankAccountsTable).where(eq(bankAccountsTable.isActive, true));
    const totalCashBank = banks.reduce((s, b) => s + Number(b.balance), 0);

    // Customers & vendors (total counts, not FY-specific)
    const [custCount] = await db.select({ n: count() }).from(customersTable);
    const [vendCount] = await db.select({ n: count() }).from(vendorsTable);

    // Budget utilisation for the FY
    const budgets = await db.select().from(budgetsTable);
    const fyBudget = budgets.find(b => b.fiscalYear === fy) ?? budgets[0];
    const budgetUtilizationPct = fyBudget
      ? Math.round((Number(fyBudget.totalActual ?? 0) / (Number(fyBudget.totalBudget ?? 1))) * 100)
      : 0;

    // Monthly revenue chart from real invoice data (grouped by calendar month)
    const revenueRows = await db
      .select({
        m:   sql<number>`extract(month from date::date)`,
        val: sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, fyFrom), lte(invoicesTable.date, fyTo)))
      .groupBy(sql`extract(month from date::date)`);

    const revenueByMonth: Record<number, number> = {};
    revenueRows.forEach(r => { revenueByMonth[Number(r.m)] = Number(r.val); });

    const revenueChart = FY_MONTHS.map((month, i) => ({
      month,
      value: revenueByMonth[FY_MONTH_NUMS[i]] ?? 0,
    }));

    // Monthly expense chart from real bill data (grouped by calendar month)
    const expenseRows = await db
      .select({
        m:   sql<number>`extract(month from date::date)`,
        val: sql<number>`coalesce(sum(total_amount), 0)`,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, fyFrom), lte(vendorBillsTable.date, fyTo)))
      .groupBy(sql`extract(month from date::date)`);

    const expenseByMonth: Record<number, number> = {};
    expenseRows.forEach(r => { expenseByMonth[Number(r.m)] = Number(r.val); });

    const expenseChart = FY_MONTHS.map((month, i) => ({
      month,
      value: expenseByMonth[FY_MONTH_NUMS[i]] ?? 0,
    }));

    const revenueMtd   = Number(mtdStats?.revenueMtd ?? 0);
    const collectedMtd = Number(mtdStats?.collectedMtd ?? 0);
    const collectionEfficiency = revenueMtd > 0 ? Math.round((collectedMtd / revenueMtd) * 100 * 10) / 10 : 0;
    const grossMarginPct = revenueMtd > 0
      ? Math.round(((revenueMtd - Number(expStats?.mtdTotal ?? 0)) / revenueMtd) * 100 * 10) / 10
      : 0;

    const gstNetPayable = Math.max(0, Number(invoiceStats?.outputTax ?? 0) - Number(billStats?.inputTax ?? 0));

    res.json({
      revenueMtd,
      revenueYtd:              Number(invoiceStats?.revenueYtd ?? 0),
      revenueTarget:           Number(invoiceStats?.revenueYtd ?? 0) * 1.15,
      collectionEfficiency,
      grossMarginPct,
      dso: 32,
      overdueReceivables:      Number(invoiceStats?.overdueAmount ?? 0),
      overdueInvoicesCount:    Number(invoiceStats?.overdueCount ?? 0),
      totalInvoicesCount:      Number(invoiceStats?.totalCount ?? 0),
      totalCashBank,
      gstNetPayable,
      budgetUtilizationPct,
      inventoryTurnover: 4.2,
      pendingBillsAmount:      Number(billStats?.pendingAmount ?? 0),
      pendingBillsCount:       Number(billStats?.pendingCount ?? 0),
      pendingExpensesAmount:   Number(expStats?.pendingAmount ?? 0),
      pendingExpensesCount:    Number(expStats?.pendingCount ?? 0),
      totalCustomers:          Number(custCount?.n ?? 0),
      totalVendors:            Number(vendCount?.n ?? 0),
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
    const { fy } = req.query as Record<string, string>;
    const { fyFrom, fyTo } = parseFY(fy);

    const banks = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.isActive, true));
    const totalBalance = banks.reduce((s, b) => s + Number(b.balance), 0);

    // Inflows & outflows from bank transactions within the FY
    const [txStats] = await db
      .select({
        inflows:  sql<number>`coalesce(sum(credit), 0)`,
        outflows: sql<number>`coalesce(sum(debit), 0)`,
      })
      .from(bankTransactionsTable)
      .where(and(gte(bankTransactionsTable.date, fyFrom), lte(bankTransactionsTable.date, fyTo)));

    // Receipts collected in the FY
    const [receiptStats] = await db
      .select({
        total: sql<number>`coalesce(sum(net_amount), 0)`,
      })
      .from(receiptsTable)
      .where(and(gte(receiptsTable.date, fyFrom), lte(receiptsTable.date, fyTo)));

    res.json({
      totalBalance,
      accounts: banks.map(b => ({
        id:          b.id,
        accountName: b.accountName,
        bankName:    b.bankName,
        balance:     Number(b.balance),
        accountType: b.accountType,
      })),
      inflows30Days:  Number(txStats?.inflows ?? 0) || Number(receiptStats?.total ?? 0),
      outflows30Days: Number(txStats?.outflows ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch cashflow" });
  }
});

router.get("/dashboard/gst-status", async (req, res) => {
  try {
    const { fy } = req.query as Record<string, string>;
    const { fyFrom, fyTo, fyStartYear } = parseFY(fy);

    // ITC balance from bills in this FY
    const [itcStats] = await db
      .select({
        cgst: sql<number>`coalesce(sum(cgst), 0)`,
        sgst: sql<number>`coalesce(sum(sgst), 0)`,
        igst: sql<number>`coalesce(sum(igst), 0)`,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, fyFrom), lte(vendorBillsTable.date, fyTo)));

    const cgst = Number(itcStats?.cgst ?? 0);
    const sgst = Number(itcStats?.sgst ?? 0);
    const igst = Number(itcStats?.igst ?? 0);
    const itcTotal = cgst + sgst + igst;

    // GST filing history from gst_documents table for this FY
    const filedDocs = await db
      .select()
      .from(gstDocumentsTable)
      .where(
        and(
          gte(gstDocumentsTable.docDate, fyFrom),
          lte(gstDocumentsTable.docDate, fyTo)
        )
      )
      .orderBy(desc(gstDocumentsTable.docDate))
      .limit(12);

    // Build filing history grouped by period
    const periodMap: Record<string, { gstr1Filed: boolean; gstr3bFiled: boolean; filedDate?: string }> = {};
    filedDocs.forEach(d => {
      const p = d.period ?? d.docDate?.slice(0, 7);
      if (!p) return;
      if (!periodMap[p]) periodMap[p] = { gstr1Filed: false, gstr3bFiled: false };
      if (d.filingStatus === "filed") {
        if (d.docType === "GSTR-1") { periodMap[p].gstr1Filed = true; periodMap[p].filedDate = d.docDate; }
        if (d.docType === "GSTR-3B") { periodMap[p].gstr3bFiled = true; periodMap[p].filedDate = d.docDate; }
      }
    });

    const filingHistory = Object.entries(periodMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3)
      .map(([period, v]) => {
        const [y, m] = period.split("-");
        const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", { month: "short" });
        return {
          period:      `${monthName} ${y}`,
          gstr1Filed:  v.gstr1Filed,
          gstr3bFiled: v.gstr3bFiled,
          filedDate:   v.filedDate,
        };
      });

    // Current period = last completed month within the FY
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentPeriod = prevMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });
    const periodKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    const currentGstr1  = periodMap[periodKey]?.gstr1Filed  ?? false;
    const currentGstr3b = periodMap[periodKey]?.gstr3bFiled ?? false;

    // Due dates (fixed 11th / 20th of current month)
    const gstr1Due  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-11`;
    const gstr3bDue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-20`;

    res.json({
      currentPeriod,
      gstr1DueDate:  gstr1Due,
      gstr1Filed:    currentGstr1,
      gstr3bDueDate: gstr3bDue,
      gstr3bFiled:   currentGstr3b,
      itcBalance:    { cgst, sgst, igst, total: itcTotal },
      filingHistory: filingHistory.length > 0 ? filingHistory : [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch GST status" });
  }
});

router.get("/dashboard/aging-summary", async (req, res) => {
  try {
    const { fy } = req.query as Record<string, string>;
    const { fyFrom, fyTo } = parseFY(fy);

    // AR aging from posted invoices with remaining balance, filtered by FY
    const [arStats] = await db
      .select({
        current:     sql<number>`coalesce(sum(case when due_date >= current_date then (total_amount - paid_amount) else 0 end), 0)`,
        days0to30:   sql<number>`coalesce(sum(case when due_date < current_date and due_date >= current_date - interval '30 days' then (total_amount - paid_amount) else 0 end), 0)`,
        days31to60:  sql<number>`coalesce(sum(case when due_date < current_date - interval '30 days' and due_date >= current_date - interval '60 days' then (total_amount - paid_amount) else 0 end), 0)`,
        days61to90:  sql<number>`coalesce(sum(case when due_date < current_date - interval '60 days' and due_date >= current_date - interval '90 days' then (total_amount - paid_amount) else 0 end), 0)`,
        days91to180: sql<number>`coalesce(sum(case when due_date < current_date - interval '90 days' and due_date >= current_date - interval '180 days' then (total_amount - paid_amount) else 0 end), 0)`,
        days180plus: sql<number>`coalesce(sum(case when due_date < current_date - interval '180 days' then (total_amount - paid_amount) else 0 end), 0)`,
      })
      .from(invoicesTable)
      .where(
        and(
          gte(invoicesTable.date, fyFrom),
          lte(invoicesTable.date, fyTo),
          sql`status = 'posted' and (total_amount - paid_amount) > 0`
        )
      );

    // AP aging from unpaid bills filtered by FY
    const [apStats] = await db
      .select({
        current:     sql<number>`coalesce(sum(case when due_date >= current_date then (total_amount - paid_amount) else 0 end), 0)`,
        days0to30:   sql<number>`coalesce(sum(case when due_date < current_date and due_date >= current_date - interval '30 days' then (total_amount - paid_amount) else 0 end), 0)`,
        days31to60:  sql<number>`coalesce(sum(case when due_date < current_date - interval '30 days' and due_date >= current_date - interval '60 days' then (total_amount - paid_amount) else 0 end), 0)`,
        days61to90:  sql<number>`coalesce(sum(case when due_date < current_date - interval '60 days' and due_date >= current_date - interval '90 days' then (total_amount - paid_amount) else 0 end), 0)`,
        days91to180: sql<number>`coalesce(sum(case when due_date < current_date - interval '90 days' and due_date >= current_date - interval '180 days' then (total_amount - paid_amount) else 0 end), 0)`,
        days180plus: sql<number>`coalesce(sum(case when due_date < current_date - interval '180 days' then (total_amount - paid_amount) else 0 end), 0)`,
      })
      .from(vendorBillsTable)
      .where(
        and(
          gte(vendorBillsTable.date, fyFrom),
          lte(vendorBillsTable.date, fyTo),
          sql`status in ('draft','posted') and (total_amount - paid_amount) > 0`
        )
      );

    const arCurrent     = Number(arStats?.current ?? 0);
    const arD0to30      = Number(arStats?.days0to30 ?? 0);
    const arD31to60     = Number(arStats?.days31to60 ?? 0);
    const arD61to90     = Number(arStats?.days61to90 ?? 0);
    const arD91to180    = Number(arStats?.days91to180 ?? 0);
    const arD180plus    = Number(arStats?.days180plus ?? 0);
    const arBuckets = {
      current: arCurrent, days0to30: arD0to30, days31to60: arD31to60,
      days61to90: arD61to90, days91to180: arD91to180, days180plus: arD180plus,
      total: arCurrent + arD0to30 + arD31to60 + arD61to90 + arD91to180 + arD180plus,
    };

    const apCurrent     = Number(apStats?.current ?? 0);
    const apD0to30      = Number(apStats?.days0to30 ?? 0);
    const apD31to60     = Number(apStats?.days31to60 ?? 0);
    const apD61to90     = Number(apStats?.days61to90 ?? 0);
    const apD91to180    = Number(apStats?.days91to180 ?? 0);
    const apD180plus    = Number(apStats?.days180plus ?? 0);
    const apBuckets = {
      current: apCurrent, days0to30: apD0to30, days31to60: apD31to60,
      days61to90: apD61to90, days91to180: apD91to180, days180plus: apD180plus,
      total: apCurrent + apD0to30 + apD31to60 + apD61to90 + apD91to180 + apD180plus,
    };

    res.json({ receivables: arBuckets, payables: apBuckets });
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
      .where(and(gte(vendorBillsTable.date, fyFrom), lte(vendorBillsTable.date, fyTo)))
      .orderBy(desc(vendorBillsTable.createdAt)).limit(3);

    const expenses = await db.select().from(expenseClaimsTable)
      .where(and(gte(expenseClaimsTable.submittedDate, fyFrom), lte(expenseClaimsTable.submittedDate, fyTo)))
      .orderBy(desc(expenseClaimsTable.createdAt)).limit(3);

    const activity = [
      ...invoices.map(i => ({
        id:          i.id,
        type:        "invoice",
        description: `Invoice ${i.invoiceNo}`,
        amount:      Number(i.totalAmount),
        party:       i.customerName,
        timestamp:   i.createdAt.toISOString(),
        status:      i.status,
        refNo:       i.invoiceNo,
      })),
      ...bills.map(b => ({
        id:          b.id,
        type:        "bill",
        description: `Bill ${b.billNo}`,
        amount:      Number(b.totalAmount),
        party:       b.vendorName,
        timestamp:   b.createdAt.toISOString(),
        status:      b.status,
        refNo:       b.billNo,
      })),
      ...expenses.map(e => ({
        id:          e.id,
        type:        "expense",
        description: `Expense ${e.claimNo}`,
        amount:      Number(e.totalAmount),
        party:       e.employeeName,
        timestamp:   e.createdAt.toISOString(),
        status:      e.status,
        refNo:       e.claimNo,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);

    res.json(activity);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

export default router;
