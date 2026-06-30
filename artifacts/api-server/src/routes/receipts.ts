import { Router } from "express";
import { db, receiptsTable, receiptAllocationsTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const router = Router();

let receiptSeq = 100;
function nextReceiptNo() {
  receiptSeq++;
  return `RCT-${new Date().getFullYear()}-${String(receiptSeq).padStart(5, "0")}`;
}

async function getReceiptWithAllocations(id: number) {
  const [receipt] = await db.select().from(receiptsTable).where(eq(receiptsTable.id, id));
  if (!receipt) return null;
  const allocations = await db.select().from(receiptAllocationsTable).where(eq(receiptAllocationsTable.receiptId, id));
  return {
    ...receipt,
    grossAmount: Number(receipt.grossAmount),
    tdsDeducted: Number(receipt.tdsDeducted),
    settlementDiscount: Number(receipt.settlementDiscount),
    netAmount: Number(receipt.netAmount),
    allocations: allocations.map(a => ({ ...a, allocatedAmount: Number(a.allocatedAmount) })),
  };
}

router.get("/receipts", async (req, res) => {
  try {
    const { customerId, from, to } = req.query as Record<string, string>;
    let query = db.select().from(receiptsTable).$dynamic();
    const conditions = [];
    if (customerId) conditions.push(eq(receiptsTable.customerId, Number(customerId)));
    if (from) conditions.push(gte(receiptsTable.date, from));
    if (to) conditions.push(lte(receiptsTable.date, to));
    if (conditions.length) query = query.where(and(...conditions));
    const rows = await query.orderBy(desc(receiptsTable.createdAt)).limit(100);
    res.json(rows.map(r => ({
      ...r,
      grossAmount: Number(r.grossAmount),
      tdsDeducted: Number(r.tdsDeducted),
      settlementDiscount: Number(r.settlementDiscount),
      netAmount: Number(r.netAmount),
      allocations: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
});

router.post("/receipts", async (req, res) => {
  try {
    const { date, customerId, paymentMode, grossAmount, tdsDeducted = 0, settlementDiscount = 0, bankAccountId, referenceNo, chequeNo, chequeDate, narration, allocations } = req.body;
    const netAmount = Number(grossAmount) - Number(tdsDeducted) - Number(settlementDiscount);
    const customerData = await db.query.customersTable.findFirst({ where: eq((await import("@workspace/db")).customersTable.id, customerId) });
    const bankData = await db.query.bankAccountsTable.findFirst({ where: eq((await import("@workspace/db")).bankAccountsTable.id, bankAccountId) });

    const [receipt] = await db.insert(receiptsTable).values({
      receiptNo: nextReceiptNo(),
      date,
      customerId,
      customerName: customerData?.name || "Customer",
      paymentMode,
      grossAmount: String(grossAmount),
      tdsDeducted: String(tdsDeducted),
      settlementDiscount: String(settlementDiscount),
      netAmount: String(netAmount),
      bankAccountId,
      bankAccountName: bankData?.accountName || "Bank",
      referenceNo,
      chequeNo,
      chequeDate,
      narration,
      status: "posted",
    }).returning();

    if (allocations?.length) {
      await db.insert(receiptAllocationsTable).values(
        allocations.map((a: any) => ({
          receiptId: receipt.id,
          invoiceId: a.invoiceId,
          invoiceNo: a.invoiceNo || `INV-${a.invoiceId}`,
          allocatedAmount: String(a.allocatedAmount),
        }))
      );
    }

    const result = await getReceiptWithAllocations(receipt.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create receipt" });
  }
});

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
