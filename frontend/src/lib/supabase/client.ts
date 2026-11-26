"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  return createClient();
}
