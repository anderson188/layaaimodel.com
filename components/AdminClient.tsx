"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { apiFetch, SESSION_KEY } from "@/lib/apiClient";
import { openAuthModal } from "@/components/AuthModal";
import { CREDIT_PACKS } from "@/lib/pricing";

export const ADMIN_TOKEN_KEY = "laya_admin_token";

type AdminData = {
  upstream_mode: string;
  settings: { upstream_mode: string; maintenance_mode: string };
  totals: {
    users: number;
    registrations_24h: number;
    registrations_7d: number;
    stripe_checkouts: number;
    stripe_tokens: number;
    admin_grants: number;
    admin_grant_tokens: number;
    upstream_24h: { total: number; upstream5xx: number; rateLimited: number };
  };
  recent_registrations: Array<{
    id: string;
    email: string;
    credits: number;
    pack_id: string | null;
    disabled: number | null;
    created_at: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    credits: number;
    remaining_tokens: number;
    consumed_tokens: number;
    total_tokens: number;
    consume_ratio: number;
    pack_id: string | null;
    disabled: number;
    is_admin?: number;
    created_at: string;
  }>;
  usersMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    emailQuery?: string;
    sort?: "created" | "usage";
  };
  ledger: Array<{
    id: string;
    user_id: string;
    user_email?: string | null;
    delta: number;
    reason: string;
    ref?: string | null;
    created_at: string;
  }>;
  ledgerMeta: { page: number; limit: number; total: number; totalPages: number };
  recent: Array<{
    id: string;
    user_id: string | null;
    user_email?: string | null;
    path?: string | null;
    model?: string | null;
    input_tokens: number;
    credits_charged: number;
    status: string;
    created_at: string;
  }>;
  recentMeta: { page: number; limit: number; total: number; totalPages: number };
  usage: Array<{ tool_slug: string; runs: number; tokens: number; credits: number }>;
};

function packLabel(reason: string, ref?: string | null): string {
  if (reason === "stripe_checkout") {
    const pack = CREDIT_PACKS.find((p) => p.id === ref);
    if (pack) return `Stripe $${pack.usd} (${pack.tokens.toLocaleString()} tok)`;
    return `Stripe checkout${ref ? ` (${ref})` : ""}`;
  }
  if (reason.startsWith("admin_")) return `Admin (${reason})`;
  if (reason === "monthly_free") return "Monthly free tokens";
  if (reason === "signup") return "Signup grant";
  return reason;
}

