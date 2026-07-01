import { pgTable, serial, text, timestamp, numeric, integer, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  receiptNo: text("receipt_no").notNull().unique(),
  date: date("date", { mode: "string" }).notNull(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  customerName: text("customer_name").notNull(),
  paymentMode: text("payment_mode").notNull().default("Bank Transfer"),
  grossAmount: numeric("gross_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  tdsDeducted: numeric("tds_deducted", { precision: 18, scale: 2 }).notNull().default("0"),
  settlementDiscount: numeric("settlement_discount", { precision: 18, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  bankAccountId: integer("bank_account_id").notNull(),
  bankAccountName: text("bank_account_name").notNull(),
  referenceNo: text("reference_no"),
  chequeNo: text("cheque_no"),
  chequeDate: date("cheque_date", { mode: "string" }),
  narration: text("narration"),
  status: text("status").notNull().default("posted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_receipts_customer_id").on(t.customerId),
  index("idx_receipts_date").on(t.date),
]);

export const receiptAllocationsTable = pgTable("receipt_allocations", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").notNull().references(() => receiptsTable.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").notNull(),
  invoiceNo: text("invoice_no").notNull(),
  allocatedAmount: numeric("allocated_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_receipt_allocations_receipt_id").on(t.receiptId),
  index("idx_receipt_allocations_invoice_id").on(t.invoiceId),
]);

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;
