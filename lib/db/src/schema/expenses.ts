import { pgTable, serial, text, timestamp, boolean, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expenseClaimsTable = pgTable("expense_claims", {
  id: serial("id").primaryKey(),
  claimNo: text("claim_no").notNull().unique(),
  employeeId: integer("employee_id").notNull().default(1),
  employeeName: text("employee_name").notNull(),
  submittedDate: date("submitted_date", { mode: "string" }).notNull(),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  approvedAmount: numeric("approved_amount", { precision: 18, scale: 2 }),
  status: text("status").notNull().default("submitted"),
  currentApprover: text("current_approver"),
  policyViolations: integer("policy_violations").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const expenseLinesTable = pgTable("expense_lines", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull().references(() => expenseClaimsTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  category: text("category").notNull(),
  subCategory: text("sub_category"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("INR"),
  vendorName: text("vendor_name"),
  description: text("description").notNull(),
  receiptUrl: text("receipt_url"),
  gstAmount: numeric("gst_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  vendorGstin: text("vendor_gstin"),
  policyViolation: boolean("policy_violation").notNull().default(false),
  violationReason: text("violation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExpenseClaimSchema = createInsertSchema(expenseClaimsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseLineSchema = createInsertSchema(expenseLinesTable).omit({ id: true, createdAt: true });
export type InsertExpenseClaim = z.infer<typeof insertExpenseClaimSchema>;
export type ExpenseClaim = typeof expenseClaimsTable.$inferSelect;
export type ExpenseLine = typeof expenseLinesTable.$inferSelect;
