import { Router } from "express";
import { db, vendorBillsTable, billLinesTable, vendorsTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const router = Router();

let billSeq = 100;
function nextBillNo() {
  billSeq++;
  return `BILL-${new Date().getFullYear()}-${String(billSeq).padStart(5, "0")}`;
}

async function getBillWithLines(id: number) {
  const [bill] = await db.select().from(vendorBillsTable).where(eq(vendorBillsTable.id, id));
  if (!bill) return null;
  const lines = await db.select().from(billLinesTable).where(eq(billLinesTable.billId, id));
  return {
    ...bill,
    taxableAmount: Number(bill.taxableAmount),
    cgst: Number(bill.cgst),
    sgst: Number(bill.sgst),
    igst: Number(bill.igst),
    tdsAmount: Number(bill.tdsAmount),
    totalAmount: Number(bill.totalAmount),
    paidAmount: Number(bill.paidAmount),
    balanceDue: Number(bill.totalAmount) - Number(bill.paidAmount),
    lines: lines.map(l => ({
      ...l,
      quantity: Number(l.quantity),
      rate: Number(l.rate),
      gstRate: Number(l.gstRate),
      taxableValue: Number(l.taxableValue),
      cgst: Number(l.cgst),
      sgst: Number(l.sgst),
      igst: Number(l.igst),
      lineTotal: Number(l.lineTotal),
    })),
  };
}

router.get("/bills", async (req, res) => {
  try {
    const { status, vendorId, from, to } = req.query as Record<string, string>;
    let query = db.select().from(vendorBillsTable).$dynamic();
    const conditions = [];
    if (status) conditions.push(eq(vendorBillsTable.status, status));
    if (vendorId) conditions.push(eq(vendorBillsTable.vendorId, Number(vendorId)));
    if (from) conditions.push(gte(vendorBillsTable.date, from));
    if (to) conditions.push(lte(vendorBillsTable.date, to));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(vendorBillsTable.createdAt)).limit(100);
    res.json(rows.map(r => ({
      ...r,
      taxableAmount: Number(r.taxableAmount),
      cgst: Number(r.cgst),
      sgst: Number(r.sgst),
      igst: Number(r.igst),
      tdsAmount: Number(r.tdsAmount),
      totalAmount: Number(r.totalAmount),
      paidAmount: Number(r.paidAmount),
      balanceDue: Number(r.totalAmount) - Number(r.paidAmount),
      lines: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

router.post("/bills", async (req, res) => {
  try {
    const { vendorId, vendorInvoiceNo, date, dueDate, poId, grnId, notes, lines } = req.body;

    let taxableAmount = 0, cgst = 0, sgst = 0, igst = 0, totalAmount = 0;
    const processedLines = (lines || []).map((l: any) => {
      const qty = Number(l.quantity);
      const rate = Number(l.rate);
      const gstRate = Number(l.gstRate || 18);
      const taxableValue = qty * rate;
      const cgstAmt = taxableValue * (gstRate / 200);
      const sgstAmt = taxableValue * (gstRate / 200);
      const igstAmt = 0;
      const lineTotal = taxableValue + cgstAmt + sgstAmt;
      taxableAmount += taxableValue;
      cgst += cgstAmt;
      sgst += sgstAmt;
      totalAmount += lineTotal;
      return {
        description: l.description, hsnSac: l.hsnSac, quantity: String(qty), unit: l.unit || "Nos",
        rate: String(rate), gstRate: String(gstRate), taxableValue: String(taxableValue),
        cgst: String(cgstAmt), sgst: String(sgstAmt), igst: "0", lineTotal: String(lineTotal),
      };
    });

    const vendor = await db.query.vendorsTable.findFirst({ where: eq(vendorsTable.id, vendorId) });

    const [bill] = await db.insert(vendorBillsTable).values({
      billNo: nextBillNo(),
      vendorInvoiceNo,
      vendorId,
      vendorName: vendor?.name || "Vendor",
      date,
      dueDate,
      poId,
      grnId,
      status: "draft",
      taxableAmount: String(taxableAmount),
      cgst: String(cgst),
      sgst: String(sgst),
      igst: "0",
      tdsAmount: "0",
      totalAmount: String(totalAmount),
      paidAmount: "0",
      isMsmeVendor: vendor?.isMsme || false,
      notes,
    }).returning();

    if (processedLines.length) {
      await db.insert(billLinesTable).values(processedLines.map((l: any) => ({ ...l, billId: bill.id })));
    }

    const result = await getBillWithLines(bill.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

router.get("/bills/:id", async (req, res) => {
  try {
    const result = await getBillWithLines(Number(req.params.id));
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch bill" });
  }
});

router.patch("/bills/:id", async (req, res) => {
  try {
    const [bill] = await db
      .update(vendorBillsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(vendorBillsTable.id, Number(req.params.id)))
      .returning();
    if (!bill) { res.status(404).json({ error: "Not found" }); return; }
    const result = await getBillWithLines(bill.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update bill" });
  }
});

router.post("/bills/:id/pay", async (req, res) => {
  try {
    const { amount } = req.body;
    const [bill] = await db.select().from(vendorBillsTable).where(eq(vendorBillsTable.id, Number(req.params.id)));
    if (!bill) { res.status(404).json({ error: "Not found" }); return; }
    const newPaid = Number(bill.paidAmount) + Number(amount);
    const newStatus = newPaid >= Number(bill.totalAmount) ? "paid" : "partial";
    const [updated] = await db
      .update(vendorBillsTable)
      .set({ paidAmount: String(newPaid), status: newStatus, updatedAt: new Date() })
      .where(eq(vendorBillsTable.id, Number(req.params.id)))
      .returning();
    const result = await getBillWithLines(updated.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;
