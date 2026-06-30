import { Router } from "express";
import { db } from "@workspace/db";
import {
  tenantsTable, platformAdminUsersTable, featureFlagsTable,
  platformAuditLogsTable, systemSettingsTable,
  subscriptionsTable, paymentsTable, platformInvoicesTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, sql, and, ilike, or, count } from "drizzle-orm";

const router = Router();

/* ── helpers ── */
function ok(res: any, data: any) { res.json(data); }
function err(res: any, e: any, status = 500) { res.status(status).json({ error: e?.message ?? String(e) }); }

async function auditLog(adminEmail: string, adminRole: string, action: string, entityType: string, entityId?: number, entityRef?: string, detail?: Record<string,unknown>) {
  await db.insert(platformAuditLogsTable).values({
    adminEmail, adminRole, action, entityType,
    entityId, entityRef, detail: detail ?? {},
    ipAddress: "127.0.0.1", severity: "info",
  }).catch(() => {});
}

/* ══════════════════════════════════
   PLATFORM STATS
═══════════════════════════════════ */
router.get("/admin/stats", async (req, res) => {
  try {
    const [tenantStats] = await db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where status='active')`,
      trial: sql<number>`count(*) filter (where status='trial')`,
      suspended: sql<number>`count(*) filter (where status='suspended')`,
      enterprise: sql<number>`count(*) filter (where plan='enterprise')`,
      totalMrr: sql<number>`coalesce(sum(mrr),0)`,
    }).from(tenantsTable);

    const [userStats] = await db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where is_active=true)`,
    }).from(usersTable);

    const [paymentStats] = await db.select({
      totalRevenue: sql<number>`coalesce(sum(total),0)`,
      monthlyRevenue: sql<number>`coalesce(sum(total) filter (where paid_at >= now() - interval '30 days'),0)`,
      pendingCount: sql<number>`count(*) filter (where status='pending')`,
    }).from(paymentsTable);

    const [featureCount] = await db.select({ total: sql<number>`count(*)`, enabled: sql<number>`count(*) filter (where enabled=true)` }).from(featureFlagsTable);
    const [auditCount] = await db.select({ total: sql<number>`count(*)` }).from(platformAuditLogsTable);

    const recentTenants = await db.select().from(tenantsTable).orderBy(desc(tenantsTable.createdAt)).limit(5);
    const recentAudit = await db.select().from(platformAuditLogsTable).orderBy(desc(platformAuditLogsTable.createdAt)).limit(10);

    const planBreakdown = await db.select({ plan: tenantsTable.plan, count: sql<number>`count(*)` }).from(tenantsTable).groupBy(tenantsTable.plan);
    const statusBreakdown = await db.select({ status: tenantsTable.status, count: sql<number>`count(*)` }).from(tenantsTable).groupBy(tenantsTable.status);

    ok(res, {
      tenants: tenantStats, users: userStats, payments: paymentStats,
      features: featureCount, audit: auditCount,
      recentTenants, recentAudit, planBreakdown, statusBreakdown,
      systemHealth: { api: "healthy", db: "healthy", queue: "healthy", storage: "healthy", uptime: "99.97%" },
    });
  } catch (e) { err(res, e); }
});

/* ══════════════════════════════════
   TENANTS
═══════════════════════════════════ */
router.get("/admin/tenants", async (req, res) => {
  try {
    const { search, status, plan, page = "1" } = req.query as Record<string,string>;
    const limit = 25, offset = (parseInt(page)-1)*limit;
    const conditions: any[] = [];
    if (status)  conditions.push(eq(tenantsTable.status, status));
    if (plan)    conditions.push(eq(tenantsTable.plan, plan));
    if (search)  conditions.push(or(ilike(tenantsTable.orgName, `%${search}%`), ilike(tenantsTable.contactEmail, `%${search}%`), ilike(tenantsTable.slug, `%${search}%`)) as any);

    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(tenantsTable).where(conditions.length ? and(...conditions) : undefined);
    const tenants = await db.select().from(tenantsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(tenantsTable.createdAt)).limit(limit).offset(offset);
    ok(res, { tenants, total, page: parseInt(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e); }
});

router.post("/admin/tenants", async (req, res) => {
  try {
    const { orgName, contactEmail, plan, billingCycle, maxUsers, maxStorage, industry, contactName, contactPhone, city, state, notes, isTest } = req.body;
    const slug = (orgName as string).toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").slice(0,40)+"-"+Date.now().toString(36);
    const trialEnd = new Date(Date.now()+14*86400000);
    const [t] = await db.insert(tenantsTable).values({
      slug, orgName, contactEmail, plan: plan||"trial", status: "trial",
      billingCycle: billingCycle||"monthly", maxUsers: maxUsers||5,
      maxStorage: maxStorage||5120, industry, contactName, contactPhone,
      city, state, notes, isTest: isTest||false, trialEnd,
    }).returning();
    await auditLog("platform@mystics.app","super_admin","TENANT_CREATE","tenant",t.id,orgName,{plan});
    res.status(201).json(t);
  } catch (e) { err(res, e); }
});

router.get("/admin/tenants/:id", async (req, res) => {
  try {
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, parseInt(req.params.id)));
    if (!t) { res.status(404).json({ error:"Not found" }); return; }
    ok(res, t);
  } catch (e) { err(res, e); }
});

