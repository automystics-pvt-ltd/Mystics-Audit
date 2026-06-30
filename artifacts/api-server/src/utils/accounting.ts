/**
 * Shared double-entry accounting helpers.
 * Every financial transaction (invoice post, receipt, bill post, payment)
 * must call createPostedJournal() so the GL is always up-to-date.
 */
import { db, journalEntriesTable, journalLinesTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let seq = 9000;
function nextVoucherNo(prefix: string) {
  seq++;
  return `${prefix}-${String(seq).padStart(6, "0")}`;
}

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  narration?: string;
  partyName?: string | null;
}

/**
 * Create a balanced, immediately-posted journal entry.
 * Throws if:
 *  - any account code is not found
 *  - the entry is not balanced (|totalDebit - totalCredit| >= 0.01)
 */
export async function createPostedJournal(opts: {
  voucherPrefix: string;       // "INV", "RCT", "BILL", "PMT", "JV"
  date: string;                // "YYYY-MM-DD"
  narration: string;
  lines: JournalLine[];
}) {
  const { voucherPrefix, date, narration, lines } = opts;

  // 1. Validate and resolve account IDs
  const allAccounts = await db.select({ id: accountsTable.id, code: accountsTable.code }).from(accountsTable);
  const codeMap = new Map(allAccounts.map(a => [a.code, a.id]));

  const resolvedLines = lines
    .filter(l => l.debit !== 0 || l.credit !== 0) // skip zero lines
    .map(l => {
      const accountId = codeMap.get(l.accountCode);
      if (!accountId) throw new Error(`GL account not found: ${l.accountCode}`);
      return {
        accountId,
        debit: round2(l.debit),
        credit: round2(l.credit),
        narration: l.narration,
        partyName: l.partyName,
      };
    });

  if (resolvedLines.length === 0) {
    throw new Error("Journal has no non-zero lines");
  }

  // 2. Validate balance
  const totalDebit  = resolvedLines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = resolvedLines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    throw new Error(
      `Journal is not balanced: DR ${totalDebit.toFixed(2)} ≠ CR ${totalCredit.toFixed(2)}`
    );
  }

  // 3. Insert journal entry (immediately posted)
  const [entry] = await db.insert(journalEntriesTable).values({
    voucherNo: nextVoucherNo(voucherPrefix),
    voucherType: voucherPrefix === "RCT" ? "Receipt"
      : voucherPrefix === "PMT" ? "Payment"
      : voucherPrefix === "INV" ? "Sales"
      : voucherPrefix === "BILL" ? "Purchase"
      : "Journal",
    date,
    narration,
    status: "posted",
    totalDebit: String(round2(totalDebit)),
    totalCredit: String(round2(totalCredit)),
    isBalanced: true,
  }).returning();

  // 4. Insert lines
  await db.insert(journalLinesTable).values(
    resolvedLines.map(l => ({
      journalId: entry.id,
      accountId: l.accountId,
      debit: String(l.debit),
      credit: String(l.credit),
      narration: l.narration ?? null,
      partyName: l.partyName ?? null,
    }))
  );

  return entry;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
