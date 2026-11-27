import { NextResponse } from "next/server";
import { studentRegisterSchema } from "@/lib/validations/auth";
import { registerStudentAccount } from "@/services/auth.service";

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

  const parsed = studentRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid student registration fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const result = await registerStudentAccount(
    parsed.data,
    new URL(request.url).origin
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json(result, { status: 201 });
}
