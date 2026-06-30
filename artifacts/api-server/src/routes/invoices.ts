import { Router } from "express";
import { db, invoicesTable, invoiceLinesTable } from "@workspace/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

const router = Router();

let invSeq = 1000;
function nextInvoiceNo() {
  invSeq++;
  return `INV-${new Date().getFullYear()}-${String(invSeq).padStart(5, "0")}`;
}

async function getInvoiceWithLines(id: number) {
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!inv) return null;
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id));
  return {
    ...inv,
    taxableAmount: Number(inv.taxableAmount),
    cgst: Number(inv.cgst),
    sgst: Number(inv.sgst),
    igst: Number(inv.igst),
    tcs: Number(inv.tcs),
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    balanceDue: Number(inv.totalAmount) - Number(inv.paidAmount),
    lines: lines.map(l => ({
      ...l,
      quantity: Number(l.quantity),
      rate: Number(l.rate),
      discountPct: Number(l.discountPct),
      gstRate: Number(l.gstRate),
      taxableValue: Number(l.taxableValue),
      cgst: Number(l.cgst),
      sgst: Number(l.sgst),
      igst: Number(l.igst),
      lineTotal: Number(l.lineTotal),
    })),
  };
}

router.get("/invoices", async (req, res) => {
  try {
    const { status, type, customerId, from, to } = req.query as Record<string, string>;
    let query = db.select().from(invoicesTable).$dynamic();
    const conditions = [];
    if (status) conditions.push(eq(invoicesTable.status, status));
    if (type) conditions.push(eq(invoicesTable.type, type));
    if (customerId) conditions.push(eq(invoicesTable.customerId, Number(customerId)));
    if (from) conditions.push(gte(invoicesTable.date, from));
    if (to) conditions.push(lte(invoicesTable.date, to));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(invoicesTable.createdAt)).limit(100);
    res.json(rows.map(r => ({
      ...r,
      taxableAmount: Number(r.taxableAmount),
      cgst: Number(r.cgst),
      sgst: Number(r.sgst),
      igst: Number(r.igst),
      tcs: Number(r.tcs),
      totalAmount: Number(r.totalAmount),
      paidAmount: Number(r.paidAmount),
      balanceDue: Number(r.totalAmount) - Number(r.paidAmount),
      lines: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const { type, date, dueDate, customerId, placeOfSupply, poReference, notes, lines } = req.body;

    let taxableAmount = 0, cgst = 0, sgst = 0, igst = 0, totalAmount = 0;
    const processedLines = (lines || []).map((l: any) => {
      const qty = Number(l.quantity);
      const rate = Number(l.rate);
      const discPct = Number(l.discountPct || 0);
      const gstRate = Number(l.gstRate || 18);
      const taxableValue = qty * rate * (1 - discPct / 100);
      const isInterState = placeOfSupply !== "Maharashtra";
      const cgstAmt = isInterState ? 0 : taxableValue * (gstRate / 200);
      const sgstAmt = isInterState ? 0 : taxableValue * (gstRate / 200);
      const igstAmt = isInterState ? taxableValue * (gstRate / 100) : 0;
      const lineTotal = taxableValue + cgstAmt + sgstAmt + igstAmt;
      taxableAmount += taxableValue;
      cgst += cgstAmt;
      sgst += sgstAmt;
      igst += igstAmt;
      totalAmount += lineTotal;
      return {
        description: l.description, hsnSac: l.hsnSac, quantity: String(qty), unit: l.unit || "Nos",
        rate: String(rate), discountPct: String(discPct), gstRate: String(gstRate),
        taxableValue: String(taxableValue), cgst: String(cgstAmt), sgst: String(sgstAmt),
        igst: String(igstAmt), lineTotal: String(lineTotal),
      };
    });

    const customerData = await db.query.customersTable.findFirst({ where: eq((await import("@workspace/db")).customersTable.id, customerId) });

    const [inv] = await db.insert(invoicesTable).values({
      invoiceNo: nextInvoiceNo(),
      type: type || "Tax Invoice",
      status: "draft",
      date,
      dueDate,
      customerId,
      customerName: customerData?.name || "Customer",
      customerGstin: customerData?.gstin,
      placeOfSupply,
      taxableAmount: String(taxableAmount),
      cgst: String(cgst),
      sgst: String(sgst),
      igst: String(igst),
      tcs: "0",
      totalAmount: String(totalAmount),
      paidAmount: "0",
      poReference,
      notes,
    }).returning();

    if (processedLines.length) {
      await db.insert(invoiceLinesTable).values(processedLines.map((l: any) => ({ ...l, invoiceId: inv.id })));
    }

    const result = await getInvoiceWithLines(inv.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

router.get("/invoices/summary", async (req, res) => {
  try {
    const rows = await db.select().from(invoicesTable);
    const draft = rows.filter(r => r.status === "draft");
    const posted = rows.filter(r => r.status === "posted");
    const today = new Date().toISOString().split("T")[0];
    const overdue = posted.filter(r => r.dueDate < today && Number(r.totalAmount) > Number(r.paidAmount));

    res.json({
      totalDraft: draft.length,
      totalPosted: posted.length,
      totalOverdue: overdue.length,
      totalDraftAmount: draft.reduce((s, r) => s + Number(r.totalAmount), 0),
      totalPostedAmount: posted.reduce((s, r) => s + Number(r.totalAmount), 0),
      totalOverdueAmount: overdue.reduce((s, r) => s + Number(r.totalAmount) - Number(r.paidAmount), 0),
      collectedMtd: rows.reduce((s, r) => s + Number(r.paidAmount), 0),
      invoicedMtd: rows.reduce((s, r) => s + Number(r.totalAmount), 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoice summary" });
  }
});

router.get("/invoices/:id", async (req, res) => {
  try {
    const result = await getInvoiceWithLines(Number(req.params.id));
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.patch("/invoices/:id", async (req, res) => {
  try {
    const [inv] = await db
      .update(invoicesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(invoicesTable.id, Number(req.params.id)), eq(invoicesTable.status, "draft")))
      .returning();
    if (!inv) { res.status(404).json({ error: "Not found or already posted" }); return; }
    const result = await getInvoiceWithLines(inv.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

router.delete("/invoices/:id", async (req, res) => {
  try {
    await db.delete(invoicesTable)
      .where(and(eq(invoicesTable.id, Number(req.params.id)), eq(invoicesTable.status, "draft")));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

router.post("/invoices/:id/post", async (req, res) => {
  try {
    const irn = `IRN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const [inv] = await db
      .update(invoicesTable)
      .set({ status: "posted", irn, updatedAt: new Date() })
      .where(eq(invoicesTable.id, Number(req.params.id)))
      .returning();
    if (!inv) { res.status(404).json({ error: "Not found" }); return; }
    const result = await getInvoiceWithLines(inv.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to post invoice" });
  }
});

export default router;
