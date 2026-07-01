import { Router } from "express";
import { db, receiptsTable, receiptAllocationsTable, bankAccountsTable, invoicesTable } from "@workspace/db";
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import { createPostedJournal, round2, type JournalLine } from "../utils/accounting";

const router = Router();

let receiptSeq = 0;
async function nextReceiptNo(): Promise<string> {
  if (receiptSeq === 0) {
    const [last] = await db.select({ no: receiptsTable.receiptNo }).from(receiptsTable)
      .orderBy(desc(receiptsTable.createdAt)).limit(1);
    if (last?.no) {
      const parts = last.no.split("-");
      receiptSeq = Math.max(100, parseInt(parts[parts.length - 1]) || 100);
    } else {
      receiptSeq = 100;
    }
  }
  receiptSeq++;
  return `RCT-${new Date().getFullYear()}-${String(receiptSeq).padStart(5, "0")}`;
}

const GL = {
  AR:               "1100",   // Accounts Receivable (credit — reduces AR)
  TDS_RECEIVABLE:   "1150",   // TDS Receivable (debit — we'll collect from Tax Dept)
  DISCOUNT_ALLOWED: "7040",   // Settlement Discount (debit — expense)
  CASH:             "1000",   // Cash in Hand (fallback if no bank account)
};

async function getReceiptWithAllocations(id: number) {
  const [receipt] = await db.select().from(receiptsTable).where(eq(receiptsTable.id, id));
  if (!receipt) return null;
  const allocations = await db.select().from(receiptAllocationsTable)
    .where(eq(receiptAllocationsTable.receiptId, id));
  return {
    ...receipt,
    grossAmount:        Number(receipt.grossAmount),
    tdsDeducted:        Number(receipt.tdsDeducted),
    settlementDiscount: Number(receipt.settlementDiscount),
    netAmount:          Number(receipt.netAmount),
    allocations: allocations.map(a => ({
      ...a, allocatedAmount: Number(a.allocatedAmount),
    })),
  };
}

