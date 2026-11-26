import { NextResponse } from "next/server";
import {
  createSubjectSchema,
  deleteSubjectSchema,
} from "@/lib/validations/subjects";
import {
  AuthorizationError,
  requireAuthenticatedTeacher,
} from "@/services/session-guard";
import {
  createTeacherSubject,
  deleteTeacherSubject,
  listTeacherSubjects,
} from "@/services/subjects.service";

export async function GET() {
  try {
    const teacher = await requireAuthenticatedTeacher();
    const subjects = await listTeacherSubjects(teacher.id);
    return NextResponse.json({ ok: true, subjects }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "SUBJECTS_LIST_FAILED", message: "Unable to load subjects." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireAuthenticatedTeacher();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, code: "INVALID_JSON", message: "Malformed JSON request body." },
        { status: 400 }
      );
    }

    const parsed = createSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Please fill in all required fields.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await createTeacherSubject(teacher.id, parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "SUBJECT_CREATE_ERROR", message: "Unable to create subject." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const teacher = await requireAuthenticatedTeacher();

    const querySubjectId = new URL(request.url).searchParams.get("subjectId");
    let rawPayload: unknown = querySubjectId ? { subjectId: querySubjectId } : null;

    if (!rawPayload) {
      try {
        rawPayload = await request.json();
      } catch {
        return NextResponse.json(
          { ok: false, code: "INVALID_JSON", message: "Malformed JSON request body." },
          { status: 400 }
        );
      }
    }

    const parsed = deleteSubjectSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Valid subjectId is required.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await deleteTeacherSubject(teacher.id, parsed.data.subjectId);
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
      { ok: false, code: "SUBJECT_DELETE_ERROR", message: "Unable to delete subject." },
      { status: 500 }
    );
  }
}
