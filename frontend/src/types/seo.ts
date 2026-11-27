export type SchemaType = "WebApplication" | "WebSite" | "SoftwareApplication";

export interface RouteDescriptor {
  path: string;
  title: string;
  description: string;
  indexable?: boolean;
}

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
}

export interface JsonLdObject {
  "@context": "https://schema.org";
  "@type": SchemaType;
  [key: string]: unknown;
}
