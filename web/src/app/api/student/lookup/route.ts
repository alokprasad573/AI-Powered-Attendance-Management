import { NextResponse } from "next/server";
import { subjectCodeSchema } from "@/lib/validations/subjects";
import {
  AuthorizationError,
  requireAuthenticatedStudent,
} from "@/services/session-guard";
import { lookupSubjectByCodeForStudent } from "@/services/subjects.service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const student = await requireAuthenticatedStudent();
    const { searchParams } = new URL(request.url);
    const parsed = subjectCodeSchema.safeParse(searchParams.get("code") ?? "");

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_SUBJECT_CODE",
          message: parsed.error.issues[0]?.message ?? "Invalid subject code.",
        },
        { status: 400 }
      );
    }

    const subject = await lookupSubjectByCodeForStudent(parsed.data);
    if (!subject) {
      return NextResponse.json(
        { ok: false, code: "SUBJECT_NOT_FOUND", message: "Subject not found" },
        { status: 404 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: existing } = await supabase
      .from("subject_students")
      .select("subject_id")
      .eq("subject_id", subject.id)
      .eq("student_id", student.id)
      .maybeSingle();

    return NextResponse.json(
      { ok: true, subject, alreadyEnrolled: Boolean(existing) },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "LOOKUP_FAILED", message: "Unable to look up subject." },
      { status: 500 }
    );
  }
}
