import { Router } from "express";
import { db } from "@workspace/db";
import {
  organizationsTable, usersTable,
  subscriptionsTable, paymentsTable, platformInvoicesTable,
} from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";

const router = Router();

/* ── Plan config ─────────────────────────────────────── */
export const PLAN_CONFIG: Record<string, {
  label: string; monthlyPrice: number; annualPrice: number;
  maxUsers: number; maxModules: number;
  features: string[];
}> = {
  trial: {
    label: "Trial", monthlyPrice: 0, annualPrice: 0,
    maxUsers: 2, maxModules: 5,
    features: ["Dashboard", "Basic Sales", "Expense Tracking", "Email Support", "14-day free trial"],
  },
  starter: {
    label: "Starter", monthlyPrice: 2999, annualPrice: 28790,
    maxUsers: 5, maxModules: 8,
    features: ["All Trial features", "Accounting & GL", "GST Filing", "Inventory Basics", "Purchase Orders", "Priority Email Support"],
  },
  professional: {
    label: "Professional", monthlyPrice: 7999, annualPrice: 76790,
    maxUsers: 15, maxModules: 15,
    features: ["All Starter features", "All 15 Modules", "Advanced GST", "Budgets", "RBAC", "API Access", "Phone Support"],
  },
  enterprise: {
    label: "Enterprise", monthlyPrice: 19999, annualPrice: 191990,
    maxUsers: 999, maxModules: 15,
    features: ["All Professional features", "Unlimited Users", "Dedicated CSM", "SLA", "Custom Integrations", "On-premise option", "White-glove onboarding"],
  },
};

/* ── Invoice number generator ────────────────────────── */
async function nextInvoiceNumber(): Promise<string> {
  const [row] = await db.select({ n: count() }).from(platformInvoicesTable);
  const seq = (Number(row?.n) ?? 0) + 1;
  const y = new Date().getFullYear();
  return `INV-${y}-${String(seq).padStart(4, "0")}`;
}

/* ── Seed subscriptions ──────────────────────────────── */
async function seedSubscriptions() {
  const existing = await db.select({ n: count() }).from(subscriptionsTable);
  if (Number(existing[0]?.n) > 0) return;

  const orgs = await db.select().from(organizationsTable);
  if (orgs.length === 0) return;

  const now = new Date();
  const rows = orgs.map(org => {
    const plan = PLAN_CONFIG[org.plan] ?? PLAN_CONFIG.trial;
    const monthlyAmt = plan.monthlyPrice;
    const periodStart = org.subscriptionStartedAt ?? new Date(now.getTime() - 15 * 86400000);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + (org.billingCycle === "annual" ? 12 : 1));
    return {
      orgId: org.id,
      planSlug: org.plan,
      status: org.status === "suspended" ? "suspended" : org.status === "trial" ? "trial" : "active",
      billingCycle: org.billingCycle,
      amount: org.billingCycle === "annual" ? plan.annualPrice : monthlyAmt,
      taxRate: 18,
      currency: "INR",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialStart: org.plan === "trial" ? periodStart : null,
      trialEnd: org.plan === "trial" ? org.trialEndsAt : null,
      autoRenew: true,
      maxUsers: plan.maxUsers,
      maxModules: plan.maxModules,
    } as any;
  });
  await db.insert(subscriptionsTable).values(rows).onConflictDoNothing();

  /* Seed some payments + invoices for active orgs */
  const activeSubs = await db.select().from(subscriptionsTable);
  const paymentMethods = [
    { method: "upi", methodDetail: "PhonePe UPI" },
    { method: "card", methodDetail: "HDFC Credit Card" },
    { method: "netbanking", methodDetail: "SBI Net Banking" },
    { method: "upi", methodDetail: "Google Pay" },
  ];
  for (const sub of activeSubs) {
    if (sub.planSlug === "trial" || sub.status === "suspended") continue;
    const org = orgs.find(o => o.id === sub.orgId);
    if (!org) continue;
    const plan = PLAN_CONFIG[sub.planSlug] ?? PLAN_CONFIG.starter;
    const amt = sub.amount;
    const tax = Math.round(amt * 0.18);
    const total = amt + tax;
    const pm = paymentMethods[sub.orgId % paymentMethods.length];
    const txId = `TXN${Date.now()}${sub.orgId}`;
    const paidAt = sub.currentPeriodStart ?? new Date();

    const [pay] = await db.insert(paymentsTable).values({
      subscriptionId: sub.id, orgId: sub.orgId,
      amount: amt, tax, total, currency: "INR",
      method: pm.method, methodDetail: pm.methodDetail,
      status: "completed", transactionId: txId,
      description: `${plan.label} plan — ${sub.billingCycle} subscription`,
      paidAt,
    }).returning();

    const invNum = await nextInvoiceNumber();
    await db.insert(platformInvoicesTable).values({
      invoiceNumber: invNum, orgId: sub.orgId, orgName: org.name,
      subscriptionId: sub.id, paymentId: pay.id,
      amount: amt, tax, total, status: "paid",
      planLabel: plan.label, billingCycle: sub.billingCycle,
      periodStart: sub.currentPeriodStart, periodEnd: sub.currentPeriodEnd,
      billingName: org.contactName, billingEmail: org.contactEmail,
      billingGstin: org.gstin,
      issuedAt: paidAt, paidAt,
    }).onConflictDoNothing();
  }
}

