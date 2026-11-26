import { NextResponse } from "next/server";
import { getStudentPortalData } from "@/services/attendance.service";
import {
  AuthorizationError,
  requireAuthenticatedStudent,
} from "@/services/session-guard";

export async function GET() {
  try {
    const student = await requireAuthenticatedStudent();
    const data = await getStudentPortalData(student.id);
    return NextResponse.json({ ok: true, subjects: data.subjects }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "STUDENT_SUBJECTS_ERROR", message: "Unable to load enrolled subjects." },
      { status: 500 }
    );
  }
}
