"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, API_DISCLAIMER } from "@/lib/api";
import { apiFetch, PASTED_KEY } from "@/lib/apiClient";
import { TOOLS, type ToolDef } from "@/lib/tools";

function defaultsFor(tool: ToolDef): Record<string, string> {
  return Object.fromEntries(tool.fields.map((f) => [f.key, f.defaultValue]));
}

export function ToolsClient({ initialSlug }: { initialSlug?: string }) {
  const initial = TOOLS.find((t) => t.slug === initialSlug) ?? TOOLS.find((t) => t.featured) ?? TOOLS[0];
  const [tool, setTool] = useState<ToolDef>(initial);
  const [values, setValues] = useState<Record<string, string>>(defaultsFor(initial));
  const [apiKey, setApiKey] = useState("");
  const [anonLeft, setAnonLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(PASTED_KEY);
    if (saved) setApiKey(saved);
    void apiFetch<{ remaining: number }>("/v1/anon/status").then((r) => {
      if (r.ok) setAnonLeft(r.data.remaining);
    });
  }, []);

  const featured = useMemo(() => TOOLS.filter((t) => t.featured), []);
  const byCat = useMemo(() => {
    const cats = ["agents", "sales", "marketing", "trust"] as const;
    return cats.map((c) => ({
      id: c,
      label:
        c === "agents"
          ? "Agents & Dev"
          : c === "sales"
            ? "Sales & Support"
            : c === "marketing"
              ? "Marketing"
              : "Data & Trust",
      items: TOOLS.filter((t) => t.category === c),
    }));
  }, []);

  function selectTool(t: ToolDef) {
    setTool(t);
    setValues(defaultsFor(t));
    setResult(null);
    setError(null);
  }

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    const key = apiKey.trim();
    if (key) window.localStorage.setItem(PASTED_KEY, key);
    else window.localStorage.removeItem(PASTED_KEY);

    const body = Object.fromEntries(tool.fields.map((f) => [f.key, values[f.key] ?? ""]));
    const res = await apiFetch<unknown>(tool.endpoint, {
      method: "POST",
      token: key || null,
      body,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setResult(res.data);
    const anon = await apiFetch<{ remaining: number }>("/v1/anon/status");
    if (anon.ok) setAnonLeft(anon.data.remaining);
  }

  return (
    <div className="space-y-10">
      <p className="max-w-3xl text-sm leading-relaxed text-muted">
        Anonymous: {anonLeft === null ? "…" : anonLeft} free real-API runs left (no signup). Paste a{" "}
        <code className="font-mono text-ink">laya_</code> key to bill your prepaid balance — same meter as{" "}
        <Link className="text-accent hover:underline" href="/docs/api/">
          /v1/decide
        </Link>
        .
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Featured templates</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {featured.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTool(t)}
              className={`rounded-lg border px-4 py-3 text-left ${
                tool.id === t.id ? "border-accent bg-panel" : "border-line bg-panel/60 hover:border-accent"
              }`}
            >
              <p className="font-medium text-ink">{t.title}</p>
              <p className="mt-1 text-xs text-muted">{t.blurb}</p>
            </button>
          ))}
        </div>
      </section>

      {byCat.map((cat) => (
        <section key={cat.id} className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">{cat.label}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {cat.items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => selectTool(t)}
                  className="w-full rounded-md border border-line bg-panel px-3 py-2 text-left text-sm hover:border-accent"
                >
                  <span className="font-medium text-ink">{t.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{t.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-4 rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{tool.title}</h2>
          <code className="font-mono text-xs text-muted">
            POST {API_BASE_URL}
            {tool.endpoint}
          </code>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-muted">API key (optional — paste laya_… to consume your balance)</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="laya_… or leave blank for anonymous free run"
            className="w-full rounded-md border border-line bg-code px-3 py-2 font-mono text-sm text-ink"
          />
        </label>
        {tool.fields.map((f) => (
          <label key={f.key} className="block space-y-1 text-sm">
            <span className="text-muted">{f.label}</span>
            {f.multiline ? (
              <textarea
                rows={5}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full rounded-md border border-line bg-code px-3 py-2 font-mono text-sm text-ink"
              />
            ) : (
              <input
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full rounded-md border border-line bg-code px-3 py-2 font-mono text-sm text-ink"
              />
            )}
          </label>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {busy ? "Running…" : "▶ Run Laya"}
        </button>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        {result ? (
          <pre className="overflow-x-auto rounded-md border border-line bg-code p-4 text-xs leading-relaxed text-ink">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </section>

      <p className="text-xs leading-relaxed text-muted">{API_DISCLAIMER}</p>
    </div>
  );
}
