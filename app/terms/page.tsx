import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { canonical, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  description:
    "Terms of use for the unofficial Laya AI community site and prepaid API gateway at layaaimodel.com.",
  alternates: { canonical: canonical("/terms/") },
};

export default function TermsPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Terms of use"
        lede="These terms apply to www.layaaimodel.com and the hosted API gateway. Last updated: 29 September 2026."
      />

      <div className="max-w-3xl space-y-8 text-sm leading-relaxed text-muted">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">1. Unofficial service</h2>
          <p>
            This site and API are an independent community project. We are not affiliated with, endorsed by, or
            partners of Convai Innovations, TypeSafe AI, Impossibl, or Cloudflare. Product names belong to their
            owners.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">2. What you buy</h2>
          <p>
            Prepaid credits buy capacity on our gateway: authentication, metering, documentation, and tool
            templates. Inference is typically proxied to a third-party host. You are not purchasing raw upstream
            provider keys, an official model SLA, or affiliation with the model authors.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">3. Accounts and API keys</h2>
          <p>
            You must keep credentials secret, not share accounts abusively, and not attempt to bypass rate limits,
            billing, or authentication. We may suspend keys or accounts that threaten the service or violate law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">4. Acceptable use</h2>
          <p>
            Do not use the service for unlawful activity, malware, child sexual exploitation, scams, unauthorized
            access to systems, or to violate third-party terms of upstream providers. You are responsible for the
            content of <code className="font-mono text-ink">state</code> and questions you submit.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">5. Payments and refunds</h2>
          <p>
            Packs are sold in USD via Stripe. Credits are applied after successful payment confirmation (webhook).
            Because capacity is digital and consumed on use, purchases are generally non-refundable except where
            required by law or when a clear billing error is on our side.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">6. Availability and changes</h2>
          <p>
            Upstream models, pricing, and free allowances may change without notice. We may pause the gateway,
            change packs, or discontinue features. Published local GPU latency figures do not apply to this hosted
            path.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">7. Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of merchantability, fitness, or
            non-infringement. Model outputs can be wrong; do not rely on them as the sole control for safety-critical
            decisions without your own validation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">8. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, our total liability for claims relating to the service is limited
            to the amount you paid us for credits in the three months before the claim.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">9. Privacy</h2>
          <p>
            See our{" "}
            <Link className="text-accent hover:underline" href="/privacy/">
              Privacy policy
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">10. Contact</h2>
          <p>
            Site:{" "}
            <a className="text-accent hover:underline" href={SITE_URL}>
              {SITE_URL}
            </a>
            . For billing or abuse reports, use the contact channel published on the account or status pages when
            available.
          </p>
        </section>
      </div>
    </div>
  );
}
