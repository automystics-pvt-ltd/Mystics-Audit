import { pgTable, serial, text, timestamp, boolean, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const journalEntriesTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  voucherNo: text("voucher_no").notNull().unique(),
  voucherType: text("voucher_type").notNull().default("Journal"),
  date: date("date", { mode: "string" }).notNull(),
  narration: text("narration"),
  status: text("status").notNull().default("draft"),
  totalDebit: numeric("total_debit", { precision: 18, scale: 2 }).notNull().default("0"),
  totalCredit: numeric("total_credit", { precision: 18, scale: 2 }).notNull().default("0"),
  isBalanced: boolean("is_balanced").notNull().default(false),
  reversalOf: integer("reversal_of"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const journalLinesTable = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  journalId: integer("journal_id").notNull().references(() => journalEntriesTable.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => accountsTable.id),
  debit: numeric("debit", { precision: 18, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 18, scale: 2 }).notNull().default("0"),
  narration: text("narration"),
  partyName: text("party_name"),
  costCenter: text("cost_center"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJournalSchema = createInsertSchema(journalEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertJournalLineSchema = createInsertSchema(journalLinesTable).omit({ id: true, createdAt: true });
export type InsertJournal = z.infer<typeof insertJournalSchema>;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type JournalLine = typeof journalLinesTable.$inferSelect;
