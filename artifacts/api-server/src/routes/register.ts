import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, subscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { PLAN_DEFS, genTempPassword } from "../lib/plans";

const router = Router();

/* ══════════════════════════════════
   SELF-SERVICE TENANT REGISTRATION
═══════════════════════════════════ */

/** Check if an email is already taken */
router.get("/register/check-email", async (req, res) => {
  try {
    const { email } = req.query as { email: string };
    if (!email) { res.json({ available: false }); return; }
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    res.json({ available: !u });
  } catch {
    res.json({ available: false });
  }
});

/** Check if a company/slug is available */
router.get("/register/check-org", async (req, res) => {
  try {
    const { orgName } = req.query as { orgName: string };
    if (!orgName) { res.json({ available: false }); return; }
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").slice(0,40);
    const [t] = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, slug));
    res.json({ available: !t, slug });
  } catch {
    res.json({ available: false });
  }
});

/** Self-service registration — creates tenant + trial subscription + owner user */
router.post("/register", async (req, res) => {
  try {
    const {
      orgName, legalName, industry, gstin, city, state,
      contactName, contactEmail, contactPhone,
      planSlug = "trial", billingCycle = "monthly",
      adminName, adminEmail, adminPassword,
      adminPhone,
    } = req.body;

    if (!orgName || !contactEmail || !adminEmail) {
      res.status(400).json({ error: "orgName, contactEmail and adminEmail are required" });
      return;
    }

    // Check duplicate email
    const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, adminEmail.toLowerCase()));
    if (existingUser) { res.status(409).json({ error: "An account with this email already exists" }); return; }

    const plan = PLAN_DEFS[planSlug] ?? PLAN_DEFS.trial;
    const slug = (orgName as string).toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").slice(0,40)+"-"+Date.now().toString(36);

    // 1. Create tenant
    const trialEnd = new Date(Date.now()+14*86400000);
    const [tenant] = await db.insert(tenantsTable).values({
      slug, orgName, legalName, industry, gstin, city, state,
      contactName: contactName || adminName, contactEmail,
      contactPhone, adminEmail,
      plan: planSlug, status: "trial",
      billingCycle, maxUsers: plan.maxUsers,
      maxStorage: plan.maxStorage,
      enabledModules: plan.modules as string[],
      trialEnd, isTest: false,
    }).returning();

    // 2. Create trial subscription
    const now = new Date();
    const [sub] = await db.insert(subscriptionsTable).values({
      orgId: tenant.id, planSlug, status:"trial",
      billingCycle, amount: 0, taxRate:18, currency:"INR",
      currentPeriodStart: now, currentPeriodEnd: trialEnd,
      trialStart: now, trialEnd,
      maxUsers: plan.maxUsers, maxModules: plan.modules.length,
      autoRenew: true,
    }).returning();

    // 3. Create owner user
    const tempPass = adminPassword || genTempPassword();
    const [user] = await db.insert(usersTable).values({
      name: adminName || contactName || adminEmail.split("@")[0],
      email: adminEmail.toLowerCase(),
      role: "Admin", roleLevel: 2,
      phone: adminPhone || contactPhone,
      isActive: true,
      orgId: tenant.id, tenantId: tenant.id,
      tempPassword: adminPassword ? null : tempPass,
      mustChangePassword: !adminPassword,
      isLocked: false,
      invitedAt: new Date(),
      licenseType: "admin",
    }).returning();

    res.status(201).json({
      tenant: { id: tenant.id, slug: tenant.slug, orgName: tenant.orgName, plan: tenant.plan, trialEnd: tenant.trialEnd },
      subscription: { id: sub.id, status: sub.status, trialEnd: sub.trialEnd },
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tempPassword: adminPassword ? undefined : tempPass,
    });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.message ?? "Registration failed" });
  }
});

export default router;
