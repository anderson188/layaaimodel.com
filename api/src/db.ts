import type { Env } from "./env";
import { MONTHLY_FREE_TOKENS } from "./packs";
import { hashPassword, nowIso, parseIntEnv, randomToken, sha256Hex, uuid } from "./util";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  credits: number;
  pack_id: string | null;
  alert_email_enabled: number;
  alert_burn_pct: number;
  disabled?: number;
  is_admin?: number;
  created_at: string;
};

export type ApiKeyRow = {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  status: string;
  created_at: string;
};

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(key, value)
    .run();
}

export async function resolveUpstreamMode(env: Env): Promise<"impossibl" | "paused" | "selfhost"> {
  const fromDb = await getSetting(env.DB, "upstream_mode");
  const mode = (fromDb ?? env.UPSTREAM_MODE ?? "impossibl").toLowerCase();
  if (mode === "paused" || mode === "selfhost" || mode === "impossibl") return mode;
  return "impossibl";
}

export function adminEmailSet(env: Env): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(env: Env, email: string): boolean {
  return adminEmailSet(env).has(email.toLowerCase());
}

/** Keep users.is_admin in sync with ADMIN_EMAILS. */
export async function syncUserAdminFlag(env: Env, user: UserRow): Promise<UserRow> {
  const want = isAdminEmail(env, user.email) ? 1 : 0;
  if ((user.is_admin ?? 0) === want) return user;
  await env.DB.prepare("UPDATE users SET is_admin = ? WHERE id = ?").bind(want, user.id).run();
  return { ...user, is_admin: want };
}

export async function createUser(
  env: Env,
  email: string,
  password: string,
): Promise<{ user: UserRow; sessionToken: string }> {
  const id = uuid();
  const salt = randomToken(16);
  const pepper = env.SESSION_PEPPER ?? "dev-pepper";
  const password_hash = await hashPassword(password, salt, pepper);
  const created_at = nowIso();
  const credits = parseIntEnv(env.DEFAULT_SIGNUP_CREDITS, MONTHLY_FREE_TOKENS);

  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, salt, credits, pack_id, alert_email_enabled, alert_burn_pct, disabled, is_admin, created_at) VALUES (?, ?, ?, ?, ?, NULL, 1, 80, 0, ?, ?)",
  )
    .bind(id, email.toLowerCase(), password_hash, salt, credits, isAdminEmail(env, email) ? 1 : 0, created_at)
    .run();

  if (credits > 0) {
    const yyyymm = created_at.slice(0, 7);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO credit_ledger (id, user_id, delta, reason, ref, ts) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(uuid(), id, credits, "signup_bonus", null, created_at),
      env.DB.prepare("INSERT INTO monthly_grants (user_id, yyyymm, tokens) VALUES (?, ?, ?)").bind(
        id,
        yyyymm,
        credits,
      ),
    ]);
  }

  const sessionToken = await createSession(env, id);
  const user: UserRow = {
    id,
    email: email.toLowerCase(),
    password_hash,
    salt,
    credits,
    pack_id: null,
    alert_email_enabled: 1,
    alert_burn_pct: 80,
    disabled: 0,
    is_admin: isAdminEmail(env, email) ? 1 : 0,
    created_at,
  };
  return { user, sessionToken };
}

export async function verifyUser(env: Env, email: string, password: string): Promise<UserRow | null> {
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<UserRow>();
  if (!user) return null;
  const pepper = env.SESSION_PEPPER ?? "dev-pepper";
  const hash = await hashPassword(password, user.salt, pepper);
  if (hash !== user.password_hash) return null;
  return user;
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = `sess_${randomToken(32)}`;
  const token_hash = await sha256Hex(token);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token_hash, userId, expires)
    .run();
  return token;
}

export async function userFromSession(env: Env, token: string | null): Promise<UserRow | null> {
  if (!token?.startsWith("sess_")) return null;
  const token_hash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(token_hash, nowIso())
    .first<UserRow>();
  if (!row || row.disabled) return null;
  return row;
}

export async function createApiKey(
  env: Env,
  userId: string,
  name: string,
): Promise<{ key: ApiKeyRow; plaintext: string }> {
  const id = uuid();
  const secret = randomToken(24);
  const plaintext = `laya_${secret}`;
  const key_hash = await sha256Hex(plaintext);
  const key_prefix = plaintext.slice(0, 12);
  const created_at = nowIso();
  await env.DB.prepare(
    `INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`,
  )
    .bind(id, userId, name, key_prefix, key_hash, created_at)
    .run();
  return {
    key: { id, user_id: userId, name, key_prefix, key_hash, status: "active", created_at },
    plaintext,
  };
}

