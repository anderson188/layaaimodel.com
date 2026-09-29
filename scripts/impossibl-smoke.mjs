#!/usr/bin/env node
/**
 * Phase 0 smoke checks against Impossibl (read-only catalog + optional live call).
 *
 * Usage:
 *   node scripts/impossibl-smoke.mjs
 *   set IMPOSSIBL_API_KEY=imp-rt-... && node scripts/impossibl-smoke.mjs
 */

const BASE = "https://api.impossibl.com";
const ALLOWED = ["convaiinnovations/laya", "convaiinnovations/laya-multilingual"];

async function main() {
  const modelsRes = await fetch(`${BASE}/v1/models`);
  if (!modelsRes.ok) {
    throw new Error(`GET /v1/models failed: ${modelsRes.status}`);
  }
  const body = await modelsRes.json();
  const models = body.data ?? body;
  const byId = new Map(models.map((m) => [m.id, m]));

  for (const id of ALLOWED) {
    const m = byId.get(id);
    if (!m) throw new Error(`Missing model in catalog: ${id}`);
    const input = m.pricing?.input_per_mtok_usd;
    const output = m.pricing?.output_per_mtok_usd;
    console.log(`[ok] ${id} pricing input=${input} output=${output} endpoints=${JSON.stringify(m.endpoints)}`);
    if (input !== 0 || output !== 0) {
      console.warn(`[warn] ${id} is no longer free — update gateway pricing assumptions`);
    }
  }

  const unauth = await fetch(`${BASE}/v1/systemone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "convaiinnovations/laya",
      state: "smoke",
      questions: { ok: { type: "noul", instructions: "Is this a smoke test?" } },
    }),
  });
  console.log(`[ok] unauthenticated /v1/systemone => ${unauth.status} (expect 401)`);
  if (unauth.status !== 401) {
    throw new Error(`Expected 401 without key, got ${unauth.status}`);
  }

  const key = process.env.IMPOSSIBL_API_KEY;
  if (!key) {
    console.log("[skip] live Laya call — set IMPOSSIBL_API_KEY to exercise funded-account path");
    console.log("[done] catalog + auth gate verified");
    return;
  }

  const live = await fetch(`${BASE}/v1/systemone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "convaiinnovations/laya",
      state: "Help! My payouts have been failing for 3 days.",
      questions: {
        is_urgent: { type: "noul", instructions: "Does this convey urgency?" },
      },
    }),
  });
  const text = await live.text();
  console.log(`[live] status=${live.status}`);
  console.log(text.slice(0, 800));
  if (live.status === 402) {
    console.warn("[warn] 402 insufficient credits — fund the Impossibl workspace even for free Laya");
  }
  if (!live.ok) {
    throw new Error(`Live call failed: ${live.status}`);
  }
  console.log("[done] live Laya call succeeded");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
