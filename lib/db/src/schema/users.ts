import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id:                  serial("id").primaryKey(),
  name:                text("name").notNull(),
  email:               text("email").notNull().unique(),
  role:                text("role").notNull().default("Staff"),
  roleLevel:           integer("role_level").notNull().default(3),
  department:          text("department"),
  phone:               text("phone"),
  isActive:            boolean("is_active").notNull().default(true),
  isMfaEnabled:        boolean("is_mfa_enabled").notNull().default(false),
  lastLogin:           timestamp("last_login", { withTimezone: true }),
  orgId:               integer("org_id"),
  modulePermissions:   jsonb("module_permissions").$type<Record<string, string>>(),
  // Security & provisioning
  passwordHash:        text("password_hash"),
  tempPassword:        text("temp_password"),
  mustChangePassword:  boolean("must_change_password").notNull().default(true),
  isLocked:            boolean("is_locked").notNull().default(false),
  lockedAt:            timestamp("locked_at", { withTimezone: true }),
  lockedReason:        text("locked_reason"),
  loginAttempts:       integer("login_attempts").notNull().default(0),
  invitedBy:           text("invited_by"),
  invitedAt:           timestamp("invited_at", { withTimezone: true }),
  // License / tenant linkage
  tenantId:            integer("tenant_id"),
  licenseType:         text("license_type").notNull().default("named"),    // named | concurrent | admin
  lastPasswordChange:  timestamp("last_password_change", { withTimezone: true }),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditLogsTable = pgTable("audit_logs", {
  id:         serial("id").primaryKey(),
  userId:     integer("user_id").notNull().default(1),
  userName:   text("user_name").notNull(),
  userRole:   text("user_role").notNull(),
  actionType: text("action_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId:   integer("entity_id"),
  entityRef:  text("entity_ref"),
  ipAddress:  text("ip_address"),
  description:text("description").notNull(),
  timestamp:  timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Tenant Invitations ─────────────────────────────────── */
export const tenantInvitationsTable = pgTable("tenant_invitations", {
  id:          serial("id").primaryKey(),
  tenantId:    integer("tenant_id").notNull(),
  email:       text("email").notNull(),
  role:        text("role").notNull().default("Staff"),
  token:       text("token").notNull().unique(),
  invitedBy:   text("invited_by").notNull(),
  status:      text("status").notNull().default("pending"),   // pending | accepted | expired | revoked
  expiresAt:   timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt:  timestamp("accepted_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true });
export const insertInvitationSchema = createInsertSchema(tenantInvitationsTable).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type TenantInvitation = typeof tenantInvitationsTable.$inferSelect;