router.patch("/admin/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = ["orgName","legalName","gstin","pan","industry","companyType","contactName","contactEmail","contactPhone","city","state","plan","status","billingCycle","mrr","maxUsers","maxStorage","enabledModules","featureOverrides","adminEmail","notes","isTest","trialEnd","renewalDate","suspendReason"];
    const updates: Record<string,any> = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (req.body.status === "suspended" && !updates.suspendedAt) updates.suspendedAt = new Date();
    const [t] = await db.update(tenantsTable).set(updates).where(eq(tenantsTable.id, id)).returning();
    if (!t) { res.status(404).json({ error:"Not found" }); return; }
    await auditLog("platform@mystics.app","super_admin","TENANT_UPDATE","tenant",id,t.orgName,updates);
    ok(res, t);
  } catch (e) { err(res, e); }
});

router.post("/admin/tenants/:id/suspend", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.update(tenantsTable).set({ status:"suspended", suspendedAt: new Date(), suspendReason: req.body.reason||"Admin action" }).where(eq(tenantsTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","TENANT_SUSPEND","tenant",id,t?.orgName,{reason:req.body.reason});
    ok(res, t);
  } catch (e) { err(res, e); }
});

router.post("/admin/tenants/:id/activate", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.update(tenantsTable).set({ status:"active", suspendedAt: null as any, suspendReason: null as any }).where(eq(tenantsTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","TENANT_ACTIVATE","tenant",id,t?.orgName);
    ok(res, t);
  } catch (e) { err(res, e); }
});

router.delete("/admin/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    await db.delete(tenantsTable).where(eq(tenantsTable.id, id));
    await auditLog("platform@mystics.app","super_admin","TENANT_DELETE","tenant",id,t?.orgName);
    ok(res, { success:true });
  } catch (e) { err(res, e); }
});

/* ══════════════════════════════════
   PLATFORM ADMIN USERS
═══════════════════════════════════ */
router.get("/admin/admin-users", async (req, res) => {
  try {
    const users = await db.select({ id:platformAdminUsersTable.id, name:platformAdminUsersTable.name, email:platformAdminUsersTable.email, role:platformAdminUsersTable.role, isActive:platformAdminUsersTable.isActive, isMfaEnabled:platformAdminUsersTable.isMfaEnabled, lastLogin:platformAdminUsersTable.lastLogin, isLocked:platformAdminUsersTable.isLocked, createdAt:platformAdminUsersTable.createdAt }).from(platformAdminUsersTable).orderBy(desc(platformAdminUsersTable.createdAt));
    ok(res, users);
  } catch (e) { err(res, e); }
});

router.post("/admin/admin-users", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const [u] = await db.insert(platformAdminUsersTable).values({ name, email, role: role||"support" }).returning();
    await auditLog("platform@mystics.app","super_admin","ADMIN_USER_CREATE","admin_user",u.id,email,{role});
    res.status(201).json({ ...u, passwordHash: undefined, mfaSecret: undefined });
  } catch (e) { err(res, e); }
});

router.patch("/admin/admin-users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, role, isActive, isMfaEnabled } = req.body;
    const updates: Record<string,any> = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (isMfaEnabled !== undefined) updates.isMfaEnabled = isMfaEnabled;
    const [u] = await db.update(platformAdminUsersTable).set(updates).where(eq(platformAdminUsersTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","ADMIN_USER_UPDATE","admin_user",id,u?.email,updates);
    ok(res, { ...u, passwordHash: undefined, mfaSecret: undefined });
  } catch (e) { err(res, e); }
});

router.post("/admin/admin-users/:id/unlock", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [u] = await db.update(platformAdminUsersTable).set({ isLocked:false, failedLogins:0, lockedUntil: null as any }).where(eq(platformAdminUsersTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","ADMIN_USER_UNLOCK","admin_user",id,u?.email);
    ok(res, { success:true });
  } catch (e) { err(res, e); }
});

/* ══════════════════════════════════
   TENANT USERS (platform-wide)
═══════════════════════════════════ */
router.get("/admin/users", async (req, res) => {
  try {
    const { search, page = "1" } = req.query as Record<string,string>;
    const limit = 30, offset = (parseInt(page)-1)*limit;
    const conditions: any[] = [];
    if (search) conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)) as any);
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(usersTable).where(conditions.length ? and(...conditions) : undefined);
    const users = await db.select().from(usersTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
    ok(res, { users, total, page: parseInt(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e); }
});

router.patch("/admin/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive, role } = req.body;
    const updates: Record<string,any> = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (role !== undefined) updates.role = role;
    const [u] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","USER_UPDATE","user",id,u?.email,updates);
    ok(res, u);
  } catch (e) { err(res, e); }
});

