import { NextResponse } from "next/server";
import { unenrollSubjectSchema } from "@/lib/validations/subjects";
import {
  AuthorizationError,
  requireAuthenticatedStudent,
} from "@/services/session-guard";
import { unenrollStudentFromSubject } from "@/services/subjects.service";

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

    const parsed = unenrollSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid subject ID.",
        },
        { status: 400 }
      );
    }

    const result = await unenrollStudentFromSubject(student.id, parsed.data.subjectId);
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
      { ok: false, code: "UNENROLL_ERROR", message: "Unable to unenroll from subject." },
      { status: 500 }
    );
  }
}
