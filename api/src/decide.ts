import type { Env } from "./env";
import { ALLOWED_MODELS, IMPOSSIBL_SYSTEMONE } from "./env";
import {
  chargeCredits,
  countRecentRequests,
  countUserTokensSince,
  findApiKey,
  getUserRpm,
  recordAlert,
  recordUsage,
  resolveUpstreamMode,
  touchBurnAlert,
} from "./db";
import { error, parseIntEnv, uuid } from "./util";

function resolveModel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const mapped = ALLOWED_MODELS[raw as keyof typeof ALLOWED_MODELS];
  return mapped ?? null;
}

export type DecideAuth =
  | { kind: "key"; apiKey: NonNullable<Awaited<ReturnType<typeof findApiKey>>> }
  | { kind: "anon"; ipHash: string };

export async function runDecide(
  env: Env,
  opts: {
    auth: DecideAuth;
    state: unknown;
    questions: Record<string, unknown>;
    modelRaw?: unknown;
    path: string;
  },
): Promise<Response> {
  const requestId = uuid();
  const userId = opts.auth.kind === "key" ? opts.auth.apiKey.user_id : null;
  const keyId = opts.auth.kind === "key" ? opts.auth.apiKey.id : null;
  const credits =
    opts.auth.kind === "key" ? opts.auth.apiKey.credits : Number.POSITIVE_INFINITY;

  const mode = await resolveUpstreamMode(env);
  if (mode === "paused") {
    await recordUsage(env, {
      keyId,
      userId,
      model: "n/a",
      inputTokens: 0,
      outputTokens: 0,
      creditsCharged: 0,
      status: "upstream_paused",
      requestId,
      upstreamStatus: null,
      path: opts.path,
    });
    return error("Gateway paused: upstream monetization or outage switch is on", 503, "upstream_paused");
  }

  if (opts.auth.kind === "key") {
    const rpm = await getUserRpm(env, opts.auth.apiKey.user_id, parseIntEnv(env.RATE_LIMIT_PER_MINUTE, 60));
    const alertThreshold = Math.max(1, Math.floor(rpm * 0.85));
    const recent = await countRecentRequests(env, opts.auth.apiKey.id, 60_000);
    if (recent >= rpm) {
      await recordAlert(env, opts.auth.apiKey.id, opts.auth.apiKey.user_id, "rate_limit", recent + 1);
      await recordUsage(env, {
        keyId,
        userId,
        model: "n/a",
        inputTokens: 0,
        outputTokens: 0,
        creditsCharged: 0,
        status: "rate_limited",
        requestId,
        upstreamStatus: null,
        path: opts.path,
      });
      return error("Rate limit exceeded", 429, "rate_limit_error");
    }
    if (recent + 1 >= alertThreshold) {
      await recordAlert(env, opts.auth.apiKey.id, opts.auth.apiKey.user_id, "high_rate", recent + 1);
    }

    // Soft burn caps similar to jevtypesafe (scaled down defaults for free upstream host)
    const hourCap = parseIntEnv(env.TOKEN_BURN_CAP_HOUR, 5_000_000);
    const dayCap = parseIntEnv(env.TOKEN_BURN_CAP_DAY, 80_000_000);
    const hourUsed = await countUserTokensSince(env, opts.auth.apiKey.user_id, 60 * 60 * 1000);
    const dayUsed = await countUserTokensSince(env, opts.auth.apiKey.user_id, 24 * 60 * 60 * 1000);
    if (hourUsed >= hourCap || dayUsed >= dayCap) {
      await recordAlert(env, opts.auth.apiKey.id, opts.auth.apiKey.user_id, "burn_cap", hourUsed);
      return error("Account token burn cap reached. Try again later or buy a larger pack.", 429, "rate_limit_error");
    }
  }

  if (!opts.questions || typeof opts.questions !== "object" || Array.isArray(opts.questions)) {
    return error("`questions` must be an object with at least one entry", 400);
  }
  if (Object.keys(opts.questions).length < 1) {
    return error("`questions` must hold at least one entry", 400);
  }
  if (opts.state === undefined) {
    return error("`state` is required", 400);
  }

  const model = resolveModel(opts.modelRaw ?? "convaiinnovations/laya");
  if (!model) {
    return error(
      "Unsupported model. Use convaiinnovations/laya or convaiinnovations/laya-multilingual",
      400,
    );
  }

  if (opts.auth.kind === "key" && credits < 1) {
    return error("Insufficient credits. Top up to continue.", 402, "insufficient_quota");
  }

  const upstreamBase =
    mode === "selfhost" && env.SELFHOST_BASE_URL
      ? `${env.SELFHOST_BASE_URL.replace(/\/$/, "")}/v1/systemone`
      : IMPOSSIBL_SYSTEMONE;

  if (mode === "selfhost" && !env.SELFHOST_BASE_URL) {
    return error("SELFHOST_BASE_URL is not configured", 503, "provider_not_configured");
  }
  if (mode === "impossibl" && !env.IMPOSSIBL_API_KEY) {
    return error("IMPOSSIBL_API_KEY is not configured", 503, "provider_not_configured");
  }

  const upstreamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };
  if (env.IMPOSSIBL_API_KEY) {
    upstreamHeaders.Authorization = `Bearer ${env.IMPOSSIBL_API_KEY}`;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamBase, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({ model, state: opts.state, questions: opts.questions }),
    });
  } catch (err) {
    await recordUsage(env, {
      keyId,
      userId,
      model,
      inputTokens: 0,
      outputTokens: 0,
      creditsCharged: 0,
      status: "upstream_network_error",
      requestId,
      upstreamStatus: null,
      path: opts.path,
    });
    return error(`Upstream network error: ${String(err)}`, 502, "upstream_error");
  }

  const upstreamText = await upstream.text();
  type UpstreamBody = {
    usage?: { input_tokens?: number; output_tokens?: number };
    model?: string;
    answers?: unknown;
  };
  let upstreamJson: UpstreamBody | null = null;
  try {
    upstreamJson = JSON.parse(upstreamText) as UpstreamBody;
  } catch {
    upstreamJson = null;
  }

  if (upstream.status === 401 || upstream.status === 403) {
    await recordUsage(env, {
      keyId,
      userId,
      model,
      inputTokens: 0,
      outputTokens: 0,
      creditsCharged: 0,
      status: "upstream_auth_error",
      requestId,
      upstreamStatus: upstream.status,
      path: opts.path,
    });
    return error("Upstream provider authentication failed", 502, "upstream_error");
  }

  const inputTokens = upstreamJson?.usage?.input_tokens ?? 0;
  const outputTokens = upstreamJson?.usage?.output_tokens ?? 0;
  const creditsPerToken = parseIntEnv(env.CREDITS_PER_INPUT_TOKEN, 1);
  const creditsCharged =
    opts.auth.kind === "key" && upstream.ok ? inputTokens * creditsPerToken : 0;

  if (opts.auth.kind === "key" && creditsCharged > 0) {
    const charged = await chargeCredits(env, opts.auth.apiKey.user_id, creditsCharged, requestId);
    if (!charged) {
      await recordUsage(env, {
        keyId,
        userId,
        model,
        inputTokens,
        outputTokens,
        creditsCharged: 0,
        status: "insufficient_after_upstream",
        requestId,
        upstreamStatus: upstream.status,
        path: opts.path,
      });
      return error("Insufficient credits. Top up to continue.", 402, "insufficient_quota");
    }
    await touchBurnAlert(env, opts.auth.apiKey.user_id, opts.auth.apiKey.id);
  }

  await recordUsage(env, {
    keyId,
    userId,
    model,
    inputTokens,
    outputTokens,
    creditsCharged,
    status: upstream.ok ? (opts.auth.kind === "anon" ? "anon_ok" : "ok") : "upstream_error",
    requestId,
    upstreamStatus: upstream.status,
    path: opts.path,
  });

  return new Response(upstreamText, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
      "X-Request-Id": requestId,
      "X-Credits-Charged": String(creditsCharged),
    },
  });
}

