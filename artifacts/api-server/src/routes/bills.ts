import { Router } from "express";
import { db, vendorBillsTable, billLinesTable, vendorsTable, bankAccountsTable, companiesTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { createPostedJournal, round2, type JournalLine } from "../utils/accounting";

const router = Router();

let billSeq = 0;
async function nextBillNo(): Promise<string> {
  if (billSeq === 0) {
    const [last] = await db.select({ no: vendorBillsTable.billNo }).from(vendorBillsTable)
      .orderBy(desc(vendorBillsTable.createdAt)).limit(1);
    if (last?.no) {
      const parts = last.no.split("-");
      billSeq = Math.max(100, parseInt(parts[parts.length - 1]) || 100);
    } else {
      billSeq = 100;
    }
  }
  billSeq++;
  return `BILL-${new Date().getFullYear()}-${String(billSeq).padStart(5, "0")}`;
}

/** Fetch company state for inter-state GST determination */
async function getCompanyState(): Promise<string> {
  const [company] = await db.select({ state: companiesTable.state }).from(companiesTable).limit(1);
  return company?.state ?? "Tamil Nadu";
}

const GL = {
  AP:        "3000",  // Accounts Payable
  PURCHASES: "5500",  // Purchases / Cost of Goods
  GST_ITC:   "1400",  // GST Input Tax Credit (ITC)
  AP_TDS:    "3200",  // TDS Payable (we deduct TDS from vendor, remit to govt)
  CASH:      "1000",  // Cash fallback
};

async function getBillWithLines(id: number) {
  const [bill] = await db.select().from(vendorBillsTable).where(eq(vendorBillsTable.id, id));
  if (!bill) return null;
  const lines = await db.select().from(billLinesTable).where(eq(billLinesTable.billId, id));
  return {
    ...bill,
    taxableAmount: Number(bill.taxableAmount),
    cgst:          Number(bill.cgst),
    sgst:          Number(bill.sgst),
    igst:          Number(bill.igst),
    tdsAmount:     Number(bill.tdsAmount),
    totalAmount:   Number(bill.totalAmount),
    paidAmount:    Number(bill.paidAmount),
    balanceDue:    round2(Number(bill.totalAmount) - Number(bill.paidAmount)),
    lines: lines.map(l => ({
      ...l,
      quantity:     Number(l.quantity),
      rate:         Number(l.rate),
      gstRate:      Number(l.gstRate),
      taxableValue: Number(l.taxableValue),
      cgst:         Number(l.cgst),
      sgst:         Number(l.sgst),
      igst:         Number(l.igst),
      lineTotal:    Number(l.lineTotal),
    })),
  };
}

/* ── GET /bills ── */
router.get("/bills", async (req, res) => {
  try {
    const { status, vendorId, from, to } = req.query as Record<string, string>;
    let query = db.select().from(vendorBillsTable).$dynamic();
    const conditions = [];
    if (status)   conditions.push(eq(vendorBillsTable.status, status));
    if (vendorId) conditions.push(eq(vendorBillsTable.vendorId, Number(vendorId)));
    if (from)     conditions.push(gte(vendorBillsTable.date, from));
    if (to)       conditions.push(lte(vendorBillsTable.date, to));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(vendorBillsTable.createdAt)).limit(200);
    res.json(rows.map(r => ({
      ...r,
      taxableAmount: Number(r.taxableAmount),
      cgst:          Number(r.cgst),
      sgst:          Number(r.sgst),
      igst:          Number(r.igst),
      tdsAmount:     Number(r.tdsAmount),
      totalAmount:   Number(r.totalAmount),
      paidAmount:    Number(r.paidAmount),
      balanceDue:    round2(Number(r.totalAmount) - Number(r.paidAmount)),
      lines: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

/* ── POST /bills  (create draft) ── */
router.post("/bills", async (req, res) => {
  try {
    const { vendorId, vendorInvoiceNo, date, dueDate, placeOfSupply, poId, grnId, notes, lines } = req.body;

    const companyState = await getCompanyState();
    const isInterState = !!placeOfSupply && placeOfSupply.toLowerCase() !== companyState.toLowerCase();

    let taxableAmount = 0, cgst = 0, sgst = 0, igst = 0, totalAmount = 0;
    const processedLines = (lines || []).map((l: any) => {
      const qty          = Number(l.quantity);
      const rate         = Number(l.rate);
      const gstRate      = Number(l.gstRate || 18);
      const taxableValue = round2(qty * rate);
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
        rate: String(rate), gstRate: String(gstRate),
        taxableValue: String(round2(taxableValue)),
        cgst: String(cgstAmt), sgst: String(sgstAmt), igst: String(igstAmt),
        lineTotal: String(lineTotal),
      };
    });

    // Round totals
    taxableAmount = round2(taxableAmount);
    cgst          = round2(cgst);
    sgst          = round2(sgst);
    igst          = round2(igst);
    totalAmount   = round2(totalAmount);

    const vendor = await db.query.vendorsTable.findFirst({ where: eq(vendorsTable.id, vendorId) });

    const [bill] = await db.insert(vendorBillsTable).values({
      billNo:         await nextBillNo(),
      vendorInvoiceNo,
      vendorId,
      vendorName:     vendor?.name || "Vendor",
      date,
      dueDate,
      poId,
      grnId,
      status:         "draft",
      taxableAmount:  String(taxableAmount),
      cgst:           String(cgst),
      sgst:           String(sgst),
      igst:           String(igst),
      tdsAmount:      "0",
      totalAmount:    String(totalAmount),
      paidAmount:     "0",
      isMsmeVendor:   vendor?.isMsme || false,
      notes,
    }).returning();

    if (processedLines.length) {
      await db.insert(billLinesTable).values(
        processedLines.map((l: any) => ({ ...l, billId: bill.id }))
      );
    }

    res.status(201).json(await getBillWithLines(bill.id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

/* ── GET /bills/:id ── */
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

/* ── PATCH /bills/:id  (only drafts) ── */
router.patch("/bills/:id", async (req, res) => {
  try {
    const [bill] = await db
      .update(vendorBillsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(vendorBillsTable.id, Number(req.params.id)), eq(vendorBillsTable.status, "draft")))
      .returning();
    if (!bill) { res.status(404).json({ error: "Not found or already posted" }); return; }
    res.json(await getBillWithLines(bill.id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update bill" });
  }
});

/* ══════════════════════════════════════════
   POST /bills/:id/post
   Locks the bill AND creates the double-entry journal:
       DR  Purchases / Expense (5500) = taxableAmount
       DR  GST Input Tax Credit(1400) = cgst + sgst + igst
       DR  TDS Payable         (3200) = tdsAmount [if > 0, we deduct at source]
       CR  Accounts Payable    (3000) = totalAmount - tdsAmount
══════════════════════════════════════════ */
router.post("/bills/:id/post", async (req, res) => {
  try {
    const [bill] = await db.select().from(vendorBillsTable)
      .where(and(
        eq(vendorBillsTable.id, Number(req.params.id)),
        eq(vendorBillsTable.status, "draft"),
      ));
    if (!bill) {
      res.status(404).json({ error: "Bill not found or already posted" }); return;
    }

    const taxableAmount = round2(Number(bill.taxableAmount));
    const cgst          = round2(Number(bill.cgst));
    const sgst          = round2(Number(bill.sgst));
    const igst          = round2(Number(bill.igst));
    const totalGst      = round2(cgst + sgst + igst);
    const tdsAmount     = round2(Number(bill.tdsAmount));
    const totalAmount   = round2(Number(bill.totalAmount));
    // AP = totalAmount (gross). If TDS is deducted at payment time, not at bill time,
    // then at posting: DR Purchases + DR ITC, CR AP = full totalAmount
    // At payment: DR AP = payment amount + DR TDS Payable if TDS deducted
    const apAmount = totalAmount;

    const journalLines: JournalLine[] = [
      { accountCode: GL.PURCHASES, debit: taxableAmount, credit: 0, narration: "Purchase " + bill.billNo, partyName: bill.vendorName },
      { accountCode: GL.AP,        debit: 0, credit: apAmount, narration: "AP for "     + bill.billNo, partyName: bill.vendorName },
    ];
    if (totalGst > 0) {
      journalLines.push({ accountCode: GL.GST_ITC, debit: totalGst, credit: 0, narration: "ITC " + bill.billNo });
    }

    await createPostedJournal({
      voucherPrefix: "BILL",
      date:          bill.date,
      narration:     `Vendor Bill ${bill.billNo} — ${bill.vendorName}`,
      lines:         journalLines,
    });

    await db.update(vendorBillsTable)
      .set({ status: "posted", updatedAt: new Date() })
      .where(eq(vendorBillsTable.id, Number(req.params.id)));

    res.json(await getBillWithLines(bill.id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to post bill" });
  }
});

/* ══════════════════════════════════════════
   POST /bills/:id/pay
   Records partial/full payment AND creates the double-entry journal:
       DR  Accounts Payable (3000) = amount
       CR  Bank/Cash GL            = amount - tdsDeducted
       CR  TDS Payable (3200)      = tdsDeducted [if any]
══════════════════════════════════════════ */
router.post("/bills/:id/pay", async (req, res) => {
  try {
    const { amount, bankAccountId, tdsDeducted = 0 } = req.body;
    const payAmt = round2(Number(amount));
    const tds    = round2(Number(tdsDeducted));
    const cashOut = round2(payAmt - tds);  // actual cash leaving the bank

    if (cashOut < 0) {
      res.status(400).json({ error: "TDS cannot exceed payment amount" }); return;
    }

    const [bill] = await db.select().from(vendorBillsTable)
      .where(eq(vendorBillsTable.id, Number(req.params.id)));
    if (!bill) { res.status(404).json({ error: "Not found" }); return; }

    // Determine bank GL code
    let bankGlCode = GL.CASH;
    if (bankAccountId) {
      const [bankAcc] = await db
        .select({ accountId: bankAccountsTable.accountId })
        .from(bankAccountsTable)
        .where(eq(bankAccountsTable.id, bankAccountId));
      if (bankAcc?.accountId) {
        const [acct] = await db
          .select({ code: (await import("@workspace/db")).accountsTable.code })
          .from((await import("@workspace/db")).accountsTable)
          .where(eq((await import("@workspace/db")).accountsTable.id, bankAcc.accountId));
        if (acct?.code) bankGlCode = acct.code;
      }
    }

    // Build journal
    const journalLines: JournalLine[] = [
      { accountCode: GL.AP,      debit: payAmt, credit: 0,       narration: "Payment for " + bill.billNo, partyName: bill.vendorName },
      { accountCode: bankGlCode, debit: 0,      credit: cashOut, narration: "Payment for " + bill.billNo },
    ];
    if (tds > 0) {
      journalLines.push({ accountCode: GL.AP_TDS, debit: 0, credit: tds, narration: "TDS on " + bill.billNo });
    }

    await createPostedJournal({
      voucherPrefix: "PMT",
      date:          new Date().toISOString().split("T")[0],
      narration:     `Payment against Bill ${bill.billNo} — ${bill.vendorName}`,
      lines:         journalLines,
    });

    // Update bill paidAmount and status
    const newPaid   = round2(Number(bill.paidAmount) + payAmt);
    const newStatus = newPaid >= round2(Number(bill.totalAmount)) ? "paid" : "partial";
    await db.update(vendorBillsTable)
      .set({ paidAmount: String(newPaid), status: newStatus, updatedAt: new Date() })
      .where(eq(vendorBillsTable.id, Number(req.params.id)));

    res.json(await getBillWithLines(bill.id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;
