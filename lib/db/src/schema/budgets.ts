import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const budgetsTable = pgTable("budgets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fiscalYear: text("fiscal_year").notNull(),
  type: text("type").notNull().default("Departmental"),
  totalBudget: numeric("total_budget", { precision: 18, scale: 2 }).notNull().default("0"),
  totalActual: numeric("total_actual", { precision: 18, scale: 2 }).notNull().default("0"),
  utilizationPct: numeric("utilization_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const budgetLinesTable = pgTable("budget_lines", {
  id: serial("id").primaryKey(),
  budgetId: integer("budget_id").notNull().references(() => budgetsTable.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull(),
  accountName: text("account_name").notNull(),
  accountCode: text("account_code").notNull(),
  department: text("department"),
  annualAmount: numeric("annual_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  actualAmount: numeric("actual_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  alertLevel: text("alert_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetsTable.$inferSelect;
