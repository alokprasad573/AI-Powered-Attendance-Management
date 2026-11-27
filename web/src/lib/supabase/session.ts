import type { NextRequest, NextResponse } from "next/server";
import { updateSession as refreshSupabaseSession } from "@/utils/supabase/middleware";

export async function updateSession(
  request: NextRequest
): Promise<NextResponse> {
  return refreshSupabaseSession(request);
}
