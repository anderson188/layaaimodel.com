import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { DataTable } from "@/components/DataTable";
import { PageTitle } from "@/components/PageTitle";
import { routedVsJev } from "@/lib/benchmarks";
import { HOME_PREVIEW, PIP_INSTALL } from "@/lib/snippets";
import { SITE_DESCRIPTION, SITE_TITLE, UPSTREAM_REPO } from "@/lib/site";

const features = [
  {
    title: "Fast Inference",
    body: "The README speed table measures 32.8 ms for one question on laya-multilingual, and 39.5 ms on laya, on a Tesla T4. Batched multilingual throughput in that table is 7.2 ms/question at 10 questions.",
  },
  {
    title: "Apache 2.0 Open Source",
    body: "The repository license is Apache 2.0. Package install is pip install laya. Weights are published on Hugging Face under convaiinnovations/laya.",
  },
  {
    title: "100+ Languages",
    body: "The README describes laya-multilingual as the checkpoint for 100+ languages. On the published 51-language MASSIVE sweep, that checkpoint clears 3× random on 45 of 51 languages.",
  },
  {
    title: "No LLM Hallucinations",
    body: "The project states there is no text generation, so there is nothing to parse and nothing to hallucinate. Outputs are typed choice, score, and noul decisions. Label errors still show up in the benchmark tables.",
  },
];

const useCases = [
  { href: "/use-cases/#ticket-routing", title: "Ticket routing", body: "Department, urgency, churn, and refund flags on a support message." },
  { href: "/use-cases/#content-safety", title: "Content safety", body: "Spam, phishing, and guardrail checks. Held-out toxicity is a weak result in the report." },
  { href: "/use-cases/#intent-classification", title: "Intent classification", body: "Choice questions such as MASSIVE intent, with the router picking the checkpoint." },
  { href: "/use-cases/#scoring", title: "Scoring", body: "Ordinal score rubrics for urgency or severity. SST-5 is the weakest published primitive." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_TITLE,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Windows, macOS, Linux",
  softwareVersion: "0.3.6",
  license: "https://www.apache.org/licenses/LICENSE-2.0",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: SITE_DESCRIPTION,
  disambiguatingDescription:
    "Unofficial community documentation. Not affiliated with Convai Innovations. Not the LayaAir game engine.",
  codeRepository: UPSTREAM_REPO,
  installUrl: "https://pypi.org/project/laya/",
  url: UPSTREAM_REPO,
  sameAs: ["https://pypi.org/project/laya/", "https://huggingface.co/convaiinnovations/laya"],
  author: { "@type": "Organization", name: "Convai Innovations" },
};

export default function Home() {
  return (
    <div className="space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section>
        <PageTitle lede="Multilingual, non-autoregressive System 1 decision engine: typed decisions over 100+ languages in a single forward pass." />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/get-started/"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            href="/benchmarks/"
            className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-ink hover:border-accent"
          >
            View Benchmarks
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Features</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-line bg-panel p-5">
              <h3 className="font-medium text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Quickstart</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Install from PyPI, then call the Router. This preview is a shortened slice of the README quickstart. The full script is on Get Started. This site does not run the model.
        </p>
        <div className="mt-6 space-y-4">
          <CodeBlock label="bash" code={PIP_INSTALL} />
          <CodeBlock label="python" code={HOME_PREVIEW} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Benchmark snapshot</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Side-by-side figures from the upstream README. Laya numbers are the project&apos;s own measurements. Jev numbers in that table are third-party published results and were not remeasured by the Laya authors. Read the full tables before treating any row as a product claim.
        </p>
        <div className="mt-6">
          <DataTable {...routedVsJev} />
        </div>
        <p className="mt-3 text-sm">
          <Link href="/benchmarks/" className="text-accent hover:underline">
            Open the benchmark tables
          </Link>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Use cases</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {useCases.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-line bg-panel p-5 hover:border-accent"
            >
              <h3 className="font-medium text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
