import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoicesTable, receiptsTable, vendorBillsTable, bankAccountsTable,
  expenseClaimsTable, budgetsTable, budgetLinesTable,
  customersTable, vendorsTable, gstDocumentsTable,
} from "@workspace/db";
import { eq, gte, lte, and, desc, sum, count, sql, ne } from "drizzle-orm";

const router = Router();

function parseFY(fy?: string): { fyFrom: string; fyTo: string } {
  if (fy && /^\d{4}-\d{2}$/.test(fy)) {
    const yr = parseInt(fy.split("-")[0]);
    return { fyFrom: `${yr}-04-01`, fyTo: `${yr + 1}-03-31` };
  }
  return { fyFrom: "2025-04-01", fyTo: "2026-03-31" };
}

/* ─── GET /finance/overview ─── */
router.get("/finance/overview", async (req, res) => {
  try {
    const { fy } = req.query as Record<string, string>;
    const { fyFrom, fyTo } = parseFY(fy);

    /* Revenue (posted/paid invoices) */
    const [invoiceStats] = await db
      .select({
        totalRevenue:      sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
        collectedRevenue:  sql<number>`coalesce(sum(paid_amount), 0)`,
        outstandingAR:     sql<number>`coalesce(sum(case when status = 'posted' then (total_amount - paid_amount) else 0 end), 0)`,
        overdueAR:         sql<number>`coalesce(sum(case when status = 'posted' and due_date < current_date then (total_amount - paid_amount) else 0 end), 0)`,
        totalGstOut:       sql<number>`coalesce(sum(cgst + sgst + igst), 0)`,
        invoiceCount:      sql<number>`count(*)`,
        draftCount:        sql<number>`count(*) filter (where status = 'draft')`,
        postedCount:       sql<number>`count(*) filter (where status = 'posted')`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, fyFrom), lte(invoicesTable.date, fyTo)));

    /* AP / Bills */
    const [billStats] = await db
      .select({
        totalPurchases:   sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
        paidAP:           sql<number>`coalesce(sum(paid_amount), 0)`,
        outstandingAP:    sql<number>`coalesce(sum(case when status = 'posted' then (total_amount - paid_amount) else 0 end), 0)`,
        overdueAP:        sql<number>`coalesce(sum(case when status = 'posted' and due_date < current_date then (total_amount - paid_amount) else 0 end), 0)`,
        totalGstIn:       sql<number>`coalesce(sum(cgst + sgst + igst), 0)`,
        totalTds:         sql<number>`coalesce(sum(tds_amount), 0)`,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, fyFrom), lte(vendorBillsTable.date, fyTo)));

    /* Expenses */
    const [expStats] = await db
      .select({
        totalExpenses:    sql<number>`coalesce(sum(total_amount), 0)`,
        pendingExp:       sql<number>`coalesce(sum(case when status = 'submitted' then total_amount else 0 end), 0)`,
        approvedExp:      sql<number>`coalesce(sum(case when status = 'approved' then total_amount else 0 end), 0)`,
        reimbursedExp:    sql<number>`coalesce(sum(case when status in ('reimbursed','paid') then total_amount else 0 end), 0)`,
        byDeptRaw:        sql<string>`coalesce(json_agg(json_build_object('dept', department, 'amount', total_amount) order by total_amount desc), '[]')`,
      })
      .from(expenseClaimsTable)
      .where(and(
        gte(expenseClaimsTable.submittedDate, fyFrom),
        lte(expenseClaimsTable.submittedDate, fyTo),
      ));

    /* Bank / Cash */
    const banks = await db
      .select({
        accountName: bankAccountsTable.accountName,
        bankName:    bankAccountsTable.bankName,
        balance:     bankAccountsTable.balance,
        accountType: bankAccountsTable.accountType,
      })
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.isActive, true));
    const totalCash = banks.reduce((s, b) => s + Number(b.balance), 0);

    /* Monthly revenue trend (12 months) */
    const monthlyRevenue = await db
      .select({
        month:   sql<string>`to_char(date::date, 'YYYY-MM')`,
        revenue: sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
        collected: sql<number>`coalesce(sum(paid_amount), 0)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, fyFrom), lte(invoicesTable.date, fyTo)))
      .groupBy(sql`to_char(date::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(date::date, 'YYYY-MM')`);

    const monthlyExpenses = await db
      .select({
        month:    sql<string>`to_char(date::date, 'YYYY-MM')`,
        expenses: sql<number>`coalesce(sum(case when status != 'draft' then total_amount else 0 end), 0)`,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, fyFrom), lte(vendorBillsTable.date, fyTo)))
      .groupBy(sql`to_char(date::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(date::date, 'YYYY-MM')`);

    /* Dept-wise expenses from expense claims */
    const deptExpenses = await db
      .select({
        department: expenseClaimsTable.department,
        total:      sql<number>`coalesce(sum(total_amount), 0)`,
        count:      sql<number>`count(*)`,
      })
      .from(expenseClaimsTable)
      .groupBy(expenseClaimsTable.department)
      .orderBy(desc(sql`sum(total_amount)`))
      .limit(10);

    /* Project profitability (revenue - expenses by project) */
    const projectRevenue = await db
      .select({
        project: invoicesTable.poReference,
        revenue: sql<number>`coalesce(sum(total_amount), 0)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, fyFrom), lte(invoicesTable.date, fyTo), sql`po_reference is not null`))
      .groupBy(invoicesTable.poReference)
      .limit(10);

    const projectExpenses = await db
      .select({
        project: expenseClaimsTable.project,
        expenses: sql<number>`coalesce(sum(total_amount), 0)`,
      })
      .from(expenseClaimsTable)
      .where(sql`project is not null`)
      .groupBy(expenseClaimsTable.project)
      .limit(10);

    /* Budget vs Actual */
    const budgets = await db
      .select({
        id:           budgetsTable.id,
        name:         budgetsTable.name,
        type:         budgetsTable.type,
        totalBudget:  budgetsTable.totalBudget,
        totalActual:  budgetsTable.totalActual,
        utilization:  budgetsTable.utilizationPct,
        status:       budgetsTable.status,
      })
      .from(budgetsTable)
      .where(eq(budgetsTable.fiscalYear, fy || "2025-26"))
      .orderBy(desc(budgetsTable.totalBudget))
      .limit(8);

    /* GST position */
    let gstPayable = 0;
    let gstReceivable = 0;
    try {
      const [gstPos] = await db
        .select({
          outputTax:   sql<number>`coalesce(sum(case when doc_type in ('tax_invoice','debit_note') then cgst+sgst+igst else 0 end), 0)`,
          inputCredit: sql<number>`coalesce(sum(case when doc_type in ('purchase_bill','credit_note') then cgst+sgst+igst else 0 end), 0)`,
        })
        .from(gstDocumentsTable);
      const net = Number(gstPos?.outputTax ?? 0) - Number(gstPos?.inputCredit ?? 0);
      if (net > 0) gstPayable = net;
      else gstReceivable = Math.abs(net);
    } catch (_) { /* gst table might be empty */ }

    /* Customers (AR by customer) */
    const topCustomersAR = await db
      .select({
        customerName: invoicesTable.customerName,
        outstanding:  sql<number>`coalesce(sum(total_amount - paid_amount), 0)`,
      })
      .from(invoicesTable)
      .where(and(eq(invoicesTable.status, "posted"), sql`(total_amount - paid_amount) > 0`))
      .groupBy(invoicesTable.customerName)
      .orderBy(desc(sql`sum(total_amount - paid_amount)`))
      .limit(5);

    /* Top vendors by AP */
    const topVendorsAP = await db
      .select({
        vendorName:  vendorBillsTable.vendorName,
        outstanding: sql<number>`coalesce(sum(total_amount - paid_amount), 0)`,
      })
      .from(vendorBillsTable)
      .where(and(eq(vendorBillsTable.status, "posted"), sql`(total_amount - paid_amount) > 0`))
      .groupBy(vendorBillsTable.vendorName)
      .orderBy(desc(sql`sum(total_amount - paid_amount)`))
      .limit(5);

    /* Derive P&L figures */
    const totalRevenue   = Number(invoiceStats.totalRevenue);
    const totalPurchases = Number(billStats.totalPurchases);
    const totalExpenses  = Number(expStats.totalExpenses);
    const grossProfit    = totalRevenue - totalPurchases;
    const netProfit      = grossProfit - totalExpenses;
    const grossMargin    = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin      = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    res.json({
      fy: fy || "2025-26",
      pnl: {
        totalRevenue,
        totalPurchases,
        totalExpenses,
        grossProfit,
        netProfit,
        grossMargin: parseFloat(grossMargin.toFixed(2)),
        netMargin:   parseFloat(netMargin.toFixed(2)),
      },
      ar: {
        outstanding: Number(invoiceStats.outstandingAR),
        overdue:     Number(invoiceStats.overdueAR),
        collected:   Number(invoiceStats.collectedRevenue),
        invoiceCount: Number(invoiceStats.invoiceCount),
      },
      ap: {
        outstanding: Number(billStats.outstandingAP),
        overdue:     Number(billStats.overdueAP),
        paid:        Number(billStats.paidAP),
        totalTds:    Number(billStats.totalTds),
      },
      cash: {
        total: totalCash,
        accounts: banks.map(b => ({ ...b, balance: Number(b.balance) })),
      },
      expenses: {
        total:      Number(expStats.totalExpenses),
        pending:    Number(expStats.pendingExp),
        approved:   Number(expStats.approvedExp),
        reimbursed: Number(expStats.reimbursedExp),
      },
      gst: {
        outputTax:   Number(invoiceStats.totalGstOut),
        inputCredit: Number(billStats.totalGstIn),
        payable:     gstPayable,
        receivable:  gstReceivable,
      },
      trends: {
        monthly: monthlyRevenue.map(r => {
          const expRow = monthlyExpenses.find(e => e.month === r.month);
          return {
            month: r.month,
            revenue: Number(r.revenue),
            collected: Number(r.collected),
            expenses: Number(expRow?.expenses ?? 0),
            profit: Number(r.revenue) - Number(expRow?.expenses ?? 0),
          };
        }),
      },
      deptExpenses: deptExpenses.map(d => ({ department: d.department || "General", total: Number(d.total), count: Number(d.count) })),
      projectProfitability: projectRevenue.map(p => {
        const expRow = projectExpenses.find(e => e.project === p.project);
        const rev = Number(p.revenue);
        const exp = Number(expRow?.expenses ?? 0);
        return { project: p.project, revenue: rev, expenses: exp, profit: rev - exp };
      }),
      budgets: budgets.map(b => ({
        ...b,
        totalBudget: Number(b.totalBudget),
        totalActual: Number(b.totalActual),
        utilization: Number(b.utilization),
      })),
      topCustomersAR: topCustomersAR.map(c => ({ ...c, outstanding: Number(c.outstanding) })),
      topVendorsAP: topVendorsAP.map(v => ({ ...v, outstanding: Number(v.outstanding) })),
    });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
