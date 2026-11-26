import { NextResponse } from "next/server";
import {
  exportSessionsToCsv,
  filterAndSortSessionSummaries,
} from "@/domain/attendance";
import { listTeacherAttendanceSessions } from "@/services/attendance.service";
import {
  AuthorizationError,
  requireAuthenticatedTeacher,
} from "@/services/session-guard";

export async function GET(request: Request) {
  try {
    const teacher = await requireAuthenticatedTeacher();
    const { searchParams } = new URL(request.url);

    const subjectCode = searchParams.get("subjectCode") ?? undefined;
    const query = searchParams.get("q") ?? undefined;
    const dateFrom = searchParams.get("from") ?? undefined;
    const dateTo = searchParams.get("to") ?? undefined;
    const rawSort = searchParams.get("sortBy");
    const sortBy =
      rawSort === "time_asc" ||
      rawSort === "subject_asc" ||
      rawSort === "rate_desc" ||
      rawSort === "time_desc"
        ? rawSort
        : "time_desc";

    const sessions = await listTeacherAttendanceSessions(teacher.id);
    const filtered = filterAndSortSessionSummaries(sessions, {
      subjectCode,
      query,
      dateFrom,
      dateTo,
      sortBy,
    });

    const csv = exportSessionsToCsv(filtered);
    const dateStamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="haziri-attendance-${teacher.id}-${dateStamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "EXPORT_FAILED", message: "Unable to export attendance records." },
      { status: 500 }
    );
  }
}
