import type { Metadata } from "next";
import { DataTable } from "@/components/DataTable";
import { PageTitle } from "@/components/PageTitle";
import {
  calibration,
  englishVsRest,
  headline,
  languageMacro,
  languages,
  optionOrder,
  publicDatasets,
  routedVsJev,
  speed,
  themes,
  typedDecisions,
  workflows,
} from "@/lib/benchmarks";
import { canonical, UPSTREAM_REPO } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: canonical("/benchmarks/") },
};

const tables = [
  headline,
  routedVsJev,
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
        section="Benchmarks"
        lede="Tables below are copied from the upstream repository. This site did not re-run them and does not add scores of its own."
      />

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
