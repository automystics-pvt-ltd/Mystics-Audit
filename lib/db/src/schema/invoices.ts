import { pgTable, serial, text, timestamp, boolean, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  type: text("type").notNull().default("Tax Invoice"),
  status: text("status").notNull().default("draft"),
  date: date("date", { mode: "string" }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  customerName: text("customer_name").notNull(),
  customerGstin: text("customer_gstin"),
  placeOfSupply: text("place_of_supply").notNull().default("Maharashtra"),
  taxableAmount: numeric("taxable_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  cgst: numeric("cgst", { precision: 18, scale: 2 }).notNull().default("0"),
  sgst: numeric("sgst", { precision: 18, scale: 2 }).notNull().default("0"),
  igst: numeric("igst", { precision: 18, scale: 2 }).notNull().default("0"),
  tcs: numeric("tcs", { precision: 18, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  irn: text("irn"),
  ewbNo: text("ewb_no"),
  poReference: text("po_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const invoiceLinesTable = pgTable("invoice_lines", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id"),
  description: text("description").notNull(),
  hsnSac: text("hsn_sac").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
  unit: text("unit").notNull().default("Nos"),
  rate: numeric("rate", { precision: 18, scale: 2 }).notNull().default("0"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  taxableValue: numeric("taxable_value", { precision: 18, scale: 2 }).notNull().default("0"),
  cgst: numeric("cgst", { precision: 18, scale: 2 }).notNull().default("0"),
  sgst: numeric("sgst", { precision: 18, scale: 2 }).notNull().default("0"),
  igst: numeric("igst", { precision: 18, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceLineSchema = createInsertSchema(invoiceLinesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
export type InvoiceLine = typeof invoiceLinesTable.$inferSelect;
