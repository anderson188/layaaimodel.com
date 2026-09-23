export const SITE_URL = "https://layaaimodel.com";

export const SITE_TITLE = "Laya AI - Open Source System-1 Decision Model";

export const SITE_DESCRIPTION =
  "Laya is an open source System-1 decision model, low latency, Apache 2.0 license, supporting 100+ languages. Run Laya locally for classification & routing tasks.";

export const DISCLAIMER =
  "Unofficial community site. Not affiliated with Convai Innovations.";

export const UPSTREAM_REPO = "https://github.com/NandhaKishorM/laya";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/get-started/", label: "Get Started" },
  { href: "/benchmarks/", label: "Benchmarks" },
  { href: "/use-cases/", label: "Use Cases" },
  { href: "/faq/", label: "FAQ" },
  { href: "/download/", label: "Download" },
] as const;

export function canonical(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  return `${SITE_URL}${withSlash}`;
}
