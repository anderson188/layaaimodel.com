import type { Env } from "./env";
import {
  addCredits,
  createApiKey,
  createSession,
  findOrCreateUserByEmail,
  findUserByEmail,
  ledgerHasRef,
  setUserPack,
} from "./db";
import { notifyAdmins, rechargeNotifyText } from "./notify";
import { packById } from "./packs";
import priceMap from "../stripe-prices.json";
import { nowIso, randomToken } from "./util";

function priceIdForPack(packId: string): string | null {
  const entry = (priceMap as { prices: Record<string, { price_id: string }> }).prices?.[packId];
  return entry?.price_id ?? null;
}

export async function createCheckoutSession(
  env: Env,
  opts: {
    packId: string;
    userId?: string | null;
    email?: string | null;
  },
): Promise<{ url: string } | { error: string; status: number }> {
  if (!env.STRIPE_SECRET_KEY) {
    return { error: "Stripe is not configured on this gateway", status: 503 };
  }
  const pack = packById(opts.packId);
  if (!pack) return { error: "Unknown pack id", status: 400 };

  const priceId = priceIdForPack(pack.id);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set(
    "success_url",
    `${env.SITE_URL}/account/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  );
  params.set("cancel_url", `${env.SITE_URL}/pricing/?checkout=cancel`);
  params.set("metadata[credits]", String(pack.tokens));
  params.set("metadata[pack_id]", pack.id);
  params.set("line_items[0][quantity]", "1");

  if (opts.userId) {
    params.set("client_reference_id", opts.userId);
    params.set("metadata[user_id]", opts.userId);
  } else {
    params.set("metadata[guest]", "1");
  }

  if (opts.email) {
    params.set("customer_email", opts.email);
  }

  if (priceId) {
    params.set("line_items[0][price]", priceId);
  } else {
    const unitAmount = Math.round(pack.usd * 100);
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
    params.set(
      "line_items[0][price_data][product_data][name]",
      `Laya AI ${pack.label} — ${pack.tokens.toLocaleString()} input tokens`,
    );
    params.set(
      "line_items[0][price_data][product_data][description]",
      `Prepaid hosted Laya decide capacity at $${pack.ratePerM}/M input. Output free.`,
    );
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return { error: data.error?.message || "Stripe checkout failed", status: 502 };
  }
  return { url: data.url };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim() ?? ""];
    }),
  ) as Record<string, string>;
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return timingSafeEqual(expected, v1);
}

type StripeCheckoutSession = {
  id?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
  payment_status?: string;
  status?: string;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  success_url?: string | null;
  cancel_url?: string | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: { object: StripeCheckoutSession };
};

async function fetchStripeSession(
  env: Env,
  sessionId: string,
): Promise<StripeCheckoutSession | null> {
  if (!env.STRIPE_SECRET_KEY) return null;
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as StripeCheckoutSession;
}

function sessionEmail(session: StripeCheckoutSession): string | null {
  const raw = session.customer_details?.email || session.customer_email || null;
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null;
  return raw.toLowerCase();
}

/** Credit the buyer for a paid Checkout session (idempotent on session id). */
export async function applyPaidCheckout(
  env: Env,
  session: StripeCheckoutSession,
  ctx?: ExecutionContext,
): Promise<{ userId: string; email: string; credits: number; packId: string | null } | { error: string }> {
  if (!session.id) return { error: "Missing session id" };
  if (session.payment_status === "unpaid") return { error: "Payment not completed" };

  // Shared Stripe account with jevtypesafe.org — ignore foreign checkouts.
  const siteHost = (() => {
    try {
      return new URL(env.SITE_URL).hostname;
    } catch {
      return "layaaimodel.com";
    }
  })();
  const success = session.success_url || "";
  const cancel = session.cancel_url || "";
  const urlsOk = success.includes(siteHost) || cancel.includes(siteHost);
  const packIdRaw = session.metadata?.pack_id ?? null;
  const layaPack = packIdRaw ? packById(packIdRaw) : undefined;
  if (!urlsOk || !layaPack) {
    return { error: "Ignored non-Laya checkout session" };
  }

  const packId = layaPack.id;
  const credits = Number.parseInt(
    session.metadata?.credits || String(layaPack.tokens || env.STRIPE_PRICE_CREDITS || "11900000"),
    10,
  );
  if (!(credits > 0)) return { error: "Invalid credit amount" };

  let userId = session.client_reference_id || session.metadata?.user_id || null;
  let email = sessionEmail(session);

  if (!userId) {
    if (!email) return { error: "Checkout email missing" };
    const password = `tmp_${randomToken(12)}`;
    const { user } = await findOrCreateUserByEmail(env, email, password);
    userId = user.id;
    email = user.email;
  } else if (!email) {
    const row = await env.DB.prepare("SELECT email FROM users WHERE id = ?")
      .bind(userId)
      .first<{ email: string }>();
    email = row?.email ?? null;
    if (!email) return { error: "User not found for checkout" };
  }

  if (!(await ledgerHasRef(env, "stripe_checkout", session.id))) {
    await addCredits(env, userId, credits, "stripe_checkout", session.id);
    await setUserPack(env, userId, packId);

    const notify = notifyAdmins(
      env,
      `Recharge: ${email} +${credits.toLocaleString()}`,
      rechargeNotifyText({
        email,
        userId,
        packId,
        credits,
        sessionId: session.id,
      }),
    );
    if (ctx) ctx.waitUntil(notify);
    else void notify;
  }

  return { userId, email, credits, packId };
}

/**
 * After Stripe redirects back: ensure credits, sign the buyer in, mint a key once.
 * Guest buyers get a one-time login_password when the account was just created.
 */
export async function claimCheckoutSession(
  env: Env,
  sessionId: string,
): Promise<
  | {
      email: string;
      credits: number;
      session_token: string;
      api_key: string | null;
      login_password: string | null;
      new_account: boolean;
    }
  | { error: string; status: number }
> {
  if (!sessionId.startsWith("cs_")) {
    return { error: "Invalid session id", status: 400 };
  }
  const session = await fetchStripeSession(env, sessionId);
  if (!session?.id) return { error: "Checkout session not found", status: 404 };
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { error: "Payment not completed yet", status: 402 };
  }

  const emailHint = sessionEmail(session);
  const existingBefore =
    emailHint && !(session.client_reference_id || session.metadata?.user_id)
      ? await findUserByEmail(env, emailHint)
      : null;

  let loginPassword: string | null = null;
  let userId = session.client_reference_id || session.metadata?.user_id || null;

  if (!userId) {
    if (!emailHint) return { error: "Checkout email missing", status: 400 };
    if (!existingBefore) {
      loginPassword = `tmp_${randomToken(12)}`;
      const { user } = await findOrCreateUserByEmail(env, emailHint, loginPassword);
      userId = user.id;
    } else {
      userId = existingBefore.id;
    }
  }

  const applied = await applyPaidCheckout(env, {
    ...session,
    client_reference_id: userId,
    metadata: { ...(session.metadata ?? {}), user_id: userId },
  });
  if ("error" in applied) return { error: applied.error, status: 400 };

  const sessionToken = await createSession(env, applied.userId);

  const keyName = `checkout-${session.id.slice(-10)}`;
  const existingKey = await env.DB.prepare(
    "SELECT id FROM api_keys WHERE user_id = ? AND name = ? AND status = 'active' LIMIT 1",
  )
    .bind(applied.userId, keyName)
    .first();

  let apiKey: string | null = null;
  if (!existingKey) {
    const { plaintext } = await createApiKey(env, applied.userId, keyName);
    apiKey = plaintext;
  }

  const refreshed = await env.DB.prepare("SELECT credits FROM users WHERE id = ?")
    .bind(applied.userId)
    .first<{ credits: number }>();

  return {
    email: applied.email,
    credits: refreshed?.credits ?? applied.credits,
    session_token: sessionToken,
    api_key: apiKey,
    login_password: loginPassword,
    new_account: !!loginPassword,
  };
}

export async function handleStripeWebhook(
  env: Env,
  req: Request,
  ctx?: ExecutionContext,
): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return new Response("Stripe webhook not configured", { status: 503 });
  }
  const payload = await req.text();
  const ok = await verifyStripeSignature(payload, req.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(payload) as StripeEvent;
  const existing = await env.DB.prepare("SELECT id FROM stripe_events WHERE id = ?")
    .bind(event.id)
    .first();
  if (existing) return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });

  if (event.type === "checkout.session.completed") {
    const applied = await applyPaidCheckout(env, event.data.object, ctx);
    if ("error" in applied && applied.error !== "Ignored non-Laya checkout session") {
      // Still ack Stripe so it does not retry forever on permanent rejects;
      // log-worthy foreign sessions are intentionally ignored above.
      console.warn("checkout apply:", applied.error, event.data.object.id);
    }
  }

  await env.DB.prepare("INSERT INTO stripe_events (id, processed_at) VALUES (?, ?)")
    .bind(event.id, nowIso())
    .run();

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
