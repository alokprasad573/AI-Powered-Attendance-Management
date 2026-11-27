import { NextResponse } from "next/server";
import { passwordRecoverySchema } from "@/lib/validations/auth";
import { requestPasswordRecovery } from "@/services/auth.service";

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

  const parsed = passwordRecoverySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Please enter a valid email address.",
      },
      { status: 400 }
    );
  }

  const { origin } = new URL(request.url);
  const result = await requestPasswordRecovery(
    parsed.data.email,
    parsed.data.role,
    origin
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
