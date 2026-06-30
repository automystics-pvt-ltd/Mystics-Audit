import { Router } from "express";
import { db, bankAccountsTable, bankTransactionsTable, accountsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

/* ── helpers ── */
function nextAccountCode(prefix: string, existing: string[]): string {
  const nums = existing
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.slice(prefix.length)) || 0);
  const max = nums.length ? Math.max(...nums) : -1;
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

/* ── GET /bank/accounts ── */
router.get("/bank/accounts", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: bankAccountsTable.id,
        accountId: bankAccountsTable.accountId,
        accountName: bankAccountsTable.accountName,
        bankName: bankAccountsTable.bankName,
        accountNo: bankAccountsTable.accountNo,
        ifsc: bankAccountsTable.ifsc,
        accountType: bankAccountsTable.accountType,
        branch: bankAccountsTable.branch,
        balance: bankAccountsTable.balance,
        isActive: bankAccountsTable.isActive,
        lastReconciled: bankAccountsTable.lastReconciled,
        createdAt: bankAccountsTable.createdAt,
        glAccountCode: accountsTable.code,
      })
      .from(bankAccountsTable)
      .leftJoin(accountsTable, eq(bankAccountsTable.accountId, accountsTable.id));

    res.json(rows.map(r => ({
      ...r,
      balance: Number(r.balance),
      glAccountCode: r.glAccountCode ?? null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch bank accounts" });
  }
});

/* ── POST /bank/accounts ── auto-creates a linked GL account ── */
router.post("/bank/accounts", async (req, res) => {
  try {
    const { openingBalance, accountId: providedAccountId, ...rest } = req.body;
    let linkedAccountId: number | null = providedAccountId ?? null;

    if (!linkedAccountId) {
      // Auto-create a GL account for this bank account
      const existingAccounts = await db.select({ code: accountsTable.code }).from(accountsTable);
      const code = nextAccountCode("10", existingAccounts.map(a => a.code));
      const [glAccount] = await db.insert(accountsTable).values({
        code,
        name: rest.accountName,
        type: "Asset",
        group: "Current Assets",
        normalBalance: "debit",
        isBank: true,
        isCash: false,
        isParty: false,
        openingBalance: String(openingBalance || 0),
        description: `Bank GL account — ${rest.bankName}`,
      }).returning();
      linkedAccountId = glAccount.id;
    }

    const [row] = await db.insert(bankAccountsTable).values({
      ...rest,
      accountId: linkedAccountId,
      balance: String(openingBalance || 0),
    }).returning();

    // Fetch the linked account code
    const [glAcc] = linkedAccountId
      ? await db.select({ code: accountsTable.code }).from(accountsTable).where(eq(accountsTable.id, linkedAccountId))
      : [{ code: null }];

    res.status(201).json({ ...row, balance: Number(row.balance), glAccountCode: glAcc?.code ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create bank account" });
  }
});

/* ── PATCH /bank/accounts/:id ── */
router.patch("/bank/accounts/:id", async (req, res) => {
  try {
    const { balance, ...rest } = req.body;
    const updates: any = { ...rest, updatedAt: new Date() };
    if (balance !== undefined) updates.balance = String(balance);
    const [row] = await db.update(bankAccountsTable).set(updates)
      .where(eq(bankAccountsTable.id, Number(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row, balance: Number(row.balance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update bank account" });
  }
});

/* ── GET /bank/accounts/:id/transactions ── */
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

/* ── POST /bank/accounts/:id/transactions ── */
router.post("/bank/accounts/:id/transactions", async (req, res) => {
  try {
    const bankAccountId = Number(req.params.id);
    const { debit = 0, credit = 0, ...rest } = req.body;
    const [prev] = await db
      .select({ balance: bankAccountsTable.balance })
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, bankAccountId));
    const prevBalance = prev ? Number(prev.balance) : 0;
    const newBalance = prevBalance + Number(credit) - Number(debit);

    const [txn] = await db.insert(bankTransactionsTable).values({
      ...rest,
      bankAccountId,
      debit: String(debit),
      credit: String(credit),
      balance: String(newBalance),
    }).returning();

    await db.update(bankAccountsTable)
      .set({ balance: String(newBalance), updatedAt: new Date() })
      .where(eq(bankAccountsTable.id, bankAccountId));

    res.status(201).json({
      ...txn,
      debit: Number(txn.debit),
      credit: Number(txn.credit),
      balance: Number(txn.balance),
      matchConfidence: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add transaction" });
  }
});

/* ── POST /bank/accounts/:id/reconcile ── */
router.post("/bank/accounts/:id/reconcile", async (req, res) => {
  try {
    const { bankTransactionId, journalId } = req.body;
    const [txn] = await db
      .update(bankTransactionsTable)
      .set({ matchedJournalId: journalId, status: "reconciled", matchConfidence: "1.00" })
      .where(eq(bankTransactionsTable.id, bankTransactionId))
      .returning();
    if (!txn) { res.status(404).json({ error: "Transaction not found" }); return; }
    await db.update(bankAccountsTable)
      .set({ lastReconciled: new Date().toISOString().split("T")[0], updatedAt: new Date() })
      .where(eq(bankAccountsTable.id, Number(req.params.id)));
    res.json({ ...txn, debit: Number(txn.debit), credit: Number(txn.credit), balance: Number(txn.balance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reconcile" });
  }
});

export default router;
