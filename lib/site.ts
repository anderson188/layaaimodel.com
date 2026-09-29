export const SITE_URL = "https://www.layaaimodel.com";

export const SITE_TITLE = "Laya AI - Open Source System One Decision Model";

export const SITE_DESCRIPTION =
  "Laya is an open source System One decision model, low latency, Apache 2.0 license, supporting 100+ languages. Run Laya locally for classification & routing.";

/** Homepage meta description — keep ≤160 chars for SERP snippets. */
export const HOME_DESCRIPTION =
  "Laya vs Jev: open-source System One model you run locally vs closed Jev API. Official and Hugging Face community scores compared.";

export const SITE_KEYWORDS = [
  "Laya",
  "Laya AI",
  "System One",
  "System One model",
  "System One decision model",
  "open source decision model",
  "Laya vs Jev",
  "Jev",
] as const;

/** Official model-card figure used for Open Graph / Twitter cards. */
export const SITE_OG_IMAGE = "/official/laya_vs_jev.png";

export const DISCLAIMER =
  "Unofficial community site. Not affiliated with Convai Innovations.";

export const UPSTREAM_REPO = "https://github.com/NandhaKishorM/laya";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/tools/", label: "Tools" },
  { href: "/docs/api/", label: "API Docs" },
  { href: "/pricing/", label: "Pricing" },
  { href: "/get-started/", label: "Get Started" },
  { href: "/benchmarks/", label: "Benchmarks" },
  { href: "/status/", label: "Status" },
  { href: "/faq/", label: "FAQ" },
] as const;

/** Public indexable URLs for sitemap.xml (excludes /account/, /admin/, /console/). */
export const SITEMAP_ROUTES = [
  { href: "/", priority: 1, changeFrequency: "weekly" as const },
  { href: "/tools/", priority: 0.9, changeFrequency: "weekly" as const },
  { href: "/docs/api/", priority: 0.9, changeFrequency: "monthly" as const },
  { href: "/api/", priority: 0.8, changeFrequency: "monthly" as const },
  { href: "/pricing/", priority: 0.8, changeFrequency: "monthly" as const },
  { href: "/get-started/", priority: 0.9, changeFrequency: "monthly" as const },
  { href: "/benchmarks/", priority: 0.9, changeFrequency: "weekly" as const },
  { href: "/use-cases/", priority: 0.8, changeFrequency: "monthly" as const },
  { href: "/download/", priority: 0.7, changeFrequency: "monthly" as const },
  { href: "/faq/", priority: 0.8, changeFrequency: "monthly" as const },
  { href: "/status/", priority: 0.5, changeFrequency: "daily" as const },
  { href: "/terms/", priority: 0.3, changeFrequency: "yearly" as const },
  { href: "/privacy/", priority: 0.3, changeFrequency: "yearly" as const },
] as const;

export function canonical(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  return `${SITE_URL}${withSlash}`;
}
