import type { MetadataRoute } from "next";
import { SITEMAP_ROUTES, canonical } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_ROUTES.map((route) => ({
    url: canonical(route.href),
    lastModified: new Date(`${route.lastmod}T12:00:00.000Z`),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
