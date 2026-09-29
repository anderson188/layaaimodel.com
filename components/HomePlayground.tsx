"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { PlaygroundResultCards } from "@/components/PlaygroundResultCards";
import { API_BASE_URL } from "@/lib/api";
import { apiFetch, PASTED_KEY } from "@/lib/apiClient";
import {
  displayFromAnswers,
  PLAYGROUND_DEMOS,
  playgroundTool,
  resultFieldsFor,
  sampleAnswersFor,
  sampleDisplayFor,
} from "@/lib/playground";

type RunResponse = {
  model?: string;
  answers?: Record<string, unknown>;
  timing?: { infer_ms?: number; queue_ms?: number };
  usage?: { input_tokens?: number };
};

export function HomePlayground() {
  const defaultSlug = PLAYGROUND_DEMOS[0]?.slug ?? "social-post-analyze";
  const [slug, setSlug] = useState(defaultSlug);
  const tool = useMemo(() => playgroundTool(slug), [slug]);
  const demo = useMemo(
    () => PLAYGROUND_DEMOS.find((d) => d.slug === slug) ?? PLAYGROUND_DEMOS[0],
    [slug],
  );

  const [input, setInput] = useState<Record<string, string>>(() => {
    const t = playgroundTool(defaultSlug);
    return t ? Object.fromEntries(t.fields.map((f) => [f.key, f.defaultValue])) : {};
  });
  const [display, setDisplay] = useState<Record<string, string>>(() => {
    const t = playgroundTool(defaultSlug);
    return t ? sampleDisplayFor(t) : {};
  });
  const [answers, setAnswers] = useState<Record<string, unknown> | null>(() => {
    const t = playgroundTool(defaultSlug);
    return t ? sampleAnswersFor(t, sampleDisplayFor(t)) : null;
  });
  const [previewOnly, setPreviewOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [anonLeft, setAnonLeft] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [model, setModel] = useState<string | null>(null);

  function selectDemo(nextSlug: string) {
    const next = playgroundTool(nextSlug);
    if (!next) return;
    setSlug(nextSlug);
    setInput(Object.fromEntries(next.fields.map((f) => [f.key, f.defaultValue])));
    const sample = sampleDisplayFor(next);
    setDisplay(sample);
    setAnswers(sampleAnswersFor(next, sample));
    setPreviewOnly(true);
    setError(null);
    setLatencyMs(null);
    setLive(false);
    setModel(null);
  }

  const run = useCallback(async () => {
    if (!tool) return;
    setLoading(true);
    setError(null);
    try {
      const key = typeof window !== "undefined" ? window.localStorage.getItem(PASTED_KEY) : null;
      const body = Object.fromEntries(tool.fields.map((f) => [f.key, input[f.key] ?? ""]));
      const res = await apiFetch<RunResponse>(tool.endpoint, {
        method: "POST",
        token: key || null,
        body,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const nextAnswers = res.data.answers ?? {};
      setAnswers(nextAnswers);
      setDisplay(displayFromAnswers(tool, nextAnswers));
      setPreviewOnly(false);
      setLatencyMs(
        typeof res.data.timing?.infer_ms === "number" ? Math.round(res.data.timing.infer_ms) : null,
      );
      setModel(res.data.model ?? null);
      setLive(true);
      const anon = await apiFetch<{ remaining: number }>("/v1/anon/status");
      if (anon.ok) setAnonLeft(anon.data.remaining);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }, [tool, input]);

  if (!tool || !demo) return null;

  const endpointLabel = `POST ${API_BASE_URL.replace(/^https?:\/\//, "")}${tool.endpoint}`;
  const charCount = Object.values(input).join("").length;
  const fields = resultFieldsFor(tool);

  return (
    <section
      id="playground"
      className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_12%,transparent),0_24px_48px_-28px_color-mix(in_oklab,var(--color-accent)_35%,transparent)]"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            Playground
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Typed decisions, live
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Pick a tool scenario, tweak the input, run the real API — choice, score, and yes/no with
            calibrated scores.
          </p>
        </div>
        <Link
          href="/tools/"
          className="shrink-0 text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          Browse all tools →
        </Link>
      </header>

      <div className="border-b border-line px-4 py-3 sm:px-5">
        <p className="mb-2 font-mono text-[11px] text-muted">{endpointLabel}</p>
        <div className="flex flex-wrap gap-2">
          {PLAYGROUND_DEMOS.map((item) => {
            const active = item.slug === slug;
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => selectDemo(item.slug)}
                className={`rounded-full border px-3 py-2 text-sm transition sm:py-1.5 ${
                  active
                    ? "border-accent bg-accent/10 font-medium text-accent"
                    : "border-line text-muted hover:border-accent/40 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              State — the input software gives Laya
            </p>
            <span className="font-mono text-[11px] text-muted">{charCount}c</span>
          </div>
          <div className="space-y-3">
            {tool.fields.map((field) => (
              <label key={field.key} className="block">
                {tool.fields.length > 1 ? (
                  <span className="mb-1 block font-mono text-[11px] text-muted">{field.label}</span>
                ) : null}
                {field.multiline ? (
                  <textarea
                    value={input[field.key] ?? ""}
                    onChange={(e) => setInput((s) => ({ ...s, [field.key]: e.target.value }))}
                    rows={tool.fields.length === 1 ? 9 : 4}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-sm leading-relaxed text-ink outline-none focus:border-accent"
                  />
                ) : (
                  <input
                    value={input[field.key] ?? ""}
                    onChange={(e) => setInput((s) => ({ ...s, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="mt-5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              Questions — typed decisions you get back
            </p>
            <ul className="mt-2 space-y-2">
              {Object.entries(tool.questions)
                .slice(0, 5)
                .map(([key, q]) => (
                  <li
                    key={key}
                    className="rounded-md border border-line/80 bg-paper/40 px-3 py-2 font-mono text-[12px]"
                  >
                    <span className="text-accent">{q.type}</span>
                    <span className="mx-2 text-muted">{key}</span>
                    <span className="mt-0.5 block text-muted/90">{q.instructions}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {previewOnly ? "Sample answers" : "Model answers"}
            </p>
            <p className="font-mono text-[11px] text-muted">
              {live && latencyMs != null
                ? `${model ? `${model} · ` : ""}${latencyMs}ms`
                : previewOnly
                  ? "sample · not yet run"
                  : "ready"}
            </p>
          </div>
          <PlaygroundResultCards
            resultFields={fields}
            display={display}
            answers={answers}
            questions={tool.questions}
          />
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <p className="font-mono text-xs text-muted">
          <span
            className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${
              live ? "bg-accent" : previewOnly ? "bg-muted" : "bg-line"
            }`}
          />
          {live && anonLeft != null
            ? `Real API · ${anonLeft}/5 anon runs left`
            : "Anonymous: 5 free real-API runs / IP · paste a laya_ key on /tools to bill prepaid"}
        </p>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="min-h-11 flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg disabled:opacity-60 sm:min-h-0 sm:flex-none sm:py-2"
          >
            {loading ? "Running…" : "▶ Run Laya"}
          </button>
          <Link
            href={`/tools/#${tool.slug}`}
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            Open this tool →
          </Link>
        </div>
      </footer>

      {error ? (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <p className="text-sm text-amber-400">{error}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/account/"
              className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
            >
              Sign in / get key
            </Link>
            <Link
              href="/pricing/"
              className="inline-flex items-center rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
            >
              Buy prepaid pack
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
