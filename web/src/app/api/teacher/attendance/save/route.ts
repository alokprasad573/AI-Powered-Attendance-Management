import { NextResponse } from "next/server";
import { saveAttendanceSessionSchema } from "@/lib/validations/attendance";
import { saveTeacherAttendanceSession } from "@/services/attendance.service";
import {
  AuthorizationError,
  requireAuthenticatedTeacher,
} from "@/services/session-guard";

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

    const parsed = saveAttendanceSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ?? "Invalid attendance submission payload.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await saveTeacherAttendanceSession(teacher.id, parsed.data);
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
      {
        ok: false,
        code: "ATTENDANCE_SAVE_ERROR",
        message: "Failed to save attendance. Your review state is preserved.",
      },
      { status: 500 }
    );
  }
}
