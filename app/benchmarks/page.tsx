import type { Metadata } from "next";
import { DataTable } from "@/components/DataTable";
import { PageTitle } from "@/components/PageTitle";
import {
  caholBanking,
  calibration,
  englishVsRest,
  headline,
  languageMacro,
  languages,
  luniLatency,
  luniPhishing,
  luniTyped,
  optionOrder,
  publicDatasets,
  routedVsJev,
  speed,
  themes,
  typedDecisions,
  whyRoute,
  workflows,
} from "@/lib/benchmarks";
import { canonical, UPSTREAM_REPO } from "@/lib/site";

export const metadata: Metadata = {
  description:
    "Laya benchmark, and a Laya vs Jev benchmark explained: why official self-test scores and Hugging Face community scores do not match.",
  alternates: { canonical: canonical("/benchmarks/") },
};

const tables = [
  routedVsJev,
  whyRoute,
  luniTyped,
  luniPhishing,
  luniLatency,
  caholBanking,
  headline,
  speed,
  typedDecisions,
  workflows,
  languageMacro,
  englishVsRest,
  languages,
  themes,
  publicDatasets,
  calibration,
  optionOrder,
];

export default function BenchmarksPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Laya benchmark"
        lede="Official self-test tables and one Hugging Face community remeasure. This site did not run either set and does not add scores of its own."
      />

      <section className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Laya vs Jev benchmark explained</h2>
        <p>
          The scores disagree because they are not the same experiment. Mixing them into one ranking is what makes Laya vs Jev threads look contradictory.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Official self-test versus a published Jev number. The README and BENCHMARKS.md measure Laya. Jev cells are third-party published figures. The authors say they had no TypeSafe API access, so sample size and prompts differ.
          </li>
          <li>
            Fine-tuned specialist versus the base checkpoint. 0.766 on typed-decisions is <code className="font-mono text-ink">laya-typed-decisions</code>. The base checkpoints in that file are 0.361 and 0.342, under the 0.461 majority-class line.
          </li>
          <li>
            Two files, two AG News cells. The README routed column is 0.950. The BENCHMARKS.md headline is 0.953, which matches the typed-decisions column in the dataset table. English MASSIVE intent is 0.783 in the summary and 0.820 in the 51-language grid.
          </li>
          <li>
            Brier is 0.062 on the README and the Hugging Face model card, and 0.061 in BENCHMARKS.md. The table below keeps 0.061 and names the other figure in its caption.
          </li>
          <li>
            Banking77 is not one protocol. The official comparison is Jev 0.870 on 72 labels against Laya 0.425 on 77 labels at the default token budget. A community fine-tune, Cahol/laya-banking77-v1, reports 85.55% on the 3,080-example 77-label test and 45.91% for the untuned base under that same protocol. That card says this is not a claim of beating Jev.
          </li>
          <li>
            Community remeasure versus the model card. Luni/laya-jev-benchmark says a model-card comparison of 83.8% with 67.8% uses two different benchmarks. On that card&apos;s own typed-decisions rerun, untuned Laya is 0.360 and a fine-tune is 0.767, next to Jev&apos;s published 0.727. The Jev row is marked published there too. Phishing on a held-out set is 0.505 raw for Laya, 0.611 after Platt scaling on half the emails, and 0.626 for the published Jev figure. Luni notes the 0.611 uses a calibration half and the 0.626 does not.
          </li>
        </ul>
      </section>

      <section className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="text-xl font-semibold tracking-tight text-ink">How to read these numbers</h2>
        <p>
          Laya figures in <a className="text-accent hover:underline" href={`${UPSTREAM_REPO}/blob/main/BENCHMARKS.md`}>BENCHMARKS.md</a> and the README are the project&apos;s own measurements. The report says every checkpoint answered byte-identical questions in each run, with a fixed seed. Reproduce from <code className="font-mono text-ink">notebooks/laya_benchmark_colab.ipynb</code> on a T4, and from the JSON files named in that report: <code className="font-mono text-ink">research/results/t4_colab_benchmark.json</code>, <code className="font-mono text-ink">cpu_51_language_sweep.json</code>, and <code className="font-mono text-ink">app_benchmark.json</code>.
        </p>
        <p>
          Jev figures in the same files are third-party published numbers. The Laya authors say they had no TypeSafe API access, so sample sizes and prompts differ. Treat the Jev column as indicative, which is the wording in BENCHMARKS.md.
        </p>
        <p>
          Two upstream tables do not use the same English MASSIVE number: the 51-language grid lists English <code className="font-mono text-ink">laya</code> at 0.820, and the “English vs the rest” summary lists 0.783. The README routed AG News cell is 0.950, while the BENCHMARKS.md headline AG News cell is 0.953 (the typed-decisions checkpoint in the dataset table). Both are shown under the caption of the table they came from.
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Where the report says it fits</h2>
        <p>
          The fine-tuned <code className="font-mono text-ink">laya-typed-decisions</code> checkpoint is the one that reaches 0.766 accuracy on 2,000 typed decisions. The base checkpoints sit at 0.361 and 0.342, under the 0.461 majority-class baseline in that file. The report&apos;s own limit statement is that Laya is a fast base to specialise, not a zero-shot decision engine.
        </p>
        <p>
          Small label sets are the published strong side: AG News has four labels. Email spam and phishing, both marked in training, are 0.993 in the themes table. Single-question T4 latency for the multilingual checkpoint is 32.8 ms. The README comparison also lists self-hosted cost as $0 against Jev&apos;s published $0.042 / 1M tokens, and Apache 2.0 weights against a closed API.
        </p>
        <p>
          For languages, use the router. The English checkpoint collapses off English and stays confident: Khmer is 0.000 accuracy at 0.952 confidence in the per-language table. Confidence gating cannot catch that, which is why routing happens before the forward pass.
        </p>
      </section>

      <section className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Where the report says Jev leads</h2>
        <p>
          Banking77 is the clear loss in the public-dataset table: Jev 0.870 on 72 labels, Laya 0.425 on 77 labels at the default token budget, and 0.492 on the typed-decisions checkpoint. The README calls this an architectural <code className="font-mono text-ink">head_max_len</code> limit and says Jev is currently better for 50+ options in one prompt without tuning.
        </p>
        <p>
          On typed-decisions, Jev&apos;s published soft accuracy is 0.580 against Laya&apos;s 0.471, and Jev&apos;s published raw ECE is 0.144 against 0.213 before temperature fitting. Laya&apos;s 0.081 ECE is after a temperature refit. Held-out toxicity moderation is 0.530. Ordinal score is the weakest primitive in the README (SST-5 0.372 on the English task list).
        </p>
      </section>

      <div className="space-y-8">
        {tables.map((table) => (
          <DataTable key={table.caption} {...table} />
        ))}
      </div>
    </div>
  );
}
