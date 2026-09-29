import type { Env } from "./env";
import { addCredits, getSetting, recentUpstreamStats, resolveUpstreamMode, setSetting } from "./db";
import { bearerToken, error, json } from "./util";

function requireAdmin(env: Env, req: Request): Response | null {
  const token = bearerToken(req);
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return error("Unauthorized", 401, "authentication_error");
  }
  return null;
}

function clampPage(raw: string | null, fallback = 1): number {
  const n = Number.parseInt(raw || "", 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function clampLimit(raw: string | null, fallback = 10, max = 50): number {
  const n = Number.parseInt(raw || "", 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, n);
}

export async function handleAdminOverview(env: Env, req: Request): Promise<Response> {
  const denied = requireAdmin(env, req);
  if (denied) return denied;

  const url = new URL(req.url);
  const usersPage = clampPage(url.searchParams.get("usersPage"));
  const usersLimit = clampLimit(url.searchParams.get("usersLimit"), 10);
  const usersEmail = (url.searchParams.get("usersEmail") || "").trim().toLowerCase();
  const usersSort = url.searchParams.get("usersSort") === "usage" ? "usage" : "created";
  const ledgerPage = clampPage(url.searchParams.get("ledgerPage"));
  const ledgerLimit = clampLimit(url.searchParams.get("ledgerLimit"), 10);
  const recentPage = clampPage(url.searchParams.get("recentPage"));
  const recentLimit = clampLimit(url.searchParams.get("recentLimit"), 10);

  const usersTotalRow = usersEmail
    ? await env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE email LIKE ?")
        .bind(`%${usersEmail}%`)
        .first<{ c: number }>()
    : await env.DB.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>();
  const usersTotal = usersTotalRow?.c ?? 0;
  const usersOffset = (usersPage - 1) * usersLimit;

  // Consumed tokens = sum of usage credits_charged (same unit as prepaid credits).
  const usersSql =
    usersSort === "usage"
      ? `SELECT u.id, u.email, u.credits, u.pack_id, u.disabled, u.created_at,
                COALESCE(s.consumed, 0) as consumed_tokens
         FROM users u
         LEFT JOIN (
           SELECT user_id, SUM(credits_charged) as consumed FROM usage_events GROUP BY user_id
         ) s ON s.user_id = u.id
         ${usersEmail ? "WHERE u.email LIKE ?" : ""}
         ORDER BY consumed_tokens DESC, u.created_at DESC
         LIMIT ? OFFSET ?`
      : `SELECT u.id, u.email, u.credits, u.pack_id, u.disabled, u.created_at,
                COALESCE(s.consumed, 0) as consumed_tokens
         FROM users u
         LEFT JOIN (
           SELECT user_id, SUM(credits_charged) as consumed FROM usage_events GROUP BY user_id
         ) s ON s.user_id = u.id
         ${usersEmail ? "WHERE u.email LIKE ?" : ""}
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`;

  const { results: userRows } = await env.DB.prepare(usersSql)
    .bind(...(usersEmail ? [`%${usersEmail}%`] : []), usersLimit, usersOffset)
    .all<{
      id: string;
      email: string;
      credits: number;
      pack_id: string | null;
      disabled: number | null;
      created_at: string;
      consumed_tokens: number;
    }>();

  const users = (userRows ?? []).map((u) => {
    const remaining = u.credits;
    const consumed = Number(u.consumed_tokens) || 0;
    const total = remaining + consumed;
    return {
      id: u.id,
      email: u.email,
      credits: remaining,
      remaining_tokens: remaining,
      consumed_tokens: consumed,
      total_tokens: total,
      consume_ratio: total > 0 ? consumed / total : 0,
      pack_id: u.pack_id,
      disabled: u.disabled ? 1 : 0,
      created_at: u.created_at,
    };
  });

  const ledgerTotalRow = await env.DB.prepare(
    "SELECT COUNT(*) as c FROM credit_ledger WHERE delta > 0",
  ).first<{ c: number }>();
  const ledgerTotal = ledgerTotalRow?.c ?? 0;
  const ledgerOffset = (ledgerPage - 1) * ledgerLimit;
  const { results: ledgerRows } = await env.DB.prepare(
    `SELECT l.id, l.user_id, u.email as user_email, l.delta, l.reason, l.ref, l.ts as created_at
     FROM credit_ledger l
     LEFT JOIN users u ON u.id = l.user_id
     WHERE l.delta > 0
     ORDER BY l.ts DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(ledgerLimit, ledgerOffset)
    .all();

  const recentTotalRow = await env.DB.prepare("SELECT COUNT(*) as c FROM usage_events").first<{ c: number }>();
  const recentTotal = recentTotalRow?.c ?? 0;
  const recentOffset = (recentPage - 1) * recentLimit;
  const { results: recentRows } = await env.DB.prepare(
    `SELECT e.id, e.user_id, u.email as user_email, e.path, e.model, e.input_tokens,
            e.credits_charged, e.status, e.ts as created_at
     FROM usage_events e
     LEFT JOIN users u ON u.id = e.user_id
     ORDER BY e.ts DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(recentLimit, recentOffset)
    .all();

  const { results: usageByPath } = await env.DB.prepare(
    `SELECT COALESCE(path, '(unknown)') as tool_slug,
            COUNT(*) as runs,
            SUM(input_tokens) as tokens,
            SUM(credits_charged) as credits
     FROM usage_events
     GROUP BY COALESCE(path, '(unknown)')
     ORDER BY runs DESC
     LIMIT 40`,
  ).all<{ tool_slug: string; runs: number; tokens: number; credits: number }>();

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const reg7 = await env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= ?")
    .bind(since7d)
    .first<{ c: number }>();
  const reg24 = await env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= ?")
    .bind(since24h)
    .first<{ c: number }>();
  const allUsers = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>();
  const stripePaid = await env.DB.prepare(
    `SELECT COUNT(*) as c, COALESCE(SUM(delta), 0) as tokens
     FROM credit_ledger WHERE reason = 'stripe_checkout'`,
  ).first<{ c: number; tokens: number }>();
  const adminGranted = await env.DB.prepare(
    `SELECT COUNT(*) as c, COALESCE(SUM(delta), 0) as tokens
     FROM credit_ledger WHERE reason LIKE 'admin_%' AND delta > 0`,
  ).first<{ c: number; tokens: number }>();

  const { results: recentRegs } = await env.DB.prepare(
    `SELECT id, email, credits, pack_id, disabled, created_at
     FROM users ORDER BY created_at DESC LIMIT 15`,
  ).all();

  const mode = await resolveUpstreamMode(env);
  const stats = await recentUpstreamStats(env, 24);
  const maintenance = (await getSetting(env.DB, "maintenance_mode")) === "1" ? "1" : "0";

  return json({
    upstream_mode: mode,
    settings: { upstream_mode: mode, maintenance_mode: maintenance },
    totals: {
      users: allUsers?.c ?? 0,
      registrations_24h: reg24?.c ?? 0,
      registrations_7d: reg7?.c ?? 0,
      stripe_checkouts: stripePaid?.c ?? 0,
      stripe_tokens: stripePaid?.tokens ?? 0,
      admin_grants: adminGranted?.c ?? 0,
      admin_grant_tokens: adminGranted?.tokens ?? 0,
      upstream_24h: stats,
    },
    recent_registrations: recentRegs ?? [],
    users,
    usersMeta: {
      page: usersPage,
      limit: usersLimit,
      total: usersTotal,
      totalPages: Math.max(1, Math.ceil(usersTotal / usersLimit)),
      emailQuery: usersEmail || undefined,
      sort: usersSort,
    },
    ledger: ledgerRows ?? [],
    ledgerMeta: {
      page: ledgerPage,
      limit: ledgerLimit,
      total: ledgerTotal,
      totalPages: Math.max(1, Math.ceil(ledgerTotal / ledgerLimit)),
    },
    recent: recentRows ?? [],
    recentMeta: {
      page: recentPage,
      limit: recentLimit,
      total: recentTotal,
      totalPages: Math.max(1, Math.ceil(recentTotal / recentLimit)),
    },
    usage: (usageByPath ?? []).map((r) => ({
      tool_slug: r.tool_slug,
      runs: r.runs,
      tokens: r.tokens,
      credits: r.credits,
    })),
  });
}

export async function handleAdminAction(env: Env, req: Request): Promise<Response> {
  const denied = requireAdmin(env, req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    mode?: string;
    email?: string;
    userId?: string;
    credits?: number;
    delta?: number;
    disabled?: boolean | number;
    key?: string;
    value?: string;
  } | null;
  if (!body?.action) return error("`action` is required", 400);

  if (body.action === "set_upstream_mode") {
    const mode = body.mode?.toLowerCase();
    if (mode !== "impossibl" && mode !== "paused" && mode !== "selfhost") {
      return error("`mode` must be impossibl | paused | selfhost", 400);
    }
    await setSetting(env.DB, "upstream_mode", mode);
    return json({ upstream_mode: mode });
  }

  if (body.action === "set_setting") {
    if (!body.key || body.value === undefined) return error("`key` and `value` are required", 400);
    const allowed = new Set(["maintenance_mode", "upstream_mode"]);
    if (!allowed.has(body.key)) return error("Setting not allowed", 400);
    if (body.key === "upstream_mode") {
      const mode = String(body.value).toLowerCase();
      if (mode !== "impossibl" && mode !== "paused" && mode !== "selfhost") {
        return error("Invalid upstream_mode", 400);
      }
    }
    if (body.key === "maintenance_mode" && body.value !== "0" && body.value !== "1") {
      return error("maintenance_mode must be 0 or 1", 400);
    }
    await setSetting(env.DB, body.key, String(body.value));
    return json({ ok: true, key: body.key, value: String(body.value) });
  }

  if (body.action === "grant_credits" || body.action === "adjust_credits") {
    const delta =
      body.action === "grant_credits"
        ? Number(body.credits)
        : Number(body.delta);
    if (!Number.isFinite(delta) || delta === 0) {
      return error("`credits` / `delta` must be a non-zero number", 400);
    }
    let userId = body.userId;
    let email = body.email?.toLowerCase();
    if (!userId && email) {
      const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
        .bind(email)
        .first<{ id: string }>();
      if (!user) return error("User not found", 404);
      userId = user.id;
    }
    if (!userId) return error("`userId` or `email` is required", 400);

    if (delta < 0) {
      const row = await env.DB.prepare("SELECT credits FROM users WHERE id = ?")
        .bind(userId)
        .first<{ credits: number }>();
      if (!row) return error("User not found", 404);
      if (row.credits + delta < 0) {
        return error("Insufficient credits to subtract", 400);
      }
    }

    const reason = body.action === "grant_credits" ? "admin_grant" : "admin_adjust";
    await addCredits(env, userId, Math.trunc(delta), reason);
    const refreshed = await env.DB.prepare("SELECT email, credits FROM users WHERE id = ?")
      .bind(userId)
      .first<{ email: string; credits: number }>();
    return json({
      ok: true,
      user_id: userId,
      email: refreshed?.email ?? email,
      delta: Math.trunc(delta),
      credits: refreshed?.credits,
    });
  }

  if (body.action === "set_disabled") {
    if (!body.userId) return error("`userId` is required", 400);
    const disabled = body.disabled === true || body.disabled === 1 ? 1 : 0;
    const result = await env.DB.prepare("UPDATE users SET disabled = ? WHERE id = ?")
      .bind(disabled, body.userId)
      .run();
    if ((result.meta.changes ?? 0) === 0) return error("User not found", 404);
    return json({ ok: true, user_id: body.userId, disabled });
  }

  return error("Unknown action", 400);
}

/** Legacy endpoints kept for scripts / curl. */
export async function handleAdminMode(env: Env, req: Request): Promise<Response> {
  const denied = requireAdmin(env, req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { mode?: string } | null;
  return handleAdminAction(
    env,
    new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ action: "set_upstream_mode", mode: body?.mode }),
    }),
  );
}

export async function handleAdminGrant(env: Env, req: Request): Promise<Response> {
  const denied = requireAdmin(env, req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { email?: string; credits?: number } | null;
  return handleAdminAction(
    env,
    new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ action: "grant_credits", email: body?.email, credits: body?.credits }),
    }),
  );
}

export async function handleAdminAlerts(env: Env, req: Request): Promise<Response> {
  const denied = requireAdmin(env, req);
  if (denied) return denied;
  const { results } = await env.DB.prepare(
    "SELECT id, key_id, user_id, reason, count, ts FROM rate_alerts ORDER BY ts DESC LIMIT 100",
  ).all();
  return json({ alerts: results });
}