/* ─────────────────────────────────────────────────────── */
/* Platform admin — subscription endpoints                  */
/* ─────────────────────────────────────────────────────── */

/* List plans */
router.get("/platform-admin/plans", (_, res) => {
  res.json(Object.entries(PLAN_CONFIG).map(([slug, cfg]) => ({ slug, ...cfg })));
});

/* List all subscriptions with org info */
router.get("/platform-admin/subscriptions", async (req, res) => {
  try {
    await seedSubscriptions();
    const subs = await db.select().from(subscriptionsTable).orderBy(desc(subscriptionsTable.createdAt));
    const orgs = await db.select().from(organizationsTable);
    const orgMap = Object.fromEntries(orgs.map(o => [o.id, o]));
    res.json(subs.map(s => ({ ...s, org: orgMap[s.orgId] ?? null })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* Get one subscription */
router.get("/platform-admin/subscriptions/:id", async (req, res) => {
  try {
    const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, Number(req.params.id)));
    if (!sub) { res.status(404).json({ error: "Not found" }); return; }
    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, sub.orgId));
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.subscriptionId, sub.id)).orderBy(desc(paymentsTable.createdAt));
    const invoices = await db.select().from(platformInvoicesTable).where(eq(platformInvoicesTable.subscriptionId, sub.id)).orderBy(desc(platformInvoicesTable.createdAt));
    res.json({ ...sub, org, payments, invoices });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* Create subscription for org */
router.post("/platform-admin/subscriptions", async (req, res) => {
  try {
    const { orgId, planSlug = "trial", billingCycle = "monthly", notes } = req.body;
    const plan = PLAN_CONFIG[planSlug] ?? PLAN_CONFIG.trial;
    const amt = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1));

    const [sub] = await db.insert(subscriptionsTable).values({
      orgId, planSlug, status: planSlug === "trial" ? "trial" : "active",
      billingCycle, amount: amt, taxRate: 18, currency: "INR",
      currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
      ...(planSlug === "trial" ? { trialStart: periodStart, trialEnd: new Date(periodStart.getTime() + 14 * 86400000) } : {}),
      autoRenew: true, maxUsers: plan.maxUsers, maxModules: plan.maxModules, notes,
    }).returning();

    /* Update org plan/status */
    await db.update(organizationsTable).set({
      plan: planSlug, status: planSlug === "trial" ? "trial" : "active",
      maxUsers: plan.maxUsers, maxModules: plan.maxModules,
      mrr: plan.monthlyPrice, subscriptionStartedAt: periodStart,
    }).where(eq(organizationsTable.id, orgId));

    res.status(201).json(sub);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to create subscription" }); }
});

/* Update subscription */
router.patch("/platform-admin/subscriptions/:id", async (req, res) => {
  try {
    const { planSlug, status, billingCycle, notes, autoRenew } = req.body;
    const updates: any = {};
    if (planSlug !== undefined) {
      const plan = PLAN_CONFIG[planSlug] ?? PLAN_CONFIG.trial;
      updates.planSlug = planSlug;
      updates.maxUsers = plan.maxUsers;
      updates.maxModules = plan.maxModules;
      updates.amount = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
      /* Sync org */
      const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, Number(req.params.id)));
      if (sub) {
        await db.update(organizationsTable).set({
          plan: planSlug, maxUsers: plan.maxUsers, maxModules: plan.maxModules, mrr: plan.monthlyPrice,
        }).where(eq(organizationsTable.id, sub.orgId));
      }
    }
    if (status !== undefined) {
      updates.status = status;
      if (status === "suspended") updates.suspendedAt = new Date();
      if (status === "cancelled") updates.cancelledAt = new Date();
      const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, Number(req.params.id)));
      if (sub) {
        const orgStatus = status === "active" ? "active" : status === "trial" ? "trial" : "suspended";
        await db.update(organizationsTable).set({ status: orgStatus }).where(eq(organizationsTable.id, sub.orgId));
      }
    }
    if (billingCycle !== undefined) updates.billingCycle = billingCycle;
    if (notes !== undefined) updates.notes = notes;
    if (autoRenew !== undefined) updates.autoRenew = autoRenew;

    const [sub] = await db.update(subscriptionsTable).set(updates)
      .where(eq(subscriptionsTable.id, Number(req.params.id))).returning();
    res.json(sub);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ─────────────────────────────────────────────────────── */
