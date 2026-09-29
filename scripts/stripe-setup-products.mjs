#!/usr/bin/env node
/**
 * Create Stripe Products + Prices for Laya credit packs.
 * Reads STRIPE_SECRET_KEY from env or api/.dev.vars (never prints the key).
 *
 * Usage: node scripts/stripe-setup-products.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const apiDir = join(root, "api");

const PACKS = [
  { id: "starter_5", label: "Starter", usd: 5, tokens: 11_900_000, ratePerM: 0.42 },
  { id: "pack_10", label: "$10", usd: 10, tokens: 23_800_000, ratePerM: 0.42 },
  { id: "pack_20", label: "$20", usd: 20, tokens: 47_600_000, ratePerM: 0.42 },
  { id: "staging_50", label: "Staging", usd: 50, tokens: 142_900_000, ratePerM: 0.35 },
  { id: "popular_100", label: "Popular", usd: 100, tokens: 400_000_000, ratePerM: 0.25 },
  { id: "scale_250", label: "Scale", usd: 250, tokens: 1_136_400_000, ratePerM: 0.22 },
  { id: "volume_500", label: "Volume", usd: 500, tokens: 2_500_000_000, ratePerM: 0.2 },
];

function loadKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY.trim();
  const p = join(apiDir, ".dev.vars");
  if (!existsSync(p)) throw new Error("Missing STRIPE_SECRET_KEY and api/.dev.vars");
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^STRIPE_SECRET_KEY=(.*)$/.exec(line);
    if (m) return m[1].trim();
  }
  throw new Error("STRIPE_SECRET_KEY not found in .dev.vars");
}

async function stripe(key, method, path, params) {
  const body = params ? new URLSearchParams(params) : undefined;
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${path}: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data;
}

async function findExistingProduct(key, packId) {
  const list = await stripe(key, "GET", "/products?limit=100&active=true");
  return (list.data || []).find((p) => p.metadata?.pack_id === packId && p.metadata?.app === "layaaimodel");
}

async function main() {
  const key = loadKey();
  const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown";
  console.log(`Stripe mode: ${mode}`);

  const mapping = { mode, created_at: new Date().toISOString(), prices: {} };

  for (const pack of PACKS) {
    let product = await findExistingProduct(key, pack.id);
    if (!product) {
      product = await stripe(key, "POST", "/products", {
        name: `Laya AI ${pack.label} — ${pack.tokens.toLocaleString()} input tokens`,
        description: `Prepaid input tokens at $${pack.ratePerM}/M. Output free. Unofficial community gateway.`,
        "metadata[app]": "layaaimodel",
        "metadata[pack_id]": pack.id,
        "metadata[tokens]": String(pack.tokens),
        "metadata[rate_per_m]": String(pack.ratePerM),
      });
      console.log(`created product ${pack.id} -> ${product.id}`);
    } else {
      console.log(`reuse product ${pack.id} -> ${product.id}`);
    }

    // Prefer an existing matching one-time USD price for this product
    const prices = await stripe(key, "GET", `/prices?product=${product.id}&active=true&limit=20`);
    let price = (prices.data || []).find(
      (p) =>
        p.currency === "usd" &&
        p.unit_amount === pack.usd * 100 &&
        p.type === "one_time" &&
        p.metadata?.pack_id === pack.id,
    );
    if (!price) {
      price = await stripe(key, "POST", "/prices", {
        product: product.id,
        currency: "usd",
        unit_amount: String(pack.usd * 100),
        "metadata[app]": "layaaimodel",
        "metadata[pack_id]": pack.id,
        "metadata[tokens]": String(pack.tokens),
      });
      console.log(`  created price $${pack.usd} -> ${price.id}`);
    } else {
      console.log(`  reuse price $${pack.usd} -> ${price.id}`);
    }

    mapping.prices[pack.id] = {
      product_id: product.id,
      price_id: price.id,
      usd: pack.usd,
      tokens: pack.tokens,
    };
  }

  // Webhook endpoint for production Worker
  const webhookUrl = "https://api.layaaimodel.com/v1/billing/webhook";
  const hooks = await stripe(key, "GET", "/webhook_endpoints?limit=100");
  let hook = (hooks.data || []).find((h) => h.url === webhookUrl);
  let webhookSecret = null;
  if (!hook) {
    hook = await stripe(key, "POST", "/webhook_endpoints", {
      url: webhookUrl,
      "enabled_events[]": "checkout.session.completed",
      description: "layaaimodel.com prepaid packs",
      "metadata[app]": "layaaimodel",
    });
    webhookSecret = hook.secret || null;
    console.log(`created webhook ${hook.id} -> ${webhookUrl}`);
    if (webhookSecret) {
      console.log("webhook signing secret received (writing to .dev.vars, not printed)");
    }
  } else {
    console.log(`reuse webhook ${hook.id} -> ${webhookUrl}`);
    console.log("NOTE: existing webhook secret is not re-exported by Stripe; keep your saved STRIPE_WEBHOOK_SECRET");
  }

  const outPath = join(apiDir, "stripe-prices.json");
  writeFileSync(outPath, JSON.stringify(mapping, null, 2) + "\n");
  console.log(`wrote ${outPath}`);

  // Persist webhook secret if newly created
  if (webhookSecret) {
    const devPath = join(apiDir, ".dev.vars");
    const lines = existsSync(devPath) ? readFileSync(devPath, "utf8").split(/\r?\n/).filter(Boolean) : [];
    const filtered = lines.filter((l) => !l.startsWith("STRIPE_WEBHOOK_SECRET="));
    filtered.push(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
    writeFileSync(devPath, filtered.join("\n") + "\n");
    console.log("updated .dev.vars with STRIPE_WEBHOOK_SECRET");
  }

  console.log("[done] Stripe products ready");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
