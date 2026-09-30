import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { PricingClient } from "@/components/PricingClient";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hosted Laya API Pricing — ≈$0.0004 per decide",
  description:
    "Prepaid hosted Laya System One API: instant laya_ keys, no GPU ops, ready-made tools. From $5. Typical decide ≈$0.0004. Register, then buy a pack.",
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
        <h2 className="text-xl font-semibold tracking-tight text-ink">Why hosted (not Jev, not pip install)</h2>
        <p>
          Published TypeSafe Jev is about <strong className="font-medium text-ink">$0.042 / 1M tokens</strong> —
          a closed API that works out of the box. Apache 2.0 Laya is{" "}
          <strong className="font-medium text-ink">$0 to self-host</strong> if you already run GPU/CPU inference.
          This page sells neither of those.
        </p>
        <p>
          You are buying a <strong className="font-medium text-ink">community hosted gateway</strong>: prepaid
          metering, instant keys, shared balance for decide + tools, and no model ops. Input rates here (
          $0.20–$0.42/M) are higher than Jev&apos;s published figure because the product is convenience capacity,
          not a claim to undercut TypeSafe on raw $/M.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-ink">Choose Jev</strong> when you want the closed API, Banking77-scale
            label sets, or an official vendor relationship.
          </li>
          <li>
            <strong className="font-medium text-ink">Self-host Laya</strong> when you already own the box, need air-gap,
            or want zero per-token markup on open weights.
          </li>
          <li>
            <strong className="font-medium text-ink">Buy hosted here</strong> when you want System One decisions tonight —
            key in minutes, prepaid so finance does not need a new vendor review, templates for triage / jailbreak
            gates / scam spot without wiring torch yourself.
          </li>
        </ul>
        <p>
          Full tables:{" "}
          <Link className="text-accent hover:underline" href="/benchmarks/">
            Laya vs Jev benchmarks
          </Link>
          . Local install:{" "}
          <Link className="text-accent hover:underline" href="/get-started/">
            Get started
          </Link>
          .
        </p>
      </section>

      <PricingClient />
    </div>
  );
}
