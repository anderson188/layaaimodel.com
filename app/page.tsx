import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { DataTable } from "@/components/DataTable";
import { HomePlayground } from "@/components/HomePlayground";
import { PageTitle } from "@/components/PageTitle";
import { VideoGallery } from "@/components/VideoGallery";
import { caholBanking, luniPhishing, luniTyped, routedVsJev } from "@/lib/benchmarks";
import { HOME_PREVIEW, PIP_INSTALL } from "@/lib/snippets";
import { canonical, HOME_DESCRIPTION, SITE_DESCRIPTION, SITE_TITLE, UPSTREAM_REPO } from "@/lib/site";
import { COMMUNITY_VIDEOS, youtubeThumbUrl, youtubeWatchUrl } from "@/lib/videos";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: canonical("/") },
  openGraph: {
    title: SITE_TITLE,
    description: HOME_DESCRIPTION,
    url: canonical("/"),
  },
};

const features = [
  {
    title: "Fast Inference",
    body: "Official T4 table: 32.8 ms for one question on laya-multilingual, 39.5 ms on laya. Batched multilingual throughput there is 7.2 ms/question at 10 questions.",
  },
  {
    title: "Apache 2.0 Open Source",
    body: "Weights and the pip package are Apache 2.0. Jev, in the same README comparison, is a closed API at a published $0.042 / 1M tokens.",
  },
  {
    title: "100+ Languages",
    body: "The README describes laya-multilingual as the 100+ language checkpoint. On the published 51-language MASSIVE sweep it clears 3× random on 45 of 51 languages.",
  },
  {
    title: "No LLM Hallucinations",
    body: "The project says there is no text generation, so there is nothing to parse. Outputs are choice, score, and noul. Wrong labels still show up in the tables below.",
  },
];

const useCases = [
  { href: "/use-cases/#when-laya", title: "Choose Laya", body: "Local, open weights, small label sets, or a checkpoint you fine-tune." },
  { href: "/use-cases/#when-jev", title: "Keep Jev", body: "Out of the box, or one choice question with more than about 20 labels." },
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
  sameAs: [
    "https://pypi.org/project/laya/",
    "https://huggingface.co/convaiinnovations/laya",
    "https://huggingface.co/datasets/Luni/laya-jev-benchmark",
  ],
  author: { "@type": "Organization", name: "Convai Innovations" },
};

const videoJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Community Laya YouTube explainers",
  itemListElement: COMMUNITY_VIDEOS.map((video, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "VideoObject",
      name: video.title,
      description: video.note,
      thumbnailUrl: youtubeThumbUrl(video.id),
      embedUrl: `https://www.youtube-nocookie.com/embed/${video.id}`,
      contentUrl: youtubeWatchUrl(video.id),
      publisher: { "@type": "Person", name: video.channel },
    },
  })),
};

export default function Home() {
  return (
    <div className="space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />

      <section>
        <figure className="rounded-2xl border border-line bg-panel px-6 py-10 sm:px-12 sm:py-14">
          <img
            src="/official/logo-lockup-dark.svg"
            alt="Official Laya logo: a blue spiral mark, the word laya, and the line decisions, not text."
            width={252}
            height={72}
            className="mx-auto h-32 w-auto sm:h-44"
          />
          <figcaption className="mt-6 text-center text-xs leading-relaxed text-muted">
            Official logo from the{" "}
            <a
              href="https://huggingface.co/convaiinnovations/laya/tree/main/assets"
              className="text-accent hover:underline"
            >
              Convai Innovations model card
            </a>
            .
          </figcaption>
        </figure>
        <div className="mt-8">
          <PageTitle lede="Laya System One model, compared with Jev. Multilingual, non-autoregressive System One decision engine: typed decisions over 100+ languages in a single forward pass." />
        </div>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink">
          Jev is a closed API that works out of the box. Laya is open source, runs locally, and is low latency, and it is weak when one choice question has many labels.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/account/" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            Get API key →
          </Link>
          <a href="#playground" className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-ink hover:border-accent">
            ▶ Try playground
          </a>
          <Link href="/tools/" className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-ink hover:border-accent">
            ▶ Try tools
          </Link>
          <Link href="/pricing/" className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-ink hover:border-accent">
            Pricing
          </Link>
          <Link href="/get-started/" className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-ink hover:border-accent">
            Run locally
          </Link>
        </div>
      </section>

      <HomePlayground />

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Laya vs Jev</h2>
        <figure className="overflow-hidden rounded-lg border border-line">
          <img
            src="/official/laya_vs_jev.png"
            alt="Official chart comparing Laya with routing against TypeSafe Jev on accuracy, language coverage, speed, calibration, license, and cost."
            width={2028}
            height={1310}
            className="w-full bg-white"
          />
          <figcaption className="border-t border-line bg-panel px-4 py-3 text-xs leading-relaxed text-muted">
            Official figure from the{" "}
            <a href="https://huggingface.co/convaiinnovations/laya" className="text-accent hover:underline">
              convaiinnovations/laya
            </a>{" "}
            model card. Jev bars are published third-party numbers.
          </figcaption>
        </figure>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Two sources sit in separate tables on purpose. The first is the project&apos;s own README. The second is a Hugging Face community dataset that remeasured Laya. Jev cells in both places are published quotes unless a caption says otherwise. The write-up of why the figures disagree is the <Link href="/benchmarks/" className="text-accent hover:underline">Laya vs Jev benchmark explained</Link> page.
        </p>
        <div className="rounded-lg border border-line bg-panel p-5 text-sm leading-relaxed text-muted">
          On the official typed-decisions run, the base checkpoints score 0.362 and 0.342, under the 0.461 majority-class baseline. The 0.766 figure belongs to <code className="font-mono text-ink">laya-typed-decisions</code>, fine-tuned on that benchmark&apos;s training split. Installing the package does not give you that score.
        </div>
        <h3 className="text-lg font-medium text-ink">Official self-test</h3>
        <DataTable {...routedVsJev} />
        <h3 className="text-lg font-medium text-ink">Third-party independent test</h3>
        <DataTable {...luniTyped} />
        <DataTable {...luniPhishing} />
        <DataTable {...caholBanking} />
      </section>

      <VideoGallery />

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
        <h2 className="text-xl font-semibold tracking-tight">Run Laya locally</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Shortened slice of the README Router quickstart. Hardware, preload pitfalls, and the full script are on <Link href="/get-started/" className="text-accent hover:underline">Get Started</Link>. This site does not run the model.
        </p>
        <div className="mt-6 space-y-4">
          <CodeBlock label="bash" code={PIP_INSTALL} />
          <CodeBlock label="python" code={HOME_PREVIEW} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Use cases</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {useCases.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg border border-line bg-panel p-5 hover:border-accent">
              <h3 className="font-medium text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
