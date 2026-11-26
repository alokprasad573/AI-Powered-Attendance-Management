import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

function buildProtectedRedirect(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const joinCode = request.nextUrl.searchParams.get("join-class");

  if (pathname.startsWith("/teacher/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/teacher/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/student/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/student/login";
    if (joinCode) {
      loginUrl.searchParams.set("join-class", joinCode);
    }
    return NextResponse.redirect(loginUrl);
  }

  return null;
}

export function createClient(request: NextRequest): {
  supabase: SupabaseClient<Database>;
  getResponse: () => NextResponse;
} {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { url, publishableKey } = getSupabasePublicConfig();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  return {
    supabase,
    getResponse: () => supabaseResponse,
  };
}

export async function updateSession(
  request: NextRequest
): Promise<NextResponse> {
  let clientBundle: ReturnType<typeof createClient>;
  try {
    clientBundle = createClient(request);
  } catch {
    return buildProtectedRedirect(request) ?? NextResponse.next({ request });
  }

  // Always verify session via getUser() on server boundaries (never getSession()).
  const {
    data: { user },
  } = await clientBundle.supabase.auth.getUser();

  if (!user) {
    const protectedRedirect = buildProtectedRedirect(request);
    if (protectedRedirect) {
      return protectedRedirect;
    }
  }

  return clientBundle.getResponse();
}
