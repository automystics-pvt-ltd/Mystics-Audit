import { Router } from "express";
import { db } from "@workspace/db";
import {
  tenantsTable, platformAdminUsersTable, featureFlagsTable,
  platformAuditLogsTable, systemSettingsTable,
  subscriptionsTable, paymentsTable, platformInvoicesTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, sql, and, ilike, or, count, inArray } from "drizzle-orm";
import { PLAN_DEFS, genTempPassword } from "../lib/plans";

const router = Router();

function ok(res: any, data: any) { res.json(data); }
function err(res: any, e: any, status = 500) { res.status(status).json({ error: e?.message ?? String(e) }); }

// ── Admin auth ────────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@mystics.app";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@1234";
// Simple static token — sufficient for an internal admin portal
const ADMIN_TOKEN    = `mystics-admin-${Buffer.from(ADMIN_EMAIL).toString("base64")}`;

router.post("/admin/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  res.json({ token: ADMIN_TOKEN, admin: { email: ADMIN_EMAIL, name: "Super Admin", role: "superadmin" } });
});

router.post("/admin/auth/logout", (_req, res) => {
  res.json({ success: true });
});

router.get("/admin/auth/me", (req, res) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== ADMIN_TOKEN) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json({ email: ADMIN_EMAIL, name: "Super Admin", role: "superadmin" });
});

async function auditLog(adminEmail: string, adminRole: string, action: string, entityType: string, entityId?: number, entityRef?: string, detail?: Record<string,unknown>) {
  await db.insert(platformAuditLogsTable).values({
    adminEmail, adminRole, action, entityType,
    entityId, entityRef, detail: detail ?? {},
    ipAddress: "127.0.0.1", severity: "info",
  }).catch(() => {});
}

/* ══════════════════════════════════
   PLAN DEFINITIONS
═══════════════════════════════════ */
router.get("/admin/plans", (_req, res) => {
  ok(res, Object.entries(PLAN_DEFS).map(([slug, p]) => ({ slug, ...p })));
});

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
      locked: sql<number>`count(*) filter (where is_locked=true)`,
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
   TENANTS — list / create
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

    // Attach user counts per tenant
    const ids = tenants.map(t => t.id);
    let userCounts: Record<number, number> = {};
    if (ids.length) {
      const uc = await db.select({ orgId: usersTable.orgId, cnt: sql<number>`count(*)` }).from(usersTable).where(inArray(usersTable.orgId, ids)).groupBy(usersTable.orgId);
      userCounts = Object.fromEntries(uc.map(r => [r.orgId!, r.cnt]));
    }

    ok(res, { tenants: tenants.map(t => ({ ...t, currentUsers: userCounts[t.id] ?? 0 })), total, page: parseInt(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e); }
});

router.post("/admin/tenants", async (req, res) => {
  try {
    const { orgName, contactEmail, plan = "trial", billingCycle = "monthly", maxUsers, maxStorage, industry, contactName, contactPhone, city, state, notes, isTest } = req.body;
    const planDef = PLAN_DEFS[plan] ?? PLAN_DEFS.trial;
    const slug = (orgName as string).toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").slice(0,40)+"-"+Date.now().toString(36);
    const trialEnd = new Date(Date.now()+14*86400000);
    const [t] = await db.insert(tenantsTable).values({
      slug, orgName, contactEmail, plan, status: "trial",
      billingCycle, maxUsers: maxUsers ?? planDef.maxUsers,
      maxStorage: maxStorage ?? planDef.maxStorage,
      enabledModules: planDef.modules as string[],
      industry, contactName, contactPhone, city, state, notes, isTest: isTest||false, trialEnd,
    }).returning();
    await auditLog("platform@mystics.app","super_admin","TENANT_CREATE","tenant",t.id,orgName,{plan});
    res.status(201).json({ ...t, currentUsers: 0 });
  } catch (e) { err(res, e); }
});

