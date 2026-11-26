import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { studentFaceOtpInitiateSchema } from "@/lib/validations/auth";
import { initiateStudentFaceOtpLogin } from "@/services/auth.service";

/**
 * Approved Option 2 Policy (BLK-02 — Face-Verified Email OTP / Magic Link):
 * 1. Validates a 128D SFace probe vector against the student's stored active template
 *    strictly inside PostgreSQL (`verify_student_face_for_otp` RPC) — zero embeddings
 *    ever leave the database and zero SUPABASE_SERVICE_ROLE_KEY is used.
 * 2. Browser face scans NEVER mint a session directly. On match, Supabase sends a
 *    one-time verification code & magic link (`signInWithOtp`, `shouldCreateUser: false`)
 *    to the student's registered email address.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", message: "Malformed JSON request body." },
      { status: 400 }
    );
  }

  const parsed = studentFaceOtpInitiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ??
          "Student ID / Email and a valid 128D face scan vector are required.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`face-otp-init:ip:${ip}`, {
    limit: 5,
    windowMs: 60_000,
  });
  const idLimit = checkRateLimit(
    `face-otp-init:id:${parsed.data.identifier.trim().toLowerCase()}`,
    {
      limit: 5,
      windowMs: 60_000,
    }
  );

  if (!ipLimit.allowed || !idLimit.allowed) {
    const retryAfter = Math.max(
      ipLimit.retryAfterSeconds,
      idLimit.retryAfterSeconds
    );
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: `Too many face verification attempts. Please wait ${retryAfter} seconds and try again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const result = await initiateStudentFaceOtpLogin(
    parsed.data,
    new URL(request.url).origin
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
