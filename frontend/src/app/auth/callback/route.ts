import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureAuthenticatedProfileAfterCallback } from "@/services/auth.service";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
  "recovery",
  "email_change",
  "invite",
]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const rawNext = searchParams.get("next");
  const candidate = rawNext ?? "/";
  const safeNext =
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
      ? candidate
      : "/";

  const fallbackLoginPath = safeNext.startsWith("/teacher")
    ? "/teacher/login"
    : "/student/login";

  const trustedOrigin = getAppOrigin(origin);

  const resolveRedirectPath = (
    resolvedRole: "teacher" | "student" | null
  ): string => {
    // Only auto-route by role when no explicit `next` param was provided
    // (for example, when Supabase redirected to Site URL /?code=... first).
    if (!rawNext) {
      if (resolvedRole === "student") return "/student/dashboard";
      if (resolvedRole === "teacher") return "/teacher/dashboard";
    }
    return safeNext;
  };

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const resolvedRole = await ensureAuthenticatedProfileAfterCallback(supabase);
        return NextResponse.redirect(
          new URL(resolveRedirectPath(resolvedRole), trustedOrigin)
        );
      }
      return NextResponse.redirect(
        new URL(`${fallbackLoginPath}?error=auth_callback_failed`, trustedOrigin)
      );
    } catch {
      return NextResponse.redirect(
        new URL(`${fallbackLoginPath}?error=auth_callback_failed`, trustedOrigin)
      );
    }
  }

  if (tokenHash && rawType && ALLOWED_OTP_TYPES.has(rawType as EmailOtpType)) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: rawType as EmailOtpType,
      });
      if (!error) {
        const resolvedRole = await ensureAuthenticatedProfileAfterCallback(supabase);
        return NextResponse.redirect(
          new URL(resolveRedirectPath(resolvedRole), trustedOrigin)
        );
      }
      return NextResponse.redirect(
        new URL(`${fallbackLoginPath}?error=auth_callback_failed`, trustedOrigin)
      );
    } catch {
      return NextResponse.redirect(
        new URL(`${fallbackLoginPath}?error=auth_callback_failed`, trustedOrigin)
      );
    }
  }

  return NextResponse.redirect(
    new URL(`${fallbackLoginPath}?error=missing_auth_code`, trustedOrigin)
  );
}
