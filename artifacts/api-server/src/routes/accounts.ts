import { Router } from "express";
import { db, accountsTable, journalLinesTable, journalEntriesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/accounts", async (req, res) => {
  try {
    const { type, group } = req.query as Record<string, string>;
    let query = db.select().from(accountsTable).$dynamic();
    const conditions = [];
    if (type) conditions.push(eq(accountsTable.type, type));
    if (group) conditions.push(eq(accountsTable.group, group));
    if (conditions.length) query = query.where(and(...conditions));

    const accounts = await query;

    const enriched = accounts.map(a => ({
      ...a,
      openingBalance: Number(a.openingBalance),
      currentBalance: Number(a.openingBalance),
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

router.post("/accounts", async (req, res) => {
  try {
    const [row] = await db.insert(accountsTable).values(req.body).returning();
    res.status(201).json({ ...row, openingBalance: Number(row.openingBalance), currentBalance: Number(row.openingBalance) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.get("/accounts/trial-balance", async (req, res) => {
  try {
    const accounts = await db.select().from(accountsTable).where(eq(accountsTable.isActive, true));
    const lines = accounts.map(a => ({
      accountCode: a.code,
      accountName: a.name,
      group: a.group,
      debit: a.normalBalance === "debit" ? Number(a.openingBalance) : 0,
      credit: a.normalBalance === "credit" ? Number(a.openingBalance) : 0,
    }));
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    res.json({
      asOf: req.query.date || new Date().toISOString().split("T")[0],
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      lines,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get trial balance" });
  }
});

router.get("/accounts/:id", async (req, res) => {
  try {
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, Number(req.params.id)));
    if (!account) { res.status(404).json({ error: "Not found" }); return; }

    const entries = await db
      .select({
        id: journalLinesTable.id,
        date: journalEntriesTable.date,
        voucherNo: journalEntriesTable.voucherNo,
        narration: journalEntriesTable.narration,
        debit: journalLinesTable.debit,
        credit: journalLinesTable.credit,
        type: journalEntriesTable.voucherType,
      })
      .from(journalLinesTable)
      .innerJoin(journalEntriesTable, eq(journalLinesTable.journalId, journalEntriesTable.id))
      .where(and(eq(journalLinesTable.accountId, Number(req.params.id)), eq(journalEntriesTable.status, "posted")))
      .orderBy(journalEntriesTable.date);

    let balance = Number(account.openingBalance);
    const mappedEntries = entries.map(e => {
      const debit = Number(e.debit);
      const credit = Number(e.credit);
      balance += account.normalBalance === "debit" ? debit - credit : credit - debit;
      return { ...e, debit, credit, balance, narration: e.narration ?? null };
    });

    const totalDebit = mappedEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = mappedEntries.reduce((s, e) => s + e.credit, 0);

    res.json({
      account: { ...account, openingBalance: Number(account.openingBalance), currentBalance: Number(account.openingBalance) + totalDebit - totalCredit },
      openingBalance: Number(account.openingBalance),
      closingBalance: balance,
      totalDebit,
      totalCredit,
      entries: mappedEntries,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

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
