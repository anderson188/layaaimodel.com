import {
  handleAdminAction,
  handleAdminAlerts,
  handleAdminGrant,
  handleAdminMode,
  handleAdminOverview,
} from "./admin";
import {
  anonTrialRemaining,
  consumeAnonTrial,
  createApiKey,
  createSession,
  createUser,
  ensureMonthlyFreeTokens,
  findApiKey,
  getSetting,
  recentUpstreamStats,
  resolveUpstreamMode,
  revokeApiKey,
  syncUserAdminFlag,
  usageSummary,
  userFromSession,
  verifyUser,
} from "./db";
import { runDecide, runGate } from "./decide";
import type { Env } from "./env";
import { ANON_FREE_TOOL_RUNS, CREDIT_PACKS, MONTHLY_FREE_TOKENS } from "./packs";
import { createCheckoutSession, handleStripeWebhook } from "./stripe";
import { notifyAdmins, registrationNotifyText } from "./notify";
import { findToolHandler } from "./toolHandlers";
import {
  bearerToken,
  error,
  json,
  nowIso,
  sha256Hex,
  withCors,
} from "./util";

async function requireUser(env: Env, req: Request) {
  const token = bearerToken(req);
  const user = await userFromSession(env, token);
  if (user) {
    await ensureMonthlyFreeTokens(env, user.id, MONTHLY_FREE_TOKENS);
    const refreshed = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(user.id)
      .first<typeof user>();
    return refreshed ?? user;
  }
  return null;
}

async function resolveDecideAuth(env: Env, req: Request, allowAnon: boolean) {
  const token = bearerToken(req);
  if (token) {
    const apiKey = await findApiKey(env, token);
    if (!apiKey) return { error: error("Invalid or revoked API key", 401, "authentication_error") };
    return { auth: { kind: "key" as const, apiKey } };
  }
  if (!allowAnon) return { error: error("Missing API key", 401, "authentication_error") };
  const ip = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "local";
  const ipHash = await sha256Hex(ip.split(",")[0].trim());
  const ok = await consumeAnonTrial(env, ipHash, ANON_FREE_TOOL_RUNS);
  if (!ok) {
    return {
      error: error(
        `Anonymous free tool runs exhausted (${ANON_FREE_TOOL_RUNS}). Sign in, buy a pack, or paste a laya_ key.`,
        402,
        "insufficient_quota",
      ),
    };
  }
  return { auth: { kind: "anon" as const, ipHash } };
}

async function handleDecide(env: Env, req: Request, path: string, allowAnon = false): Promise<Response> {
  if ((await getSetting(env.DB, "maintenance_mode")) === "1") {
    return error("Gateway is in maintenance mode", 503, "maintenance");
  }
  const authResult = await resolveDecideAuth(env, req, allowAnon);
  if ("error" in authResult && authResult.error) return authResult.error;
  const auth = authResult.auth!;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return error("Malformed JSON body", 400);
  return runDecide(env, {
    auth,
    state: body.state,
    questions: body.questions as Record<string, unknown>,
    modelRaw: body.model,
    path,
  });
}

async function handleBatchDecide(env: Env, req: Request): Promise<Response> {
  if ((await getSetting(env.DB, "maintenance_mode")) === "1") {
    return error("Gateway is in maintenance mode", 503, "maintenance");
  }
  const authResult = await resolveDecideAuth(env, req, false);
  if ("error" in authResult && authResult.error) return authResult.error;
  const auth = authResult.auth!;
  const body = (await req.json().catch(() => null)) as {
    states?: unknown[];
    questions?: Record<string, unknown>;
    model?: string;
  } | null;
  if (!body?.states || !Array.isArray(body.states) || body.states.length < 1) {
    return error("`states` must be a non-empty array", 400);
  }
  if (body.states.length > 20) return error("Batch limit is 20 states", 400);
  if (!body.questions) return error("`questions` is required", 400);

  const results: unknown[] = [];
  let totalIn = 0;
  let totalOut = 0;
  for (const state of body.states) {
    const res = await runDecide(env, {
      auth,
      state,
      questions: body.questions,
      modelRaw: body.model,
      path: "/v1/batch/decide",
    });
    const text = await res.text();
    let parsed: { usage?: { input_tokens?: number; output_tokens?: number }; answers?: unknown; model?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      return error("Upstream returned non-JSON in batch", 502, "upstream_error");
    }
    if (!res.ok) {
      return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
    }
    totalIn += parsed.usage?.input_tokens ?? 0;
    totalOut += parsed.usage?.output_tokens ?? 0;
    results.push({ model: parsed.model, answers: parsed.answers, usage: parsed.usage });
  }
  return json({
    results,
    usage: { input_tokens: totalIn, output_tokens: totalOut },
  });
}

