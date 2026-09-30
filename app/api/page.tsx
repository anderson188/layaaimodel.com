import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { API_BASE_URL } from "@/lib/api";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hosted Laya API",
  description:
    "Hosted Laya System One API at api.layaaimodel.com: prepaid laya_ keys, /v1/decide, batch, gate, and ready-made tool endpoints with shared metering.",
  alternates: { canonical: canonical("/api/") },
};

const highlights = [
  {
    title: "Core decide",
    body: "POST /v1/decide (alias /v1/systemone) with state + typed questions — choice, score, noul. Prepaid input tokens; output free.",
  },
  {
    title: "Batch & gate",
    body: "POST /v1/batch/decide for up to 20 states. POST /v1/gate for allow/review/block without burning tokens.",
  },
  {
    title: "Ready-made tools",
    body: "Fixed templates such as support triage, email triage, content moderate, prompt guard, and scam spot — same Bearer key and balance.",
  },
  {
    title: "Console & packs",
    body: "Register on Account for laya_ keys and monthly free tokens. Buy $5–$500 packs on Pricing. Monitor burn on Account.",
  },
];

export default function ApiOverviewPage() {
  return (
    <div className="space-y-8">
      <PageTitle
        section="Hosted Laya API"
        lede="Unofficial community gateway for the Laya System One decision model — instant keys, prepaid metering, and production templates."
      />

      <p className="max-w-3xl text-sm leading-relaxed text-muted">
        Base URL:{" "}
        <code className="font-mono text-ink">{API_BASE_URL}</code>
        . Auth:{" "}
        <code className="font-mono text-ink">Authorization: Bearer laya_…</code>
        . Inference is proxied to a third-party host by default; not affiliated with Convai Innovations,
        TypeSafe, or Impossibl.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {highlights.map((item) => (
          <li key={item.title} className="rounded-lg border border-line bg-panel p-4">
            <h2 className="font-medium text-ink">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="rounded-md bg-accent px-4 py-2 font-medium text-accent-fg" href="/docs/api/">
          Full API reference →
        </Link>
        <Link className="rounded-md border border-line px-4 py-2 text-ink hover:border-accent" href="/account/">
          Create key
        </Link>
        <Link className="rounded-md border border-line px-4 py-2 text-ink hover:border-accent" href="/tools/">
          Try tools
        </Link>
        <Link className="rounded-md border border-line px-4 py-2 text-ink hover:border-accent" href="/pricing/">
          Pricing
        </Link>
      </div>
    </div>
  );
}
