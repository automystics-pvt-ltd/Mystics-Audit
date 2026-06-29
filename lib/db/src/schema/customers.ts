import { pgTable, serial, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("Business"),
  gstin: text("gstin"),
  pan: text("pan"),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  whatsapp: text("whatsapp"),
  billingAddress: text("billing_address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  creditLimit: numeric("credit_limit", { precision: 18, scale: 2 }).notNull().default("0"),
  paymentTerms: text("payment_terms").notNull().default("30 days"),
  currency: text("currency").notNull().default("INR"),
  tdsCategory: text("tds_category"),
  customerGroup: text("customer_group"),
  openingBalance: numeric("opening_balance", { precision: 18, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
