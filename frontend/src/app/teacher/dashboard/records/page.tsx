import { AttendanceRecordsClient } from "@/components/teacher/attendance-records-client";
import { listTeacherAttendanceSessions } from "@/services/attendance.service";
import { requireAuthenticatedTeacher } from "@/services/session-guard";

export const dynamic = "force-dynamic";

export default async function TeacherRecordsPage() {
  const teacher = await requireAuthenticatedTeacher();
  const sessions = await listTeacherAttendanceSessions(teacher.id);

  return <AttendanceRecordsClient initialSessions={sessions} />;
}
