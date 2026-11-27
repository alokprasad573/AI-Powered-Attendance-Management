import { NextResponse } from "next/server";
import { studentLoginSchema } from "@/lib/validations/auth";
import { loginStudentAccount } from "@/services/auth.service";

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

  const parsed = studentLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid login details.",
      },
      { status: 400 }
    );
  }

  const result = await loginStudentAccount(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
