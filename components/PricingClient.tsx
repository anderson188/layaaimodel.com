"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { openAuthModal } from "@/components/AuthModal";
import { API_BASE_URL } from "@/lib/api";
import { apiFetch, SESSION_KEY } from "@/lib/apiClient";
import { approxDecideCalls, CREDIT_PACKS, type CreditPack } from "@/lib/pricing";

export function PricingClient() {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function sync() {
      setToken(window.localStorage.getItem(SESSION_KEY));
    }
    sync();
    window.addEventListener("laya-auth-changed", sync);
    return () => window.removeEventListener("laya-auth-changed", sync);
  }, []);

  async function buy(pack: CreditPack) {
    setMessage(null);
    if (!token) {
      openAuthModal("login");
      setMessage("Sign in to checkout, then click Buy again.");
      return;
    }
    setBusy(pack.id);
    const res = await apiFetch<{ url: string }>("/v1/billing/checkout", {
      method: "POST",
      token,
      body: { pack_id: pack.id },
    });
    setBusy(null);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    window.location.href = res.data.url;
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel px-4 py-3 shadow-glow">
          <p className="text-xs uppercase tracking-wide text-muted">Input tokens</p>
          <p className="mt-1 text-lg font-semibold text-ink">$0.20–$0.42/M</p>
        </div>
        <div className="rounded-lg border border-line bg-panel px-4 py-3 shadow-glow">
          <p className="text-xs uppercase tracking-wide text-muted">Output tokens</p>
          <p className="mt-1 text-lg font-semibold text-ink">Free</p>
        </div>
        <div className="rounded-lg border border-line bg-panel px-4 py-3 shadow-glow">
          <p className="text-xs uppercase tracking-wide text-muted">Per decision (avg)</p>
          <p className="mt-1 text-lg font-semibold text-ink">≈$0.0004</p>
        </div>
      </div>

      {message ? <p className="text-sm text-accent">{message}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <div key={pack.id} className="flex flex-col rounded-lg border border-line bg-panel p-5 shadow-glow">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold text-ink">{pack.label}</h3>
              {pack.badge ? (
                <span className="text-xs font-medium text-accent">{pack.badge}</span>
              ) : null}
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">${pack.usd}</p>
            <p className="mt-2 text-sm text-muted">
              ≈ {pack.tokens.toLocaleString()} input tokens · ${pack.ratePerM}/M
            </p>
            <p className="mt-1 text-xs text-muted">
              ≈ {approxDecideCalls(pack.tokens).toLocaleString()} typical /decide calls · {pack.rpm}{" "}
              RPM
            </p>
            <button
              type="button"
              disabled={busy === pack.id}
              onClick={() => buy(pack)}
              className="mt-4 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
            >
              {busy === pack.id ? "Redirecting…" : `Buy $${pack.usd} →`}
            </button>
          </div>
        ))}
      </div>

      <section className="space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="text-xl font-semibold tracking-tight text-ink">What you are buying</h2>
        <p>
          Prepaid capacity on this unofficial community host: instant <code className="font-mono text-ink">laya_</code>{" "}
          keys, hosted <code className="font-mono text-ink">/v1/decide</code>, batch, gate, and ready-made tools. Same
          ladder as{" "}
          <a className="text-accent hover:underline" href="https://jevtypesafe.org/pricing" rel="noreferrer">
            jevtypesafe.org pricing
          </a>
          . You are not buying a Convai / Impossibl SLA or raw upstream keys.
        </p>
        <p>
          Anonymous visitors get 5 free real-API tool runs. Registered accounts get ~10k free input tokens/month.
          Create keys on{" "}
          <Link className="text-accent hover:underline" href="/account/">
            Account
          </Link>
          . API base: <code className="font-mono text-ink">{API_BASE_URL}</code>
        </p>
        {!token ? (
          <p>
            <button type="button" className="text-accent hover:underline" onClick={() => openAuthModal("login")}>
              Sign in
            </button>{" "}
            before checkout.
          </p>
        ) : null}
      </section>
    </div>
  );
}
