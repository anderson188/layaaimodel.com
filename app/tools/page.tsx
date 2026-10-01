import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { ToolsClient } from "@/components/ToolsClient";
import { canonical } from "@/lib/site";
import { TOOL_LANDINGS } from "@/lib/toolLandings";

export const metadata: Metadata = {
  title: "Decision templates",
  description:
    "Laya decision templates: support triage, email triage, content moderation, prompt injection guard, scam spotting, and more. Paste a laya_ key or try 1 free anonymous run.",
  alternates: { canonical: canonical("/tools/") },
};

export default function ToolsPage() {
  const guides = Object.values(TOOL_LANDINGS);
  return (
    <div className="space-y-10">
      <PageTitle
        section="Decision templates"
        lede="Runnable production templates for triage, moderation, agents, and labeling — mirror the same patterns on /v1/decide. Anonymous: 1 free run. Signed in / pasted key: prepaid balance."
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Guides (what / when / example)</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/tools/${g.slug}/`}
                className="block rounded-md border border-line bg-panel px-3 py-2 text-sm hover:border-accent"
              >
                <span className="font-medium text-ink">{g.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{g.intent}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ToolsClient />
    </div>
  );
}
