import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { canonical, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy policy for the unofficial Laya AI community site and prepaid API gateway at layaaimodel.com.",
  alternates: { canonical: canonical("/privacy/") },
};

export default function PrivacyPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Privacy policy"
        lede="How we handle account and usage data for layaaimodel.com. Last updated: 29 September 2026."
      />

      <div className="max-w-3xl space-y-8 text-sm leading-relaxed text-muted">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">1. Who we are</h2>
          <p>
            This unofficial community site and API gateway operate independently of Convai Innovations, TypeSafe AI,
            and Impossibl. The service is offered at{" "}
            <a className="text-accent hover:underline" href={SITE_URL}>
              {SITE_URL}
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">2. Data we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account email and hashed password (we do not store plaintext passwords).</li>
            <li>API key metadata (prefix, status) and usage events (tokens, path, timestamps, status codes).</li>
            <li>Billing metadata from Stripe (customer email, pack id, payment references) — card data is handled by Stripe.</li>
            <li>Approximate client IP hashes for anonymous free tool-run limits.</li>
            <li>Content you send in API or tool requests (`state`, questions, tool fields) is processed to return answers.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">3. Why we process it</h2>
          <p>
            To authenticate you, meter prepaid credits, prevent abuse, provide support, improve reliability, and meet
            legal obligations. Inference requests are forwarded to our configured upstream host so the model can
            answer.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">4. Processors and transfers</h2>
          <p>
            Infrastructure may include Cloudflare (hosting, Workers, D1) and Stripe (payments). Upstream model hosting
            (for example Impossibl) receives request payloads needed for inference. Those providers process data under
            their own terms and policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">5. Retention</h2>
          <p>
            Account and ledger data are kept while your account is active and for a reasonable period afterward for
            billing disputes and security. Usage logs may be aggregated or deleted on a rolling basis. You may request
            account deletion; we will remove or anonymize personal data except where we must retain records by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">6. Cookies and local storage</h2>
          <p>
            The marketing site is mostly static. The console stores a session token and optional pasted API key in
            your browser local storage so you stay signed in and can run tools. Clear site data to remove them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">7. Your choices</h2>
          <p>
            You can revoke API keys, log out, and adjust burn-alert preferences in{" "}
            <Link className="text-accent hover:underline" href="/account/">
              Account
            </Link>
            . For deletion or privacy requests, contact us through the channels published on the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">8. Children</h2>
          <p>The service is not directed to children under 16. Do not create an account if you are under that age.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">9. Changes</h2>
          <p>
            We may update this policy. Continued use after a posted update means you accept the revised policy. See
            also our{" "}
            <Link className="text-accent hover:underline" href="/terms/">
              Terms of use
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