async function handleTool(env: Env, req: Request, path: string): Promise<Response> {
  if ((await getSetting(env.DB, "maintenance_mode")) === "1") {
    return error("Gateway is in maintenance mode", 503, "maintenance");
  }
  const handler = findToolHandler(path);
  if (!handler) return error("Unknown tool", 404);
  const authResult = await resolveDecideAuth(env, req, true);
  if ("error" in authResult && authResult.error) return authResult.error;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return error("Malformed JSON body", 400);
  const built = handler.build(body);
  if ("error" in built) return error(built.error, 400);
  return runDecide(env, {
    auth: authResult.auth!,
    state: built.state,
    questions: built.questions as Record<string, unknown>,
    modelRaw: body.model,
    path,
  });
}

async function handleRegister(env: Env, req: Request, ctx?: ExecutionContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) return error("`email` and `password` are required", 400);
  if (body.password.length < 8) return error("Password must be at least 8 characters", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return error("Invalid email", 400);
  try {
    const { user, sessionToken } = await createUser(env, body.email, body.password);
    const notify = notifyAdmins(
      env,
      `New registration: ${user.email}`,
      registrationNotifyText(user.email, user.credits, user.id),
    );
    if (ctx) ctx.waitUntil(notify);
    else void notify;
    return json(
      {
        user: {
          id: user.id,
          email: user.email,
          credits: user.credits,
          pack_id: user.pack_id,
          is_admin: !!user.is_admin,
        },
        session_token: sessionToken,
      },
      201,
    );
  } catch (err) {
    const msg = String(err);
    if (msg.includes("UNIQUE") || msg.toLowerCase().includes("constraint")) {
      return error("Email already registered", 409);
    }
    throw err;
  }
}

async function handleLogin(env: Env, req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) return error("`email` and `password` are required", 400);
  const user = await verifyUser(env, body.email, body.password);
  if (!user) return error("Invalid email or password", 401, "authentication_error");
  if (user.disabled) return error("Account disabled", 403, "authentication_error");
  const synced = await syncUserAdminFlag(env, user);
  await ensureMonthlyFreeTokens(env, synced.id, MONTHLY_FREE_TOKENS);
  const sessionToken = await createSession(env, synced.id);
  const refreshed = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(synced.id).first<typeof synced>();
  const u = refreshed ?? synced;
  return json({
    user: {
      id: u.id,
      email: u.email,
      credits: u.credits,
      pack_id: u.pack_id,
      is_admin: !!u.is_admin,
    },
    session_token: sessionToken,
  });
}

async function handleMe(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const synced = await syncUserAdminFlag(env, user);
  const summary = await usageSummary(env, synced.id);
  return json({
    user: {
      id: synced.id,
      email: synced.email,
      credits: synced.credits,
      pack_id: synced.pack_id,
      alert_email_enabled: !!synced.alert_email_enabled,
      alert_burn_pct: synced.alert_burn_pct,
      is_admin: !!synced.is_admin,
    },
    usage: summary,
  });
}

async function handleAlertSettings(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const body = (await req.json().catch(() => null)) as {
    alert_email_enabled?: boolean;
    alert_burn_pct?: number;
  } | null;
  if (!body) return error("Malformed JSON", 400);
  const enabled = body.alert_email_enabled === false ? 0 : 1;
  const pct = Math.min(99, Math.max(1, body.alert_burn_pct ?? user.alert_burn_pct ?? 80));
  await env.DB.prepare("UPDATE users SET alert_email_enabled = ?, alert_burn_pct = ? WHERE id = ?")
    .bind(enabled, pct, user.id)
    .run();
  return json({ alert_email_enabled: !!enabled, alert_burn_pct: pct });
}

