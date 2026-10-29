"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { apiFetch, SESSION_KEY } from "@/lib/apiClient";

type AuthMode = "login" | "register" | "verify";

export function openAuthModal(mode: AuthMode = "login") {
  window.dispatchEvent(new CustomEvent("laya-open-auth", { detail: { mode } }));
}

type SessionPayload = {
  session_token: string;
};

type RegisterPayload = {
  status?: string;
  email?: string;
  message?: string;
  session_token?: string;
};

export function AuthModal() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ mode?: AuthMode }>).detail;
      const next = detail?.mode === "register" ? "register" : detail?.mode === "verify" ? "verify" : "login";
      setMode(next);
      setMessage(null);
      setPassword("");
      setCode("");
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

  function finishLogin(sessionToken: string) {
    window.localStorage.setItem(SESSION_KEY, sessionToken);
    window.dispatchEvent(new Event("laya-auth-changed"));
    setOpen(false);
    setPassword("");
    setCode("");
    if (!window.location.pathname.startsWith("/account")) {
      window.location.href = "/account/";
    } else {
      window.location.reload();
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    if (mode === "verify") {
      const res = await apiFetch<SessionPayload>("/v1/auth/verify", {
        method: "POST",
        body: { email, code },
      });
      setBusy(false);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      finishLogin(res.data.session_token);
      return;
    }

    if (mode === "register") {
      const res = await apiFetch<RegisterPayload>("/v1/auth/register", {
        method: "POST",
        body: { email, password },
      });
      setBusy(false);
      if (!res.ok) {
        if (res.type === "forbidden_email" || /don't mess around/i.test(res.message)) {
          window.alert(res.message);
        }
        setMessage(res.message);
        return;
      }
      if (res.data.session_token) {
        finishLogin(res.data.session_token);
        return;
      }
      setMode("verify");
      setCode("");
      setMessage(res.data.message || "Check your email for a 6-digit code.");
      return;
    }

    const res = await apiFetch<SessionPayload>("/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    finishLogin(res.data.session_token);
  }

  async function resendCode() {
    setBusy(true);
    setMessage(null);
    const res = await apiFetch<{ message?: string }>("/v1/auth/resend-verification", {
      method: "POST",
      body: { email },
    });
    setBusy(false);
    setMessage(res.ok ? res.data.message || "A new code was sent." : res.message);
  }

  if (!open) return null;

  const title =
    mode === "login" ? "Log in" : mode === "verify" ? "Verify email" : "Create account";

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
            {title}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-paper hover:text-ink"
          >
            Close
          </button>
        </div>

        {mode !== "verify" ? (
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
        ) : null}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Email</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={mode === "verify"}
              className="w-full rounded-md border border-line bg-code px-3 py-2 text-ink read-only:opacity-80"
            />
          </label>
          {mode === "verify" ? (
            <label className="block space-y-1 text-sm">
              <span className="text-muted">6-digit code</span>
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-md border border-line bg-code px-3 py-2 font-mono text-ink tracking-widest"
              />
            </label>
          ) : (
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
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : mode === "verify"
                  ? "Verify and continue"
                  : "Send verification code"}
          </button>
        </form>

        {mode === "verify" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void resendCode()}
            className="mt-3 text-sm text-accent hover:underline disabled:opacity-60"
          >
            Resend code
          </button>
        ) : null}

        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {mode === "verify"
            ? "We only create the account after the code arrives — fake inboxes do not count."
            : mode === "register"
              ? "We email a 6-digit code first. Signup credits unlock after verification."
              : (
                  <>
                    Instant <code className="font-mono text-ink">laya_</code> keys · ~10k free tokens/month after
                    signup.
                  </>
                )}
        </p>
      </div>
    </div>
  );
}
