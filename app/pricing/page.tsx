import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { PricingClient } from "@/components/PricingClient";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  description:
    "Laya hosted API pricing: prepaid input-token packs from $5–$500. Output free. Same balance for /v1/decide and tools.",
  alternates: { canonical: canonical("/pricing/") },
};

export default function PricingPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Pricing"
        lede="Pay for input only — output is free. Start with $5–$20 to wire /v1/decide; move to Production ($100) when you leave staging. Tokens never expire while your account is active."
      />
      <PricingClient />
    </div>
  );
}
