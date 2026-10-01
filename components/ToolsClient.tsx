"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SideNavLayout } from "@/components/SideNav";
import { API_BASE_URL, API_DISCLAIMER } from "@/lib/api";
import { apiFetch, PASTED_KEY } from "@/lib/apiClient";
import { TOOLS, type ToolDef } from "@/lib/tools";

function defaultsFor(tool: ToolDef): Record<string, string> {
  return Object.fromEntries(tool.fields.map((f) => [f.key, f.defaultValue]));
}

const CAT_ORDER: { id: ToolDef["category"]; label: string }[] = [
  { id: "agents", label: "Agents & Dev" },
  { id: "sales", label: "Sales & Support" },
  { id: "marketing", label: "Marketing" },
  { id: "trust", label: "Data & Trust" },
];

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

  const groups = useMemo(() => {
    const featured = TOOLS.filter((t) => t.featured);
    const cats = CAT_ORDER.map((c) => ({
      ...c,
      items: TOOLS.filter((t) => t.category === c.id),
    })).filter((c) => c.items.length > 0);
    return { featured, cats };
  }, []);

  function selectTool(t: ToolDef) {
    setTool(t);
    setValues(defaultsFor(t));
    setResult(null);
    setError(null);
    history.replaceState(null, "", `#${t.slug}`);
  }

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const found = TOOLS.find((t) => t.slug === hash || t.id === hash);
    if (found) selectTool(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hash hydrate
  }, []);

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
    <SideNavLayout
      hideNavOnMobile
      nav={
        <nav aria-label="Templates" className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Templates</p>
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink">Featured</p>
            <ul className="space-y-0.5">
              {groups.featured.map((t) => (
                <li key={`feat-${t.id}`}>
                  <button
                    type="button"
                    onClick={() => selectTool(t)}
                    className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                      tool.id === t.id
                        ? "bg-panel font-medium text-accent"
                        : "text-muted hover:bg-panel hover:text-ink"
                    }`}
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {groups.cats.map((cat) => (
            <div key={cat.id}>
              <p className="mb-1.5 text-xs font-medium text-ink">{cat.label}</p>
              <ul className="space-y-0.5">
                {cat.items.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => selectTool(t)}
                      className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                        tool.id === t.id
                          ? "bg-panel font-medium text-accent"
                          : "text-muted hover:bg-panel hover:text-ink"
                      }`}
                    >
                      {t.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      }
    >
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-muted">
          Anonymous: {anonLeft === null ? "…" : anonLeft} free run left. Then register or paste a{" "}
          <code className="font-mono text-ink">laya_</code> key to bill your prepaid balance — same meter as{" "}
          <Link className="text-accent hover:underline" href="/docs/api/">
            /v1/decide
          </Link>
          .
        </p>

        <label className="block space-y-1 text-sm lg:hidden">
          <span className="text-muted">Template</span>
          <select
            value={tool.id}
            onChange={(e) => {
              const t = TOOLS.find((x) => x.id === e.target.value);
              if (t) selectTool(t);
            }}
            className="w-full rounded-md border border-line bg-code px-3 py-2 text-ink"
          >
            {TOOLS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>

        <section className="space-y-4 rounded-lg border border-line bg-panel p-5 shadow-glow">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{tool.title}</h2>
              <p className="mt-1 text-sm text-muted">{tool.blurb}</p>
            </div>
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
            <pre className="overflow-x-auto rounded-md border border-line bg-code p-4 text-xs leading-relaxed text-ink shadow-glow">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </section>

        <p className="text-xs leading-relaxed text-muted">{API_DISCLAIMER}</p>
      </div>
    </SideNavLayout>
  );
}
