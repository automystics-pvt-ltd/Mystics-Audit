import { Router } from "express";
import { db, bankAccountsTable, bankTransactionsTable, accountsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { createPostedJournal } from "../utils/accounting.js";

const router = Router();

/* ── helpers ── */
function nextAccountCode(prefix: string, existing: string[]): string {
  const nums = existing
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.slice(prefix.length)) || 0);
  const max = nums.length ? Math.max(...nums) : -1;
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

/**
 * Ensure a GL account exists for a given code. If missing, create it.
 */
async function ensureGlAccount(code: string, name: string, type: string, group: string, normalBalance: "debit" | "credit"): Promise<number> {
  const [existing] = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.code, code));
  if (existing) return existing.id;
  const [created] = await db.insert(accountsTable).values({
    code, name, type, group, normalBalance,
    isBank: false, isCash: false, isParty: false,
    openingBalance: "0",
    description: `Auto-created GL account for ${name}`,
  }).returning();
  return created.id;
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
    const {
      openingBalance, accountId: providedAccountId,
      accountName, bankName, accountNumber, accountNo,
      ifscCode, ifsc, accountType, branch, ...rest
    } = req.body;
    let linkedAccountId: number | null = providedAccountId ?? null;
    const resolvedAccountNo = accountNo || accountNumber;
    const resolvedIfsc     = ifsc || ifscCode;

    if (!linkedAccountId) {
      const existingAccounts = await db.select({ code: accountsTable.code }).from(accountsTable);
      const code = nextAccountCode("10", existingAccounts.map(a => a.code));
      const [glAccount] = await db.insert(accountsTable).values({
        code,
        name: accountName,
        type: "Asset",
        group: "Current Assets",
        normalBalance: "debit",
        isBank: true,
        isCash: false,
        isParty: false,
        openingBalance: String(openingBalance || 0),
        description: `Bank GL account — ${bankName}`,
      }).returning();
      linkedAccountId = glAccount.id;
    }

    const [row] = await db.insert(bankAccountsTable).values({
      accountName,
      bankName,
      accountNo: resolvedAccountNo,
      ifsc: resolvedIfsc,
      accountType: accountType || "Current",
      branch: branch || null,
      accountId: linkedAccountId,
      balance: String(openingBalance || 0),
    }).returning();

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
    const bankAccountId = Number(req.params.id);
    const { status, type } = req.query as { status?: string; type?: string };

    const conditions = [eq(bankTransactionsTable.bankAccountId, bankAccountId)];

    const rows = await db.select().from(bankTransactionsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(sql`${bankTransactionsTable.date} DESC, ${bankTransactionsTable.id} DESC`);

    let filtered = rows;
    if (status) filtered = filtered.filter(r => r.status === status);
    if (type) filtered = filtered.filter(r => (r as any).type === type);

    res.json(filtered.map(r => ({
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

/* ── POST /bank/accounts/:id/transactions ── creates bank txn + GL journal ── */
router.post("/bank/accounts/:id/transactions", async (req, res) => {
  try {
    const bankAccountId = Number(req.params.id);
    const { type, description, amount: rawAmount, date, referenceNo } = req.body;
    const amount = Number(rawAmount) || 0;

    // Fetch bank account and linked GL code
    const [bankAccount] = await db
      .select({ balance: bankAccountsTable.balance, accountId: bankAccountsTable.accountId, accountName: bankAccountsTable.accountName })
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, bankAccountId));
    if (!bankAccount) { res.status(404).json({ error: "Bank account not found" }); return; }

    const prevBalance = Number(bankAccount.balance);
    let debit = 0;
    let credit = 0;

    // Determine debit/credit direction
    switch (type) {
      case "DEPOSIT":
      case "INTEREST":
        credit = amount; // Money coming in → credit bank (increases bank balance for debit-normal accounts)
        break;
      case "WITHDRAWAL":
      case "BANK_CHARGE":
        debit = amount;  // Money going out
        break;
      default:
        // Fallback: treat positive as credit, negative as debit
        if (amount >= 0) credit = amount;
        else debit = Math.abs(amount);
    }

    const newBalance = prevBalance + credit - debit;

    // Get bank GL account code
    let bankGlCode: string | null = null;
    if (bankAccount.accountId) {
      const [acc] = await db.select({ code: accountsTable.code }).from(accountsTable).where(eq(accountsTable.id, bankAccount.accountId));
      bankGlCode = acc?.code ?? null;
    }

    // Create GL journal entry if we have a bank GL code
    let journalId: number | null = null;
    if (bankGlCode) {
      try {
        let lines: Array<{ accountCode: string; debit: number; credit: number; narration?: string }> = [];

        switch (type) {
          case "DEPOSIT": {
            // Ensure a "Sundry Income" or clearing account exists
            await ensureGlAccount("7100", "Other Income", "Revenue", "Other Income", "credit");
            lines = [
              { accountCode: bankGlCode, debit: amount, credit: 0, narration: description },
              { accountCode: "7100", debit: 0, credit: amount, narration: description },
            ];
            break;
          }
          case "WITHDRAWAL": {
            await ensureGlAccount("5900", "General Expenses", "Expense", "Operating Expenses", "debit");
            lines = [
              { accountCode: "5900", debit: amount, credit: 0, narration: description },
              { accountCode: bankGlCode, debit: 0, credit: amount, narration: description },
            ];
            break;
          }
          case "BANK_CHARGE": {
            await ensureGlAccount("5800", "Bank Charges", "Expense", "Financial Expenses", "debit");
            lines = [
              { accountCode: "5800", debit: amount, credit: 0, narration: description },
              { accountCode: bankGlCode, debit: 0, credit: amount, narration: description },
            ];
            break;
          }
          case "INTEREST": {
            await ensureGlAccount("7200", "Interest Income", "Revenue", "Other Income", "credit");
            lines = [
              { accountCode: bankGlCode, debit: amount, credit: 0, narration: description },
              { accountCode: "7200", debit: 0, credit: amount, narration: description },
            ];
            break;
          }
        }

        if (lines.length > 0) {
          const journal = await createPostedJournal({
            voucherPrefix: type === "DEPOSIT" || type === "INTEREST" ? "RCT" : "PMT",
            date,
            narration: description,
            lines,
          });
          journalId = journal.id;
        }
      } catch (glErr) {
        req.log.warn({ glErr }, "GL journal creation failed for bank transaction — bank entry still saved");
      }
    }

    const [txn] = await db.insert(bankTransactionsTable).values({
      bankAccountId,
      date,
      description,
      debit: String(debit),
      credit: String(credit),
      balance: String(newBalance),
      referenceNo: referenceNo || null,
      status: "unreconciled",
      matchedJournalId: journalId,
      matchConfidence: journalId ? "1.00" : null,
      ...(type ? { type } : {}),
    } as any).returning();

    await db.update(bankAccountsTable)
      .set({ balance: String(newBalance), updatedAt: new Date() })
      .where(eq(bankAccountsTable.id, bankAccountId));

    res.status(201).json({
      ...txn,
      debit: Number(txn.debit),
      credit: Number(txn.credit),
      balance: Number(txn.balance),
      matchConfidence: txn.matchConfidence ? Number(txn.matchConfidence) : null,
      journalId,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add transaction" });
  }
});

/* ── POST /bank/transfer ── transfer between two bank accounts ── */
router.post("/bank/transfer", async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount: rawAmount, date, description, referenceNo } = req.body;
    const amount = Number(rawAmount) || 0;

    if (fromAccountId === toAccountId) {
      res.status(400).json({ error: "Cannot transfer to the same account" }); return;
    }
    if (amount <= 0) {
      res.status(400).json({ error: "Amount must be positive" }); return;
    }

    // Fetch both accounts
    const accounts = await db
      .select({ id: bankAccountsTable.id, balance: bankAccountsTable.balance, accountId: bankAccountsTable.accountId, accountName: bankAccountsTable.accountName })
      .from(bankAccountsTable)
      .where(inArray(bankAccountsTable.id, [fromAccountId, toAccountId]));

    const fromAcc = accounts.find(a => a.id === fromAccountId);
    const toAcc   = accounts.find(a => a.id === toAccountId);
    if (!fromAcc || !toAcc) { res.status(404).json({ error: "Account not found" }); return; }

    const fromNewBalance = Number(fromAcc.balance) - amount;
    const toNewBalance   = Number(toAcc.balance)   + amount;

    // Resolve GL codes
    let fromGlCode: string | null = null;
    let toGlCode: string | null = null;
    if (fromAcc.accountId) {
      const [acc] = await db.select({ code: accountsTable.code }).from(accountsTable).where(eq(accountsTable.id, fromAcc.accountId));
      fromGlCode = acc?.code ?? null;
    }
    if (toAcc.accountId) {
      const [acc] = await db.select({ code: accountsTable.code }).from(accountsTable).where(eq(accountsTable.id, toAcc.accountId));
      toGlCode = acc?.code ?? null;
    }

    // Create GL journal: DR destination bank / CR source bank
    let journalId: number | null = null;
    if (fromGlCode && toGlCode) {
      try {
        const journal = await createPostedJournal({
          voucherPrefix: "PMT",
          date,
          narration: description || `Bank transfer: ${fromAcc.accountName} → ${toAcc.accountName}`,
          lines: [
            { accountCode: toGlCode,   debit: amount,  credit: 0 },
            { accountCode: fromGlCode, debit: 0, credit: amount  },
          ],
        });
        journalId = journal.id;
      } catch (glErr) {
        req.log.warn({ glErr }, "GL journal creation failed for bank transfer");
      }
    }

    // Insert transactions in both accounts
    const transferDesc = description || `Transfer to/from ${toAcc.accountName}`;
    const fromDesc = `Transfer to ${toAcc.accountName}${referenceNo ? ` (${referenceNo})` : ""}`;
    const toDesc   = `Transfer from ${fromAcc.accountName}${referenceNo ? ` (${referenceNo})` : ""}`;

    const [fromTxn] = await db.insert(bankTransactionsTable).values({
      bankAccountId: fromAccountId,
      date,
      description: fromDesc,
      debit: String(amount),
      credit: "0",
      balance: String(fromNewBalance),
      referenceNo: referenceNo || null,
      status: "reconciled",
      matchedJournalId: journalId,
      matchConfidence: journalId ? "1.00" : null,
      type: "TRANSFER_OUT",
    } as any).returning();

    const [toTxn] = await db.insert(bankTransactionsTable).values({
      bankAccountId: toAccountId,
      date,
      description: toDesc,
      debit: "0",
      credit: String(amount),
      balance: String(toNewBalance),
      referenceNo: referenceNo || null,
      status: "reconciled",
      matchedJournalId: journalId,
      matchConfidence: journalId ? "1.00" : null,
      type: "TRANSFER_IN",
    } as any).returning();

    // Update both account balances
    await db.update(bankAccountsTable).set({ balance: String(fromNewBalance), updatedAt: new Date() }).where(eq(bankAccountsTable.id, fromAccountId));
    await db.update(bankAccountsTable).set({ balance: String(toNewBalance),   updatedAt: new Date() }).where(eq(bankAccountsTable.id, toAccountId));

    const mapTxn = (t: typeof fromTxn) => ({
      ...t,
      debit: Number(t.debit),
      credit: Number(t.credit),
      balance: Number(t.balance),
      matchConfidence: t.matchConfidence ? Number(t.matchConfidence) : null,
      journalId,
    });

    res.status(201).json({ fromTransaction: mapTxn(fromTxn), toTransaction: mapTxn(toTxn) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create bank transfer" });
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
