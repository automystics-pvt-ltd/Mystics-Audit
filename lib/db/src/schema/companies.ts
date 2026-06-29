import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name"),
  pan: text("pan"),
  cin: text("cin"),
  gstin: text("gstin"),
  companyType: text("company_type").notNull().default("Private Limited"),
  industry: text("industry"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  logoUrl: text("logo_url"),
  fiscalYearStart: text("fiscal_year_start").notNull().default("April"),
  gstFilingFrequency: text("gst_filing_frequency").notNull().default("Monthly"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