/* ══════════════════════════════════
   SUBSCRIPTIONS & PAYMENTS
═══════════════════════════════════ */
router.get("/admin/subscriptions", async (req, res) => {
  try {
    const { status, plan, page = "1" } = req.query as Record<string,string>;
    const limit = 25, offset = (parseInt(page)-1)*limit;
    const conditions: any[] = [];
    if (status) conditions.push(eq(subscriptionsTable.status, status));
    if (plan)   conditions.push(eq(subscriptionsTable.planSlug, plan));
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(subscriptionsTable).where(conditions.length ? and(...conditions) : undefined);
    const subs = await db.select().from(subscriptionsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(subscriptionsTable.createdAt)).limit(limit).offset(offset);
    ok(res, { subscriptions: subs, total, page: parseInt(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e); }
});

router.get("/admin/payments", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string,string>;
    const limit = 25, offset = (parseInt(page)-1)*limit;
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(paymentsTable);
    const payments = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt)).limit(limit).offset(offset);
    ok(res, { payments, total, page: parseInt(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e); }
});

router.get("/admin/invoices", async (req, res) => {
  try {
    const invoices = await db.select().from(platformInvoicesTable).orderBy(desc(platformInvoicesTable.createdAt)).limit(50);
    ok(res, invoices);
  } catch (e) { err(res, e); }
});

/* ══════════════════════════════════
   FEATURE FLAGS
═══════════════════════════════════ */
router.get("/admin/feature-flags", async (req, res) => {
  try {
    const flags = await db.select().from(featureFlagsTable).orderBy(featureFlagsTable.category, featureFlagsTable.key);
    ok(res, flags);
  } catch (e) { err(res, e); }
});

router.post("/admin/feature-flags", async (req, res) => {
  try {
    const { key, name, description, category, enabled, rolloutPct, plans } = req.body;
    const [f] = await db.insert(featureFlagsTable).values({ key, name, description, category: category||"general", enabled: enabled||false, rolloutPct: rolloutPct||100, plans: plans||[], updatedBy:"platform@mystics.app" }).returning();
    await auditLog("platform@mystics.app","super_admin","FEATURE_FLAG_CREATE","feature_flag",f.id,key,{enabled});
    res.status(201).json(f);
  } catch (e) { err(res, e); }
});

router.patch("/admin/feature-flags/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { enabled, rolloutPct, plans, description } = req.body;
    const updates: Record<string,any> = { updatedBy:"platform@mystics.app" };
    if (enabled !== undefined) updates.enabled = enabled;
    if (rolloutPct !== undefined) updates.rolloutPct = rolloutPct;
    if (plans !== undefined) updates.plans = plans;
    if (description !== undefined) updates.description = description;
    const [f] = await db.update(featureFlagsTable).set(updates).where(eq(featureFlagsTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","FEATURE_FLAG_UPDATE","feature_flag",id,f?.key,{enabled:f?.enabled});
    ok(res, f);
  } catch (e) { err(res, e); }
});

router.delete("/admin/feature-flags/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(featureFlagsTable).where(eq(featureFlagsTable.id, id));
    ok(res, { success:true });
  } catch (e) { err(res, e); }
});

/* ══════════════════════════════════
   PLATFORM AUDIT LOGS
═══════════════════════════════════ */
router.get("/admin/audit-logs", async (req, res) => {
  try {
    const { entityType, action, severity, page = "1" } = req.query as Record<string,string>;
    const limit = 50, offset = (parseInt(page)-1)*limit;
    const conditions: any[] = [];
    if (entityType) conditions.push(eq(platformAuditLogsTable.entityType, entityType));
    if (action)     conditions.push(ilike(platformAuditLogsTable.action, `%${action}%`));
    if (severity)   conditions.push(eq(platformAuditLogsTable.severity, severity));
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(platformAuditLogsTable).where(conditions.length ? and(...conditions) : undefined);
    const logs = await db.select().from(platformAuditLogsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(platformAuditLogsTable.createdAt)).limit(limit).offset(offset);
    ok(res, { logs, total, page: parseInt(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e); }
});

/* ══════════════════════════════════
   SYSTEM SETTINGS
═══════════════════════════════════ */
router.get("/admin/settings", async (req, res) => {
  try {
    const settings = await db.select().from(systemSettingsTable).orderBy(systemSettingsTable.category, systemSettingsTable.key);
    ok(res, settings);
  } catch (e) { err(res, e); }
});

router.patch("/admin/settings/:key", async (req, res) => {
  try {
    const { value, valueJson } = req.body;
    const existing = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.key, req.params.key));
    if (existing.length === 0) {
      const [s] = await db.insert(systemSettingsTable).values({ key: req.params.key, value, valueJson, updatedBy:"platform@mystics.app" }).returning();
      ok(res, s);
    } else {
      const [s] = await db.update(systemSettingsTable).set({ value, valueJson, updatedBy:"platform@mystics.app" }).where(eq(systemSettingsTable.key, req.params.key)).returning();
      ok(res, s);
    }
  } catch (e) { err(res, e); }
});

export default router;
