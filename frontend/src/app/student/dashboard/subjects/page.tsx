import { StudentDashboardClient } from "@/components/student/student-dashboard-client";
import { getStudentPortalData } from "@/services/attendance.service";
import { requireAuthenticatedStudent } from "@/services/session-guard";
import { getStudentBiometricOverview } from "@/services/templates.service";

export const dynamic = "force-dynamic";

export default async function StudentSubjectsPage() {
  const student = await requireAuthenticatedStudent();
  const [portalData, biometric] = await Promise.all([
    getStudentPortalData(student.id),
    getStudentBiometricOverview(student.id, student.legacyFaceEmbeddings),
  ]);

  return (
    <StudentDashboardClient
      subjects={portalData.subjects}
      history={[]}
      biometricState={biometric.state}
      joinCode={null}
      showRecentHistory={false}
    />
  );
}
