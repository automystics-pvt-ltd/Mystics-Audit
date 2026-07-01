import { Router } from "express";
import { db, invoicesTable, invoiceLinesTable, accountsTable, companiesTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { createPostedJournal, round2 } from "../utils/accounting";

const router = Router();

let invSeq = 0;
async function nextInvoiceNo(): Promise<string> {
  if (invSeq === 0) {
    // Initialize from DB to avoid collisions after restart
    const [last] = await db.select({ no: invoicesTable.invoiceNo }).from(invoicesTable)
      .orderBy(desc(invoicesTable.createdAt)).limit(1);
    if (last?.no) {
      const parts = last.no.split("-");
      invSeq = Math.max(1000, parseInt(parts[parts.length - 1]) || 1000);
    } else {
      invSeq = 1000;
    }
  }
  invSeq++;
  return `INV-${new Date().getFullYear()}-${String(invSeq).padStart(5, "0")}`;
}

/** Fetch company state for inter-state GST determination */
async function getCompanyState(): Promise<string> {
  const [company] = await db.select({ state: companiesTable.state }).from(companiesTable).limit(1);
  return company?.state ?? "Tamil Nadu";
}

/** Default revenue GL account code */
const GL = {
  AR:            "1100",  // Accounts Receivable
  REVENUE:       "6000",  // Revenue from IT Services (default)
  GST_CGST:      "3100",  // GST Payable - CGST
  GST_SGST:      "3110",  // GST Payable - SGST
  GST_IGST:      "3120",  // GST Payable - IGST
};

async function getInvoiceWithLines(id: number) {
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!inv) return null;
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id));
  return {
    ...inv,
    taxableAmount: Number(inv.taxableAmount),
    cgst:          Number(inv.cgst),
    sgst:          Number(inv.sgst),
    igst:          Number(inv.igst),
    tcs:           Number(inv.tcs),
    totalAmount:   Number(inv.totalAmount),
    paidAmount:    Number(inv.paidAmount),
    balanceDue:    round2(Number(inv.totalAmount) - Number(inv.paidAmount)),
    lines: lines.map(l => ({
      ...l,
      quantity:     Number(l.quantity),
      rate:         Number(l.rate),
      discountPct:  Number(l.discountPct),
      gstRate:      Number(l.gstRate),
      taxableValue: Number(l.taxableValue),
      cgst:         Number(l.cgst),
      sgst:         Number(l.sgst),
      igst:         Number(l.igst),
      lineTotal:    Number(l.lineTotal),
    })),
  };
}

