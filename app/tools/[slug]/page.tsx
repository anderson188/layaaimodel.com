import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { PageTitle } from "@/components/PageTitle";
import { API_BASE_URL } from "@/lib/api";
import { canonical } from "@/lib/site";
import {
  exampleRequestBody,
  exampleSampleAnswers,
  TOOL_LANDING_SLUGS,
  toolLanding,
} from "@/lib/toolLandings";

export const dynamic = "force-static";

export function generateStaticParams() {
  return TOOL_LANDING_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = toolLanding(slug);
  if (!page) return { title: "Tool" };
  return {
    title: page.copy.title,
    description: page.copy.description,
    alternates: { canonical: canonical(`/tools/${slug}/`) },
    openGraph: {
      title: `${page.copy.title} | Laya AI`,
      description: page.copy.description,
      url: canonical(`/tools/${slug}/`),
    },
  };
}

export default async function ToolLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = toolLanding(slug);
  if (!page) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Unknown tool</h1>
        <Link href="/tools/" className="text-accent hover:underline">
          ← All templates
        </Link>
      </div>
    );
  }

  const { tool, copy } = page;
  const body = exampleRequestBody(tool);
  const sample = exampleSampleAnswers(tool);
  const curl = `curl ${API_BASE_URL}${tool.endpoint} \\
  -H "Authorization: Bearer laya_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body)}'`;

  const questionsPreview = Object.entries(tool.questions)
    .map(([id, q]) => {
      const criteria =
        q.type === "choice" && q.criteria && !Array.isArray(q.criteria)
          ? Object.keys(q.criteria).join(" | ")
          : q.type === "score" && Array.isArray(q.criteria)
            ? q.criteria.join(" → ")
            : "yes/no probability";
      return `${id} (${q.type}): ${q.instructions} [${criteria}]`;
    })
    .join("\n");

  const sampleLines = Object.entries(sample)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          Decision template · {copy.intent}
        </p>
        <PageTitle section={copy.h1} lede={copy.description} />
        <p className="font-mono text-xs text-muted">
          POST {API_BASE_URL}
          {tool.endpoint}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">When to use it</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{copy.whenToUse}</p>
        {copy.body.map((para) => (
          <p key={para.slice(0, 48)} className="max-w-3xl text-sm leading-relaxed text-muted">
            {para}
          </p>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">How the request works</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{copy.howItWorks}</p>
        <CodeBlock label="bash" code={curl} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Questions you get back</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Each id is a typed decision (choice / score / noul) — the System One shape, not a chat
          completion.
        </p>
        <CodeBlock label="text" code={questionsPreview} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Example result shape</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{copy.exampleNarrative}</p>
        <CodeBlock label="sample answers" code={sampleLines} />
        <p className="text-sm text-muted">
          Live calibrated bars and a free anonymous try: open the{" "}
          <Link className="text-accent hover:underline" href={`/#playground`}>
            homepage playground
          </Link>{" "}
          or the interactive{" "}
          <Link className="text-accent hover:underline" href={`/tools/#${tool.slug}`}>
            tools runner
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Pricing & keys</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Create a <code className="font-mono text-ink">laya_</code> key on{" "}
          <Link className="text-accent hover:underline" href="/account/">
            Account
          </Link>
          , buy prepaid packs on{" "}
          <Link className="text-accent hover:underline" href="/pricing/">
            Pricing
          </Link>
          , or read the full decide reference under{" "}
          <Link className="text-accent hover:underline" href="/docs/api/">
            API docs
          </Link>
          . Output tokens are free; input is metered.
        </p>
      </section>
    </article>
  );
}
