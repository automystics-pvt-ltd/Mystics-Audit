import { Router } from "express";
import { db } from "@workspace/db";
import { organizationsTable, usersTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";

const router = Router();

const PLAN_CONFIG: Record<string, { maxUsers: number; maxModules: number; mrr: number }> = {
  trial:        { maxUsers: 2,         maxModules: 5,  mrr: 0 },
  starter:      { maxUsers: 5,         maxModules: 8,  mrr: 2999 },
  professional: { maxUsers: 15,        maxModules: 15, mrr: 7999 },
  enterprise:   { maxUsers: 999,       maxModules: 15, mrr: 19999 },
};

async function seedDemoOrgs() {
  const existing = await db.select({ n: count() }).from(organizationsTable);
  if (Number(existing[0]?.n) > 0) return;

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 86400000);
  const subStart = new Date("2024-04-01");

  await db.insert(organizationsTable).values([
    {
      name: "Automystics Technologies Pvt. Ltd.", slug: "automystics",
      plan: "professional", status: "active", maxUsers: 15, maxModules: 15,
      contactName: "John Doe", contactEmail: "admin@automystics.com", contactPhone: "+91 44 4567 8900",
      gstin: "33ABFCA6057N1ZE", industry: "Technology", city: "Chennai", state: "Tamil Nadu",
      billingCycle: "annual", mrr: 7999, usersCount: 4,
      subscriptionStartedAt: subStart, notes: "Flagship customer — uses all 15 modules",
    },
    {
      name: "Nexus Fintech Solutions", slug: "nexus-fintech",
      plan: "starter", status: "active", maxUsers: 5, maxModules: 8,
      contactName: "Priya Mehta", contactEmail: "admin@nexusfintech.in", contactPhone: "+91 22 4001 7654",
      gstin: "27AABCN1234A1Z5", industry: "Financial Services", city: "Mumbai", state: "Maharashtra",
      billingCycle: "monthly", mrr: 2999, usersCount: 3,
      subscriptionStartedAt: new Date("2024-08-15"), notes: "Growing team — may upgrade to Professional",
    },
    {
      name: "Meridian Exports Pvt Ltd", slug: "meridian-exports",
      plan: "trial", status: "trial", maxUsers: 2, maxModules: 5,
      contactName: "Arjun Singh", contactEmail: "arjun@meridianexports.co", contactPhone: "+91 11 4567 2200",
      gstin: "07AABCM5678A1Z3", industry: "Export / Import", city: "Delhi", state: "Delhi",
      billingCycle: "monthly", mrr: 0, usersCount: 1,
      trialEndsAt: new Date(now.getTime() + 7 * 86400000), notes: "Trial — follow up on day 10",
    },
    {
      name: "Bharat Commerce Hub", slug: "bharat-commerce",
      plan: "enterprise", status: "active", maxUsers: 999, maxModules: 15,
      contactName: "Kavitha Reddy", contactEmail: "kavitha@bharatcommerce.com", contactPhone: "+91 80 4000 1111",
      gstin: "29AABCB8765A1Z8", industry: "Wholesale / Distribution", city: "Bangalore", state: "Karnataka",
      billingCycle: "annual", mrr: 19999, usersCount: 22,
      subscriptionStartedAt: new Date("2023-11-01"), notes: "Enterprise — custom SLA in place",
    },
    {
      name: "Lakshmi Agro Industries", slug: "lakshmi-agro",
      plan: "starter", status: "suspended", maxUsers: 5, maxModules: 8,
      contactName: "Suresh Nadar", contactEmail: "suresh@lakshmiagro.in", contactPhone: "+91 422 267 8900",
      gstin: "33AABCL4321A1Z6", industry: "Agriculture", city: "Coimbatore", state: "Tamil Nadu",
      billingCycle: "monthly", mrr: 0, usersCount: 2,
      subscriptionStartedAt: new Date("2024-06-01"), notes: "Suspended due to payment failure — reach out",
    },
  ]).onConflictDoNothing();
}

