import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  description:
    "When to choose Laya and when to keep Jev: local open-source routing versus a closed API for wide label sets.",
  alternates: { canonical: canonical("/use-cases/") },
};

const cases = [
  {
    id: "ticket-routing",
    title: "Ticket routing",
    fit: [
      "A support message needs a small department choice, an ordinal urgency score, and yes/no flags such as churn or an explicit refund request. That is the README Router example and the triage preset laya.triage_questions().",
      "choice, score, and noul run in one forward pass. The README shows a confidence gate at 0.85 for automatic routing versus human review. Fit temperatures on your own data before trusting that threshold: both checkpoints ship over-confident.",
    ],
    unfit: [
      "A 10-way support queue. The themes table scores support triage at 0.502–0.522, and that data was in the training mix.",
      "Fifty or more labels in one choice question. Banking77 is 0.425 for the base checkpoints at the default head budget.",
      "Writing the reply. Laya does not generate text.",
    ],
  },
  {
    id: "content-safety",
    title: "Content safety",
    fit: [
      "Email spam and phishing in the themes table: 0.993, with the report noting ECE around 0.01. Both sources were in the training mix. Presets in the README are laya.moderation_questions() and laya.guard_questions().",
      "Held-out jailbreak detection lands at 0.708–0.762 across checkpoints, and a separate prompt-injection set is listed at 0.698. The report treats that as a signal, not a sole control.",
    ],
    unfit: [
      "Held-out toxicity moderation. The themes table is 0.530 with macro-F1 0.400. BENCHMARKS.md says hand-picked demo examples work and real traffic does not.",
      "A safety stack that only checks the model’s confidence on text the English checkpoint cannot read. Khmer is 0.000 accuracy at 0.952 confidence.",
    ],
  },
  {
    id: "intent-classification",
    title: "Intent classification",
    fit: [
      "English intent with a modest label set. MASSIVE intent English is 0.783 on laya in the summary table (the per-language grid lists English laya at 0.820; both numbers are in BENCHMARKS.md).",
      "Other languages when Router sends the request to laya-multilingual. The summary lists 0.451 on 13 other MASSIVE languages, and 45 of 51 languages clear 3× random.",
    ],
    unfit: [
      "Non-Latin text on the English checkpoint. The README says it collapses, and confidence stays high, so a confidence gate does not save the call. Route first.",
      "A single choice question with more than about 20 options, unless you raise head_max_len or shortlist with predict_shortlist. The README says keep choice questions under ~20 options at the defaults.",
    ],
  },
  {
    id: "scoring",
    title: "Scoring",
    fit: [
      "A short ordinal rubric: the README score primitive returns an expected level, a distribution, and a confidence. The ticket example uses not urgent / soon / critical.",
      "After domain fine-tuning. On typed-decisions the fine-tuned checkpoint’s score MAE is 0.242 in BENCHMARKS.md, against 0.694 and 0.687 for the base checkpoints.",
    ],
    unfit: [
      "Fine-grained sentiment such as SST-5. The README lists SST-5 at 0.372 for laya and calls ordinal score the weakest primitive.",
      "Zero-shot scoring with a base checkpoint on a typed-decisions style rubric. Those checkpoints sit under the majority-class baseline on that benchmark.",
    ],
  },
];

export default function UseCasesPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Use cases"
        lede="When the published tables point at Laya, and when they point at Jev. Task notes below use the README limits and the benchmark files."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <article id="when-laya" className="scroll-mt-24 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold text-ink">When to choose Laya</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>You need to run the model on your own machine, with Apache 2.0 weights, and the README comparison lists self-hosted cost as $0.</li>
            <li>The choice set is small. AG News has four labels. The ticket example uses four departments.</li>
            <li>You will fine-tune. The 0.766 typed-decisions score is the specialist checkpoint, not the base install.</li>
            <li>Latency on a local GPU matters. The official one-question multilingual figure is 32.8 ms on a T4.</li>
          </ul>
        </article>
        <article id="when-jev" className="scroll-mt-24 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold text-ink">When to keep Jev</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>You want a closed API that is already specialized, without a fine-tune step. Base Laya is under the majority-class line on typed-decisions.</li>
            <li>One choice question has more than about 20 labels. Banking77 is 0.870 for Jev on 72 labels and 0.425 for Laya on 77 labels at the default budget.</li>
            <li>You need the probability distribution, not only the top label. Jev&apos;s published soft accuracy is 0.580 against 0.471, and its published raw ECE is 0.144 against 0.213 before Laya&apos;s temperature fit.</li>
          </ul>
        </article>
      </div>
      <div className="grid gap-4">
        {cases.map((item) => (
          <article key={item.id} id={item.id} className="scroll-mt-24 rounded-lg border border-line bg-panel p-5">
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
