import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hosted API",
  description: "Hosted Laya API overview — see the full reference under /docs/api/.",
  alternates: { canonical: canonical("/api/") },
};

export default function ApiOverviewPage() {
  return (
    <div className="space-y-8">
      <PageTitle
        section="Hosted API"
        lede="Unofficial Laya System One HTTP API with prepaid metering, tools, and account console."
      />
      <p className="max-w-3xl text-sm leading-relaxed text-muted">
        Full endpoint reference, examples, batch, gate, and ready-made tools live on the{" "}
        <Link className="text-accent hover:underline" href="/docs/api/">
          API docs
        </Link>
        . Create keys on{" "}
        <Link className="text-accent hover:underline" href="/account/">
          Account
        </Link>
        , buy packs on{" "}
        <Link className="text-accent hover:underline" href="/pricing/">
          Pricing
        </Link>
        , or try templates on{" "}
        <Link className="text-accent hover:underline" href="/tools/">
          Tools
        </Link>
        .
      </p>
    </div>
  );
}
