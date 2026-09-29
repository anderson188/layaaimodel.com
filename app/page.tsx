import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { DataTable } from "@/components/DataTable";
import { HomePlayground } from "@/components/HomePlayground";
import { VideoGallery } from "@/components/VideoGallery";
import { caholBanking, luniPhishing, luniTyped, routedVsJev } from "@/lib/benchmarks";
import { HOME_PREVIEW, PIP_INSTALL } from "@/lib/snippets";
import { canonical, SITE_DESCRIPTION, SITE_TITLE, UPSTREAM_REPO } from "@/lib/site";
import { COMMUNITY_VIDEOS, youtubeThumbUrl, youtubeWatchUrl } from "@/lib/videos";

export const metadata: Metadata = {
  description:
    "Laya playground: run typed decision tools live — choice, score, noul. Open-source System-1 model vs closed Jev API.",
  alternates: { canonical: canonical("/") },
};

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
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          Laya AI · System-1
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Open-source typed decisions
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          Choice / score / noul in one forward pass. Hosted prepaid API on this site — or run weights
          locally. Same playground shape as unofficial Jev hosts; inference is Laya.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#playground"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            ▶ Try playground
          </a>
          <Link
            href="/account/"
            className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-ink hover:border-accent"
          >
            Get API key →
          </Link>
          <Link
            href="/pricing/"
            className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-ink hover:border-accent"
          >
            Pricing
          </Link>
        </div>
      </section>

      <HomePlayground />

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Laya vs Jev</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Official self-test vs a Hugging Face community remeasure. Full write-up:{" "}
          <Link href="/benchmarks/" className="text-accent hover:underline">
            Benchmarks
          </Link>
          .
        </p>
        <DataTable {...routedVsJev} />
        <DataTable {...luniTyped} />
        <DataTable {...luniPhishing} />
        <DataTable {...caholBanking} />
      </section>

      <VideoGallery />

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Run Laya locally</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Weights are Apache 2.0. Full script on{" "}
          <Link href="/get-started/" className="text-accent hover:underline">
            Get Started
          </Link>
          .
        </p>
        <div className="mt-6 space-y-4">
          <CodeBlock label="bash" code={PIP_INSTALL} />
          <CodeBlock label="python" code={HOME_PREVIEW} />
        </div>
      </section>
    </div>
  );
}
