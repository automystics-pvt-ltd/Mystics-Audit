import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const transport = createTransport();

  if (!transport) {
    return {
      ok: false,
      error: "SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.",
    };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    await transport.sendMail({
      from: `"Mystics Audit" <${from}>`,
      to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
      subject: opts.subject,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ""),
      html: opts.html,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export function buildAuditorEmailHtml(opts: {
  recipientName?: string;
  message?: string;
  docCount: number;
  filterFY?: string;
  filterPeriod?: string;
  companyName?: string;
}): string {
  const name = opts.recipientName || "Auditor";
  const company = opts.companyName || "Mystics Technologies Pvt Ltd";
  const period = [
    opts.filterFY && `FY ${opts.filterFY}`,
    opts.filterPeriod,
  ].filter(Boolean).join(", ") || "All periods";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 24px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
  .header { background: #6C3CE1; color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 6px 0 0; opacity: .85; font-size: 13px; }
  .body { padding: 28px 32px; }
  .body p { margin: 0 0 16px; line-height: 1.6; }
  .summary { background: #f9f7ff; border: 1px solid #e0d7fa; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
  .summary table { width: 100%; border-collapse: collapse; }
  .summary td { padding: 4px 0; font-size: 14px; }
  .summary td:last-child { text-align: right; font-weight: 600; }
  .footer { border-top: 1px solid #eee; padding: 16px 32px; text-align: center; font-size: 12px; color: #999; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>📁 Audit Document Package</h1>
      <p>${company} — Secure Audit Share</p>
    </div>
    <div class="body">
      <p>Dear ${name},</p>
      <p>${opts.message || "Please find below the audit document package prepared for your review."}</p>
      <div class="summary">
        <table>
          <tr><td>Company</td><td>${company}</td></tr>
          <tr><td>Period</td><td>${period}</td></tr>
          <tr><td>Total Records Shared</td><td>${opts.docCount}</td></tr>
          <tr><td>Shared On</td><td>${new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</td></tr>
        </table>
      </div>
      <p>Please log in to the Mystics Audit portal to access and download the full document package. If you have any questions, please reply to this email.</p>
      <p>Regards,<br><strong>Mystics Audit Team</strong></p>
    </div>
    <div class="footer">This is an automated notification from Mystics Audit. Do not reply directly.</div>
  </div>
</body>
</html>`;
}
