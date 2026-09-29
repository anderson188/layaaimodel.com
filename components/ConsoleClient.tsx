"use client";

import { useEffect, useState, type FormEvent } from "react";
import { API_BASE_URL, API_DISCLAIMER } from "@/lib/api";

type User = { id: string; email: string; credits: number };
type KeyRow = { id: string; name: string; key_prefix: string; status: string; created_at: string };
type UsageRow = {
  id: string;
  model: string | null;
  input_tokens: number;
  credits_charged: number;
  status: string;
  ts: string;
};

const SESSION_KEY = "laya_session_token";

async function api<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: { message: text } };
  }
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
    return { ok: false, status: res.status, message };
  }
  return { ok: true, data: data as T };
}

export function ConsoleClient() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SESSION_KEY);
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setKeys([]);
      setUsage([]);
      return;
    }
    void refresh(token);
  }, [token]);

  async function refresh(session: string) {
    setBusy(true);
    setMessage(null);
    const me = await api<{ user: User }>("/v1/me", { token: session });
    if (!me.ok) {
      window.localStorage.removeItem(SESSION_KEY);
      setToken(null);
      setMessage(me.message);
      setBusy(false);
      return;
    }
    setUser(me.data.user);
    const [k, u] = await Promise.all([
      api<{ keys: KeyRow[] }>("/v1/keys", { token: session }),
      api<{ events: UsageRow[] }>("/v1/usage", { token: session }),
    ]);
    if (k.ok) setKeys(k.data.keys);
    if (u.ok) setUsage(u.data.events);
    setBusy(false);
  }

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const path = mode === "login" ? "/v1/auth/login" : "/v1/auth/register";
    const res = await api<{ session_token: string; user: User }>(path, {
      method: "POST",
      body: { email, password },
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    window.localStorage.setItem(SESSION_KEY, res.data.session_token);
    setToken(res.data.session_token);
    setUser(res.data.user);
    setPassword("");
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
    setNewKey(null);
  }

  async function createKey() {
    if (!token) return;
    setBusy(true);
    const res = await api<{ key: string; id: string }>("/v1/keys", {
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
    const res = await api(`/v1/keys/${id}`, { method: "DELETE", token });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    await refresh(token);
  }

  async function checkout() {
    if (!token) return;
    setBusy(true);
    const res = await api<{ url: string }>("/v1/billing/checkout", { method: "POST", token });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    window.location.href = res.data.url;
  }

  if (!token || !user) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <p className="text-sm leading-relaxed text-muted">{API_DISCLAIMER}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "login" ? "bg-accent text-accent-fg" : "border border-line bg-panel"}`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "register" ? "bg-accent text-accent-fg" : "border border-line bg-panel"}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        <form onSubmit={submitAuth} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line bg-code px-3 py-2 text-ink"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Password</span>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line bg-code px-3 py-2 text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        {message ? <p className="text-sm text-accent">{message}</p> : null}
        <p className="text-xs text-muted">
          API base: <code className="font-mono">{API_BASE_URL}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-lg font-semibold text-ink">
            {user.credits.toLocaleString()} credits
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={checkout}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            Buy credit pack
          </button>
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
          <p className="rounded-lg border border-accent/40 bg-panel px-4 py-3 font-mono text-sm text-ink shadow-glow">
            {newKey}
            <span className="mt-1 block font-sans text-xs text-muted">Copy now — shown once.</span>
          </p>
        ) : null}
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel shadow-glow">
          {keys.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No keys yet.</li>
          ) : (
            keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {k.name}{" "}
                    <span className="font-mono text-muted">
                      {k.key_prefix}…
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {k.status} · {k.created_at}
                  </p>
                </div>
                {k.status === "active" ? (
                  <button
                    type="button"
                    className="text-xs text-accent hover:underline"
                    onClick={() => revokeKey(k.id)}
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Recent usage</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel shadow-glow">
          {usage.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No calls yet.</li>
          ) : (
            usage.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-ink">
                  {e.status} · {e.input_tokens} in · {e.credits_charged} credits
                </p>
                <p className="text-xs text-muted">
                  {e.model ?? "—"} · {e.ts}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-muted">{API_DISCLAIMER}</p>
    </div>
  );
}
