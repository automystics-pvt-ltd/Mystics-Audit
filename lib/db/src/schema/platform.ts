import { pgTable, serial, text, timestamp, boolean, integer, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/* ── Tenants ─────────────────────────────────────────────
   The platform-level registry of all tenant organisations.
   Each row is one customer of the SaaS platform.          */
export const tenantsTable = pgTable("tenants", {
  id:              serial("id").primaryKey(),
  slug:            text("slug").notNull().unique(),             // url-safe identifier
  orgName:         text("org_name").notNull(),
  legalName:       text("legal_name"),
  gstin:           text("gstin"),
  pan:             text("pan"),
  industry:        text("industry"),
  companyType:     text("company_type").default("Private Limited"),
  contactName:     text("contact_name"),
  contactEmail:    text("contact_email").notNull(),
  contactPhone:    text("contact_phone"),
  city:            text("city"),
  state:           text("state"),
  country:         text("country").default("India"),
  plan:            text("plan").notNull().default("trial"),     // trial | starter | growth | professional | enterprise
  status:          text("status").notNull().default("trial"),   // trial | active | suspended | cancelled | expired | pending
  billingCycle:    text("billing_cycle").default("monthly"),
  mrr:             integer("mrr").default(0),                   // monthly recurring revenue in INR
  maxUsers:        integer("max_users").default(5),
  maxStorage:      integer("max_storage").default(5120),        // MB
  usedStorage:     integer("used_storage").default(0),          // MB
  activeUsers:     integer("active_users").default(0),
  totalUsers:      integer("total_users").default(0),
  enabledModules:  jsonb("enabled_modules").$type<string[]>().default([]),
  featureOverrides:jsonb("feature_overrides").$type<Record<string,boolean>>().default({}),
  customPricing:   jsonb("custom_pricing").$type<{
    enabled: boolean;
    plans: Record<string, { monthlyPrice: number; annualPrice: number }>;
  }>().default({ enabled: false, plans: {} }),
  adminEmail:      text("admin_email"),
  notes:           text("notes"),
  trialEnd:        timestamp("trial_end", { withTimezone: true }),
  renewalDate:     timestamp("renewal_date", { withTimezone: true }),
  suspendedAt:     timestamp("suspended_at", { withTimezone: true }),
  suspendReason:   text("suspend_reason"),
  lastActivity:    timestamp("last_activity", { withTimezone: true }),
  dataRegion:      text("data_region").default("ap-south-1"),
  isTest:          boolean("is_test").default(false),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── Platform Admin Users ───────────────────────────────── */
export const platformAdminUsersTable = pgTable("platform_admin_users", {
  id:             serial("id").primaryKey(),
  name:           text("name").notNull(),
  email:          text("email").notNull().unique(),
  role:           text("role").notNull().default("support"),    // super_admin | admin | support | billing | readonly
  passwordHash:   text("password_hash"),
  isActive:       boolean("is_active").notNull().default(true),
  isMfaEnabled:   boolean("is_mfa_enabled").notNull().default(false),
  mfaSecret:      text("mfa_secret"),
  lastLogin:      timestamp("last_login", { withTimezone: true }),
  lastLoginIp:    text("last_login_ip"),
  failedLogins:   integer("failed_logins").default(0),
  isLocked:       boolean("is_locked").default(false),
  lockedUntil:    timestamp("locked_until", { withTimezone: true }),
  permissions:    jsonb("permissions").$type<string[]>().default([]),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── Feature Flags ──────────────────────────────────────── */
export const featureFlagsTable = pgTable("feature_flags", {
  id:          serial("id").primaryKey(),
  key:         text("key").notNull().unique(),
  name:        text("name").notNull(),
  description: text("description"),
  category:    text("category").default("general"),            // general | billing | modules | security | beta
  enabled:     boolean("enabled").notNull().default(false),
  rolloutPct:  integer("rollout_pct").default(100),            // 0–100 rollout percentage
  tenantIds:   jsonb("tenant_ids").$type<number[]>().default([]), // empty = all tenants
  plans:       jsonb("plans").$type<string[]>().default([]),   // empty = all plans
  updatedBy:   text("updated_by"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── Platform Audit Logs ────────────────────────────────── */
export const platformAuditLogsTable = pgTable("platform_audit_logs", {
  id:          serial("id").primaryKey(),
  adminId:     integer("admin_id"),
  adminEmail:  text("admin_email").notNull(),
  adminRole:   text("admin_role").notNull(),
  action:      text("action").notNull(),                       // e.g. TENANT_SUSPEND, USER_CREATE
  entityType:  text("entity_type").notNull(),                  // tenant | user | subscription | feature_flag | setting
  entityId:    integer("entity_id"),
  entityRef:   text("entity_ref"),                             // human-readable ref
  detail:      jsonb("detail").$type<Record<string,unknown>>().default({}),
  ipAddress:   text("ip_address"),
  userAgent:   text("user_agent"),
  severity:    text("severity").default("info"),               // info | warning | critical
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── System Settings ────────────────────────────────────── */
export const systemSettingsTable = pgTable("system_settings", {
  id:          serial("id").primaryKey(),
  key:         text("key").notNull().unique(),
  value:       text("value"),
  valueJson:   jsonb("value_json"),
  category:    text("category").default("general"),
  label:       text("label"),
  description: text("description"),
  isSecret:    boolean("is_secret").default(false),
  updatedBy:   text("updated_by"),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── Email Settings (per-org SMTP configuration) ────────── */
export const emailSettingsTable = pgTable("email_settings", {
  id:            serial("id").primaryKey(),
  orgSlug:       text("org_slug").notNull().unique().default("default"),
  configAllowed: boolean("config_allowed").notNull().default(false),  // platform admin gate
  provider:      text("provider").notNull().default("gmail"),          // gmail | outlook | custom
  smtpHost:      text("smtp_host"),
  smtpPort:      integer("smtp_port").default(587),
  smtpUser:      text("smtp_user"),
  smtpPass:      text("smtp_pass"),
  smtpFrom:      text("smtp_from"),
  isVerified:    boolean("is_verified").notNull().default(false),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type EmailSettings = typeof emailSettingsTable.$inferSelect;

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlatformAdminUserSchema = createInsertSchema(platformAdminUsersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeatureFlagSchema = createInsertSchema(featureFlagsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlatformAuditLogSchema = createInsertSchema(platformAuditLogsTable).omit({ id: true, createdAt: true });

export type Tenant = typeof tenantsTable.$inferSelect;
export type PlatformAdminUser = typeof platformAdminUsersTable.$inferSelect;
export type FeatureFlag = typeof featureFlagsTable.$inferSelect;
export type PlatformAuditLog = typeof platformAuditLogsTable.$inferSelect;
export type SystemSetting = typeof systemSettingsTable.$inferSelect;
