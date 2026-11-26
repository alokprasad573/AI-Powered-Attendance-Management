import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { studentFaceOtpVerifySchema } from "@/lib/validations/auth";
import { verifyStudentFaceOtpLogin } from "@/services/auth.service";

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

  const parsed = studentFaceOtpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ??
          "Student ID / Email and email verification code are required.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`face-otp-verify:ip:${ip}`, {
    limit: 8,
    windowMs: 60_000,
  });
  const idLimit = checkRateLimit(
    `face-otp-verify:id:${parsed.data.identifier.trim().toLowerCase()}`,
    {
      limit: 8,
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
        message: `Too many OTP verification attempts. Please wait ${retryAfter} seconds and try again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const result = await verifyStudentFaceOtpLogin(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