export function runGate(body: Record<string, unknown>): Response {
  const answers = body.answers as Record<string, Record<string, unknown>> | undefined;
  const policy = (body.policy ?? {}) as {
    min_confidence?: number;
    noul?: Record<string, { block_above?: number; review_above?: number }>;
    choice?: Record<string, { allow?: string[]; block?: string[]; review?: string[] }>;
  };
  if (!answers || typeof answers !== "object") {
    return error("`answers` is required", 400);
  }

  const reasons: string[] = [];
  let decision: "allow" | "review" | "block" = "allow";
  const minConf = policy.min_confidence ?? 0;

  for (const [id, ans] of Object.entries(answers)) {
    const type = ans.type;
    if (typeof ans.confidence === "number" && ans.confidence < minConf) {
      reasons.push(`${id}: confidence ${ans.confidence} < ${minConf}`);
      decision = decision === "block" ? "block" : "review";
    }
    if (type === "noul" && policy.noul?.[id] && typeof ans.noul === "number") {
      const p = policy.noul[id];
      if (p.block_above !== undefined && ans.noul >= p.block_above) {
        reasons.push(`${id}: noul ${ans.noul} >= block_above ${p.block_above}`);
        decision = "block";
      } else if (p.review_above !== undefined && ans.noul >= p.review_above) {
        reasons.push(`${id}: noul ${ans.noul} >= review_above ${p.review_above}`);
        if (decision !== "block") decision = "review";
      }
    }
    if (type === "choice" && policy.choice?.[id] && typeof ans.choice === "string") {
      const p = policy.choice[id];
      if (p.block?.includes(ans.choice)) {
        reasons.push(`${id}: choice ${ans.choice} blocked`);
        decision = "block";
      } else if (p.review?.includes(ans.choice)) {
        reasons.push(`${id}: choice ${ans.choice} review`);
        if (decision !== "block") decision = "review";
      } else if (p.allow && !p.allow.includes(ans.choice)) {
        reasons.push(`${id}: choice ${ans.choice} not in allow list`);
        if (decision !== "block") decision = "review";
      }
    }
  }

  return new Response(JSON.stringify({ decision, reasons, billed: false }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
