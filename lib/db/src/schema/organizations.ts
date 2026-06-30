import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("trial"),            // trial | starter | professional | enterprise
  status: text("status").notNull().default("trial"),        // active | trial | suspended | cancelled
  maxUsers: integer("max_users").notNull().default(2),
  maxModules: integer("max_modules").notNull().default(5),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  gstin: text("gstin"),
  industry: text("industry"),
  city: text("city"),
  state: text("state"),
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly | annual
  mrr: integer("mrr").notNull().default(0),                 // monthly recurring revenue in rupees
  usersCount: integer("users_count").notNull().default(0),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  subscriptionStartedAt: timestamp("subscription_started_at", { withTimezone: true }),
  notes: text("notes"),
  emailConfigEnabled: boolean("email_config_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
