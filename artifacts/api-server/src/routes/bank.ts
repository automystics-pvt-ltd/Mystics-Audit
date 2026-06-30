import { Router } from "express";
import { db, bankAccountsTable, bankTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/bank/accounts", async (req, res) => {
  try {
    const rows = await db.select().from(bankAccountsTable);
    res.json(rows.map(r => ({ ...r, balance: Number(r.balance) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch bank accounts" });
  }
});

router.post("/bank/accounts", async (req, res) => {
  try {
    const { openingBalance, ...rest } = req.body;
    const [row] = await db.insert(bankAccountsTable).values({ ...rest, balance: String(openingBalance || 0) }).returning();
    res.status(201).json({ ...row, balance: Number(row.balance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create bank account" });
  }
});

router.get("/bank/accounts/:id/transactions", async (req, res) => {
  try {
    const rows = await db.select().from(bankTransactionsTable)
      .where(eq(bankTransactionsTable.bankAccountId, Number(req.params.id)));
    res.json(rows.map(r => ({
      ...r,
      debit: Number(r.debit),
      credit: Number(r.credit),
      balance: Number(r.balance),
      matchConfidence: r.matchConfidence ? Number(r.matchConfidence) : null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.post("/bank/accounts/:id/reconcile", async (req, res) => {
  try {
    const { bankTransactionId, journalId } = req.body;
    const [row] = await db
      .update(bankTransactionsTable)
      .set({ status: "reconciled", matchedJournalId: journalId, matchConfidence: "100" })
      .where(eq(bankTransactionsTable.id, bankTransactionId))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row, debit: Number(row.debit), credit: Number(row.credit), balance: Number(row.balance), matchConfidence: 100 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reconcile" });
  }
});

export default router;