/* ── GET /receipts ── */
router.get("/receipts", async (req, res) => {
  try {
    const { customerId, from, to } = req.query as Record<string, string>;
    let query = db.select().from(receiptsTable).$dynamic();
    const conditions = [];
    if (customerId) conditions.push(eq(receiptsTable.customerId, Number(customerId)));
    if (from)       conditions.push(gte(receiptsTable.date, from));
    if (to)         conditions.push(lte(receiptsTable.date, to));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(receiptsTable.createdAt)).limit(200);
    res.json(rows.map(r => ({
      ...r,
      grossAmount:        Number(r.grossAmount),
      tdsDeducted:        Number(r.tdsDeducted),
      settlementDiscount: Number(r.settlementDiscount),
      netAmount:          Number(r.netAmount),
      allocations: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
});

/* ══════════════════════════════════════════
   POST /receipts
   Creates the receipt AND the double-entry journal:
       DR  Bank GL account        = netAmount
       DR  TDS Receivable (1150)  = tdsDeducted       [if > 0]
       DR  Discount Allowed (7040)= settlementDiscount [if > 0]
       CR  Accounts Receivable    = grossAmount
   Then updates invoice paidAmount for each allocation.
══════════════════════════════════════════ */
router.post("/receipts", async (req, res) => {
  try {
    const {
      date, customerId, paymentMode,
      grossAmount, tdsDeducted = 0, settlementDiscount = 0,
      bankAccountId, referenceNo, chequeNo, chequeDate, narration, allocations,
    } = req.body;

    const gross    = round2(Number(grossAmount));
    const tds      = round2(Number(tdsDeducted));
    const discount = round2(Number(settlementDiscount));
    const net      = round2(gross - tds - discount);

    if (net < 0) {
      res.status(400).json({ error: "netAmount cannot be negative" }); return;
    }

    // Fetch customer
    const customerData = await db.query.customersTable.findFirst({
      where: eq((await import("@workspace/db")).customersTable.id, customerId),
    });

    // Fetch bank GL account code
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

    const bankData = await db.query.bankAccountsTable.findFirst({
      where: eq(bankAccountsTable.id, bankAccountId),
    });

    // 1. Save receipt record
    const [receipt] = await db.insert(receiptsTable).values({
      receiptNo:          await nextReceiptNo(),
      date,
      customerId,
      customerName:       customerData?.name || "Customer",
      paymentMode,
      grossAmount:        String(gross),
      tdsDeducted:        String(tds),
      settlementDiscount: String(discount),
      netAmount:          String(net),
      bankAccountId,
      bankAccountName:    bankData?.accountName || "Bank",
      referenceNo,
      chequeNo,
      chequeDate,
      narration,
      status: "posted",
    }).returning();

    // 2. Save allocations and update invoice paidAmount
    if (allocations?.length) {
      await db.insert(receiptAllocationsTable).values(
        allocations.map((a: any) => ({
          receiptId:       receipt.id,
          invoiceId:       a.invoiceId,
          invoiceNo:       a.invoiceNo || `INV-${a.invoiceId}`,
          allocatedAmount: String(round2(Number(a.allocatedAmount))),
        }))
      );

      // Batch-fetch all invoices referenced by allocations (avoid N+1)
      const invoiceIds = allocations
        .map((a: any) => Number(a.invoiceId))
        .filter((id: number) => id > 0);
      const fetchedInvoices = invoiceIds.length
        ? await db.select().from(invoicesTable).where(inArray(invoicesTable.id, invoiceIds))
        : [];
      const invMap = new Map(fetchedInvoices.map(i => [i.id, i]));

      // Validate and update each invoice's paidAmount
      for (const alloc of allocations) {
        const allocated = round2(Number(alloc.allocatedAmount));
        if (!alloc.invoiceId || allocated <= 0) continue;
        const inv = invMap.get(Number(alloc.invoiceId));
        if (!inv) continue;
        const outstanding = round2(Number(inv.totalAmount) - Number(inv.paidAmount));
        if (allocated > outstanding + 0.01) {
          res.status(400).json({ error: `Allocated amount ${allocated} exceeds outstanding balance ${outstanding} for invoice ${alloc.invoiceId}` }); return;
        }
        const newPaid = round2(Number(inv.paidAmount) + allocated);
        const newStatus = newPaid >= round2(Number(inv.totalAmount)) ? "paid" : "partial";
        await db.update(invoicesTable)
          .set({ paidAmount: String(newPaid), status: newStatus, updatedAt: new Date() })
          .where(eq(invoicesTable.id, alloc.invoiceId));
      }
    }

    // 3. Create double-entry journal
    //    DR Bank    = net cash received
    //    DR TDS Rec = TDS deducted by customer (if any)
    //    DR Disc    = settlement discount given (if any)
    //    CR AR      = gross amount (full invoice value being settled)
    const journalLines: JournalLine[] = [
      { accountCode: bankGlCode, debit: net,   credit: 0,     narration: "Receipt " + receipt.receiptNo,    partyName: customerData?.name },
      { accountCode: GL.AR,      debit: 0,     credit: gross, narration: "AR cleared " + receipt.receiptNo, partyName: customerData?.name },
    ];
    if (tds > 0) {
      journalLines.push({ accountCode: GL.TDS_RECEIVABLE,   debit: tds,      credit: 0, narration: "TDS on " + receipt.receiptNo });
    }
    if (discount > 0) {
      journalLines.push({ accountCode: GL.DISCOUNT_ALLOWED, debit: discount, credit: 0, narration: "Discount on " + receipt.receiptNo });
    }

    await createPostedJournal({
      voucherPrefix: "RCT",
      date,
      narration:     `Receipt ${receipt.receiptNo} from ${customerData?.name || "Customer"}`,
      lines:         journalLines,
    });

    res.status(201).json(await getReceiptWithAllocations(receipt.id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create receipt" });
  }
});

/* ── GET /receipts/:id ── */
router.get("/receipts/:id", async (req, res) => {
  try {
    const result = await getReceiptWithAllocations(Number(req.params.id));
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch receipt" });
  }
});

export default router;
