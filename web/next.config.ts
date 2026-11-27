import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/**
 * Loads fallback env values from the repository root `.env` when `web/.env*`
 * or process environment variables have not already defined them.
 */
function loadRootEnvFallback(): Record<string, string> {
  const rootEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env");
  if (!existsSync(rootEnvPath)) {
    return {};
  }

  const publicEnv: Record<string, string> = {};
  const raw = readFileSync(rootEnvPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trimStart()
      : trimmed;
    const eqIndex = normalized.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, eqIndex).trim();
    let value = normalized.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key]) {
      continue;
    }

    process.env[key] = value;
    if (key.startsWith("NEXT_PUBLIC_")) {
      publicEnv[key] = value;
    }
  }

  return publicEnv;
}

const nextConfig: NextConfig = {
  env: loadRootEnvFallback(),
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(), microphone=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
