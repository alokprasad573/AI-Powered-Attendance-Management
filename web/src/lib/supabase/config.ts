export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export class MissingEnvConfigError extends Error {
  readonly code = "MISSING_ENV_CONFIG";

  constructor(message: string) {
    super(message);
    this.name = "MissingEnvConfigError";
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    throw new MissingEnvConfigError(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured."
    );
  }

  return { url, publishableKey };
}

export function getAppOrigin(requestOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (requestOrigin) {
    return requestOrigin.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
