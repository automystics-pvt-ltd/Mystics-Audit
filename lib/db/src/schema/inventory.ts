import { pgTable, serial, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  itemCode: text("item_code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull().default("Goods"),
  group: text("group"),
  hsnSac: text("hsn_sac").notNull(),
  unit: text("unit").notNull().default("Nos"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  purchaseRate: numeric("purchase_rate", { precision: 18, scale: 2 }),
  sellingRate: numeric("selling_rate", { precision: 18, scale: 2 }),
  mrp: numeric("mrp", { precision: 18, scale: 2 }),
  reorderLevel: numeric("reorder_level", { precision: 12, scale: 3 }),
  reorderQty: numeric("reorder_qty", { precision: 12, scale: 3 }),
  valuationMethod: text("valuation_method").notNull().default("FIFO"),
  currentStock: numeric("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  stockValue: numeric("stock_value", { precision: 18, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  isBatchTracked: boolean("is_batch_tracked").notNull().default(false),
  isSerialTracked: boolean("is_serial_tracked").notNull().default(false),
  isExpiryTracked: boolean("is_expiry_tracked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
