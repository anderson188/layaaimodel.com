import type { Env } from "./env";

export async function verifyTurnstile(
  env: Env,
  token: string | undefined,
  remoteIp: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!env.TURNSTILE_SECRET) {
    // Fail closed once Turnstile is wired — missing secret would let bots through.
    console.error("[turnstile] TURNSTILE_SECRET not configured");
    return { ok: false, reason: "turnstile_not_configured" };
  }
  if (!token || typeof token !== "string" || token.length < 10) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET,
    response: token,
  });
  if (remoteIp && remoteIp !== "local") body.set("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => null)) as {
    success?: boolean;
    "error-codes"?: string[];
  } | null;
  if (!data?.success) {
    return { ok: false, reason: (data?.["error-codes"] ?? ["verify_failed"]).join(",") };
  }
  return { ok: true };
}
