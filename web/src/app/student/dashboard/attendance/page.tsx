import { StudentAttendanceHistoryClient } from "@/components/student/student-attendance-client";
import { getStudentPortalData } from "@/services/attendance.service";
import { requireAuthenticatedStudent } from "@/services/session-guard";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage() {
  const student = await requireAuthenticatedStudent();
  const portalData = await getStudentPortalData(student.id);

  return <StudentAttendanceHistoryClient history={portalData.history} />;
}