export async function findApiKey(env: Env, token: string | null): Promise<(ApiKeyRow & { credits: number; email: string }) | null> {
  if (!token?.startsWith("laya_")) return null;
  const key_hash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT k.id, k.user_id, k.name, k.key_prefix, k.key_hash, k.status, k.created_at,
            u.credits as credits, u.email as email, u.disabled as disabled
     FROM api_keys k JOIN users u ON u.id = k.user_id
     WHERE k.key_hash = ? AND k.status = 'active'`,
  )
    .bind(key_hash)
    .first<ApiKeyRow & { credits: number; email: string; disabled?: number }>();
  if (!row || row.disabled) return null;
  return row;
}

export async function revokeApiKey(env: Env, userId: string, keyId: string): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE api_keys SET status = 'revoked' WHERE id = ? AND user_id = ?",
  )
    .bind(keyId, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function addCredits(env: Env, userId: string, delta: number, reason: string, ref?: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").bind(delta, userId),
    env.DB.prepare(
      "INSERT INTO credit_ledger (id, user_id, delta, reason, ref, ts) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(uuid(), userId, delta, reason, ref ?? null, nowIso()),
  ]);
}

export async function chargeCredits(env: Env, userId: string, amount: number, ref: string): Promise<boolean> {
  if (amount <= 0) return true;
  const result = await env.DB.prepare(
    "UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?",
  )
    .bind(amount, userId, amount)
    .run();
  if ((result.meta.changes ?? 0) === 0) return false;
  await env.DB.prepare(
    "INSERT INTO credit_ledger (id, user_id, delta, reason, ref, ts) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(uuid(), userId, -amount, "systemone", ref, nowIso())
    .run();
  return true;
}

export async function countRecentRequests(env: Env, keyId: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as c FROM usage_events WHERE key_id = ? AND ts >= ?",
  )
    .bind(keyId, since)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

export async function recordAlert(
  env: Env,
  keyId: string,
  userId: string,
  reason: string,
  count: number,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO rate_alerts (id, key_id, user_id, reason, count, ts) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(uuid(), keyId, userId, reason, count, nowIso())
    .run();
}

export async function recordUsage(
  env: Env,
  data: {
    keyId: string | null;
    userId: string | null;
    model: string;
    inputTokens: number;
    outputTokens: number;
    creditsCharged: number;
    status: string;
    requestId: string;
    upstreamStatus: number | null;
    path?: string;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO usage_events
      (id, key_id, user_id, model, input_tokens, output_tokens, credits_charged, status, request_id, upstream_status, path, ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      uuid(),
      data.keyId,
      data.userId,
      data.model,
      data.inputTokens,
      data.outputTokens,
      data.creditsCharged,
      data.status,
      data.requestId,
      data.upstreamStatus,
      data.path ?? null,
      nowIso(),
    )
    .run();
}

export async function countUserTokensSince(env: Env, userId: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const row = await env.DB.prepare(
    "SELECT COALESCE(SUM(input_tokens), 0) as c FROM usage_events WHERE user_id = ? AND ts >= ? AND status IN ('ok','anon_ok')",
  )
    .bind(userId, since)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

export async function getUserRpm(env: Env, userId: string, fallback: number): Promise<number> {
  const user = await env.DB.prepare("SELECT pack_id FROM users WHERE id = ?")
    .bind(userId)
    .first<{ pack_id: string | null }>();
  if (!user?.pack_id) return fallback;
  const { packById } = await import("./packs");
  return packById(user.pack_id)?.rpm ?? fallback;
}

export async function setUserPack(env: Env, userId: string, packId: string): Promise<void> {
  await env.DB.prepare("UPDATE users SET pack_id = ? WHERE id = ?").bind(packId, userId).run();
}

export async function touchBurnAlert(env: Env, userId: string, keyId: string): Promise<void> {
  const user = await env.DB.prepare("SELECT credits, alert_burn_pct, alert_email_enabled FROM users WHERE id = ?")
    .bind(userId)
    .first<{ credits: number; alert_burn_pct: number; alert_email_enabled: number }>();
  if (!user || !user.alert_email_enabled) return;
  // Alert when remaining credits are low relative to last purchase / balance snapshot via ledger total purchased.
  const purchased =
    (
      await env.DB.prepare(
        "SELECT COALESCE(SUM(delta), 0) as c FROM credit_ledger WHERE user_id = ? AND delta > 0",
      )
        .bind(userId)
        .first<{ c: number }>()
    )?.c ?? 0;
  if (purchased <= 0) return;
  const usedPct = ((purchased - user.credits) / purchased) * 100;
  if (usedPct >= user.alert_burn_pct) {
    await recordAlert(env, keyId, userId, "balance_burn", Math.round(usedPct));
  }
}

export async function consumeAnonTrial(env: Env, ipHash: string, maxRuns: number): Promise<boolean> {
  const row = await env.DB.prepare("SELECT runs FROM anon_trials WHERE ip_hash = ?")
    .bind(ipHash)
    .first<{ runs: number }>();
  const runs = row?.runs ?? 0;
  if (runs >= maxRuns) return false;
  if (row) {
    await env.DB.prepare("UPDATE anon_trials SET runs = runs + 1, updated_at = ? WHERE ip_hash = ?")
      .bind(nowIso(), ipHash)
      .run();
  } else {
    await env.DB.prepare("INSERT INTO anon_trials (ip_hash, runs, updated_at) VALUES (?, 1, ?)")
      .bind(ipHash, nowIso())
      .run();
  }
  return true;
}

export async function anonTrialRemaining(env: Env, ipHash: string, maxRuns: number): Promise<number> {
  const row = await env.DB.prepare("SELECT runs FROM anon_trials WHERE ip_hash = ?")
    .bind(ipHash)
    .first<{ runs: number }>();
  return Math.max(0, maxRuns - (row?.runs ?? 0));
}

export async function ensureMonthlyFreeTokens(env: Env, userId: string, amount: number): Promise<number> {
  const yyyymm = new Date().toISOString().slice(0, 7);
  const existing = await env.DB.prepare("SELECT tokens FROM monthly_grants WHERE user_id = ? AND yyyymm = ?")
    .bind(userId, yyyymm)
    .first<{ tokens: number }>();
  if (existing) return 0;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO monthly_grants (user_id, yyyymm, tokens) VALUES (?, ?, ?)").bind(
      userId,
      yyyymm,
      amount,
    ),
    env.DB.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").bind(amount, userId),
    env.DB.prepare(
      "INSERT INTO credit_ledger (id, user_id, delta, reason, ref, ts) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(uuid(), userId, amount, "monthly_free", yyyymm, nowIso()),
  ]);
  return amount;
}

export async function usageSummary(env: Env, userId: string): Promise<{
  last_24h_calls: number;
  last_24h_tokens: number;
  last_7d_calls: number;
  last_7d_tokens: number;
  alerts_24h: number;
}> {
  const d1 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const c24 =
    (
      await env.DB.prepare("SELECT COUNT(*) as c FROM usage_events WHERE user_id = ? AND ts >= ?")
        .bind(userId, d1)
        .first<{ c: number }>()
    )?.c ?? 0;
  const t24 =
    (
      await env.DB.prepare(
        "SELECT COALESCE(SUM(input_tokens),0) as c FROM usage_events WHERE user_id = ? AND ts >= ?",
      )
        .bind(userId, d1)
        .first<{ c: number }>()
    )?.c ?? 0;
  const c7 =
    (
      await env.DB.prepare("SELECT COUNT(*) as c FROM usage_events WHERE user_id = ? AND ts >= ?")
        .bind(userId, d7)
        .first<{ c: number }>()
    )?.c ?? 0;
  const t7 =
    (
      await env.DB.prepare(
        "SELECT COALESCE(SUM(input_tokens),0) as c FROM usage_events WHERE user_id = ? AND ts >= ?",
      )
        .bind(userId, d7)
        .first<{ c: number }>()
    )?.c ?? 0;
  const a24 =
    (
      await env.DB.prepare("SELECT COUNT(*) as c FROM rate_alerts WHERE user_id = ? AND ts >= ?")
        .bind(userId, d1)
        .first<{ c: number }>()
    )?.c ?? 0;
  return {
    last_24h_calls: c24,
    last_24h_tokens: t24,
    last_7d_calls: c7,
    last_7d_tokens: t7,
    alerts_24h: a24,
  };
}

export async function recentUpstreamStats(env: Env, hours = 24): Promise<{
  total: number;
  upstream5xx: number;
  rateLimited: number;
}> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const total =
    (
      await env.DB.prepare("SELECT COUNT(*) as c FROM usage_events WHERE ts >= ?")
        .bind(since)
        .first<{ c: number }>()
    )?.c ?? 0;
  const upstream5xx =
    (
      await env.DB.prepare(
        "SELECT COUNT(*) as c FROM usage_events WHERE ts >= ? AND upstream_status >= 500",
      )
        .bind(since)
        .first<{ c: number }>()
    )?.c ?? 0;
  const rateLimited =
    (
      await env.DB.prepare("SELECT COUNT(*) as c FROM rate_alerts WHERE ts >= ?")
        .bind(since)
        .first<{ c: number }>()
    )?.c ?? 0;
  return { total, upstream5xx, rateLimited };
}
