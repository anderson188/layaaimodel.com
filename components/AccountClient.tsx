"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { openAuthModal } from "@/components/AuthModal";
import { API_BASE_URL, API_DISCLAIMER } from "@/lib/api";
import { apiFetch, SESSION_KEY } from "@/lib/apiClient";
import { CREDIT_PACKS } from "@/lib/pricing";

type User = {
  id: string;
  email: string;
  credits: number;
  pack_id?: string | null;
  alert_email_enabled?: boolean;
  alert_burn_pct?: number;
};
type KeyRow = { id: string; name: string; key_prefix: string; status: string; created_at: string };
type UsageRow = {
  id: string;
  model: string | null;
  input_tokens: number;
  credits_charged: number;
  status: string;
  path?: string | null;
  ts: string;
};
type AlertRow = { id: string; reason: string; count: number; ts: string };
type Summary = {
  last_24h_calls: number;
  last_24h_tokens: number;
  last_7d_calls: number;
  last_7d_tokens: number;
  alerts_24h: number;
};

export function AccountClient() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [burnPct, setBurnPct] = useState(80);
  const [alertEnabled, setAlertEnabled] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(SESSION_KEY);
    if (saved) setToken(saved);
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "cancel") {
      setMessage("Checkout canceled — no charge was made.");
    }
    if (!saved) {
      const m = params.get("mode") === "register" ? "register" : "login";
      openAuthModal(m);
    }
    if (checkout === "success" && saved) {
      setMessage("Payment received — confirming credit top-up…");
      let tries = 0;
      const timer = window.setInterval(async () => {
        tries += 1;
        const ledger = await apiFetch<{
          credits: number;
          entries: Array<{ reason: string; delta: number; ts: string }>;
        }>("/v1/billing/ledger", { token: saved });
        if (ledger.ok) {
          const recent = ledger.data.entries.find((e) => e.reason === "stripe_checkout");
          const ageMs = recent ? Date.now() - new Date(recent.ts).getTime() : Number.POSITIVE_INFINITY;
          if (recent && ageMs < 15 * 60 * 1000) {
            setMessage(
              `Payment confirmed — +${recent.delta.toLocaleString()} credits applied. Balance ${ledger.data.credits.toLocaleString()}.`,
            );
            setToken(saved);
            window.clearInterval(timer);
            window.history.replaceState(null, "", "/account/");
            return;
          }
        }
        if (tries >= 12) {
          setMessage(
            "Payment received. Credits usually appear within a minute — refresh if the balance has not updated.",
          );
          window.clearInterval(timer);
          window.history.replaceState(null, "", "/account/");
        }
      }, 2500);
      return () => window.clearInterval(timer);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    void refresh(token);
  }, [token]);

  useEffect(() => {
    function onAuth() {
      setToken(window.localStorage.getItem(SESSION_KEY));
    }
    window.addEventListener("laya-auth-changed", onAuth);
    return () => window.removeEventListener("laya-auth-changed", onAuth);
  }, []);

  async function refresh(session: string) {
    setBusy(true);
    setMessage(null);
    const me = await apiFetch<{ user: User; usage: Summary }>("/v1/me", { token: session });
    if (!me.ok) {
      window.localStorage.removeItem(SESSION_KEY);
      setToken(null);
      setMessage(me.message);
      setBusy(false);
      return;
    }
    setUser(me.data.user);
    setSummary(me.data.usage);
    setBurnPct(me.data.user.alert_burn_pct ?? 80);
    setAlertEnabled(me.data.user.alert_email_enabled !== false);
    const [k, u, a] = await Promise.all([
      apiFetch<{ keys: KeyRow[] }>("/v1/keys", { token: session }),
      apiFetch<{ events: UsageRow[]; summary: Summary }>("/v1/usage", { token: session }),
      apiFetch<{ alerts: AlertRow[] }>("/v1/alerts", { token: session }),
    ]);
    if (k.ok) setKeys(k.data.keys);
    if (u.ok) {
      setUsage(u.data.events);
      setSummary(u.data.summary);
    }
    if (a.ok) setAlerts(a.data.alerts);
    setBusy(false);
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
    setNewKey(null);
    window.dispatchEvent(new Event("laya-auth-changed"));
  }

  async function createKey() {
    if (!token) return;
    setBusy(true);
    const res = await apiFetch<{ key: string }>("/v1/keys", {
      method: "POST",
      token,
      body: { name: "default" },
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    setNewKey(res.data.key);
    await refresh(token);
  }

  async function revokeKey(id: string) {
    if (!token) return;
    setBusy(true);
    const res = await apiFetch(`/v1/keys/${id}`, { method: "DELETE", token });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    await refresh(token);
  }

  async function checkout(packId: string) {
    if (!token) return;
    setBusy(true);
    const res = await apiFetch<{ url: string }>("/v1/billing/checkout", {
      method: "POST",
      token,
      body: { pack_id: packId },
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    window.location.href = res.data.url;
  }

  async function saveAlerts() {
    if (!token) return;
    setBusy(true);
    const res = await apiFetch("/v1/me/alerts", {
      method: "POST",
      token,
      body: { alert_email_enabled: alertEnabled, alert_burn_pct: burnPct },
    });
    setBusy(false);
    setMessage(res.ok ? "Alert settings saved." : res.message);
  }

  if (!token || !user) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <p className="text-sm leading-relaxed text-muted">{API_DISCLAIMER}</p>
        <p className="text-sm text-muted">Sign in to manage API keys, prepaid balance, and usage alerts.</p>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Sign in
        </button>
        {message ? <p className="text-sm text-accent">{message}</p> : null}
      </div>
    );
  }

  const packLabel = CREDIT_PACKS.find((p) => p.id === user.pack_id)?.label ?? "None yet";

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-2xl font-semibold text-ink">{user.credits.toLocaleString()} credits</p>
          <p className="mt-1 text-xs text-muted">
            Pack tier: {packLabel} · API {API_BASE_URL}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pricing/" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg">
            Buy tokens
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium"
          >
            Log out
          </button>
        </div>
      </div>

      {message ? <p className="text-sm text-accent">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="24h calls" value={summary?.last_24h_calls ?? 0} />
        <Stat label="24h tokens" value={summary?.last_24h_tokens ?? 0} />
        <Stat label="7d tokens" value={summary?.last_7d_tokens ?? 0} />
        <Stat label="24h alerts" value={summary?.alerts_24h ?? 0} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Quick top-up</h2>
        <div className="flex flex-wrap gap-2">
          {CREDIT_PACKS.slice(0, 4).map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => checkout(p.id)}
              className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium disabled:opacity-60"
            >
              ${p.usd}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">API keys</h2>
          <button
            type="button"
            disabled={busy}
            onClick={createKey}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            Create key
          </button>
        </div>
        {newKey ? (
          <p className="rounded-lg border border-accent/40 bg-panel px-4 py-3 font-mono text-sm text-ink">
            {newKey}
            <span className="mt-1 block font-sans text-xs text-muted">Copy now — shown once.</span>
          </p>
        ) : null}
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {keys.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No keys yet.</li>
          ) : (
            keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {k.name} <span className="font-mono text-muted">{k.key_prefix}…</span>
                  </p>
                  <p className="text-xs text-muted">
                    {k.status} · {k.created_at}
                  </p>
                </div>
                {k.status === "active" ? (
                  <button type="button" className="text-xs text-accent hover:underline" onClick={() => revokeKey(k.id)}>
                    Revoke
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Burn alerts</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={alertEnabled} onChange={(e) => setAlertEnabled(e.target.checked)} />
            Enable burn alerts
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Alert at % burned</span>
            <input
              type="number"
              min={1}
              max={99}
              value={burnPct}
              onChange={(e) => setBurnPct(Number(e.target.value))}
              className="block w-24 rounded-md border border-line bg-code px-2 py-1.5 text-ink"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={saveAlerts}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Alerts</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {alerts.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No alerts.</li>
          ) : (
            alerts.map((a) => (
              <li key={a.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-ink">
                  {a.reason} · count {a.count}
                </p>
                <p className="text-xs text-muted">{a.ts}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Usage monitor</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {usage.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">
              No calls yet. Try a{" "}
              <Link className="text-accent hover:underline" href="/tools/">
                tool
              </Link>
              .
            </li>
          ) : (
            usage.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-ink">
                  {e.status} · {e.input_tokens} in · {e.credits_charged} credits
                </p>
                <p className="text-xs text-muted">
                  {e.path ?? e.model ?? "—"} · {e.ts}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-muted">{API_DISCLAIMER}</p>
      <p className="text-xs text-muted">
        Operators:{" "}
        <Link className="text-accent hover:underline" href="/admin/">
          Admin console
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value.toLocaleString()}</p>
    </div>
  );
}
