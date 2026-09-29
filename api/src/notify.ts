import type { Env } from "./env";
import { adminEmailSet } from "./db";

/** Fire-and-forget admin email via Resend. No-op when RESEND_API_KEY is unset. */
export async function notifyAdmins(
  env: Env,
  subject: string,
  text: string,
): Promise<{ sent: boolean; reason?: string }> {
  const recipients = [...adminEmailSet(env)];
  if (recipients.length === 0) {
    console.log("[notify] skipped: ADMIN_EMAILS empty", subject);
    return { sent: false, reason: "no_admin_emails" };
  }
  if (!env.RESEND_API_KEY) {
    console.log("[notify] skipped: RESEND_API_KEY unset", subject, text.slice(0, 200));
    return { sent: false, reason: "no_resend_key" };
  }

  const from = env.RESEND_FROM || "Laya AI Alerts <onboarding@resend.dev>";
  const html = `<pre style="font-family:ui-monospace,monospace;font-size:14px;white-space:pre-wrap">${escapeHtml(text)}</pre>`;

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
        subject: `[Laya AI] ${subject}`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
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
    "",
    `Admin: ${`https://www.layaaimodel.com/admin/`}`,
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
    "",
    `Admin: ${`https://www.layaaimodel.com/admin/`}`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
