import { ManageSubjectsClient } from "@/components/teacher/manage-subjects-client";
import { requireAuthenticatedTeacher } from "@/services/session-guard";
import { listTeacherSubjects } from "@/services/subjects.service";

export const dynamic = "force-dynamic";

export default async function TeacherSubjectsPage() {
  const teacher = await requireAuthenticatedTeacher();
  const subjects = await listTeacherSubjects(teacher.id);

  return <ManageSubjectsClient initialSubjects={subjects} />;
}
