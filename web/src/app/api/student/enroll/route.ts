import { NextResponse } from "next/server";
import { enrollByCodeSchema } from "@/lib/validations/subjects";
import {
  AuthorizationError,
  requireAuthenticatedStudent,
} from "@/services/session-guard";
import { enrollStudentByCode } from "@/services/subjects.service";

export async function POST(request: Request) {
  try {
    const student = await requireAuthenticatedStudent();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, code: "INVALID_JSON", message: "Malformed JSON request body." },
        { status: 400 }
      );
    }

    const parsed = enrollByCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Please enter a valid subject code.",
        },
        { status: 400 }
      );
    }

    const result = await enrollStudentByCode(student.id, parsed.data.code);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "ENROLL_ERROR", message: "Unable to enroll in subject." },
      { status: 500 }
    );
  }
}
