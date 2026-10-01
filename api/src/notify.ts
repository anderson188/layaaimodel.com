import type { Env } from "./env";
import { adminEmailSet } from "./db";

const SITE_MARK = "https://www.layaaimodel.com/official/logo-mark.png";
const SUPPORT_EMAIL = "support@layaaimodel.com";
const ADMIN_URL = "https://www.layaaimodel.com/admin/";
const DEFAULT_NOTIFY = "2420133012@qq.com";

/** Alert email cooldown (per reason+user) to avoid inbox floods. */
const ALERT_EMAIL_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function notifyRecipients(env: Env): string[] {
  const dedicated = (env.ADMIN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (dedicated.length) return dedicated;
  const admins = [...adminEmailSet(env)];
  if (admins.length) return admins;
  return [DEFAULT_NOTIFY];
}

function brandedHtml(title: string, bodyText: string): string {
  const lines = escapeHtml(bodyText)
    .split("\n")
    .map((line) => (line ? line : "&nbsp;"))
    .join("<br/>");
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#121410;color:#f3efe6;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#121410;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#1b1f1c;border:1px solid #2c312b;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #2c312b;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${SITE_MARK}" width="28" height="28" alt="Laya AI" style="display:block;border:0;" />
                  </td>
                  <td style="vertical-align:middle;font-size:18px;font-weight:600;color:#f3efe6;letter-spacing:-0.02em;">
                    Laya AI
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#3dbe98;">${escapeHtml(title)}</p>
              <p style="margin:0;font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.55;color:#b7b1a6;">${lines}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #2c312b;font-size:12px;color:#b7b1a6;">
              Contact:
              <a href="mailto:${SUPPORT_EMAIL}" style="color:#3dbe98;text-decoration:none;">${SUPPORT_EMAIL}</a>
              ·
              <a href="${ADMIN_URL}" style="color:#3dbe98;text-decoration:none;">Admin</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type SendResult = { sent: boolean; reason?: string; via?: string };

async function sendViaCloudflareEmail(
  env: Env,
  to: string[],
  subject: string,
  text: string,
  html: string,
): Promise<SendResult> {
  const binding = env.EMAIL;
  if (!binding?.send) return { sent: false, reason: "no_email_binding" };
  const fromEmail =
    (env.EMAIL_FROM || SUPPORT_EMAIL).replace(/^.*<([^>]+)>.*$/, "$1").trim() || SUPPORT_EMAIL;
  const fromName = "Laya AI";
  try {
    await binding.send({
      to,
      from: { email: fromEmail, name: fromName },
      replyTo: SUPPORT_EMAIL,
      subject: `[Laya AI] ${subject}`,
      text,
      html,
    });
    return { sent: true, via: "cloudflare_email" };
  } catch (err) {
    console.error("[notify] Cloudflare EMAIL.send failed", err);
    return { sent: false, reason: "cf_email_error" };
  }
}

async function sendViaResend(
  env: Env,
  to: string[],
  subject: string,
  text: string,
  html: string,
): Promise<SendResult> {
  if (!env.RESEND_API_KEY) return { sent: false, reason: "no_resend_key" };
  const from = env.RESEND_FROM || `Laya AI <${SUPPORT_EMAIL}>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: SUPPORT_EMAIL,
        subject: `[Laya AI] ${subject}`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 403 || /domain|not verified|from/i.test(body)) {
        const fallback = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Laya AI Alerts <onboarding@resend.dev>",
            to,
            reply_to: SUPPORT_EMAIL,
            subject: `[Laya AI] ${subject}`,
            text,
            html,
          }),
        });
        if (!fallback.ok) {
          console.error("[notify] Resend failed", fallback.status, (await fallback.text()).slice(0, 500));
          return { sent: false, reason: `resend_${fallback.status}` };
        }
        return { sent: true, via: "resend_fallback" };
      }
      console.error("[notify] Resend failed", res.status, body.slice(0, 500));
      return { sent: false, reason: `resend_${res.status}` };
    }
    return { sent: true, via: "resend" };
  } catch (err) {
    console.error("[notify] Resend error", err);
    return { sent: false, reason: "resend_error" };
  }
}

/** Fire-and-forget admin email. Prefer Cloudflare Email binding (same as jevtypesafe), else Resend. */
export async function notifyAdmins(
  env: Env,
  subject: string,
  text: string,
): Promise<SendResult> {
  const recipients = notifyRecipients(env);
  if (recipients.length === 0) {
    console.log("[notify] skipped: no notify recipients", subject);
    return { sent: false, reason: "no_admin_emails" };
  }

  const html = brandedHtml(subject, text);
  const textWithContact = `${text}\n\nContact: ${SUPPORT_EMAIL}\nAdmin: ${ADMIN_URL}`;

  const cf = await sendViaCloudflareEmail(env, recipients, subject, textWithContact, html);
  if (cf.sent) return cf;

  const resend = await sendViaResend(env, recipients, subject, textWithContact, html);
  if (resend.sent) return resend;

  console.log(
    "[notify] skipped: no working mail transport",
    subject,
    { cf: cf.reason, resend: resend.reason, to: recipients },
  );
  return { sent: false, reason: cf.reason === "no_email_binding" ? resend.reason : cf.reason };
}

export function registrationNotifyText(email: string, credits: number, userId: string): string {
  return [
    "New user registered on layaaimodel.com",
    "",
    `Email:   ${email}`,
    `User ID: ${userId}`,
    `Signup credits: ${credits.toLocaleString()}`,
    `When:    ${new Date().toISOString()}`,
  ].join("\n");
}

export function rechargeNotifyText(opts: {
  email: string;
  userId: string;
  packId: string | null;
  credits: number;
  usd?: number | null;
  sessionId?: string;
}): string {
  const amount =
    opts.usd != null && Number.isFinite(opts.usd) ? `$${opts.usd}` : "(unknown)";
  return [
    "Prepaid pack purchased (Stripe checkout completed)",
    "",
    `Email:   ${opts.email}`,
    `User ID: ${opts.userId}`,
    `Amount:  ${amount}`,
    `Pack:    ${opts.packId ?? "(unknown)"}`,
    `Credits: +${opts.credits.toLocaleString()}`,
    `Session: ${opts.sessionId ?? "(none)"}`,
    `When:    ${new Date().toISOString()}`,
  ].join("\n");
}

export function alertNotifyText(opts: {
  email: string;
  userId: string;
  reason: string;
  count: number;
  keyId?: string | null;
}): string {
  return [
    "Account alert on layaaimodel.com",
    "",
    `Reason:  ${opts.reason}`,
    `Email:   ${opts.email}`,
    `User ID: ${opts.userId}`,
    `Key ID:  ${opts.keyId ?? "(none)"}`,
    `Count:   ${opts.count}`,
    `When:    ${new Date().toISOString()}`,
  ].join("\n");
}

/** Record alert + email admin (cooldown per user+reason). */
export async function recordAlertAndNotify(
  env: Env,
  keyId: string | null,
  userId: string,
  reason: string,
  count: number,
): Promise<void> {
  const { recordAlert } = await import("./db");
  await recordAlert(env, keyId ?? "unknown", userId, reason, count);

  const since = new Date(Date.now() - ALERT_EMAIL_COOLDOWN_MS).toISOString();
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) as c FROM rate_alerts
     WHERE user_id = ? AND reason = ? AND ts >= ?`,
  )
    .bind(userId, reason, since)
    .first<{ c: number }>();
  // recordAlert just inserted one — if more than 1 in window, we already emailed recently.
  if ((recent?.c ?? 0) > 1) return;

  const user = await env.DB.prepare("SELECT email FROM users WHERE id = ?")
    .bind(userId)
    .first<{ email: string }>();
  await notifyAdmins(
    env,
    `Alert: ${reason} · ${user?.email ?? userId}`,
    alertNotifyText({
      email: user?.email ?? "(unknown)",
      userId,
      reason,
      count,
      keyId,
    }),
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
