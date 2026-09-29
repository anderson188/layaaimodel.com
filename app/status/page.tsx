import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { StatusClient } from "@/components/StatusClient";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  description:
    "Operational status for the unofficial Laya System-1 API gateway: upstream mode, catalog pricing probe, and recent error rates.",
  alternates: { canonical: canonical("/status/") },
};

export default function StatusPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Gateway status"
        lede="Live probe of the Cloudflare Worker gateway and the Impossibl model catalog. Admin can pause or switch upstream when free pricing changes."
      />
      <StatusClient />
    </div>
  );
}
