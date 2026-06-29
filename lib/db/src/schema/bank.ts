import { pgTable, serial, text, timestamp, boolean, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankAccountsTable = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  accountName: text("account_name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNo: text("account_no").notNull(),
  ifsc: text("ifsc").notNull(),
  accountType: text("account_type").notNull().default("Current"),
  branch: text("branch"),
  balance: numeric("balance", { precision: 18, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  lastReconciled: date("last_reconciled", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const bankTransactionsTable = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  bankAccountId: integer("bank_account_id").notNull().references(() => bankAccountsTable.id),
  date: date("date", { mode: "string" }).notNull(),
  description: text("description").notNull(),
  debit: numeric("debit", { precision: 18, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 18, scale: 2 }).notNull().default("0"),
  balance: numeric("balance", { precision: 18, scale: 2 }).notNull().default("0"),
  referenceNo: text("reference_no"),
  status: text("status").notNull().default("unreconciled"),
  matchedJournalId: integer("matched_journal_id"),
  matchConfidence: numeric("match_confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBankTransactionSchema = createInsertSchema(bankTransactionsTable).omit({ id: true, createdAt: true });
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccountsTable.$inferSelect;
export type BankTransaction = typeof bankTransactionsTable.$inferSelect;
