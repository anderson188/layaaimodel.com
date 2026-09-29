"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type StatusPayload = {
  status: string;
  upstream_mode: string;
  checked_at: string;
  impossibl_catalog: {
    ok: boolean;
    status: number;
    laya_free?: boolean | null;
    laya_input_per_mtok_usd?: number | null;
  };
  last_24h: { total: number; upstream5xx: number; rateLimited: number };
  notes: string[];
};

export function StatusClient() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/status`);
        const json = (await res.json()) as StatusPayload;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    }
    void load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (error) {
    return (
      <p className="text-sm text-muted">
        Could not reach gateway status at <code className="font-mono text-ink">{API_BASE_URL}</code>: {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted">Loading status…</p>;
  }

  const badge =
    data.status === "operational"
      ? "text-accent"
      : data.status === "paused"
        ? "text-muted"
        : "text-ink";

  return (
    <div className="space-y-6">
      <p className={`text-2xl font-semibold tracking-tight ${badge}`}>{data.status}</p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-muted">Upstream mode</dt>
          <dd className="mt-1 font-mono text-sm text-ink">{data.upstream_mode}</dd>
        </div>
        <div className="rounded-lg border border-line bg-panel px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-muted">Checked at</dt>
          <dd className="mt-1 font-mono text-sm text-ink">{data.checked_at}</dd>
        </div>
        <div className="rounded-lg border border-line bg-panel px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-muted">Impossibl Laya free?</dt>
          <dd className="mt-1 font-mono text-sm text-ink">
            {data.impossibl_catalog.ok
              ? String(data.impossibl_catalog.laya_free)
              : `catalog unreachable (${data.impossibl_catalog.status})`}
          </dd>
        </div>
        <div className="rounded-lg border border-line bg-panel px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-muted">Last 24h</dt>
          <dd className="mt-1 text-sm text-ink">
            {data.last_24h.total} calls · {data.last_24h.upstream5xx} upstream 5xx ·{" "}
            {data.last_24h.rateLimited} rate alerts
          </dd>
        </div>
      </dl>
      <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
        {data.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
