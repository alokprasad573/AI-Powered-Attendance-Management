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
    return NextResponse.json({ ok: true, history: data.history }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "ATTENDANCE_HISTORY_ERROR", message: "Unable to load attendance history." },
      { status: 500 }
    );
  }
}
