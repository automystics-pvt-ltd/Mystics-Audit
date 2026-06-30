import { Router } from "express";
import { db, accountsTable, journalLinesTable, journalEntriesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

/* ── helpers ── */
function isDebitNormal(normalBalance: string): boolean {
  return normalBalance.toLowerCase() === "debit";
}

/* ══════════════════════════════════════════
   GET /accounts  — list with live balances
══════════════════════════════════════════ */
router.get("/accounts", async (req, res) => {
  try {
    const { type, group } = req.query as Record<string, string>;
    let query = db.select().from(accountsTable).$dynamic();
    const conditions = [];
    if (type)  conditions.push(eq(accountsTable.type, type));
    if (group) conditions.push(eq(accountsTable.group, group));
    if (conditions.length) query = query.where(and(...conditions));

    const accounts = await query;

    // Aggregate posted journal lines per account
    const balanceSums = await db
      .select({
        accountId: journalLinesTable.accountId,
        totalDebit:  sql<number>`coalesce(sum(${journalLinesTable.debit}::numeric), 0)`,
        totalCredit: sql<number>`coalesce(sum(${journalLinesTable.credit}::numeric), 0)`,
      })
      .from(journalLinesTable)
      .innerJoin(journalEntriesTable, and(
        eq(journalLinesTable.journalId, journalEntriesTable.id),
        eq(journalEntriesTable.status, "posted"),
      ))
      .groupBy(journalLinesTable.accountId);

    const balMap = new Map(balanceSums.map(b => [b.accountId, b]));

    const enriched = accounts.map(a => {
      const b = balMap.get(a.id);
      const opening = Number(a.openingBalance);
      const debit   = b ? Number(b.totalDebit)  : 0;
      const credit  = b ? Number(b.totalCredit) : 0;
      // Debit-normal accounts: balance increases with debits, decreases with credits
      // Credit-normal accounts: balance increases with credits, decreases with debits
      const currentBalance = isDebitNormal(a.normalBalance)
        ? opening + debit - credit
        : opening + credit - debit;
      return { ...a, openingBalance: opening, currentBalance };
    });

    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

/* ══════════════════════════════════════════
   POST /accounts  — create
══════════════════════════════════════════ */
router.post("/accounts", async (req, res) => {
  try {
    const [row] = await db.insert(accountsTable).values(req.body).returning();
    res.status(201).json({ ...row, openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

/* ══════════════════════════════════════════
   GET /accounts/trial-balance
   — includes opening balances AND all posted journal movements
══════════════════════════════════════════ */
router.get("/accounts/trial-balance", async (req, res) => {
  try {
    const accounts = await db.select().from(accountsTable).where(eq(accountsTable.isActive, true));

    // Aggregate all posted journal lines per account
    const balanceSums = await db
      .select({
        accountId: journalLinesTable.accountId,
        totalDebit:  sql<number>`coalesce(sum(${journalLinesTable.debit}::numeric), 0)`,
        totalCredit: sql<number>`coalesce(sum(${journalLinesTable.credit}::numeric), 0)`,
      })
      .from(journalLinesTable)
      .innerJoin(journalEntriesTable, and(
        eq(journalLinesTable.journalId, journalEntriesTable.id),
        eq(journalEntriesTable.status, "posted"),
      ))
      .groupBy(journalLinesTable.accountId);

    const balMap = new Map(balanceSums.map(b => [b.accountId, b]));

    const lines = accounts.map(a => {
      const b       = balMap.get(a.id);
      const opening = Number(a.openingBalance);
      const txDebit  = b ? Number(b.totalDebit)  : 0;
      const txCredit = b ? Number(b.totalCredit) : 0;
      // Net closing balance
      const closingBalance = isDebitNormal(a.normalBalance)
        ? opening + txDebit - txCredit
        : opening + txCredit - txDebit;

      // In a trial balance, debit-normal accounts with positive balance go to Debit column
      // credit-normal accounts with positive balance go to Credit column
      const debit  = isDebitNormal(a.normalBalance)  ? Math.max(closingBalance, 0) : Math.max(-closingBalance, 0);
      const credit = !isDebitNormal(a.normalBalance) ? Math.max(closingBalance, 0) : Math.max(-closingBalance, 0);

      return {
        accountCode: a.code,
        accountName: a.name,
        type: a.type,
        group: a.group,
        debit,
        credit,
        closingBalance,
      };
    }).filter(l => l.debit !== 0 || l.credit !== 0); // skip zero-balance accounts

    const totalDebit  = lines.reduce((s, l) => s + l.debit,  0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    res.json({
      asOf: req.query.date || new Date().toISOString().split("T")[0],
      totalDebit:  Math.round(totalDebit  * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced:  Math.abs(totalDebit - totalCredit) < 0.01,
      lines,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get trial balance" });
  }
});

/* ══════════════════════════════════════════
   GET /accounts/:id  — ledger with running balance
══════════════════════════════════════════ */
router.get("/accounts/:id", async (req, res) => {
  try {
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, Number(req.params.id)));
    if (!account) { res.status(404).json({ error: "Not found" }); return; }

    const entries = await db
      .select({
        id:        journalLinesTable.id,
        date:      journalEntriesTable.date,
        voucherNo: journalEntriesTable.voucherNo,
        narration: journalEntriesTable.narration,
        debit:     journalLinesTable.debit,
        credit:    journalLinesTable.credit,
        type:      journalEntriesTable.voucherType,
      })
      .from(journalLinesTable)
      .innerJoin(journalEntriesTable, eq(journalLinesTable.journalId, journalEntriesTable.id))
      .where(and(
        eq(journalLinesTable.accountId, Number(req.params.id)),
        eq(journalEntriesTable.status, "posted"),
      ))
      .orderBy(journalEntriesTable.date, journalEntriesTable.id);

    const debitNormal = isDebitNormal(account.normalBalance);
    let balance = Number(account.openingBalance);

    const mappedEntries = entries.map(e => {
      const debit  = Number(e.debit);
      const credit = Number(e.credit);
      // Running balance follows normal balance direction
      balance += debitNormal ? (debit - credit) : (credit - debit);
      return { ...e, debit, credit, balance: Math.round(balance * 100) / 100, narration: e.narration ?? null };
    });

    const totalDebit  = mappedEntries.reduce((s, e) => s + e.debit,  0);
    const totalCredit = mappedEntries.reduce((s, e) => s + e.credit, 0);
    const opening     = Number(account.openingBalance);
    const currentBalance = debitNormal
      ? opening + totalDebit - totalCredit
      : opening + totalCredit - totalDebit;

    res.json({
      account: { ...account, openingBalance: opening, currentBalance },
      openingBalance:  opening,
      closingBalance:  balance,
      totalDebit:      Math.round(totalDebit  * 100) / 100,
      totalCredit:     Math.round(totalCredit * 100) / 100,
      entries: mappedEntries,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

/* ══════════════════════════════════════════
   PATCH /accounts/:id  — update
══════════════════════════════════════════ */
router.patch("/accounts/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(accountsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountsTable.id, Number(req.params.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row, openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update account" });
  }
});

export default router;