export function AdminClient() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [delta, setDelta] = useState<Record<string, string>>({});
  const [grantEmail, setGrantEmail] = useState("");
  const [grantCredits, setGrantCredits] = useState("");
  const [busy, setBusy] = useState(false);

  const [usersPage, setUsersPage] = useState(1);
  const [usersEmailInput, setUsersEmailInput] = useState("");
  const [usersEmailQuery, setUsersEmailQuery] = useState("");
  const [usersSort, setUsersSort] = useState<"created" | "usage">("created");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);

  useEffect(() => {
    function refreshAuth() {
      const session = window.localStorage.getItem(SESSION_KEY);
      const savedAdmin = window.localStorage.getItem(ADMIN_TOKEN_KEY);
      if (session) setToken(session);
      else if (savedAdmin) {
        setToken(savedAdmin);
        setTokenInput(savedAdmin);
      } else setToken("");
    }
    refreshAuth();
    window.addEventListener("laya-auth-changed", refreshAuth);
    window.addEventListener("storage", refreshAuth);
    return () => {
      window.removeEventListener("laya-auth-changed", refreshAuth);
      window.removeEventListener("storage", refreshAuth);
    };
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setData(null);
      return;
    }
    const qs = new URLSearchParams({
      usersPage: String(usersPage),
      usersLimit: "10",
      ledgerPage: String(ledgerPage),
      ledgerLimit: "10",
      recentPage: String(recentPage),
      recentLimit: "10",
      usersSort,
    });
    if (usersEmailQuery) qs.set("usersEmail", usersEmailQuery);
    const res = await apiFetch<AdminData>(`/v1/admin/overview?${qs}`, { token });
    if (!res.ok) {
      setError(res.message);
      setData(null);
      return;
    }
    setData(res.data);
    setError(null);
  }, [token, usersPage, usersEmailQuery, usersSort, ledgerPage, recentPage]);

  useEffect(() => {
    void load();
  }, [load]);

  function saveToken() {
    const t = tokenInput.trim();
    if (!t) {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
      const session = window.localStorage.getItem(SESSION_KEY);
      setToken(session || "");
      if (!session) setData(null);
      return;
    }
    window.localStorage.setItem(ADMIN_TOKEN_KEY, t);
    setToken(t);
    setOkMsg("Admin token saved locally.");
  }

  async function post(body: Record<string, unknown>) {
    if (!token) return false;
    setBusy(true);
    setOkMsg(null);
    setError(null);
    const res = await apiFetch<Record<string, unknown>>("/v1/admin/action", {
      method: "POST",
      token,
      body,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return false;
    }
    setOkMsg("Updated.");
    await load();
    return true;
  }

  if (!token) {
    return (
      <div className="space-y-4 rounded-lg border border-line bg-panel p-5">
        <p className="text-sm text-muted">
          Sign in with an admin account (listed in <code className="font-mono text-ink">ADMIN_EMAILS</code>
          ), or paste the gateway <code className="font-mono text-ink">ADMIN_TOKEN</code>.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Sign in
        </button>
        <label className="block space-y-1 text-sm">
          <span className="text-muted">Or admin token</span>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full rounded-md border border-line bg-code px-3 py-2 font-mono text-sm text-ink"
            placeholder="ADMIN_TOKEN"
          />
        </label>
        <button
          type="button"
          onClick={saveToken}
          className="rounded-md border border-line px-4 py-2 text-sm"
        >
          Unlock with token
        </button>
        <p className="text-xs text-muted">
          Back to{" "}
          <Link className="text-accent hover:underline" href="/account/">
            Account
          </Link>
          .
        </p>
      </div>
    );
  }

  if (error && !data) {
    const isSession = token.startsWith("sess_");
    return (
      <div className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <p className="text-sm text-accent">{error}</p>
        <p className="text-sm text-muted">
          {isSession
            ? "This signed-in account is not an admin. Sign in as luckinessdueler@gmail.com, or use ADMIN_TOKEN."
            : "Invalid admin token."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-sm"
            onClick={() => openAuthModal("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-sm"
            onClick={() => {
              window.localStorage.removeItem(ADMIN_TOKEN_KEY);
              setToken("");
              setTokenInput("");
            }}
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-sm text-muted">Loading admin…</p>;

  return (
    <div className="space-y-10">
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {okMsg ? <p className="text-sm text-ink">{okMsg}</p> : null}

      <section className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">System</h2>
            <p className="mt-1 text-sm text-muted">
              Users {data.totals.users.toLocaleString()} · new 24h {data.totals.registrations_24h} · 7d{" "}
              {data.totals.registrations_7d} · upstream 24h {data.totals.upstream_24h.total} calls (
              {data.totals.upstream_24h.upstream5xx}×5xx)
            </p>
            <p className="mt-1 text-sm text-muted">
              Stripe checkouts {data.totals.stripe_checkouts} (+
              {Number(data.totals.stripe_tokens).toLocaleString()} tok) · admin grants{" "}
              {data.totals.admin_grants}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-xs text-muted"
            onClick={() => {
              window.localStorage.removeItem(ADMIN_TOKEN_KEY);
              setTokenInput("");
              const session = window.localStorage.getItem(SESSION_KEY);
              if (session) setToken(session);
              else {
                setToken("");
                setData(null);
              }
            }}
          >
            Lock token
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-line px-3 py-1.5 text-sm"
            onClick={() =>
              void post({
                action: "set_setting",
                key: "maintenance_mode",
                value: data.settings.maintenance_mode === "1" ? "0" : "1",
              })
            }
          >
            Maintenance: {data.settings.maintenance_mode === "1" ? "ON" : "OFF"} (toggle)
          </button>
          {(["impossibl", "paused", "selfhost"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={busy || data.upstream_mode === mode}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                data.upstream_mode === mode
                  ? "border-accent bg-panel font-medium text-accent"
                  : "border-line"
              }`}
              onClick={() => void post({ action: "set_upstream_mode", mode })}
            >
              Upstream: {mode}
            </button>
          ))}
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-sm"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Quick grant</h2>
        <p className="mt-1 text-sm text-muted">Add prepaid tokens by email (same meter as Stripe packs).</p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void post({
              action: "grant_credits",
              email: grantEmail.trim(),
              credits: Number(grantCredits),
            }).then((ok) => {
              if (ok) {
                setGrantEmail("");
                setGrantCredits("");
              }
            });
          }}
        >
          <input
            type="email"
            required
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="user@example.com"
            className="min-w-[14rem] flex-1 rounded-md border border-line bg-code px-3 py-2 text-sm"
          />
          <input
            type="number"
            required
            value={grantCredits}
            onChange={(e) => setGrantCredits(e.target.value)}
            placeholder="tokens"
            className="w-32 rounded-md border border-line bg-code px-3 py-2 font-mono text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            Grant
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">New registrations</h2>
        <p className="mt-1 text-sm text-muted">Latest signups (newest first).</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Time</th>
                <th className="py-1 pr-3 font-medium">Email</th>
                <th className="py-1 pr-3 font-medium">Balance</th>
                <th className="py-1 font-medium">Pack</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_registrations.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-mono text-xs">{u.created_at}</td>
                  <td className="py-1.5 pr-3">
                    {u.email}
                    {u.disabled ? " (disabled)" : ""}
                  </td>
                  <td className="py-1.5 pr-3 font-mono">{Number(u.credits).toLocaleString()}</td>
                  <td className="py-1.5">{u.pack_id ?? "—"}</td>
                </tr>
              ))}
              {data.recent_registrations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-muted">
                    No users yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Usage by path</h2>
        <ul className="mt-3 space-y-2 font-mono text-sm">
          {data.usage.map((row) => (
            <li key={row.tool_slug} className="flex justify-between border-b border-line py-2">
              <span>{row.tool_slug}</span>
              <span>
                {row.runs} runs · {Number(row.tokens).toLocaleString()} tok ·{" "}
                {Number(row.credits).toLocaleString()} charged
              </span>
            </li>
          ))}
          {data.usage.length === 0 ? <li className="text-muted">No usage yet.</li> : null}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Users</h2>
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setUsersPage(1);
            setUsersEmailQuery(usersEmailInput.trim());
          }}
        >
          <input
            type="search"
            value={usersEmailInput}
            onChange={(e) => setUsersEmailInput(e.target.value)}
            placeholder="Search email…"
            className="min-w-[14rem] flex-1 rounded-md border border-line bg-code px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg">
            Search
          </button>
          {usersEmailQuery ? (
            <button
              type="button"
              className="rounded-md border border-line px-3 py-2 text-sm"
              onClick={() => {
                setUsersEmailInput("");
                setUsersEmailQuery("");
                setUsersPage(1);
              }}
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            className={`rounded-md border px-3 py-2 text-sm ${
              usersSort === "usage" ? "border-accent text-accent" : "border-line"
            }`}
            onClick={() => {
              setUsersPage(1);
              setUsersSort((s) => (s === "usage" ? "created" : "usage"));
            }}
          >
            Sort: {usersSort === "usage" ? "usage" : "created"}
          </button>
        </form>
        <ul className="mt-3 space-y-3">
          {data.users.map((u) => (
            <li key={u.id} className="rounded-lg border border-line bg-panel p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {u.email}
                    {u.is_admin ? " · admin" : ""}
                    {u.disabled ? " · disabled" : ""}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    remaining {u.remaining_tokens.toLocaleString()} · used{" "}
                    {u.consumed_tokens.toLocaleString()} · ratio{" "}
                    {(u.consume_ratio * 100).toFixed(1)}%
                    {u.pack_id ? ` · pack ${u.pack_id}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted">{u.created_at}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    placeholder="±tokens"
                    value={delta[u.id] ?? ""}
                    onChange={(e) => setDelta((s) => ({ ...s, [u.id]: e.target.value }))}
                    className="w-28 rounded border border-line bg-code px-2 py-1 font-mono"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-line px-2 py-1"
                    onClick={() =>
                      void post({
                        action: "adjust_credits",
                        userId: u.id,
                        delta: Number(delta[u.id] ?? "0"),
                      })
                    }
                  >
                    Adjust
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-line px-2 py-1"
                    onClick={() =>
                      void post({
                        action: "set_disabled",
                        userId: u.id,
                        disabled: !u.disabled,
                      })
                    }
                  >
                    {u.disabled ? "Enable" : "Disable"}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {data.users.length === 0 ? (
            <li className="rounded-lg border border-line bg-panel p-3 text-sm text-muted">No users.</li>
          ) : null}
        </ul>
        {data.usersMeta.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={usersPage <= 1}
              className="rounded border border-line px-2 py-1 disabled:opacity-40"
              onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-muted">
              {data.usersMeta.page} / {data.usersMeta.totalPages} ({data.usersMeta.total})
            </span>
            <button
              type="button"
              disabled={usersPage >= data.usersMeta.totalPages}
              className="rounded border border-line px-2 py-1 disabled:opacity-40"
              onClick={() => setUsersPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent credit purchases / grants</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Time</th>
                <th className="py-1 pr-3 font-medium">Email</th>
                <th className="py-1 pr-3 font-medium">Delta</th>
                <th className="py-1 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.ledger.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-mono text-xs">{row.created_at}</td>
                  <td className="py-1.5 pr-3">{row.user_email ?? row.user_id}</td>
                  <td className="py-1.5 pr-3 font-mono">+{Number(row.delta).toLocaleString()}</td>
                  <td className="py-1.5">{packLabel(row.reason, row.ref)}</td>
                </tr>
              ))}
              {data.ledger.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-muted">
                    No positive ledger entries yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {data.ledgerMeta.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={ledgerPage <= 1}
              className="rounded border border-line px-2 py-1 disabled:opacity-40"
              onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-muted">
              {data.ledgerMeta.page} / {data.ledgerMeta.totalPages}
            </span>
            <button
              type="button"
              disabled={ledgerPage >= data.ledgerMeta.totalPages}
              className="rounded border border-line px-2 py-1 disabled:opacity-40"
              onClick={() => setLedgerPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent runs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Time</th>
                <th className="py-1 pr-3 font-medium">User</th>
                <th className="py-1 pr-3 font-medium">Path</th>
                <th className="py-1 pr-3 font-medium">Tokens</th>
                <th className="py-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-mono text-xs">{row.created_at}</td>
                  <td className="py-1.5 pr-3">{row.user_email ?? "anon"}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{row.path ?? "—"}</td>
                  <td className="py-1.5 pr-3 font-mono">{Number(row.input_tokens).toLocaleString()}</td>
                  <td className="py-1.5">{row.status}</td>
                </tr>
              ))}
              {data.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3 text-muted">
                    No runs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {data.recentMeta.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={recentPage <= 1}
              className="rounded border border-line px-2 py-1 disabled:opacity-40"
              onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-muted">
              {data.recentMeta.page} / {data.recentMeta.totalPages}
            </span>
            <button
              type="button"
              disabled={recentPage >= data.recentMeta.totalPages}
              className="rounded border border-line px-2 py-1 disabled:opacity-40"
              onClick={() => setRecentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      <p className="text-xs text-muted">
        API base <code className="font-mono">{API_BASE_URL}</code>. Not indexed. Operator use only.
      </p>
    </div>
  );
}
