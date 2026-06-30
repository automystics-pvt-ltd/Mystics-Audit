import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("Staff"),
  roleLevel: integer("role_level").notNull().default(3),
  department: text("department"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  isMfaEnabled: boolean("is_mfa_enabled").notNull().default(false),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  orgId: integer("org_id"),
  modulePermissions: jsonb("module_permissions").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  actionType: text("action_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  entityRef: text("entity_ref"),
  ipAddress: text("ip_address"),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
