import type { Env } from "./env";
import { adminEmailSet } from "./db";

const SITE_MARK = "https://www.layaaimodel.com/official/logo-mark.png";
const SUPPORT_EMAIL = "support@layaaimodel.com";
const ADMIN_URL = "https://www.layaaimodel.com/admin/";

function notifyRecipients(env: Env): string[] {
  const dedicated = (env.ADMIN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (dedicated.length) return dedicated;
  return [...adminEmailSet(env)];
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

/** Fire-and-forget admin email via Resend. No-op when RESEND_API_KEY is unset. */
export async function notifyAdmins(
  env: Env,
  subject: string,
  text: string,
): Promise<{ sent: boolean; reason?: string }> {
  const recipients = notifyRecipients(env);
  if (recipients.length === 0) {
    console.log("[notify] skipped: no notify recipients", subject);
    return { sent: false, reason: "no_admin_emails" };
  }
  if (!env.RESEND_API_KEY) {
    console.log("[notify] skipped: RESEND_API_KEY unset", subject, text.slice(0, 200));
    return { sent: false, reason: "no_resend_key" };
  }

  // Prefer support@ once the domain is verified in Resend; otherwise Resend onboarding sender.
  const from =
    env.RESEND_FROM ||
    `Laya AI <${SUPPORT_EMAIL}>`;
  const html = brandedHtml(subject, text);
  const textWithContact = `${text}\n\nContact: ${SUPPORT_EMAIL}\nAdmin: ${ADMIN_URL}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        reply_to: SUPPORT_EMAIL,
        subject: `[Laya AI] ${subject}`,
        text: textWithContact,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      // Domain not verified yet — retry with Resend's shared onboarding sender.
      if (res.status === 403 || /domain|not verified|from/i.test(body)) {
        const fallback = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Laya AI Alerts <onboarding@resend.dev>",
            to: recipients,
            reply_to: SUPPORT_EMAIL,
            subject: `[Laya AI] ${subject}`,
            text: textWithContact,
            html,
          }),
        });
        if (!fallback.ok) {
          const fb = await fallback.text();
          console.error("[notify] Resend failed", fallback.status, fb.slice(0, 500));
          return { sent: false, reason: `resend_${fallback.status}` };
        }
        return { sent: true };
      }
      console.error("[notify] Resend failed", res.status, body.slice(0, 500));
      return { sent: false, reason: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[notify] Resend error", err);
    return { sent: false, reason: "resend_error" };
  }
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
  sessionId?: string;
}): string {
  return [
    "Prepaid pack purchased (Stripe checkout completed)",
    "",
    `Email:   ${opts.email}`,
    `User ID: ${opts.userId}`,
    `Pack:    ${opts.packId ?? "(unknown)"}`,
    `Credits: +${opts.credits.toLocaleString()}`,
    `Session: ${opts.sessionId ?? "(none)"}`,
    `When:    ${new Date().toISOString()}`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
