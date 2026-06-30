import { Router } from "express";
import { db } from "@workspace/db";
import { emailSettingsTable, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "../lib/mailer";

const router = Router();

const DEFAULT_SLUG = "default";

/* ensure a row always exists — configAllowed defaults true so tenant can configure immediately */
async function getOrCreateSettings(slug = DEFAULT_SLUG) {
  const existing = await db
    .select()
    .from(emailSettingsTable)
    .where(eq(emailSettingsTable.orgSlug, slug))
    .limit(1);
  if (existing.length) return existing[0];
  const [created] = await db
    .insert(emailSettingsTable)
    .values({ orgSlug: slug, configAllowed: true })
    .returning();
  return created;
}

/* ── GET /api/settings/email ── */
router.get("/settings/email", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    /* never expose the password */
    const { smtpPass: _pass, ...safe } = settings;
    res.json({ ...safe, hasPassword: !!_pass });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ── PUT /api/settings/email ── */
router.put("/settings/email", async (req, res) => {
  try {
    const { provider, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = req.body;
    const settings = await getOrCreateSettings();

    const [updated] = await db
      .update(emailSettingsTable)
      .set({
        provider:  provider  ?? settings.provider,
        smtpHost:  smtpHost  ?? settings.smtpHost,
        smtpPort:  smtpPort  ?? settings.smtpPort,
        smtpUser:  smtpUser  ?? settings.smtpUser,
        smtpPass:  smtpPass !== undefined ? (smtpPass === "" ? null : smtpPass) : settings.smtpPass,
        smtpFrom:  smtpFrom  ?? settings.smtpFrom,
        isVerified: false,   // reset verification on any change
      })
      .where(eq(emailSettingsTable.orgSlug, DEFAULT_SLUG))
      .returning();

    const { smtpPass: _pass, ...safe } = updated;
    res.json({ ...safe, hasPassword: !!_pass });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ── POST /api/settings/email/test ── */
router.post("/settings/email/test", async (req, res): Promise<void> => {
  try {
    const { toEmail } = req.body;
    if (!toEmail) { res.status(400).json({ error: "toEmail is required" }); return; }

    const settings = await getOrCreateSettings();
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
      res.status(400).json({ error: "SMTP credentials not configured yet" }); return;
    }

    const result = await sendEmail({
      to: toEmail,
      subject: "Mystics Audit — Email Configuration Test",
      html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px">
        <h2 style="color:#6C3CE1">&#10003; Email Configuration Verified</h2>
        <p>This test email confirms your SMTP settings are working correctly in Mystics Audit.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="font-size:12px;color:#999">Sent from Mystics Audit Email Configuration</p>
      </div>`,
      smtpOverride: {
        host: settings.smtpHost,
        port: settings.smtpPort ?? 587,
        user: settings.smtpUser,
        pass: settings.smtpPass,
        from: settings.smtpFrom ?? settings.smtpUser,
      },
    }, req.log);

    if (result.ok) {
      /* mark as verified */
      await db
        .update(emailSettingsTable)
        .set({ isVerified: true })
        .where(eq(emailSettingsTable.orgSlug, DEFAULT_SLUG));
      res.json({ ok: true });
    } else {
      res.status(400).json({ ok: false, error: result.error });
    }
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ── PATCH /admin/tenants/:id/email-config  (platform admin toggle) ── */
router.patch("/admin/tenants/:id/email-config", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { configAllowed } = req.body as { configAllowed: boolean };

    /* toggle on organizations table */
    await db
      .update(organizationsTable)
      .set({ emailConfigEnabled: configAllowed })
      .where(eq(organizationsTable.id, id));

    /* mirror on email_settings default row */
    const settings = await getOrCreateSettings();
    await db
      .update(emailSettingsTable)
      .set({ configAllowed })
      .where(eq(emailSettingsTable.orgSlug, DEFAULT_SLUG));

    res.json({ ok: true, configAllowed });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /admin/tenants/:id/email-config ── */
router.get("/admin/tenants/:id/email-config", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [org] = await db
      .select({ emailConfigEnabled: organizationsTable.emailConfigEnabled })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, id))
      .limit(1);

    const settings = await getOrCreateSettings();
    const { smtpPass: _pass, ...safeSettings } = settings;

    res.json({
      configAllowed: org?.emailConfigEnabled ?? false,
      settings: { ...safeSettings, hasPassword: !!_pass },
    });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
