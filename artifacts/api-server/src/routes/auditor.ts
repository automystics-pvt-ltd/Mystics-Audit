import { Router } from "express";
import { db } from "@workspace/db";
import {
  documentsTable, auditorSharesTable,
  invoicesTable, vendorBillsTable, expenseClaimsTable,
} from "@workspace/db";
import { eq, and, gte, lte, ilike, or, desc, inArray, sql } from "drizzle-orm";

const router = Router();

/* ─── GET /auditor/package — build doc package with filters ─── */
router.get("/auditor/package", async (req, res) => {
  try {
    const { fy, period, project, customer, vendor } = req.query as Record<string, string>;
    const conds: any[] = [];
    if (fy)       conds.push(eq(documentsTable.financialYear, fy));
    if (period)   conds.push(eq(documentsTable.period, period));
    if (project)  conds.push(eq(documentsTable.project, project));
    if (vendor)   conds.push(ilike(documentsTable.vendorName, `%${vendor}%`));
    if (customer) conds.push(ilike(documentsTable.clientName, `%${customer}%`));

    const docs = await db
      .select()
      .from(documentsTable)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(documentsTable.createdAt));

    /* Also pull matching transactions */
    const txConds: any[] = [];
    if (fy) {
      const yr = parseInt(fy.split("-")[0]);
      const from = `${yr}-04-01`;
      const to   = `${yr + 1}-03-31`;
      txConds.push(gte(invoicesTable.date, from));
      txConds.push(lte(invoicesTable.date, to));
    }
    if (customer) txConds.push(ilike(invoicesTable.customerName, `%${customer}%`));

    const invoices = await db
      .select({
        id: invoicesTable.id, ref: invoicesTable.invoiceNo,
        party: invoicesTable.customerName, date: invoicesTable.date,
        amount: invoicesTable.totalAmount, status: invoicesTable.status,
        type: sql<string>`'invoice'`,
      })
      .from(invoicesTable)
      .where(txConds.length ? and(...txConds) : undefined)
      .orderBy(desc(invoicesTable.date))
      .limit(50);

    const billConds: any[] = [];
    if (fy) {
      const yr = parseInt(fy.split("-")[0]);
      billConds.push(gte(vendorBillsTable.date, `${yr}-04-01`));
      billConds.push(lte(vendorBillsTable.date, `${yr + 1}-03-31`));
    }
    if (vendor) billConds.push(ilike(vendorBillsTable.vendorName, `%${vendor}%`));

    const bills = await db
      .select({
        id: vendorBillsTable.id, ref: vendorBillsTable.billNo,
        party: vendorBillsTable.vendorName, date: vendorBillsTable.date,
        amount: vendorBillsTable.totalAmount, status: vendorBillsTable.status,
        type: sql<string>`'bill'`,
      })
      .from(vendorBillsTable)
      .where(billConds.length ? and(...billConds) : undefined)
      .orderBy(desc(vendorBillsTable.date))
      .limit(50);

    /* summary by doc category */
    const byCat: Record<string, number> = {};
    for (const d of docs) byCat[d.docCategory] = (byCat[d.docCategory] ?? 0) + 1;

    const totalSize = docs.reduce((s, d) => s + d.sizeBytes, 0);

    res.json({
      docs,
      invoices: invoices.map(i => ({ ...i, amount: Number(i.amount) })),
      bills:    bills.map(b => ({ ...b, amount: Number(b.amount) })),
      summary: {
        docCount: docs.length,
        totalSize,
        byCat,
        invoiceCount: invoices.length,
        billCount: bills.length,
      },
    });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── GET /auditor/shares ─── */
router.get("/auditor/shares", async (req, res) => {
  try {
    const shares = await db
      .select()
      .from(auditorSharesTable)
      .orderBy(desc(auditorSharesTable.createdAt))
      .limit(100);
    res.json(shares);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── POST /auditor/shares — log a share event ─── */
router.post("/auditor/shares", async (req, res) => {
  try {
    const {
      shareType, format, subject, message,
      recipientEmail, recipientName,
      filterFY, filterPeriod, filterProject, filterCustomer, filterVendor,
      docIds, docCount, notes,
    } = req.body;

    const [share] = await db
      .insert(auditorSharesTable)
      .values({
        shareType:      shareType || "email",
        format:         format || "pdf",
        subject, message,
        recipientEmail, recipientName,
        filterFY, filterPeriod, filterProject, filterCustomer, filterVendor,
        docIds:         JSON.stringify(docIds || []),
        docCount:       docCount || 0,
        notes,
        sharedBy:       "Current User",
        status:         "sent",
      })
      .returning();
    res.status(201).json(share);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