/* ── Tenant detail ── */
router.get("/admin/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    if (!t) { res.status(404).json({ error:"Not found" }); return; }
    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.orgId, id));
    const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.orgId, id)).orderBy(desc(subscriptionsTable.createdAt)).limit(1);
    ok(res, { ...t, currentUsers: cnt, subscription: sub ?? null });
  } catch (e) { err(res, e); }
});

router.patch("/admin/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = ["orgName","legalName","gstin","pan","industry","companyType","contactName","contactEmail","contactPhone","city","state","plan","status","billingCycle","mrr","maxUsers","maxStorage","enabledModules","featureOverrides","adminEmail","notes","isTest","trialEnd","renewalDate","suspendReason"];
    const updates: Record<string,any> = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (req.body.status === "suspended" && !updates.suspendedAt) updates.suspendedAt = new Date();
    if (req.body.status === "active") { updates.suspendedAt = null; updates.suspendReason = null; }
    // Sync plan limits if plan changed
    if (req.body.plan && PLAN_DEFS[req.body.plan] && !req.body.maxUsers) {
      updates.maxUsers = PLAN_DEFS[req.body.plan].maxUsers;
      updates.enabledModules = PLAN_DEFS[req.body.plan].modules;
    }
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
    // Lock all tenant users
    await db.update(usersTable).set({ isLocked:true, lockedAt: new Date(), lockedReason:"Tenant suspended" }).where(eq(usersTable.orgId, id));
    await auditLog("platform@mystics.app","super_admin","TENANT_SUSPEND","tenant",id,t?.orgName,{reason:req.body.reason});
    ok(res, t);
  } catch (e) { err(res, e); }
});

router.post("/admin/tenants/:id/activate", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.update(tenantsTable).set({ status:"active", suspendedAt: null as any, suspendReason: null as any }).where(eq(tenantsTable.id, id)).returning();
    // Unlock all tenant users that were locked due to suspension
    await db.update(usersTable).set({ isLocked:false, lockedAt: null as any, lockedReason: null as any }).where(and(eq(usersTable.orgId, id), eq(usersTable.lockedReason, "Tenant suspended")));
    await auditLog("platform@mystics.app","super_admin","TENANT_ACTIVATE","tenant",id,t?.orgName);
    ok(res, t);
  } catch (e) { err(res, e); }
});

router.delete("/admin/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    await db.delete(usersTable).where(eq(usersTable.orgId, id));
    await db.delete(tenantsTable).where(eq(tenantsTable.id, id));
    await auditLog("platform@mystics.app","super_admin","TENANT_DELETE","tenant",id,t?.orgName);
    ok(res, { success:true });
  } catch (e) { err(res, e); }
});

