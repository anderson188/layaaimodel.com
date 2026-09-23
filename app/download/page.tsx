import type { Metadata } from "next";
import { PageTitle } from "@/components/PageTitle";
import { canonical, UPSTREAM_REPO } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: canonical("/download/") },
};

const links = [
  {
    title: "GitHub repository",
    href: UPSTREAM_REPO,
    body: "Source, README, BENCHMARKS.md, and the Apache 2.0 LICENSE. This documentation site is not that repository.",
  },
  {
    title: "Releases",
    href: "https://github.com/NandhaKishorM/laya/releases",
    body: "GitHub release index. The latest tag at the time these pages were written is v0.3.6, published 2026-09-22, matching version 0.3.6 in pyproject.toml.",
  },
  {
    title: "v0.3.6 wheel",
    href: "https://github.com/NandhaKishorM/laya/releases/download/v0.3.6/laya-0.3.6-py3-none-any.whl",
    body: "laya-0.3.6-py3-none-any.whl from that release.",
  },
  {
    title: "v0.3.6 source archive",
    href: "https://github.com/NandhaKishorM/laya/releases/download/v0.3.6/laya-0.3.6.tar.gz",
    body: "laya-0.3.6.tar.gz from that release. Prefer the Releases page if a newer tag exists.",
  },
  {
    title: "PyPI",
    href: "https://pypi.org/project/laya/",
    body: "pip install laya. The package page is the install path the README badge points at.",
  },
  {
    title: "Hugging Face weights",
    href: "https://huggingface.co/convaiinnovations/laya",
    body: "convaiinnovations/laya. The README loads the English root from this repo, multilingual with subfolder=\"multilingual\", and typed-decisions with subfolder=\"typed-decisions\".",
  },
  {
    title: "Hugging Face multilingual card",
    href: "https://huggingface.co/convaiinnovations/laya-multilingual",
    body: "Separate model card linked from the README badge for laya-multilingual.",
  },
];

export default function DownloadPage() {
  return (
    <div className="space-y-10">
      <PageTitle
        section="Download"
        lede="Links to the upstream source, the current GitHub release, PyPI, and Hugging Face weights. This site does not host model files and does not run inference."
      />
      <ol className="max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
        <li>Install with pip, or download the wheel / sdist from the latest GitHub release.</li>
        <li>Weights are not inside the wheel. The first Router or laya.load call downloads them from Hugging Face.</li>
        <li>Check the Releases page for a tag newer than v0.3.6 before pinning a file URL.</li>
      </ol>
      <div className="grid gap-4">
        {links.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-lg border border-line bg-panel p-5 hover:border-accent"
          >
            <h2 className="text-base font-medium text-ink">{item.title}</h2>
            <p className="mt-1 font-mono text-xs text-accent">{item.href}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
