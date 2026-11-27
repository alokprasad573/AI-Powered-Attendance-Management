import type { MetadataRoute } from "next";
import { buildRobotsRules } from "@/services/seo";

export default function robots(): MetadataRoute.Robots {
  return buildRobotsRules();
}
