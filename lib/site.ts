export const SITE_URL = "https://www.layaaimodel.com";

/** Brand + category first; "open source" stays a body selling point, not the Title lead. */
export const SITE_TITLE = "Laya AI — System One Decision Model";

export const SITE_DESCRIPTION =
  "Laya AI is a System One decision model for choice, score, and yes/no routing. Hosted prepaid API on this site; Apache 2.0 weights you can run locally.";

/** Homepage meta description — keep ≤160 chars for SERP snippets. */
export const HOME_DESCRIPTION =
  "Laya AI System One decision model vs Jev: typed decisions (choice / score / yes-no), hosted API, and open weights you can run locally.";

export const SITE_KEYWORDS = [
  "Laya",
  "Laya AI",
  "System One",
  "System One decision model",
  "Laya vs Jev",
  "decision model API",
  "typed decisions",
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
  { href: "/", priority: 1, changeFrequency: "weekly" as const, lastmod: "2026-10-01" },
  { href: "/tools/", priority: 0.7, changeFrequency: "weekly" as const, lastmod: "2026-10-01" },
  // Individual /tools/* landings stay reachable from /tools/ but are omitted from the sitemap —
  // thin keyword targets that compete with buyer pages for crawl budget.
  { href: "/docs/api/", priority: 0.9, changeFrequency: "monthly" as const, lastmod: "2026-09-29" },
  { href: "/api/", priority: 0.8, changeFrequency: "monthly" as const, lastmod: "2026-09-30" },
  { href: "/pricing/", priority: 0.9, changeFrequency: "monthly" as const, lastmod: "2026-10-01" },
  { href: "/get-started/", priority: 0.85, changeFrequency: "monthly" as const, lastmod: "2026-09-23" },
  { href: "/benchmarks/", priority: 0.9, changeFrequency: "weekly" as const, lastmod: "2026-10-01" },
  { href: "/use-cases/", priority: 0.8, changeFrequency: "monthly" as const, lastmod: "2026-10-01" },
  { href: "/download/", priority: 0.7, changeFrequency: "monthly" as const, lastmod: "2026-10-01" },
  { href: "/faq/", priority: 0.8, changeFrequency: "monthly" as const, lastmod: "2026-09-30" },
  { href: "/status/", priority: 0.5, changeFrequency: "daily" as const, lastmod: "2026-09-29" },
  { href: "/terms/", priority: 0.3, changeFrequency: "yearly" as const, lastmod: "2026-09-29" },
  { href: "/privacy/", priority: 0.3, changeFrequency: "yearly" as const, lastmod: "2026-09-29" },
] as const;

export function canonical(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  return `${SITE_URL}${withSlash}`;
}
