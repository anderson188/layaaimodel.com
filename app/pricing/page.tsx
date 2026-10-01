import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { PricingClient } from "@/components/PricingClient";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hosted Laya API Pricing — ≈$0.0004 per decide",
  description:
    "Prepaid hosted Laya System One API: instant laya_ keys, no GPU ops, ready-made tools. From $5. Typical decide ≈$0.0004 — cheaper than routing triage through a chat LLM.",
  alternates: { canonical: canonical("/pricing/") },
};

export default function PricingPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Hosted Laya API — prepaid decide calls"
        lede="Skip torch, T4s, and Router preload. Register, buy a pack, create a laya_ key, call /v1/decide and the tool templates. Typical call ≈$0.0004."
      />

      <section className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Priced per decision, not per chat token</h2>
        <p>
          System One returns choice / score / yes-no in one forward pass. A typical{" "}
          <code className="font-mono text-ink">/v1/decide</code> is about{" "}
          <strong className="font-medium text-ink">$0.0004</strong> — a few tenths of a mill. Routing the same
          triage or label job through GPT/Claude chat completions usually costs several× that per call (prompt +
          completion), before you parse free text.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-ink">Instant key</strong> — register, top up, mint a{" "}
            <code className="font-mono text-ink">laya_</code> key in minutes.
          </li>
          <li>
            <strong className="font-medium text-ink">No GPU ops</strong> — no torch install, no Hugging Face
            download, no Router preload.
          </li>
          <li>
            <strong className="font-medium text-ink">Tools included</strong> — triage, jailbreak gate, scam spot,
            and more on the same prepaid balance.
          </li>
        </ul>
        <p>
          Want local weights instead? See{" "}
          <Link className="text-accent hover:underline" href="/download/">
            Download
          </Link>{" "}
          and{" "}
          <Link className="text-accent hover:underline" href="/get-started/">
            Get started
          </Link>
          . Benchmark tables:{" "}
          <Link className="text-accent hover:underline" href="/benchmarks/">
            Laya vs Jev
          </Link>
          .
        </p>
      </section>

      <PricingClient />
    </div>
  );
}
