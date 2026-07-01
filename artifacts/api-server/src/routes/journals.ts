import { Router } from "express";
import { db, journalEntriesTable, journalLinesTable, accountsTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const router = Router();

let voucherSeq = 0;
let voucherSeqInit = false;

async function initVoucherSeq() {
  if (voucherSeqInit) return;
  voucherSeqInit = true;
  try {
    const rows = await db.execute(
      "SELECT voucher_no FROM journal_entries WHERE voucher_no ~ '^[A-Z]+-[0-9]+$' ORDER BY id DESC LIMIT 1"
    );
    if (rows.rows.length > 0) {
      const parts = String(rows.rows[0].voucher_no).split("-");
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last)) voucherSeq = last;
    }
    if (voucherSeq < 9000) voucherSeq = 9000;
  } catch {
    voucherSeq = 9000;
  }
}

async function nextVoucherNo(type: string) {
  await initVoucherSeq();
  voucherSeq++;
  const prefix = type === "Payment" ? "PMT" : type === "Receipt" ? "RCT" : type === "Contra" ? "CNT" : "JV";
  return `${prefix}-${String(voucherSeq).padStart(6, "0")}`;
}

async function getJournalWithLines(id: number) {
  const [entry] = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.id, id));
  if (!entry) return null;
  const lines = await db
    .select({
      id: journalLinesTable.id,
      accountId: journalLinesTable.accountId,
      accountName: accountsTable.name,
      accountCode: accountsTable.code,
      debit: journalLinesTable.debit,
      credit: journalLinesTable.credit,
      narration: journalLinesTable.narration,
      partyName: journalLinesTable.partyName,
      costCenter: journalLinesTable.costCenter,
    })
    .from(journalLinesTable)
    .innerJoin(accountsTable, eq(journalLinesTable.accountId, accountsTable.id))
    .where(eq(journalLinesTable.journalId, id));

  return {
    ...entry,
    totalDebit: Number(entry.totalDebit),
    totalCredit: Number(entry.totalCredit),
    lines: lines.map(l => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) })),
  };
}

router.get("/journals", async (req, res) => {
  try {
    const { status, from, to } = req.query as Record<string, string>;
    let query = db.select().from(journalEntriesTable).$dynamic();
    const conditions = [];
    if (status) conditions.push(eq(journalEntriesTable.status, status));
    if (from) conditions.push(gte(journalEntriesTable.date, from));
    if (to) conditions.push(lte(journalEntriesTable.date, to));
    if (conditions.length) query = query.where(and(...conditions));

    const rows = await query.orderBy(desc(journalEntriesTable.createdAt)).limit(100);
    res.json(rows.map(r => ({
      ...r,
      totalDebit: Number(r.totalDebit),
      totalCredit: Number(r.totalCredit),
      lines: [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch journals" });
  }
});

router.post("/journals", async (req, res) => {
  try {
    const { voucherType, date, narration, lines } = req.body;
    if (!lines || lines.length < 2) {
      res.status(400).json({ error: "Journal must have at least two lines" }); return;
    }
    const totalDebit = lines.reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + Number(l.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    if (!isBalanced) {
      res.status(400).json({ error: `Journal is not balanced: debit ${totalDebit.toFixed(2)} ≠ credit ${totalCredit.toFixed(2)}` }); return;
    }

    const [entry] = await db.insert(journalEntriesTable).values({
      voucherNo: await nextVoucherNo(voucherType),
      voucherType,
      date,
      narration,
      status: "draft",
      totalDebit: String(totalDebit),
      totalCredit: String(totalCredit),
      isBalanced,
    }).returning();

    if (lines?.length) {
      const accountData = await db.select().from(accountsTable);
      const mappedLines = lines.map((l: any) => {
        const accountId = l.accountId
          ? Number(l.accountId)
          : accountData.find(a => a.code === l.accountCode)?.id;
        if (!accountId) return null;
        return {
          journalId: entry.id,
          accountId,
          debit: String(l.debit || 0),
          credit: String(l.credit || 0),
          narration: l.narration,
          partyName: l.partyName,
          costCenter: l.costCenter,
        };
      }).filter(Boolean);
      if (mappedLines.length) await db.insert(journalLinesTable).values(mappedLines);
    }

    const result = await getJournalWithLines(entry.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create journal" });
  }
});

router.get("/journals/:id", async (req, res) => {
  try {
    const result = await getJournalWithLines(Number(req.params.id));
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch journal" });
  }
});

router.post("/journals/:id/post", async (req, res) => {
  try {
    const [entry] = await db
      .update(journalEntriesTable)
      .set({ status: "posted", updatedAt: new Date() })
      .where(eq(journalEntriesTable.id, Number(req.params.id)))
      .returning();
    if (!entry) { res.status(404).json({ error: "Not found" }); return; }
    const result = await getJournalWithLines(entry.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to post journal" });
  }
});

router.post("/journals/:id/reverse", async (req, res) => {
  try {
    const original = await getJournalWithLines(Number(req.params.id));
    if (!original) { res.status(404).json({ error: "Not found" }); return; }

    const [reversal] = await db.insert(journalEntriesTable).values({
      voucherNo: await nextVoucherNo(original.voucherType),
      voucherType: original.voucherType,
      date: new Date().toISOString().split("T")[0],
      narration: `Reversal of ${original.voucherNo}`,
      status: "posted",
      totalDebit: String(original.totalCredit),
      totalCredit: String(original.totalDebit),
      isBalanced: original.isBalanced,
      reversalOf: original.id,
    }).returning();

    if (original.lines.length) {
      await db.insert(journalLinesTable).values(
        original.lines.map(l => ({
          journalId: reversal.id,
          accountId: l.accountId,
          debit: String(l.credit),
          credit: String(l.debit),
        }))
      );
    }

    const result = await getJournalWithLines(reversal.id);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reverse journal" });
  }
});

export default router;