async function handleListKeys(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const { results } = await env.DB.prepare(
    "SELECT id, name, key_prefix, status, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
  )
    .bind(user.id)
    .all();
  return json({ keys: results });
}

async function handleCreateKey(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const { key, plaintext } = await createApiKey(env, user.id, body.name?.trim() || "default");
  return json(
    {
      id: key.id,
      name: key.name,
      key_prefix: key.key_prefix,
      status: key.status,
      created_at: key.created_at,
      key: plaintext,
      warning: "Store this key now. It will not be shown again.",
    },
    201,
  );
}

async function handleRevokeKey(env: Env, req: Request, keyId: string): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const ok = await revokeApiKey(env, user.id, keyId);
  if (!ok) return error("Key not found", 404);
  return json({ revoked: true, id: keyId });
}

async function handleUsage(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const { results } = await env.DB.prepare(
    `SELECT id, model, input_tokens, output_tokens, credits_charged, status, request_id, path, ts
     FROM usage_events WHERE user_id = ? ORDER BY ts DESC LIMIT 200`,
  )
    .bind(user.id)
    .all();
  return json({ events: results, summary: await usageSummary(env, user.id) });
}

async function handleUserAlerts(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const { results } = await env.DB.prepare(
    "SELECT id, key_id, reason, count, ts FROM rate_alerts WHERE user_id = ? ORDER BY ts DESC LIMIT 100",
  )
    .bind(user.id)
    .all();
  return json({ alerts: results });
}

async function handleBillingLedger(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const { results } = await env.DB.prepare(
    `SELECT id, delta, reason, ref, ts FROM credit_ledger
     WHERE user_id = ? ORDER BY ts DESC LIMIT 50`,
  )
    .bind(user.id)
    .all();
  return json({ entries: results, credits: user.credits });
}

async function handleCheckout(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  if (!user) return error("Unauthorized", 401, "authentication_error");
  const body = (await req.json().catch(() => null)) as { pack_id?: string } | null;
  const packId = body?.pack_id || "starter_5";
  const result = await createCheckoutSession(env, user.id, user.email, packId);
  if ("error" in result) return error(result.error, result.status);
  return json({ url: result.url, pack_id: packId });
}

async function handlePacks(): Promise<Response> {
  return json({
    packs: CREDIT_PACKS,
    anon_free_tool_runs: ANON_FREE_TOOL_RUNS,
    monthly_free_tokens: MONTHLY_FREE_TOKENS,
    notes: [
      "Pay for input only — output is free.",
      "API + tools share one prepaid balance.",
      "Tokens never expire while your account is active.",
    ],
  });
}

async function handleAnonStatus(env: Env, req: Request): Promise<Response> {
  const ip = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "local";
  const ipHash = await sha256Hex(ip.split(",")[0].trim());
  const remaining = await anonTrialRemaining(env, ipHash, ANON_FREE_TOOL_RUNS);
  return json({ remaining, max: ANON_FREE_TOOL_RUNS });
}

