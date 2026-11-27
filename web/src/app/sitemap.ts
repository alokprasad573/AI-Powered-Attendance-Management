import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/services/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries().map((entry) => ({
    url: entry.url,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
