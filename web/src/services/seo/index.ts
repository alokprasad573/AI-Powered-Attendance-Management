import type { Metadata } from "next";
import {
  DISALLOWED_CRAWL_PATHS,
  PUBLIC_ROUTES,
  SITE_DESCRIPTION,
  SITE_ICON_PATH,
  SITE_NAME,
  SITE_URL,
} from "@/constants/seo";
import type { JsonLdObject, RouteDescriptor, SitemapEntry } from "@/types/seo";

export function canonicalUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\?#]/.test(path)) {
    throw new Error(`Invalid local route pathname: ${path}`);
  }
  const base = new URL(SITE_URL);
  const url = new URL(path.replace(/\/{2,}/g, "/"), base);
  if (url.origin !== base.origin) {
    throw new Error("Canonical origin mismatch");
  }
  url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
  return url.href;
}

export function buildMetadata(route: RouteDescriptor): Metadata {
  const canonical = canonicalUrl(route.path);
  return {
    title: route.title,
    description: route.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title: route.title,
      description: route.description,
      images: [
        {
          url: canonicalUrl(SITE_ICON_PATH),
          alt: `${SITE_NAME} emblem`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: route.title,
      description: route.description,
    },
    robots: {
      index: route.indexable !== false,
      follow: route.indexable !== false,
    },
  };
}

export function buildSitemapEntries(): SitemapEntry[] {
  const routeEntries: Array<{
    path: string;
    changeFrequency: SitemapEntry["changeFrequency"];
    priority: number;
  }> = [
    { path: PUBLIC_ROUTES.home, changeFrequency: "weekly", priority: 1.0 },
    { path: PUBLIC_ROUTES.studentLogin, changeFrequency: "monthly", priority: 0.7 },
    { path: PUBLIC_ROUTES.studentRegister, changeFrequency: "monthly", priority: 0.7 },
    { path: PUBLIC_ROUTES.teacherLogin, changeFrequency: "monthly", priority: 0.7 },
    { path: PUBLIC_ROUTES.teacherRegister, changeFrequency: "monthly", priority: 0.7 },
  ];

  return routeEntries.map((entry) => ({
    url: canonicalUrl(entry.path),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}

export function buildRobotsRules() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...DISALLOWED_CRAWL_PATHS],
      },
    ],
    sitemap: canonicalUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}

export function buildWebApplicationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${canonicalUrl("/")}#webapp`,
    name: SITE_NAME,
    url: canonicalUrl("/"),
    description: SITE_DESCRIPTION,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    browserRequirements: "Requires camera permission in a modern web browser for live attendance check-in.",
  };
}

export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
