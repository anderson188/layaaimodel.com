"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { apiFetch, SESSION_KEY } from "@/lib/apiClient";

type AuthMode = "login" | "register";

export function openAuthModal(mode: AuthMode = "login") {
  window.dispatchEvent(new CustomEvent("laya-open-auth", { detail: { mode } }));
}

export function AuthModal() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ mode?: AuthMode }>).detail;
      setMode(detail?.mode === "register" ? "register" : "login");
      setMessage(null);
      setPassword("");
      setOpen(true);
    }
    window.addEventListener("laya-open-auth", onOpen);
    return () => window.removeEventListener("laya-open-auth", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const path = mode === "login" ? "/v1/auth/login" : "/v1/auth/register";
    const res = await apiFetch<{ session_token: string }>(path, {
      method: "POST",
      body: { email, password },
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    window.localStorage.setItem(SESSION_KEY, res.data.session_token);
    window.dispatchEvent(new Event("laya-auth-changed"));
    setOpen(false);
    setPassword("");
    if (!window.location.pathname.startsWith("/account")) {
      window.location.href = "/account/";
    } else {
      window.location.reload();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/65"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-xl border border-line bg-panel p-5 shadow-glow sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {mode === "login" ? "Log in" : "Create account"}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-paper hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-2 rounded-lg border border-line bg-paper p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === "login" ? "bg-accent text-accent-fg" : "text-muted hover:text-ink"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMessage(null);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === "register" ? "bg-accent text-accent-fg" : "text-muted hover:text-ink"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Email</span>
            <input
              required
              type="email"
              autoComplete="email"
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line bg-code px-3 py-2 text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Instant <code className="font-mono text-ink">laya_</code> keys · ~10k free tokens/month after signup.
        </p>
      </div>
    </div>
  );
}
