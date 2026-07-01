import { pgTable, serial, text, timestamp, boolean, numeric, integer, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expenseClaimsTable = pgTable("expense_claims", {
  id:                   serial("id").primaryKey(),
  claimNo:              text("claim_no").notNull().unique(),
  employeeId:           integer("employee_id").notNull().default(1),
  employeeName:         text("employee_name").notNull(),
  submittedDate:        date("submitted_date", { mode: "string" }).notNull(),
  totalAmount:          numeric("total_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  approvedAmount:       numeric("approved_amount", { precision: 18, scale: 2 }),
  status:               text("status").notNull().default("submitted"),
  project:              text("project"),
  department:           text("department"),
  branch:               text("branch"),
  costCenter:           text("cost_center"),
  clientName:           text("client_name"),
  currentApprover:      text("current_approver"),
  approvalLevel:        integer("approval_level").notNull().default(1),
  reviewedBy:           text("reviewed_by"),
  paymentMethod:        text("payment_method"),
  reimbursementStatus:  text("reimbursement_status").notNull().default("pending"),
  reimbursedAt:         timestamp("reimbursed_at", { withTimezone: true }),
  paidAt:               timestamp("paid_at", { withTimezone: true }),
  policyViolations:     integer("policy_violations").notNull().default(0),
  notes:                text("notes"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_expense_claims_status").on(t.status),
  index("idx_expense_claims_submitted_date").on(t.submittedDate),
  index("idx_expense_claims_employee_id").on(t.employeeId),
]);

export const expenseLinesTable = pgTable("expense_lines", {
  id:               serial("id").primaryKey(),
  claimId:          integer("claim_id").notNull().references(() => expenseClaimsTable.id, { onDelete: "cascade" }),
  date:             date("date", { mode: "string" }).notNull(),
  category:         text("category").notNull(),
  subCategory:      text("sub_category"),
  amount:           numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
  currency:         text("currency").notNull().default("INR"),
  vendorName:       text("vendor_name"),
  vendorGstin:      text("vendor_gstin"),
  description:      text("description").notNull(),
  receiptUrl:       text("receipt_url"),
  gstAmount:        numeric("gst_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  gstRate:          numeric("gst_rate", { precision: 5, scale: 2 }),
  hsnCode:          text("hsn_code"),
  billable:         boolean("billable").notNull().default(false),
  policyViolation:  boolean("policy_violation").notNull().default(false),
  violationReason:  text("violation_reason"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_expense_lines_claim_id").on(t.claimId),
]);

export const expenseApprovalLogsTable = pgTable("expense_approval_logs", {
  id:         serial("id").primaryKey(),
  claimId:    integer("claim_id").notNull().references(() => expenseClaimsTable.id, { onDelete: "cascade" }),
  level:      integer("level").notNull().default(1),
  action:     text("action").notNull(),
  actorName:  text("actor_name").notNull(),
  comment:    text("comment"),
  amount:     numeric("amount", { precision: 18, scale: 2 }),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_expense_approval_logs_claim_id").on(t.claimId),
]);

export const gstDocumentsTable = pgTable("gst_documents", {
  id:             serial("id").primaryKey(),
  docType:        text("doc_type").notNull(),
  docNo:          text("doc_no").notNull(),
  docDate:        date("doc_date", { mode: "string" }).notNull(),
  partyName:      text("party_name").notNull(),
  partyGstin:     text("party_gstin"),
  partyType:      text("party_type").notNull().default("supplier"),
  placeOfSupply:  text("place_of_supply"),
  taxableAmount:  numeric("taxable_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  cgst:           numeric("cgst", { precision: 18, scale: 2 }).notNull().default("0"),
  sgst:           numeric("sgst", { precision: 18, scale: 2 }).notNull().default("0"),
  igst:           numeric("igst", { precision: 18, scale: 2 }).notNull().default("0"),
  cess:           numeric("cess", { precision: 18, scale: 2 }).notNull().default("0"),
  total:          numeric("total", { precision: 18, scale: 2 }).notNull().default("0"),
  hsnCode:        text("hsn_code"),
  description:    text("description"),
  gstRate:        numeric("gst_rate", { precision: 5, scale: 2 }),
  period:         text("period"),
  filingStatus:   text("filing_status").notNull().default("unfiled"),
  linkedExpenseId: integer("linked_expense_id"),
  receiptUrl:     text("receipt_url"),
  notes:          text("notes"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_gst_documents_period").on(t.period),
  index("idx_gst_documents_filing_status").on(t.filingStatus),
]);

export const insertExpenseClaimSchema = createInsertSchema(expenseClaimsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseLineSchema = createInsertSchema(expenseLinesTable).omit({ id: true, createdAt: true });
export const insertGstDocumentSchema = createInsertSchema(gstDocumentsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertExpenseClaim = z.infer<typeof insertExpenseClaimSchema>;
export type ExpenseClaim = typeof expenseClaimsTable.$inferSelect;
export type ExpenseLine = typeof expenseLinesTable.$inferSelect;
export type GstDocument = typeof gstDocumentsTable.$inferSelect;
