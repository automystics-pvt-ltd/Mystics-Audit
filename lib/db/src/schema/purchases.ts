import { pgTable, serial, text, timestamp, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNo: text("po_no").notNull().unique(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  vendorName: text("vendor_name").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  deliveryDate: date("delivery_date", { mode: "string" }),
  status: text("status").notNull().default("draft"),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  receivedAmount: numeric("received_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  billedAmount: numeric("billed_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const poLinesTable = pgTable("po_lines", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id"),
  description: text("description").notNull(),
  hsnSac: text("hsn_sac").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
  unit: text("unit").notNull().default("Nos"),
  rate: numeric("rate", { precision: 18, scale: 2 }).notNull().default("0"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  receivedQty: numeric("received_qty", { precision: 12, scale: 3 }).notNull().default("0"),
  billedQty: numeric("billed_qty", { precision: 12, scale: 3 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const grnsTable = pgTable("grns", {
  id: serial("id").primaryKey(),
  grnNo: text("grn_no").notNull().unique(),
  poId: integer("po_id").notNull().references(() => purchaseOrdersTable.id),
  poNo: text("po_no").notNull(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  vendorName: text("vendor_name").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("received"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const grnLinesTable = pgTable("grn_lines", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").notNull().references(() => grnsTable.id, { onDelete: "cascade" }),
  poLineId: integer("po_line_id").notNull().references(() => poLinesTable.id),
  description: text("description").notNull(),
  quantityOrdered: numeric("quantity_ordered", { precision: 12, scale: 3 }).notNull().default("0"),
  quantityReceived: numeric("quantity_received", { precision: 12, scale: 3 }).notNull().default("0"),
  unit: text("unit").notNull().default("Nos"),
  rate: numeric("rate", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGrnSchema = createInsertSchema(grnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type Grn = typeof grnsTable.$inferSelect;
