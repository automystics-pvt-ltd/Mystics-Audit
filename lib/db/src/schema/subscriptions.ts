import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/* ── Subscriptions ────────────────────────────────────── */
export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  planSlug: text("plan_slug").notNull().default("trial"),   // trial | starter | professional | enterprise | custom
  status: text("status").notNull().default("trial"),         // trial | active | grace_period | suspended | cancelled | expired
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly | annual
  amount: integer("amount").notNull().default(0),            // rupees/period (excl. tax)
  taxRate: integer("tax_rate").notNull().default(18),        // GST %
  currency: text("currency").notNull().default("INR"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  trialStart: timestamp("trial_start", { withTimezone: true }),
  trialEnd: timestamp("trial_end", { withTimezone: true }),
  gracePeriodEnd: timestamp("grace_period_end", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  autoRenew: boolean("auto_renew").notNull().default(true),
  maxUsers: integer("max_users").notNull().default(2),
  maxModules: integer("max_modules").notNull().default(5),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── Payments ─────────────────────────────────────────── */
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id"),
  orgId: integer("org_id").notNull(),
  amount: integer("amount").notNull(),                       // rupees (excl. tax)
  tax: integer("tax").notNull().default(0),                  // GST amount
  total: integer("total").notNull(),                         // amount + tax
  currency: text("currency").notNull().default("INR"),
  method: text("method").notNull(),                          // upi | card | netbanking | wallet | qr | offline
  methodDetail: text("method_detail"),                       // e.g. "PhonePe UPI", "HDFC Net Banking"
  status: text("status").notNull().default("completed"),     // pending | completed | failed | refunded
  transactionId: text("transaction_id"),
  referenceId: text("reference_id"),
  description: text("description"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Platform Invoices ────────────────────────────────── */
export const platformInvoicesTable = pgTable("platform_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  orgId: integer("org_id").notNull(),
  orgName: text("org_name").notNull(),
  subscriptionId: integer("subscription_id"),
  paymentId: integer("payment_id"),
  amount: integer("amount").notNull(),                       // base
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("issued"),        // draft | issued | paid | void
  planLabel: text("plan_label"),
  billingCycle: text("billing_cycle"),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  billingName: text("billing_name"),
  billingEmail: text("billing_email"),
  billingGstin: text("billing_gstin"),
  billingAddress: text("billing_address"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export const insertPlatformInvoiceSchema = createInsertSchema(platformInvoicesTable).omit({ id: true, createdAt: true });

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type PlatformInvoice = typeof platformInvoicesTable.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
