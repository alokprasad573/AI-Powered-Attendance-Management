import { NextResponse } from "next/server";
import { rosterQuerySchema } from "@/lib/validations/attendance";
import { getOwnedSubjectRoster } from "@/services/attendance.service";
import {
  AuthorizationError,
  requireAuthenticatedTeacher,
} from "@/services/session-guard";

export async function GET(request: Request) {
  try {
    const teacher = await requireAuthenticatedTeacher();
    const { searchParams } = new URL(request.url);
    const parsed = rosterQuerySchema.safeParse({
      subjectId: searchParams.get("subjectId"),
    });

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

    const result = await getOwnedSubjectRoster(teacher.id, parsed.data.subjectId);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { ok: true, ...result.data },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "ROSTER_ERROR", message: "Unable to load subject roster." },
      { status: 500 }
    );
  }
}
