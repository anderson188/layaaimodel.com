import type { Env } from "./env";
import { addCredits, setUserPack } from "./db";
import { notifyAdmins, rechargeNotifyText } from "./notify";
import { packById } from "./packs";
import priceMap from "../stripe-prices.json";
import { nowIso } from "./util";

function priceIdForPack(packId: string): string | null {
  const entry = (priceMap as { prices: Record<string, { price_id: string }> }).prices?.[packId];
  return entry?.price_id ?? null;
}

export async function createCheckoutSession(
  env: Env,
  userId: string,
  email: string,
  packId: string,
): Promise<{ url: string } | { error: string; status: number }> {
  if (!env.STRIPE_SECRET_KEY) {
    return { error: "Stripe is not configured on this gateway", status: 503 };
  }
  const pack = packById(packId);
  if (!pack) return { error: "Unknown pack id", status: 400 };

  const priceId = priceIdForPack(pack.id);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${env.SITE_URL}/account/?checkout=success`);
  params.set("cancel_url", `${env.SITE_URL}/pricing/?checkout=cancel`);
  params.set("customer_email", email);
  params.set("client_reference_id", userId);
  params.set("metadata[user_id]", userId);
  params.set("metadata[credits]", String(pack.tokens));
  params.set("metadata[pack_id]", pack.id);
  params.set("line_items[0][quantity]", "1");

  if (priceId) {
    params.set("line_items[0][price]", priceId);
  } else {
    // Fallback if stripe-prices.json is missing an entry
    const unitAmount = Math.round(pack.usd * 100);
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
    params.set(
      "line_items[0][price_data][product_data][name]",
      `Laya AI ${pack.label} — ${pack.tokens.toLocaleString()} input tokens`,
    );
    params.set(
      "line_items[0][price_data][product_data][description]",
      `Prepaid input tokens at $${pack.ratePerM}/M. Output free. Unofficial community gateway.`,
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

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      client_reference_id?: string | null;
      metadata?: Record<string, string>;
      payment_status?: string;
      customer_email?: string | null;
    };
  };
};

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
    const session = event.data.object;
    const userId = session.client_reference_id || session.metadata?.user_id;
    const packId = session.metadata?.pack_id ?? null;
    const pack = packId ? packById(packId) : undefined;
    const credits = Number.parseInt(
      session.metadata?.credits || String(pack?.tokens || env.STRIPE_PRICE_CREDITS || "11900000"),
      10,
    );
    if (userId && credits > 0 && session.payment_status !== "unpaid") {
      await addCredits(env, userId, credits, "stripe_checkout", session.id);
      if (packId) await setUserPack(env, userId, packId);

      const user = await env.DB.prepare("SELECT email FROM users WHERE id = ?")
        .bind(userId)
        .first<{ email: string }>();
      const notify = notifyAdmins(
        env,
        `Recharge: ${user?.email ?? userId} +${credits.toLocaleString()}`,
        rechargeNotifyText({
          email: user?.email ?? "(unknown)",
          userId,
          packId,
          credits,
          sessionId: session.id,
        }),
      );
      if (ctx) ctx.waitUntil(notify);
      else void notify;
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
