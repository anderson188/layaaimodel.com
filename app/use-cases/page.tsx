import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/PageTitle";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Use cases — Laya System One vs closed APIs",
  description:
    "Where Laya System One fits (local or hosted) and how it differs from closed decision APIs. Hosted packs from $5.",
  alternates: { canonical: canonical("/use-cases/") },
};

const cases = [
  {
    id: "ticket-routing",
    title: "Ticket routing",
    fit: [
      "A support message needs a small department choice, an ordinal urgency score, and yes/no flags such as churn or an explicit refund request. That is the README Router example and the triage preset laya.triage_questions().",
      "choice, score, and yes/no run in one forward pass. The README shows a confidence gate at 0.85 for automatic routing versus human review. Fit temperatures on your own data before trusting that threshold.",
    ],
    unfit: [
      "A very wide support queue with dozens of teams in one choice question — keep label sets small, or shortlist first.",
      "Writing the reply. Laya does not generate text; pair with a drafting model only if you add one yourself.",
    ],
  },
  {
    id: "content-safety",
    title: "Content safety",
    fit: [
      "Spam / phishing style gates and prompt-injection style yes/no flags in a single decide call — see the moderation and guard presets in the README.",
      "Hosted templates on this site (prompt-guard, content-moderate, scam-spot) share the same prepaid balance as /v1/decide.",
    ],
    unfit: [
      "A safety stack that only checks English-checkpoint confidence on text the model cannot read — route multilingual traffic to the multilingual checkpoint first.",
      "Sole control for jailbreak / toxicity: treat model scores as a signal, not the only gate.",
    ],
  },
  {
    id: "intent-classification",
    title: "Intent classification",
    fit: [
      "English intent with a modest label set, or other languages when Router sends the request to laya-multilingual.",
      "Small choice sets that match the ticket / AG News style examples in the README.",
    ],
    unfit: [
      "Non-Latin text on the English checkpoint without routing — confidence can stay high while accuracy collapses.",
      "One choice question with a very large option list at default head budget — raise head_max_len or shortlist first.",
    ],
  },
  {
    id: "scoring",
    title: "Scoring",
    fit: [
      "A short ordinal rubric: the README score primitive returns an expected level, a distribution, and a confidence.",
      "After domain fine-tuning when your rubric matches the specialist checkpoint.",
    ],
    unfit: [
      "Fine-grained sentiment such as SST-5 — the README treats ordinal score as the weakest primitive.",
      "Expecting a base install to match a fine-tuned specialist score out of the box — see /benchmarks/ for which checkpoint owns which figure.",
    ],
  },
];

export default function UseCasesPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Use cases"
        lede="How Laya System One divides work with closed decision APIs — then where hosted prepaid keys fit if you skip local install."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <article id="when-laya" className="scroll-mt-24 rounded-lg border border-line bg-panel p-5 shadow-glow">
          <h2 className="text-lg font-semibold text-ink">When Laya fits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>You want Apache 2.0 weights on your own machine, or a hosted prepaid key without running torch yourself.</li>
            <li>The choice set is small — ticket departments, AG News–scale labels, triage templates.</li>
            <li>You will fine-tune a specialist checkpoint for your workflow.</li>
            <li>Local GPU latency matters, or you want a key tonight via the hosted gateway on this site.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Prefer hosted?{" "}
            <Link href="/pricing/" className="text-accent hover:underline">
              Packs from $5
            </Link>
            , typical decide ≈ $0.0004.
          </p>
        </article>
        <article id="when-jev" className="scroll-mt-24 rounded-lg border border-line bg-panel p-5 shadow-glow">
          <h2 className="text-lg font-semibold text-ink">Where closed APIs differ</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>You want a vendor closed API already specialized for your task, with no fine-tune step.</li>
            <li>One choice question needs a very wide label inventory in a single prompt.</li>
            <li>You lean on soft / full probability distributions as a first-class product surface.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Published head-to-head numbers (including wide-label and baseline notes) live on{" "}
            <Link href="/benchmarks/" className="text-accent hover:underline">
              Benchmarks
            </Link>
            . Still want to try hosted Laya?{" "}
            <Link href="/pricing/" className="text-accent hover:underline">
              From $5
            </Link>
            .
          </p>
        </article>
      </div>
      <div className="grid gap-4">
        {cases.map((item) => (
          <article key={item.id} id={item.id} className="scroll-mt-24 rounded-lg border border-line bg-panel p-5 shadow-glow">
            <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-accent">Good fit</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                  {item.fit.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink">Poor fit</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                  {item.unfit.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