/* ── Tenant license ── */
router.get("/admin/tenants/:id/license", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    if (!t) { res.status(404).json({ error:"Not found" }); return; }
    const [{ total, active, locked }] = await db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where is_active=true and is_locked=false)`,
      locked: sql<number>`count(*) filter (where is_locked=true)`,
    }).from(usersTable).where(eq(usersTable.orgId, id));
    const planDef = PLAN_DEFS[t.plan] ?? PLAN_DEFS.trial;
    ok(res, {
      maxUsers: t.maxUsers ?? 0, currentUsers: total, activeUsers: active, lockedUsers: locked,
      availableSeats: Math.max(0, (t.maxUsers ?? 0) - total),
      utilization: (t.maxUsers ?? 0) > 0 ? Math.round((total / (t.maxUsers ?? 1)) * 100) : 0,
      plan: t.plan, planName: planDef.name,
      enabledModules: t.enabledModules ?? planDef.modules,
      allModules: Object.keys(PLAN_DEFS.enterprise.modules.reduce((a:any,m)=>{a[m]=1;return a},{})),
    });
  } catch (e) { err(res, e); }
});

router.patch("/admin/tenants/:id/license", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { maxUsers } = req.body;
    const [t] = await db.update(tenantsTable).set({ maxUsers }).where(eq(tenantsTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","LICENSE_UPDATE","tenant",id,t?.orgName,{maxUsers});
    ok(res, { maxUsers: t?.maxUsers });
  } catch (e) { err(res, e); }
});

router.patch("/admin/tenants/:id/modules", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { enabledModules } = req.body;
    const [t] = await db.update(tenantsTable).set({ enabledModules }).where(eq(tenantsTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","MODULE_ACCESS_UPDATE","tenant",id,t?.orgName,{enabledModules});
    ok(res, { enabledModules: t?.enabledModules });
  } catch (e) { err(res, e); }
});

/* ── Tenant users ── */
router.get("/admin/tenants/:id/users", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    if (!t) { res.status(404).json({ error:"Not found" }); return; }
    const users = await db.select().from(usersTable).where(eq(usersTable.orgId, id)).orderBy(desc(usersTable.createdAt));
    ok(res, { users, maxUsers: t.maxUsers ?? 0, currentUsers: users.length });
  } catch (e) { err(res, e); }
});

router.post("/admin/tenants/:id/users", async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!t) { res.status(404).json({ error:"Tenant not found" }); return; }

    const maxU = t.maxUsers ?? 0;
    // License check
    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.orgId, tenantId));
    if (maxU > 0 && cnt >= maxU) {
      res.status(422).json({ error: `License limit reached. This tenant is licensed for ${maxU} users and currently has ${cnt}. Upgrade the plan or increase the user limit.` });
      return;
    }

    const { name, email, role = "Staff", department, phone, modulePermissions } = req.body;
    const tempPass = genTempPassword();
    const roleLevel: Record<string,number> = { "Super Admin":1,"Admin":2,"Manager":3,"Accountant":4,"Staff":5,"Viewer":6 };

    const [u] = await db.insert(usersTable).values({
      name, email, role, roleLevel: roleLevel[role]||5, department, phone,
      orgId: tenantId, tenantId, isActive: true,
      tempPassword: tempPass, mustChangePassword: true,
      invitedBy: "platform@mystics.app", invitedAt: new Date(),
      modulePermissions: modulePermissions ?? null,
    }).returning();

    await auditLog("platform@mystics.app","super_admin","USER_PROVISION","user",u.id,email,{tenantId,role});
    ok(res, { ...u, tempPassword: tempPass });
  } catch (e) { err(res, e); }
});

/* ══════════════════════════════════
   PLATFORM-WIDE USER MANAGEMENT
═══════════════════════════════════ */
router.get("/admin/users", async (req, res) => {
  try {
    const { search, tenantId, status, page = "1" } = req.query as Record<string,string>;
    const limit = 30, offset = (parseInt(page)-1)*limit;
    const conditions: any[] = [];
    if (search) conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)) as any);
    if (tenantId) conditions.push(eq(usersTable.orgId, parseInt(tenantId)));
    if (status === "active") conditions.push(and(eq(usersTable.isActive, true), eq(usersTable.isLocked, false)) as any);
    if (status === "inactive") conditions.push(eq(usersTable.isActive, false));
    if (status === "locked") conditions.push(eq(usersTable.isLocked, true));

    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(usersTable).where(conditions.length ? and(...conditions) : undefined);
    const users = await db.select().from(usersTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);

    // Attach tenant names
    const orgIds = [...new Set(users.map(u => u.orgId).filter(Boolean))] as number[];
    let tenantMap: Record<number, string> = {};
    if (orgIds.length) {
      const ts = await db.select({ id: tenantsTable.id, orgName: tenantsTable.orgName }).from(tenantsTable).where(inArray(tenantsTable.id, orgIds));
      tenantMap = Object.fromEntries(ts.map(t => [t.id, t.orgName]));
    }

    ok(res, {
      users: users.map(u => ({ ...u, tenantName: u.orgId ? tenantMap[u.orgId] : null })),
      total, page: parseInt(page), pages: Math.ceil(total/limit),
    });
  } catch (e) { err(res, e); }
});

router.patch("/admin/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive, role, department, modulePermissions, licenseType } = req.body;
    const updates: Record<string,any> = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (role !== undefined) { updates.role = role; const rl: any = {"Super Admin":1,"Admin":2,"Manager":3,"Accountant":4,"Staff":5,"Viewer":6}; updates.roleLevel = rl[role]||5; }
    if (department !== undefined) updates.department = department;
    if (modulePermissions !== undefined) updates.modulePermissions = modulePermissions;
    if (licenseType !== undefined) updates.licenseType = licenseType;
    const [u] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","USER_UPDATE","user",id,u?.email,updates);
    ok(res, u);
  } catch (e) { err(res, e); }
});

router.post("/admin/users/:id/lock", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [u] = await db.update(usersTable).set({ isLocked:true, lockedAt: new Date(), lockedReason: req.body.reason||"Admin action", isActive:false }).where(eq(usersTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","USER_LOCK","user",id,u?.email,{reason:req.body.reason});
    ok(res, { success:true });
  } catch (e) { err(res, e); }
});

router.post("/admin/users/:id/unlock", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [u] = await db.update(usersTable).set({ isLocked:false, lockedAt: null as any, lockedReason: null as any, loginAttempts:0, isActive:true }).where(eq(usersTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","USER_UNLOCK","user",id,u?.email);
    ok(res, { success:true });
  } catch (e) { err(res, e); }
});

router.post("/admin/users/:id/reset-password", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tempPass = genTempPassword();
    const [u] = await db.update(usersTable).set({ tempPassword: tempPass, mustChangePassword:true, loginAttempts:0, isLocked:false, lockedAt: null as any }).where(eq(usersTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","PASSWORD_RESET","user",id,u?.email);
    ok(res, { tempPassword: tempPass });
  } catch (e) { err(res, e); }
});

router.patch("/admin/users/:id/modules", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { modulePermissions } = req.body;
    const [u] = await db.update(usersTable).set({ modulePermissions }).where(eq(usersTable.id, id)).returning();
    await auditLog("platform@mystics.app","super_admin","USER_MODULE_UPDATE","user",id,u?.email,{modulePermissions});
    ok(res, { modulePermissions: u?.modulePermissions });
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
   SUBSCRIPTIONS & BILLING
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

    // Attach tenant names
    const orgIds = [...new Set(subs.map(s => s.orgId))];
    let tenantMap: Record<number, string> = {};
    if (orgIds.length) {
      const ts = await db.select({ id: tenantsTable.id, orgName: tenantsTable.orgName }).from(tenantsTable).where(inArray(tenantsTable.id, orgIds));
      tenantMap = Object.fromEntries(ts.map(t => [t.id, t.orgName]));
    }

    ok(res, { subscriptions: subs.map(s => ({ ...s, orgName: tenantMap[s.orgId] ?? `Org ${s.orgId}` })), total, page: parseInt(page), pages: Math.ceil(total/limit) });
  } catch (e) { err(res, e); }
});

router.post("/admin/subscriptions", async (req, res) => {
  try {
    const { orgId, planSlug = "trial", billingCycle = "monthly", autoRenew = true, notes } = req.body;
    const plan = PLAN_DEFS[planSlug] ?? PLAN_DEFS.trial;
    const price = billingCycle === "annual" ? plan.annualPrice : plan.price;
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === "annual") periodEnd.setFullYear(periodEnd.getFullYear()+1);
    else periodEnd.setMonth(periodEnd.getMonth()+1);

    const [s] = await db.insert(subscriptionsTable).values({
      orgId, planSlug, status: planSlug === "trial" ? "trial" : "active",
      billingCycle, amount: price, taxRate:18, currency:"INR",
      currentPeriodStart: now, currentPeriodEnd: periodEnd,
      trialStart: planSlug === "trial" ? now : null as any,
      trialEnd: planSlug === "trial" ? new Date(now.getTime()+14*86400000) : null as any,
      maxUsers: plan.maxUsers, maxModules: plan.modules.length,
      autoRenew, notes,
    }).returning();
    // Sync tenant plan
    await db.update(tenantsTable).set({ plan: planSlug, maxUsers: plan.maxUsers, enabledModules: plan.modules as string[] }).where(eq(tenantsTable.id, orgId));
    await auditLog("platform@mystics.app","super_admin","SUBSCRIPTION_CREATE","subscription",s.id,`org:${orgId}`,{planSlug,billingCycle});
    res.status(201).json(s);
  } catch (e) { err(res, e); }
});

router.patch("/admin/subscriptions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = ["planSlug","status","billingCycle","amount","maxUsers","maxModules","autoRenew","notes","currentPeriodEnd","gracePeriodEnd","cancelledAt","suspendedAt"];
    const updates: Record<string,any> = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const [s] = await db.update(subscriptionsTable).set(updates).where(eq(subscriptionsTable.id, id)).returning();
    if (req.body.planSlug) {
      const plan = PLAN_DEFS[req.body.planSlug];
      if (plan) await db.update(tenantsTable).set({ plan: req.body.planSlug, maxUsers: plan.maxUsers, enabledModules: plan.modules as string[] }).where(eq(tenantsTable.id, s.orgId));
    }
    await auditLog("platform@mystics.app","super_admin","SUBSCRIPTION_UPDATE","subscription",id,`org:${s.orgId}`,updates);
    ok(res, s);
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

router.post("/admin/payments", async (req, res) => {
  try {
    const { orgId, subscriptionId, amount, method, methodDetail, description, notes } = req.body;
    const tax = Math.round(amount * 0.18);
    const total = amount + tax;
    const [p] = await db.insert(paymentsTable).values({
      orgId, subscriptionId, amount, tax, total, method, methodDetail,
      description, status:"completed", paidAt: new Date(),
      transactionId: `TXN${Date.now()}`, referenceId: `REF${Math.random().toString(36).slice(2,8).toUpperCase()}`,
    }).returning();
    await auditLog("platform@mystics.app","super_admin","PAYMENT_RECORD","payment",p.id,`org:${orgId}`,{amount,method});
    res.status(201).json(p);
  } catch (e) { err(res, e); }
});

router.get("/admin/invoices", async (req, res) => {
  try {
    const invoices = await db.select().from(platformInvoicesTable).orderBy(desc(platformInvoicesTable.createdAt)).limit(50);
    ok(res, invoices);
  } catch (e) { err(res, e); }
});

router.post("/admin/invoices/generate", async (req, res) => {
  try {
    const { orgId, planSlug, billingCycle = "monthly", billingName, billingEmail, billingGstin, billingAddress } = req.body;
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, orgId));
    const plan = PLAN_DEFS[planSlug ?? t?.plan ?? "trial"];
    const amount = billingCycle === "annual" ? plan.annualPrice : plan.price;
    const tax = Math.round(amount * 0.18);
    const total = amount + tax;
    const num = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const dueDate = new Date(Date.now()+7*86400000);
    const [inv] = await db.insert(platformInvoicesTable).values({
      invoiceNumber: num, orgId, orgName: t?.orgName ?? `Org ${orgId}`,
      amount, tax, total, status:"issued",
      planLabel: plan.name, billingCycle,
      billingName: billingName ?? t?.contactName ?? t?.orgName,
      billingEmail: billingEmail ?? t?.contactEmail,
      billingGstin, billingAddress,
      periodStart: new Date(), periodEnd: new Date(Date.now()+ (billingCycle==="annual" ? 365 : 30)*86400000),
      issuedAt: new Date(), dueAt: dueDate,
    }).returning();
    await auditLog("platform@mystics.app","super_admin","INVOICE_GENERATE","invoice",inv.id,num,{orgId,amount});
    res.status(201).json(inv);
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
