"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const { url, publishableKey } = getSupabasePublicConfig();
  browserClient = createBrowserClient<Database>(url, publishableKey);
  return browserClient;
}