/* ── Platform stats ─────────────────────────────────── */
router.get("/platform-admin/stats", async (req, res) => {
  try {
    await seedDemoOrgs();
    const orgs = await db.select().from(organizationsTable);
    const totalOrgs    = orgs.length;
    const activeOrgs   = orgs.filter(o => o.status === "active").length;
    const trialOrgs    = orgs.filter(o => o.status === "trial").length;
    const suspendedOrgs= orgs.filter(o => o.status === "suspended").length;
    const totalMrr     = orgs.filter(o => o.status === "active").reduce((s, o) => s + o.mrr, 0);
    const totalUsers   = orgs.reduce((s, o) => s + o.usersCount, 0);

    const planBreakdown = {
      trial:        orgs.filter(o => o.plan === "trial").length,
      starter:      orgs.filter(o => o.plan === "starter").length,
      professional: orgs.filter(o => o.plan === "professional").length,
      enterprise:   orgs.filter(o => o.plan === "enterprise").length,
    };

    res.json({ totalOrgs, activeOrgs, trialOrgs, suspendedOrgs, totalMrr, totalUsers, planBreakdown });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── List organizations ──────────────────────────────── */
router.get("/platform-admin/organizations", async (req, res) => {
  try {
    await seedDemoOrgs();
    const orgs = await db.select().from(organizationsTable).orderBy(desc(organizationsTable.createdAt));
    res.json(orgs);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Get one organization ────────────────────────────── */
router.get("/platform-admin/organizations/:id", async (req, res) => {
  try {
    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, Number(req.params.id)));
    if (!org) { res.status(404).json({ error: "Not found" }); return; }
    // Get users for this org
    const users = await db.select().from(usersTable).where(eq(usersTable.orgId, Number(req.params.id)));
    res.json({ ...org, users });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ── Create organization ─────────────────────────────── */
router.post("/platform-admin/organizations", async (req, res) => {
  try {
    const { name, plan = "trial", contactEmail, contactName, contactPhone, industry, city, state } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const cfg  = PLAN_CONFIG[plan] ?? PLAN_CONFIG.trial;
    const trialEndsAt = plan === "trial" ? new Date(Date.now() + 14 * 86400000) : undefined;
    const subscriptionStartedAt = plan !== "trial" ? new Date() : undefined;

    const [org] = await db.insert(organizationsTable).values({
      name, slug, plan, status: plan === "trial" ? "trial" : "active",
      maxUsers: cfg.maxUsers, maxModules: cfg.maxModules, mrr: cfg.mrr,
      contactName, contactEmail, contactPhone, industry, city, state,
      billingCycle: "monthly", usersCount: 0,
      ...(trialEndsAt ? { trialEndsAt } : {}),
      ...(subscriptionStartedAt ? { subscriptionStartedAt } : {}),
    }).returning();
    res.status(201).json(org);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to create org" }); }
});

/* ── Update organization (plan / status / notes) ─────── */
router.patch("/platform-admin/organizations/:id", async (req, res) => {
  try {
    const { plan, status, notes, maxUsers, maxModules, mrr } = req.body;
    const updates: Record<string, any> = {};
    if (plan   !== undefined) {
      updates.plan = plan;
      const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.trial;
      if (maxUsers   === undefined) updates.maxUsers   = cfg.maxUsers;
      if (maxModules === undefined) updates.maxModules = cfg.maxModules;
      if (mrr        === undefined) updates.mrr        = cfg.mrr;
      if (plan !== "trial" && !updates.subscriptionStartedAt) updates.subscriptionStartedAt = new Date();
    }
    if (status     !== undefined) updates.status     = status;
    if (notes      !== undefined) updates.notes      = notes;
    if (maxUsers   !== undefined) updates.maxUsers   = maxUsers;
    if (maxModules !== undefined) updates.maxModules = maxModules;
    if (mrr        !== undefined) updates.mrr        = mrr;

    const [org] = await db.update(organizationsTable).set(updates)
      .where(eq(organizationsTable.id, Number(req.params.id))).returning();
    res.json(org);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to update org" }); }
});

/* ── Platform users list (all orgs) ─────────────────── */
router.get("/platform-admin/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    res.json(users);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

export default router;