/* ── GET /invoices ── */
router.get("/invoices", async (req, res) => {
  try {
    const { status, type, customerId, from, to } = req.query as Record<string, string>;
    let query = db.select().from(invoicesTable).$dynamic();
    const conditions = [];
    if (status)     conditions.push(eq(invoicesTable.status, status));
    if (type)       conditions.push(eq(invoicesTable.type, type));
    if (customerId) conditions.push(eq(invoicesTable.customerId, Number(customerId)));
    if (from)       conditions.push(gte(invoicesTable.date, from));
    if (to)         conditions.push(lte(invoicesTable.date, to));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(invoicesTable.createdAt)).limit(200);
    res.json(rows.map(r => ({
      ...r,
      taxableAmount: Number(r.taxableAmount),
      cgst:          Number(r.cgst),
      sgst:          Number(r.sgst),
      igst:          Number(r.igst),
      tcs:           Number(r.tcs),
      totalAmount:   Number(r.totalAmount),
      paidAmount:    Number(r.paidAmount),
      balanceDue:    round2(Number(r.totalAmount) - Number(r.paidAmount)),
      lines: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

/* ── POST /invoices  (create draft) ── */
router.post("/invoices", async (req, res) => {
  try {
    const { type, date, dueDate, customerId, placeOfSupply, poReference, notes, lines } = req.body;

    if (!customerId) { res.status(400).json({ error: "customerId is required" }); return; }
    if (!lines || lines.length === 0) { res.status(400).json({ error: "Invoice must have at least one line item" }); return; }

    const companyState = await getCompanyState();
    const isInterState = !!placeOfSupply && placeOfSupply.toLowerCase() !== companyState.toLowerCase();

    let taxableAmount = 0, cgst = 0, sgst = 0, igst = 0, totalAmount = 0;
    const processedLines = (lines || []).map((l: any) => {
      const qty         = Number(l.quantity);
      const rate        = Number(l.rate);
      const discPct     = Number(l.discountPct || 0);
      const gstRate     = Number(l.gstRate || 18);
      const taxableValue = round2(qty * rate * (1 - discPct / 100));
      const cgstAmt  = isInterState ? 0 : round2(taxableValue * gstRate / 200);
      const sgstAmt  = isInterState ? 0 : round2(taxableValue * gstRate / 200);
      const igstAmt  = isInterState ? round2(taxableValue * gstRate / 100) : 0;
      const lineTotal = round2(taxableValue + cgstAmt + sgstAmt + igstAmt);
      taxableAmount += taxableValue;
      cgst  += cgstAmt;
      sgst  += sgstAmt;
      igst  += igstAmt;
      totalAmount += lineTotal;
      return {
        description: l.description, hsnSac: l.hsnSac || "",
        quantity: String(qty), unit: l.unit || "Nos",
        rate: String(rate), discountPct: String(discPct), gstRate: String(gstRate),
        taxableValue: String(round2(taxableValue)),
        cgst: String(cgstAmt), sgst: String(sgstAmt), igst: String(igstAmt),
        lineTotal: String(lineTotal),
      };
    });

    // Round totals
    taxableAmount = round2(taxableAmount);
    cgst  = round2(cgst);
    sgst  = round2(sgst);
    igst  = round2(igst);
    totalAmount = round2(totalAmount);

    const customerData = await db.query.customersTable.findFirst({
      where: eq((await import("@workspace/db")).customersTable.id, customerId),
    });

    const [inv] = await db.insert(invoicesTable).values({
      invoiceNo:    await nextInvoiceNo(),
      type:         type || "Tax Invoice",
      status:       "draft",
      date,
      dueDate,
      customerId,
      customerName:  customerData?.name || "Customer",
      customerGstin: customerData?.gstin,
      placeOfSupply,
      taxableAmount: String(taxableAmount),
      cgst:          String(cgst),
      sgst:          String(sgst),
      igst:          String(igst),
      tcs:           "0",
      totalAmount:   String(totalAmount),
      paidAmount:    "0",
      poReference,
      notes,
    }).returning();

    if (processedLines.length) {
      await db.insert(invoiceLinesTable).values(
        processedLines.map((l: any) => ({ ...l, invoiceId: inv.id }))
      );
    }

    res.status(201).json(await getInvoiceWithLines(inv.id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

/* ── GET /invoices/summary ── */
router.get("/invoices/summary", async (req, res) => {
  try {
    const rows = await db.select().from(invoicesTable);
    const draft  = rows.filter(r => r.status === "draft");
    const posted = rows.filter(r => r.status === "posted" || r.status === "paid" || r.status === "partial");
    const today  = new Date().toISOString().split("T")[0];
    const overdue = rows.filter(
      r => (r.status === "posted" || r.status === "partial") &&
        r.dueDate && r.dueDate < today &&
        Number(r.totalAmount) > Number(r.paidAmount)
    );
    res.json({
      totalDraft:        draft.length,
      totalPosted:       posted.length,
      totalOverdue:      overdue.length,
      totalDraftAmount:  round2(draft.reduce((s, r)  => s + Number(r.totalAmount), 0)),
      totalPostedAmount: round2(posted.reduce((s, r) => s + Number(r.totalAmount), 0)),
      totalOverdueAmount: round2(overdue.reduce((s, r) => s + Number(r.totalAmount) - Number(r.paidAmount), 0)),
      collectedMtd:      round2(rows.reduce((s, r) => s + Number(r.paidAmount), 0)),
      invoicedMtd:       round2(rows.reduce((s, r) => s + Number(r.totalAmount), 0)),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoice summary" });
  }
});

/* ── GET /invoices/:id ── */
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

/* ── PATCH /invoices/:id  (only drafts) ── */
router.patch("/invoices/:id", async (req, res) => {
  try {
    const [inv] = await db
      .update(invoicesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(invoicesTable.id, Number(req.params.id)), eq(invoicesTable.status, "draft")))
      .returning();
    if (!inv) { res.status(404).json({ error: "Not found or already posted" }); return; }
    res.json(await getInvoiceWithLines(inv.id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

/* ── DELETE /invoices/:id  (only drafts) ── */
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

/* ══════════════════════════════════════════
   POST /invoices/:id/post
   — Locks the invoice AND creates the double-entry journal:
       DR  Accounts Receivable (1100)  = totalAmount
       CR  Revenue              (6000) = taxableAmount
       CR  GST Payable CGST    (3100) = cgst   [if intra-state]
       CR  GST Payable SGST    (3110) = sgst   [if intra-state]
       CR  GST Payable IGST    (3120) = igst   [if inter-state]
══════════════════════════════════════════ */
router.post("/invoices/:id/post", async (req, res) => {
  try {
    // 1. Fetch invoice — must be draft
    const [inv] = await db.select().from(invoicesTable)
      .where(and(
        eq(invoicesTable.id, Number(req.params.id)),
        eq(invoicesTable.status, "draft"),
      ));
    if (!inv) {
      res.status(404).json({ error: "Invoice not found or already posted" }); return;
    }

    const taxableAmount = round2(Number(inv.taxableAmount));
    const cgst          = round2(Number(inv.cgst));
    const sgst          = round2(Number(inv.sgst));
    const igst          = round2(Number(inv.igst));
    const totalAmount   = round2(Number(inv.totalAmount));

    // 2. Build journal lines
    const journalLines = [
      // Debit: Accounts Receivable increases by full invoice amount
      { accountCode: GL.AR,      debit: totalAmount,    credit: 0,             narration: "AR for " + inv.invoiceNo, partyName: inv.customerName },
      // Credit: Revenue
      { accountCode: GL.REVENUE, debit: 0,              credit: taxableAmount, narration: "Revenue " + inv.invoiceNo },
    ];

    // Credit: GST (only non-zero amounts)
    if (cgst > 0) journalLines.push({ accountCode: GL.GST_CGST, debit: 0, credit: cgst, narration: "CGST " + inv.invoiceNo });
    if (sgst > 0) journalLines.push({ accountCode: GL.GST_SGST, debit: 0, credit: sgst, narration: "SGST " + inv.invoiceNo });
    if (igst > 0) journalLines.push({ accountCode: GL.GST_IGST, debit: 0, credit: igst, narration: "IGST " + inv.invoiceNo });

    // 3. Create the posted journal entry
    await createPostedJournal({
      voucherPrefix: "INV",
      date:          inv.date,
      narration:     `Sales Invoice ${inv.invoiceNo} — ${inv.customerName}`,
      lines:         journalLines,
    });

    // 4. Mark invoice as posted and generate IRN
    const irn = `IRN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await db.update(invoicesTable)
      .set({ status: "posted", irn, updatedAt: new Date() })
      .where(eq(invoicesTable.id, Number(req.params.id)));

    res.json(await getInvoiceWithLines(inv.id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to post invoice" });
  }
});

export default router;
