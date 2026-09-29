import type { MetadataRoute } from "next";
import { SITEMAP_ROUTES, canonical } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return SITEMAP_ROUTES.map((route) => ({
    url: canonical(route.href),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
