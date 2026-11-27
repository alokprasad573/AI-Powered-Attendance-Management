import { StudentDashboardClient } from "@/components/student/student-dashboard-client";
import { subjectCodeSchema } from "@/lib/validations/subjects";
import { getStudentPortalData } from "@/services/attendance.service";
import { requireAuthenticatedStudent } from "@/services/session-guard";
import { getStudentBiometricOverview } from "@/services/templates.service";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const student = await requireAuthenticatedStudent();
  const params = await searchParams;
  const rawJoin = params["join-class"];
  const joinRaw = Array.isArray(rawJoin) ? rawJoin[0] : rawJoin;
  const parsed = joinRaw ? subjectCodeSchema.safeParse(joinRaw) : null;
  const joinCode = parsed?.success ? parsed.data : null;

  const [portalData, biometric] = await Promise.all([
    getStudentPortalData(student.id),
    getStudentBiometricOverview(student.id, student.legacyFaceEmbeddings),
  ]);

  return (
    <StudentDashboardClient
      subjects={portalData.subjects}
      history={portalData.history}
      biometricState={biometric.state}
      joinCode={joinCode}
    />
  );
}
