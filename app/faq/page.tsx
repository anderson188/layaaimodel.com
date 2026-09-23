import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { canonical, UPSTREAM_REPO } from "@/lib/site";

export const metadata: Metadata = {
  description:
    "FAQ for the Laya system one model: LayaAir, whether Laya can replace Jev, Banking77 limits, and the Apache 2.0 license.",
  alternates: { canonical: canonical("/faq/") },
};

const faqs = [
  {
    q: "Is Laya the same as LayaAir game engine?",
    a: "No. LayaAir is a game engine. Laya in this documentation is the System 1 decision model in the Convai Innovations repository NandhaKishorM/laya. The pages here use the full name Laya AI - Open Source System-1 Decision Model so the two projects are not mixed up. This site is not affiliated with either project.",
  },
  {
    q: "What is Laya AI Model?",
    a: "The README calls it a multilingual, non-autoregressive System 1 decision engine. It scores typed questions — choice, score, and noul — over a state such as text, email, a ticket, or a JSON document, in one forward pass. It does not write free text. Three checkpoints ship with a Router that picks among them: laya for English, laya-multilingual for 100+ languages, and laya-typed-decisions for the typed-decisions workflows.",
  },
  {
    q: "Can Laya fully replace Jev?",
    a: "No complete replacement follows from the published tables. On the README routed comparison, the fine-tuned path is ahead on typed-decisions argmax accuracy (0.766 vs 0.727), AG News, DAIR Emotion, post-temperature ECE, single-question T4 latency, open weights, and self-hosted cost. Jev leads on Banking77 (0.870 vs 0.425), on soft accuracy (0.580 vs 0.471), and on raw ECE before temperature fitting (0.144 vs 0.213). Those Jev numbers are third-party published figures, not a paired remeasurement. Base Laya checkpoints sit under the majority-class baseline on typed-decisions until you use the fine-tuned checkpoint. Jev is the closed API that works out of the box. Laya is the open, local, low-latency option, and it is weak when one choice question has many labels.",
  },
  {
    q: "What are Laya's limitations?",
    a: "Banking77 is the clearest one. In the official comparison Jev scores 0.870 on 72 labels and Laya scores 0.425 on 77 labels at the default head budget. Options share a fixed token budget, about 192 tokens on the English checkpoint and 256 on the multilingual one, so 77 labels get roughly 3 to 4 tokens each and stop being distinct. The README says Jev is currently the better fit for 50 or more options in one prompt without tuning. Other limits in the same files: base checkpoints are near chance on typed-decisions zero-shot, held-out toxicity moderation is 0.530, ordinal score is the weakest primitive (SST-5 0.372), and the English checkpoint can be confidently wrong outside English (Khmer 0.000 accuracy at 0.952 confidence). A community fine-tune on the 77-label BANKING77 test reports 85.55%, and that model card says the number is not a win over Jev.",
  },
  {
    q: "What is the license of Laya? Can I use it commercially?",
    a: "The repository is Apache 2.0, developed by Convai Innovations. Apache 2.0 allows commercial use, modification, and distribution if you keep the license and attribution notices. Read the LICENSE file in the repository. This page is not legal advice, and this site is not the licensor.",
  },
  {
    q: "What hardware do I need to run Laya locally?",
    a: "Python 3.10 or newer, plus the pip dependencies (torch, transformers, and the rest of the package). Published GPU timings use a Tesla T4: 32.8 ms for one multilingual question with the router preloaded. The same README line gives 193–464 ms on CPU with Router(preload=True). The repo does not publish a minimum RAM or VRAM figure. Checkpoint sizes it does publish are 421M parameters for laya and laya-typed-decisions (ModernBERT-large) and 322M for laya-multilingual (mmBERT-base). Preload for production; a language switch with max_loaded=1 reloads the model (7.4 s median on CPU, 10.3 s on T4 in the README).",
  },
  {
    q: "Does Laya generate text like a regular LLM?",
    a: "No. The README says there is no text generation, so there is nothing to parse. A call returns structured fields such as choice, score, noul, confidence, and routing metadata. It is the wrong tool when the product needs a written answer. Pair it with a generative model only if you add that model yourself; this site does not ship or run one.",
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="FAQ"
        lede="Short answers from the upstream README, BENCHMARKS.md, and the Apache 2.0 license. Nothing here is an official statement from Convai Innovations."
      />
      <div className="space-y-3">
        {faqs.map((item) => (
          <details key={item.q} className="rounded-lg border border-line bg-panel px-5 py-4" open>
            <summary className="cursor-pointer text-base font-medium text-ink">{item.q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="text-sm text-muted">
        Source repository:{" "}
        <a className="text-accent hover:underline" href={UPSTREAM_REPO}>
          {UPSTREAM_REPO}
        </a>
      </p>
    </div>
  );
}
