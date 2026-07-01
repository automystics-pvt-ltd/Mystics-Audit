import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoicesTable, vendorBillsTable, expenseClaimsTable, expenseLinesTable,
  budgetsTable, budgetLinesTable,
} from "@workspace/db";
import { and, gte, lte, eq, desc, sql, gt } from "drizzle-orm";

const router = Router();

function dateRange(from?: string, to?: string) {
  const from_ = from || `${new Date().getFullYear()}-04-01`;
  const to_   = to   || new Date().toISOString().split("T")[0];
  return { from: from_, to: to_ };
}

/* ─── GET /reports/gst-sales-register ─── */
router.get("/reports/gst-sales-register", async (req, res) => {
  try {
    const { from, to } = dateRange(req.query.from as string, req.query.to as string);
    const rows = await db
      .select({
        id:           invoicesTable.id,
        invoiceNo:    invoicesTable.invoiceNo,
        date:         invoicesTable.date,
        customerName: invoicesTable.customerName,
        customerGstin:invoicesTable.customerGstin,
        placeOfSupply:invoicesTable.placeOfSupply,
        taxableAmount:invoicesTable.taxableAmount,
        cgst:         invoicesTable.cgst,
        sgst:         invoicesTable.sgst,
        igst:         invoicesTable.igst,
        tcs:          invoicesTable.tcs,
        totalAmount:  invoicesTable.totalAmount,
        status:       invoicesTable.status,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, from), lte(invoicesTable.date, to)))
      .orderBy(desc(invoicesTable.date));

    const totals = rows.reduce(
      (s, r) => ({
        taxable: s.taxable + Number(r.taxableAmount),
        cgst:    s.cgst    + Number(r.cgst),
        sgst:    s.sgst    + Number(r.sgst),
        igst:    s.igst    + Number(r.igst),
        total:   s.total   + Number(r.totalAmount),
      }),
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    );

    res.json({ from, to, rows: rows.map(r => ({
      ...r,
      taxableAmount: Number(r.taxableAmount),
      cgst: Number(r.cgst), sgst: Number(r.sgst),
      igst: Number(r.igst), tcs: Number(r.tcs),
      totalAmount: Number(r.totalAmount),
    })), totals });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /reports/gst-purchase-register ─── */
router.get("/reports/gst-purchase-register", async (req, res) => {
  try {
    const { from, to } = dateRange(req.query.from as string, req.query.to as string);
    const rows = await db
      .select({
        id:            vendorBillsTable.id,
        billNo:        vendorBillsTable.billNo,
        vendorInvoiceNo: vendorBillsTable.vendorInvoiceNo,
        date:          vendorBillsTable.date,
        vendorName:    vendorBillsTable.vendorName,
        taxableAmount: vendorBillsTable.taxableAmount,
        cgst:          vendorBillsTable.cgst,
        sgst:          vendorBillsTable.sgst,
        igst:          vendorBillsTable.igst,
        tdsAmount:     vendorBillsTable.tdsAmount,
        totalAmount:   vendorBillsTable.totalAmount,
        status:        vendorBillsTable.status,
        isMsme:        vendorBillsTable.isMsmeVendor,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, from), lte(vendorBillsTable.date, to)))
      .orderBy(desc(vendorBillsTable.date));

    const totals = rows.reduce(
      (s, r) => ({
        taxable: s.taxable + Number(r.taxableAmount),
        cgst:    s.cgst    + Number(r.cgst),
        sgst:    s.sgst    + Number(r.sgst),
        igst:    s.igst    + Number(r.igst),
        tds:     s.tds     + Number(r.tdsAmount),
        total:   s.total   + Number(r.totalAmount),
      }),
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, tds: 0, total: 0 }
    );

    res.json({ from, to, rows: rows.map(r => ({
      ...r,
      taxableAmount: Number(r.taxableAmount),
      cgst: Number(r.cgst), sgst: Number(r.sgst), igst: Number(r.igst),
      tdsAmount: Number(r.tdsAmount), totalAmount: Number(r.totalAmount),
    })), totals });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /reports/expense-report ─── */
router.get("/reports/expense-report", async (req, res) => {
  try {
    const { department, project, status } = req.query as Record<string, string>;
    const { from, to } = dateRange(req.query.from as string, req.query.to as string);

    const claimConds: any[] = [
      gte(expenseClaimsTable.submittedDate, from),
      lte(expenseClaimsTable.submittedDate, to),
    ];
    if (department) claimConds.push(eq(expenseClaimsTable.department, department));
    if (project)    claimConds.push(eq(expenseClaimsTable.project, project));
    if (status)     claimConds.push(eq(expenseClaimsTable.status, status));

    const rows = await db
      .select()
      .from(expenseClaimsTable)
      .where(and(...claimConds))
      .orderBy(desc(expenseClaimsTable.submittedDate));

    /* GST total from expense lines matching claim IDs */
    const claimIds = rows.map(r => r.id);
    let totalGst = 0;
    if (claimIds.length > 0) {
      const gstRows = await db
        .select({ total: sql<number>`sum(gst_amount)` })
        .from(expenseLinesTable)
        .where(sql`claim_id = ANY(ARRAY[${sql.join(claimIds.map(id => sql`${id}`), sql`, `)}]::int[])`);
      totalGst = Number(gstRows[0]?.total ?? 0);
    }

    /* By category — from lines */
    const byCategory = await db
      .select({
        category: expenseLinesTable.category,
        total:    sql<number>`sum(${expenseLinesTable.amount})`,
        count:    sql<number>`count(distinct ${expenseLinesTable.claimId})`,
      })
      .from(expenseLinesTable)
      .where(claimIds.length > 0
        ? sql`claim_id = ANY(ARRAY[${sql.join(claimIds.map(id => sql`${id}`), sql`, `)}]::int[])`
        : sql`1=0`)
      .groupBy(expenseLinesTable.category)
      .orderBy(desc(sql`sum(${expenseLinesTable.amount})`));

    /* By department */
    const byDept = await db
      .select({
        department: expenseClaimsTable.department,
        total:      sql<number>`sum(total_amount)`,
        count:      sql<number>`count(*)`,
      })
      .from(expenseClaimsTable)
      .where(and(...claimConds))
      .groupBy(expenseClaimsTable.department)
      .orderBy(desc(sql`sum(total_amount)`));

    /* By status */
    const byStatus = await db
      .select({
        status: expenseClaimsTable.status,
        total:  sql<number>`sum(total_amount)`,
        count:  sql<number>`count(*)`,
      })
      .from(expenseClaimsTable)
      .where(and(...claimConds))
      .groupBy(expenseClaimsTable.status);

    const totalAmount = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
    const violations  = rows.filter(r => r.policyViolations > 0).length;

    res.json({
      from, to,
      rows: rows.map(r => ({ ...r, totalAmount: Number(r.totalAmount), gstAmount: 0 })),
      totals: { totalAmount, totalGst, count: rows.length, violations },
      byCategory: byCategory.map(b => ({ ...b, total: Number(b.total), count: Number(b.count) })),
      byDept:     byDept.map(b => ({ ...b, total: Number(b.total), count: Number(b.count) })),
      byStatus:   byStatus.map(b => ({ ...b, total: Number(b.total), count: Number(b.count) })),
    });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /reports/vendor-payments ─── */
router.get("/reports/vendor-payments", async (req, res) => {
  try {
    const { from, to } = dateRange(req.query.from as string, req.query.to as string);
    const rows = await db
      .select({
        id:          vendorBillsTable.id,
        billNo:      vendorBillsTable.billNo,
        vendorName:  vendorBillsTable.vendorName,
        date:        vendorBillsTable.date,
        dueDate:     vendorBillsTable.dueDate,
        totalAmount: vendorBillsTable.totalAmount,
        paidAmount:  vendorBillsTable.paidAmount,
        tdsAmount:   vendorBillsTable.tdsAmount,
        status:      vendorBillsTable.status,
        isMsme:      vendorBillsTable.isMsmeVendor,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, from), lte(vendorBillsTable.date, to)))
      .orderBy(desc(vendorBillsTable.date));

    const byVendor = await db
      .select({
        vendorName:  vendorBillsTable.vendorName,
        totalBilled: sql<number>`sum(total_amount)`,
        totalPaid:   sql<number>`sum(paid_amount)`,
        outstanding: sql<number>`sum(total_amount - paid_amount)`,
        count:       sql<number>`count(*)`,
      })
      .from(vendorBillsTable)
      .where(and(gte(vendorBillsTable.date, from), lte(vendorBillsTable.date, to)))
      .groupBy(vendorBillsTable.vendorName)
      .orderBy(desc(sql`sum(total_amount)`));

    const totals = rows.reduce(
      (s, r) => ({
        billed:      s.billed      + Number(r.totalAmount),
        paid:        s.paid        + Number(r.paidAmount),
        outstanding: s.outstanding + (Number(r.totalAmount) - Number(r.paidAmount)),
        tds:         s.tds         + Number(r.tdsAmount),
      }),
      { billed: 0, paid: 0, outstanding: 0, tds: 0 }
    );

    res.json({
      from, to,
      rows: rows.map(r => ({
        ...r,
        totalAmount: Number(r.totalAmount), paidAmount: Number(r.paidAmount),
        outstanding: Number(r.totalAmount) - Number(r.paidAmount),
        tdsAmount: Number(r.tdsAmount),
      })),
      totals,
      byVendor: byVendor.map(v => ({
        ...v,
        totalBilled: Number(v.totalBilled), totalPaid: Number(v.totalPaid),
        outstanding: Number(v.outstanding), count: Number(v.count),
      })),
    });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /reports/customer-collections ─── */
router.get("/reports/customer-collections", async (req, res) => {
  try {
    const { from, to } = dateRange(req.query.from as string, req.query.to as string);
    const invoices = await db
      .select({
        id:           invoicesTable.id,
        invoiceNo:    invoicesTable.invoiceNo,
        customerName: invoicesTable.customerName,
        date:         invoicesTable.date,
        dueDate:      invoicesTable.dueDate,
        totalAmount:  invoicesTable.totalAmount,
        paidAmount:   invoicesTable.paidAmount,
        status:       invoicesTable.status,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, from), lte(invoicesTable.date, to)))
      .orderBy(desc(invoicesTable.date));

    const byCustomer = await db
      .select({
        customerName: invoicesTable.customerName,
        totalBilled:  sql<number>`sum(total_amount)`,
        totalCollected: sql<number>`sum(paid_amount)`,
        outstanding:  sql<number>`sum(total_amount - paid_amount)`,
        count:        sql<number>`count(*)`,
      })
      .from(invoicesTable)
      .where(and(gte(invoicesTable.date, from), lte(invoicesTable.date, to)))
      .groupBy(invoicesTable.customerName)
      .orderBy(desc(sql`sum(total_amount)`));

    const totals = invoices.reduce(
      (s, r) => ({
        billed:    s.billed    + Number(r.totalAmount),
        collected: s.collected + Number(r.paidAmount),
        outstanding: s.outstanding + (Number(r.totalAmount) - Number(r.paidAmount)),
      }),
      { billed: 0, collected: 0, outstanding: 0 }
    );

    res.json({
      from, to,
      rows: invoices.map(r => ({
        ...r,
        totalAmount: Number(r.totalAmount), paidAmount: Number(r.paidAmount),
        outstanding: Number(r.totalAmount) - Number(r.paidAmount),
      })),
      totals,
      byCustomer: byCustomer.map(c => ({
        ...c,
        totalBilled: Number(c.totalBilled), totalCollected: Number(c.totalCollected),
        outstanding: Number(c.outstanding), count: Number(c.count),
      })),
    });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /reports/budget-variance ─── */
router.get("/reports/budget-variance", async (req, res) => {
  try {
    const now = new Date();
    const currentFY = now.getMonth() >= 3
      ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
      : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`;
    const fiscalYear = (req.query.fy as string) || currentFY;

    const budgets = await db
      .select()
      .from(budgetsTable)
      .where(eq(budgetsTable.fiscalYear, fiscalYear))
      .orderBy(desc(budgetsTable.totalBudget));

    const lines = await db
      .select()
      .from(budgetLinesTable)
      .orderBy(budgetLinesTable.budgetId, budgetLinesTable.id);

    const result = budgets.map(b => {
      const bLines = lines.filter(l => l.budgetId === b.id).map(l => ({
        ...l,
        annualAmount: Number(l.annualAmount),
        actualAmount: Number(l.actualAmount),
        variance: Number(l.annualAmount) - Number(l.actualAmount),
        variancePct: Number(l.annualAmount) > 0
          ? ((Number(l.annualAmount) - Number(l.actualAmount)) / Number(l.annualAmount) * 100)
          : 0,
      }));
      return {
        ...b,
        totalBudget: Number(b.totalBudget),
        totalActual: Number(b.totalActual),
        utilization: Number(b.utilizationPct),
        variance:    Number(b.totalBudget) - Number(b.totalActual),
        lines: bLines,
      };
    });

    const grandTotals = result.reduce(
      (s, b) => ({ budget: s.budget + b.totalBudget, actual: s.actual + b.totalActual }),
      { budget: 0, actual: 0 }
    );

    res.json({ fiscalYear, budgets: result, grandTotals });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
