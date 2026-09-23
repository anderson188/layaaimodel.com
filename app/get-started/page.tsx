import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DataTable } from "@/components/DataTable";
import { PageTitle } from "@/components/PageTitle";
import { checkpoints } from "@/lib/benchmarks";
import { PIP_INSTALL, README_QUICKSTART } from "@/lib/snippets";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: canonical("/get-started/") },
};

export default function GetStartedPage() {
  return (
    <div className="space-y-12">
      <PageTitle
        section="Get Started"
        lede="Run Laya on your own machine with Python. This page does not call the model from the browser."
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Requirements</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          The package requires Python 3.10 or newer. pyproject.toml classifies 3.10 through 3.13. The README says the dependency floor is Python 3.10 because huggingface_hub 1.x, transformers 5.x, and torch 2.14 require it. Declared dependencies are torch, transformers, safetensors, huggingface_hub, and numpy.
        </p>
        <DataTable {...checkpoints} />
        <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
          <p>
            Published latency was measured on a Tesla T4. With <code className="font-mono text-ink">Router(preload=True)</code> the README reports 32.8 ms on GPU and 193–464 ms on CPU. A cold checkpoint build costs seconds. At the default <code className="font-mono text-ink">max_loaded=1</code>, alternating languages reloads a model on every switch: the README measures a 7.4 s median reload on CPU and 10.3 s on T4.
          </p>
          <p>
            The repository does not publish a minimum RAM or VRAM number. It does say production servers should preload, that <code className="font-mono text-ink">router.attach</code> avoids a second copy in VRAM when an agent is already loaded, and that <code className="font-mono text-ink">router.unload()</code> frees memory. Parameter counts above are the only size figures in the README.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Install</h2>
        <CodeBlock label="bash" code={PIP_INSTALL} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Example</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Recommended Router quickstart from the repository README. Comments after the print calls are the README&apos;s annotated sample output, not a run from this website.
        </p>
        <CodeBlock label="python" code={README_QUICKSTART} />
        <ol className="max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>Install Python 3.10+ and run the pip command above.</li>
          <li>Save the script and run it with <code className="font-mono text-ink">python</code>.</li>
          <li>
            The first <code className="font-mono text-ink">predict</code> downloads checkpoints from Hugging Face (<code className="font-mono text-ink">convaiinnovations/laya</code>). The machine needs network access to the Hub.
          </li>
          <li>
            <code className="font-mono text-ink">Router(preload=True)</code> keeps checkpoints resident. Pass <code className="font-mono text-ink">device=&quot;cuda&quot;</code> when a CUDA GPU is available. CPU still runs; use the CPU latency band above, not the T4 figure.
          </li>
          <li>Language detection runs before the forward pass and selects english, multilingual, or an explicit <code className="font-mono text-ink">model=&quot;typed-decisions&quot;</code> override.</li>
        </ol>
      </section>
    </div>
  );
}
