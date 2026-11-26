import { AttendanceWorkflowClient } from "@/components/teacher/attendance-workflow-client";
import { requireAuthenticatedTeacher } from "@/services/session-guard";
import { listTeacherSubjects } from "@/services/subjects.service";

export const dynamic = "force-dynamic";

export default async function TeacherAttendancePage() {
  const teacher = await requireAuthenticatedTeacher();
  const subjects = await listTeacherSubjects(teacher.id);

  return <AttendanceWorkflowClient subjects={subjects} />;
}
