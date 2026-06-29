import { pgTable, serial, text, timestamp, boolean, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const vendorBillsTable = pgTable("vendor_bills", {
  id: serial("id").primaryKey(),
  billNo: text("bill_no").notNull().unique(),
  vendorInvoiceNo: text("vendor_invoice_no"),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  vendorName: text("vendor_name").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  poId: integer("po_id"),
  grnId: integer("grn_id"),
  status: text("status").notNull().default("draft"),
  taxableAmount: numeric("taxable_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  cgst: numeric("cgst", { precision: 18, scale: 2 }).notNull().default("0"),
  sgst: numeric("sgst", { precision: 18, scale: 2 }).notNull().default("0"),
  igst: numeric("igst", { precision: 18, scale: 2 }).notNull().default("0"),
  tdsAmount: numeric("tds_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  isMsmeVendor: boolean("is_msme_vendor").notNull().default(false),
  msmeBreachDate: date("msme_breach_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const billLinesTable = pgTable("bill_lines", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => vendorBillsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  hsnSac: text("hsn_sac").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
  unit: text("unit").notNull().default("Nos"),
  rate: numeric("rate", { precision: 18, scale: 2 }).notNull().default("0"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  taxableValue: numeric("taxable_value", { precision: 18, scale: 2 }).notNull().default("0"),
  cgst: numeric("cgst", { precision: 18, scale: 2 }).notNull().default("0"),
  sgst: numeric("sgst", { precision: 18, scale: 2 }).notNull().default("0"),
  igst: numeric("igst", { precision: 18, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVendorBillSchema = createInsertSchema(vendorBillsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBillLineSchema = createInsertSchema(billLinesTable).omit({ id: true, createdAt: true });
export type InsertVendorBill = z.infer<typeof insertVendorBillSchema>;
export type VendorBill = typeof vendorBillsTable.$inferSelect;
export type BillLine = typeof billLinesTable.$inferSelect;
