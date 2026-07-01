import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  systemSettingsTable, paymentsTable, subscriptionsTable,
  platformInvoicesTable, organizationsTable,
} from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { PLAN_CONFIG } from "./subscriptions.js";

const router = Router();

const GW = {
  enabled:       "payment_gateway_enabled",
  provider:      "payment_gateway_provider",
  mode:          "payment_gateway_mode",
  keyId:         "payment_gateway_key_id",
  keySecret:     "payment_gateway_key_secret",
  webhookSecret: "payment_gateway_webhook_secret",
};

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select({ value: systemSettingsTable.value })
    .from(systemSettingsTable).where(eq(systemSettingsTable.key, key));
  return row?.value ?? null;
}

async function upsertSetting(key: string, value: string, isSecret = false): Promise<void> {
  const [ex] = await db.select({ id: systemSettingsTable.id })
    .from(systemSettingsTable).where(eq(systemSettingsTable.key, key));
  if (ex) {
    await db.update(systemSettingsTable)
      .set({ value, isSecret, updatedBy: "platform@mystics.app" })
      .where(eq(systemSettingsTable.key, key));
  } else {
    await db.insert(systemSettingsTable).values({
      key, value, category: "payment", isSecret, updatedBy: "platform@mystics.app",
    });
  }
}

/* ══════════════════════════════════════
   ADMIN — Gateway configuration
══════════════════════════════════════ */

router.get("/admin/settings/payment-gateway", async (req, res) => {
  try {
    const [enabled, provider, mode, keyId, keySecret, webhookSecret] = await Promise.all([
      getSetting(GW.enabled), getSetting(GW.provider), getSetting(GW.mode),
      getSetting(GW.keyId), getSetting(GW.keySecret), getSetting(GW.webhookSecret),
    ]);
    res.json({
      enabled:          enabled === "true",
      provider:         provider ?? "razorpay",
      mode:             mode ?? "test",
      keyId:            keyId ?? "",
      keySecretSet:     !!keySecret,
      webhookSecretSet: !!webhookSecret,
    });
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

router.put("/admin/settings/payment-gateway", async (req, res) => {
  try {
    const { enabled, provider, mode, keyId, keySecret, webhookSecret } = req.body;
    const ops: Promise<void>[] = [
      upsertSetting(GW.enabled,  String(!!enabled)),
      upsertSetting(GW.provider, provider  ?? "razorpay"),
      upsertSetting(GW.mode,     mode      ?? "test"),
    ];
    if (keyId         !== undefined) ops.push(upsertSetting(GW.keyId,         keyId,         false));
    if (keySecret     && keySecret !== "")     ops.push(upsertSetting(GW.keySecret,     keySecret,     true));
    if (webhookSecret && webhookSecret !== "") ops.push(upsertSetting(GW.webhookSecret, webhookSecret, true));
    await Promise.all(ops);
    res.json({ ok: true });
  } catch (e: any) { req.log?.error(e); res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════
   PUBLIC — config for checkout UI
══════════════════════════════════════ */

router.get("/billing/razorpay/config", async (_req, res) => {
  try {
    const [enabled, keyId, mode] = await Promise.all([
      getSetting(GW.enabled), getSetting(GW.keyId), getSetting(GW.mode),
    ]);
    res.json({ enabled: enabled === "true", keyId: keyId ?? "", mode: mode ?? "test" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════
   CREATE ORDER
══════════════════════════════════════ */

router.post("/billing/razorpay/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", planSlug, billingCycle, orgId } = req.body;
    const [keyId, keySecret] = await Promise.all([getSetting(GW.keyId), getSetting(GW.keySecret)]);
    if (!keyId || !keySecret) {
      res.status(503).json({ error: "Payment gateway not configured. Ask your platform admin to enable Razorpay in Admin → Settings → Payment Gateway." });
      return;
    }
    const Razorpay = (await import("razorpay")).default;
    const rz = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const amountPaise = Math.round(Number(amount) * 100);
    const order = await rz.orders.create({
      amount: amountPaise,
      currency,
      receipt: `org${orgId}_${Date.now()}`,
      notes: { planSlug, billingCycle, orgId: String(orgId) },
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e?.error?.description ?? e.message ?? "Failed to create order" });
  }
});

/* ══════════════════════════════════════
   VERIFY + RECORD PAYMENT
══════════════════════════════════════ */

router.post("/billing/razorpay/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      orgId, planSlug, billingCycle, amount,
    } = req.body;

    const keySecret = await getSetting(GW.keySecret);
    if (!keySecret) { res.status(503).json({ error: "Gateway not configured" }); return; }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
    if (expected !== razorpay_signature) {
      res.status(400).json({ error: "Payment signature verification failed" });
      return;
    }

    const plan = PLAN_CONFIG[planSlug as string] ?? PLAN_CONFIG.starter;
    const amt  = Number(amount) || (billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice);
    const tax  = Math.round(amt * 0.18);
    const total = amt + tax;

    let [sub] = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, Number(orgId)))
      .orderBy(desc(subscriptionsTable.createdAt));

    const periodStart = new Date();
    const periodEnd   = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1));

    if (!sub) {
      [sub] = await db.insert(subscriptionsTable).values({
        orgId: Number(orgId), planSlug: planSlug as string, status: "active",
        billingCycle, amount: amt, taxRate: 18, currency: "INR",
        currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
        autoRenew: true, maxUsers: plan.maxUsers, maxModules: plan.maxModules,
      }).returning();
    } else {
      [sub] = await db.update(subscriptionsTable).set({
        planSlug: planSlug as string, status: "active", billingCycle, amount: amt,
        currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
        maxUsers: plan.maxUsers, maxModules: plan.maxModules,
      }).where(eq(subscriptionsTable.id, sub.id)).returning();
    }

    const [pay] = await db.insert(paymentsTable).values({
      subscriptionId: sub.id, orgId: Number(orgId),
      amount: amt, tax, total, currency: "INR",
      method: "razorpay", methodDetail: `Razorpay • ${razorpay_payment_id}`,
      status: "completed",
      transactionId: razorpay_payment_id,
      referenceId: razorpay_order_id,
      description: `${plan.label} — ${billingCycle}`,
      paidAt: new Date(),
    }).returning();

    const [org] = await db.select().from(organizationsTable)
      .where(eq(organizationsTable.id, Number(orgId)));
    if (org) {
      const [{ n }] = await db.select({ n: count() }).from(platformInvoicesTable);
      const invNum = `INV-${new Date().getFullYear()}-${String(Number(n) + 1).padStart(4, "0")}`;
      await db.insert(platformInvoicesTable).values({
        invoiceNumber: invNum, orgId: Number(orgId), orgName: org.name,
        subscriptionId: sub.id, paymentId: pay.id,
        amount: amt, tax, total, status: "paid",
        planLabel: plan.label, billingCycle,
        billingName: org.contactName, billingEmail: org.contactEmail, billingGstin: org.gstin,
        issuedAt: new Date(), paidAt: new Date(),
      }).onConflictDoNothing();
      await db.update(organizationsTable).set({
        plan: planSlug as string, status: "active", mrr: plan.monthlyPrice,
        maxUsers: plan.maxUsers, maxModules: plan.maxModules,
      }).where(eq(organizationsTable.id, Number(orgId)));
    }

    res.json({ ok: true, payment: pay, subscription: sub });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message ?? "Verification failed" });
  }
});

export default router;
