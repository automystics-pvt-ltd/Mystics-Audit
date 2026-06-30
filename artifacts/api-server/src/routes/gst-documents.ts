import { Router } from "express";
import { db, gstDocumentsTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const router = Router();

router.get("/gst-documents", async (req, res) => {
  try {
    const { docType, filingStatus, period, partyType, from, to } = req.query as Record<string, string>;
    let query = db.select().from(gstDocumentsTable).$dynamic();
    const conditions = [];
    if (docType)       conditions.push(eq(gstDocumentsTable.docType, docType));
    if (filingStatus)  conditions.push(eq(gstDocumentsTable.filingStatus, filingStatus));
    if (period)        conditions.push(eq(gstDocumentsTable.period, period));
    if (partyType)     conditions.push(eq(gstDocumentsTable.partyType, partyType));
    if (from)          conditions.push(gte(gstDocumentsTable.docDate, from));
    if (to)            conditions.push(lte(gstDocumentsTable.docDate, to));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(gstDocumentsTable.createdAt)).limit(500);
    res.json(rows.map(r => ({
      ...r,
      taxableAmount: Number(r.taxableAmount),
      cgst: Number(r.cgst), sgst: Number(r.sgst),
      igst: Number(r.igst), cess: Number(r.cess),
      total: Number(r.total),
      gstRate: r.gstRate ? Number(r.gstRate) : null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch GST documents" });
  }
});

router.post("/gst-documents", async (req, res) => {
  try {
    const {
      docType, docNo, docDate, partyName, partyGstin, partyType, placeOfSupply,
      taxableAmount, cgst, sgst, igst, cess, total, hsnCode, description, gstRate,
      period, filingStatus, linkedExpenseId, receiptUrl, notes,
    } = req.body;
    const computed = {
      taxable: Number(taxableAmount) || 0,
      cgst:    Number(cgst) || 0,
      sgst:    Number(sgst) || 0,
      igst:    Number(igst) || 0,
      cess:    Number(cess) || 0,
    };
    const computedTotal = total != null ? Number(total) : computed.taxable + computed.cgst + computed.sgst + computed.igst + computed.cess;
    const [doc] = await db.insert(gstDocumentsTable).values({
      docType: docType || "invoice",
      docNo, docDate, partyName,
      partyGstin: partyGstin || null,
      partyType: partyType || "supplier",
      placeOfSupply: placeOfSupply || null,
      taxableAmount: String(computed.taxable),
      cgst:  String(computed.cgst),
      sgst:  String(computed.sgst),
      igst:  String(computed.igst),
      cess:  String(computed.cess),
      total: String(computedTotal),
      hsnCode: hsnCode || null,
      description: description || null,
      gstRate: gstRate ? String(gstRate) : null,
      period: period || new Date().toISOString().slice(0, 7),
      filingStatus: filingStatus || "unfiled",
      linkedExpenseId: linkedExpenseId ? Number(linkedExpenseId) : null,
      receiptUrl: receiptUrl || null,
      notes: notes || null,
    }).returning();
    res.status(201).json({ ...doc, taxableAmount: Number(doc.taxableAmount), total: Number(doc.total) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create GST document" });
  }
});

router.get("/gst-documents/summary", async (req, res) => {
  try {
    const { period } = req.query as Record<string, string>;
    let query = db.select().from(gstDocumentsTable).$dynamic();
    if (period) query = query.where(eq(gstDocumentsTable.period, period));
    const docs = await query;

    const sum = (arr: typeof docs) => arr.reduce((s, d) => ({
      taxable: s.taxable + Number(d.taxableAmount),
      cgst:    s.cgst    + Number(d.cgst),
      sgst:    s.sgst    + Number(d.sgst),
      igst:    s.igst    + Number(d.igst),
      total:   s.total   + Number(d.total),
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

    const sales    = docs.filter(d => d.partyType === "customer");
    const purchase = docs.filter(d => d.partyType === "supplier");
    const salesSum = sum(sales);
    const purchSum = sum(purchase);

    res.json({
      period: period || "All",
      totalDocs: docs.length,
      filed:    docs.filter(d => d.filingStatus === "filed").length,
      unfiled:  docs.filter(d => d.filingStatus === "unfiled").length,
      matched:  docs.filter(d => d.filingStatus === "matched").length,
      mismatched: docs.filter(d => d.filingStatus === "mismatched").length,
      sales:    { count: sales.length, ...salesSum },
      purchases: { count: purchase.length, ...purchSum },
      itcAvailable: purchSum.cgst + purchSum.sgst + purchSum.igst,
      taxLiability: salesSum.cgst + salesSum.sgst + salesSum.igst,
      netPayable:   Math.max(0, (salesSum.cgst + salesSum.sgst + salesSum.igst) - (purchSum.cgst + purchSum.sgst + purchSum.igst)),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get summary" });
  }
});

router.patch("/gst-documents/:id", async (req, res) => {
  try {
    const { filingStatus, notes } = req.body;
    const [doc] = await db.update(gstDocumentsTable)
      .set({ ...(filingStatus && { filingStatus }), ...(notes !== undefined && { notes }), updatedAt: new Date() })
      .where(eq(gstDocumentsTable.id, Number(req.params.id)))
      .returning();
    if (!doc) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...doc, total: Number(doc.total) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/gst-documents/:id", async (req, res) => {
  try {
    await db.delete(gstDocumentsTable).where(eq(gstDocumentsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