async function handleStatus(env: Env): Promise<Response> {
  const mode = await resolveUpstreamMode(env);
  const stats = await recentUpstreamStats(env, 24);
  const catalogProbe = await fetch("https://api.impossibl.com/v1/models")
    .then(async (r) => {
      if (!r.ok) return { ok: false as const, status: r.status };
      const body = (await r.json()) as {
        data?: Array<{ id: string; pricing?: { input_per_mtok_usd?: number } }>;
      };
      const laya = (body.data ?? []).find((m) => m.id === "convaiinnovations/laya");
      return {
        ok: true as const,
        status: r.status,
        laya_free: laya?.pricing?.input_per_mtok_usd === 0,
        laya_input_per_mtok_usd: laya?.pricing?.input_per_mtok_usd ?? null,
      };
    })
    .catch(() => ({ ok: false as const, status: 0, laya_free: null, laya_input_per_mtok_usd: null }));

  const healthy =
    mode !== "paused" && (mode === "selfhost" || (catalogProbe.ok && catalogProbe.laya_free !== false));

  return json({
    status: healthy ? "operational" : mode === "paused" ? "paused" : "degraded",
    upstream_mode: mode,
    checked_at: nowIso(),
    impossibl_catalog: catalogProbe,
    last_24h: stats,
    notes: [
      "Unofficial community gateway. Not affiliated with Convai Innovations, TypeSafe, or Impossibl.",
      "Inference is proxied to a third-party host unless upstream_mode=selfhost.",
      "Published local T4 latency figures do not apply to this hosted path.",
    ],
  });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin, env.SITE_URL);
    }

    let res: Response;
    try {
      if (req.method === "GET" && (path === "/health" || path === "/")) {
        res = json({ ok: true, service: "layaaimodel-api", ts: nowIso() });
      } else if (req.method === "GET" && path === "/v1/status") {
        res = await handleStatus(env);
      } else if (req.method === "GET" && path === "/v1/packs") {
        res = await handlePacks();
      } else if (req.method === "GET" && path === "/v1/anon/status") {
        res = await handleAnonStatus(env, req);
      } else if (req.method === "POST" && (path === "/v1/systemone" || path === "/v1/decide")) {
        res = await handleDecide(env, req, path, false);
      } else if (req.method === "POST" && path === "/v1/batch/decide") {
        res = await handleBatchDecide(env, req);
      } else if (req.method === "POST" && path === "/v1/gate") {
        const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
        res = body ? runGate(body) : error("Malformed JSON", 400);
      } else if (req.method === "POST" && findToolHandler(path)) {
        res = await handleTool(env, req, path);
      } else if (req.method === "POST" && path === "/v1/auth/register") {
        res = await handleRegister(env, req, ctx);
      } else if (req.method === "POST" && path === "/v1/auth/login") {
        res = await handleLogin(env, req);
      } else if (req.method === "GET" && path === "/v1/me") {
        res = await handleMe(env, req);
      } else if (req.method === "POST" && path === "/v1/me/alerts") {
        res = await handleAlertSettings(env, req);
      } else if (req.method === "GET" && path === "/v1/keys") {
        res = await handleListKeys(env, req);
      } else if (req.method === "POST" && path === "/v1/keys") {
        res = await handleCreateKey(env, req);
      } else if (req.method === "DELETE" && path.startsWith("/v1/keys/")) {
        res = await handleRevokeKey(env, req, path.slice("/v1/keys/".length));
      } else if (req.method === "GET" && path === "/v1/usage") {
        res = await handleUsage(env, req);
      } else if (req.method === "GET" && path === "/v1/alerts") {
        res = await handleUserAlerts(env, req);
      } else if (req.method === "GET" && path === "/v1/billing/ledger") {
        res = await handleBillingLedger(env, req);
      } else if (req.method === "POST" && path === "/v1/billing/checkout") {
        res = await handleCheckout(env, req);
      } else if (req.method === "POST" && path === "/v1/billing/webhook") {
        res = await handleStripeWebhook(env, req, ctx);
      } else if (req.method === "GET" && path === "/v1/admin/overview") {
        res = await handleAdminOverview(env, req);
      } else if (req.method === "POST" && path === "/v1/admin/action") {
        res = await handleAdminAction(env, req);
      } else if (req.method === "POST" && path === "/v1/admin/upstream-mode") {
        res = await handleAdminMode(env, req);
      } else if (req.method === "POST" && path === "/v1/admin/grant-credits") {
        res = await handleAdminGrant(env, req);
      } else if (req.method === "GET" && path === "/v1/admin/alerts") {
        res = await handleAdminAlerts(env, req);
      } else {
        res = error("Not found", 404);
      }
    } catch (err) {
      console.error(err);
      res = error("Internal error", 500, "server_error");
    }

    return withCors(res, origin, env.SITE_URL);
  },
};