/* Payments                                                */
/* ─────────────────────────────────────────────────────── */

router.get("/platform-admin/payments", async (req, res) => {
  try {
    await seedSubscriptions();
    const payments = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
    const orgs = await db.select().from(organizationsTable);
    const orgMap = Object.fromEntries(orgs.map(o => [o.id, o]));
    res.json(payments.map(p => ({ ...p, org: orgMap[p.orgId] ?? null })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/platform-admin/payments", async (req, res) => {
  try {
    const { orgId, subscriptionId, amount, method, methodDetail, description, billingCycle } = req.body;
    const tax = Math.round(amount * 0.18);
    const total = amount + tax;

    const [pay] = await db.insert(paymentsTable).values({
      orgId, subscriptionId, amount, tax, total, currency: "INR",
      method, methodDetail, status: "completed",
      transactionId: `TXN${Date.now()}`,
      referenceId: `REF${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      description, paidAt: new Date(),
    }).returning();

    /* Auto-generate invoice */
    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
    const invNum = await nextInvoiceNumber();
    if (org) {
      const [sub] = subscriptionId
        ? await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, subscriptionId))
        : [null];
      const plan = sub ? (PLAN_CONFIG[sub.planSlug] ?? PLAN_CONFIG.trial) : null;
      await db.insert(platformInvoicesTable).values({
        invoiceNumber: invNum, orgId, orgName: org.name,
        subscriptionId: subscriptionId ?? null, paymentId: pay.id,
        amount, tax, total, status: "paid",
        planLabel: plan?.label ?? "Subscription",
        billingCycle: billingCycle ?? sub?.billingCycle ?? "monthly",
        billingName: org.contactName, billingEmail: org.contactEmail, billingGstin: org.gstin,
        issuedAt: new Date(), paidAt: new Date(),
      }).onConflictDoNothing();
    }

    /* Activate subscription if paid */
    if (subscriptionId) {
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1));
      await db.update(subscriptionsTable).set({
        status: "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
      }).where(eq(subscriptionsTable.id, subscriptionId));
      if (org) {
        await db.update(organizationsTable).set({ status: "active" }).where(eq(organizationsTable.id, orgId));
      }
    }

    res.status(201).json({ ...pay, invoiceNumber: invNum });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to record payment" }); }
});

/* ─────────────────────────────────────────────────────── */
/* Invoices                                                */
/* ─────────────────────────────────────────────────────── */

router.get("/platform-admin/invoices", async (req, res) => {
  try {
    await seedSubscriptions();
    const invoices = await db.select().from(platformInvoicesTable).orderBy(desc(platformInvoicesTable.createdAt));
    res.json(invoices);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/platform-admin/invoices/:id", async (req, res) => {
  try {
    const [inv] = await db.select().from(platformInvoicesTable)
      .where(eq(platformInvoicesTable.id, Number(req.params.id)));
    if (!inv) { res.status(404).json({ error: "Not found" }); return; }
    res.json(inv);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ─────────────────────────────────────────────────────── */
/* Analytics                                               */
/* ─────────────────────────────────────────────────────── */

router.get("/platform-admin/analytics", async (req, res) => {
  try {
    await seedSubscriptions();
    const orgs = await db.select().from(organizationsTable);
    const subs = await db.select().from(subscriptionsTable);
    const payments = await db.select().from(paymentsTable);

    /* MRR by plan */
    const activeOrgs = orgs.filter(o => o.status === "active");
    const totalMrr = activeOrgs.reduce((s, o) => s + o.mrr, 0);
    const arr = totalMrr * 12;

    /* Monthly revenue chart (last 12 months) */
    const now = new Date();
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      /* Revenue from payments in that month */
      const rev = payments.filter(p => {
        const pd = new Date(p.createdAt);
        return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth() && p.status === "completed";
      }).reduce((s, p) => s + p.amount, 0);
      /* If no data, extrapolate from MRR with slight variation */
      const base = totalMrr + (Math.sin(i * 0.8) * totalMrr * 0.12);
      return { month: label, revenue: rev > 0 ? rev : Math.round(base * (0.7 + i * 0.027)) };
    });

    /* Plan distribution */
    const planDist = ["trial", "starter", "professional", "enterprise"].map(p => ({
      plan: p,
      count: orgs.filter(o => o.plan === p).length,
      mrr: orgs.filter(o => o.plan === p && o.status === "active").reduce((s, o) => s + o.mrr, 0),
    }));

    /* Churn (suspended/cancelled) */
    const churned = orgs.filter(o => o.status === "suspended" || o.status === "cancelled").length;
    const churnRate = orgs.length > 0 ? (churned / orgs.length * 100) : 0;

    /* Total collected */
    const totalCollected = payments.filter(p => p.status === "completed").reduce((s, p) => s + p.total, 0);

    /* User stats */
    const totalUsers = await db.select({ n: count() }).from(usersTable);

    res.json({
      totalMrr, arr, totalOrgs: orgs.length,
      activeOrgs: activeOrgs.length, trialOrgs: orgs.filter(o => o.status === "trial").length,
      suspendedOrgs: orgs.filter(o => o.status === "suspended").length, churned, churnRate,
      totalCollected, totalUsers: Number(totalUsers[0]?.n ?? 0),
      monthlyRevenue, planDist,
      avgRevenuePerUser: activeOrgs.length > 0 ? Math.round(totalMrr / activeOrgs.length) : 0,
      conversionRate: orgs.length > 0 ? ((activeOrgs.length / orgs.length) * 100) : 0,
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* ─────────────────────────────────────────────────────── */
/* Tenant billing (org=1 as demo) — returns own sub info   */
/* ─────────────────────────────────────────────────────── */

router.get("/billing/current", async (req, res) => {
  try {
    await seedSubscriptions();
    const orgId = Number(req.query.orgId ?? 1);
    const [sub] = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, orgId))
      .orderBy(desc(subscriptionsTable.createdAt));
    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
    const invoices = await db.select().from(platformInvoicesTable)
      .where(eq(platformInvoicesTable.orgId, orgId)).orderBy(desc(platformInvoicesTable.createdAt));
    const payments = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.orgId, orgId)).orderBy(desc(paymentsTable.createdAt));
    const users = await db.select({ n: count() }).from(usersTable).where(eq(usersTable.orgId, orgId));
    const plan = sub ? (PLAN_CONFIG[sub.planSlug] ?? PLAN_CONFIG.trial) : PLAN_CONFIG.trial;
    res.json({ sub, org, plan, invoices, payments, usersCount: Number(users[0]?.n ?? 0) });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

/* Tenant initiates a payment */
router.post("/billing/pay", async (req, res) => {
  try {
    const { orgId = 1, method, methodDetail, planSlug, billingCycle = "monthly" } = req.body;
    const plan = PLAN_CONFIG[planSlug] ?? PLAN_CONFIG.starter;
    const amt = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
    const tax = Math.round(amt * 0.18);
    const total = amt + tax;

    /* Find or create subscription */
    let [sub] = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, Number(orgId)))
      .orderBy(desc(subscriptionsTable.createdAt));

    if (!sub) {
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1));
      [sub] = await db.insert(subscriptionsTable).values({
        orgId: Number(orgId), planSlug, status: "active",
        billingCycle, amount: amt, taxRate: 18, currency: "INR",
        currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
        autoRenew: true, maxUsers: plan.maxUsers, maxModules: plan.maxModules,
      }).returning();
    } else {
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1));
      [sub] = await db.update(subscriptionsTable).set({
        planSlug, status: "active", billingCycle, amount: amt,
        currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
        maxUsers: plan.maxUsers, maxModules: plan.maxModules,
      }).where(eq(subscriptionsTable.id, sub.id)).returning();
    }

    const [pay] = await db.insert(paymentsTable).values({
      subscriptionId: sub.id, orgId: Number(orgId),
      amount: amt, tax, total, currency: "INR",
      method, methodDetail, status: "completed",
      transactionId: `TXN${Date.now()}`,
      referenceId: `REF${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      description: `${plan.label} plan — ${billingCycle}`,
      paidAt: new Date(),
    }).returning();

    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, Number(orgId)));
    if (org) {
      const invNum = await nextInvoiceNumber();
      await db.insert(platformInvoicesTable).values({
        invoiceNumber: invNum, orgId: Number(orgId), orgName: org.name,
        subscriptionId: sub.id, paymentId: pay.id,
        amount: amt, tax, total, status: "paid",
        planLabel: plan.label, billingCycle,
        billingName: org.contactName, billingEmail: org.contactEmail, billingGstin: org.gstin,
        issuedAt: new Date(), paidAt: new Date(),
      }).onConflictDoNothing();
      await db.update(organizationsTable).set({
        plan: planSlug, status: "active", mrr: plan.monthlyPrice,
        maxUsers: plan.maxUsers, maxModules: plan.maxModules,
      }).where(eq(organizationsTable.id, Number(orgId)));
    }
    res.status(201).json({ payment: pay, subscription: sub });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

export default router;
