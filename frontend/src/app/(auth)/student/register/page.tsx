import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { StudentRegisterForm } from "@/components/auth/student-register-form";
import { PUBLIC_ROUTES } from "@/constants/seo";
import { generateStudentId } from "@/domain/ids";
import { subjectCodeSchema } from "@/lib/validations/subjects";
import { buildMetadata } from "@/services/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  path: PUBLIC_ROUTES.studentRegister,
  title: "Student Registration",
  description:
    "Create your Haziri.AI student account and set up your private face profile in seconds.",
});

export default async function StudentRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawJoin = params["join-class"];
  const joinRaw = Array.isArray(rawJoin) ? rawJoin[0] : rawJoin;
  const parsedJoin = joinRaw ? subjectCodeSchema.safeParse(joinRaw) : null;
  const joinCode = parsedJoin?.success ? parsedJoin.data : null;

  const initialStudentId = generateStudentId();

  return (
    <AuthShell
      headerSubtitle="Student Registration"
      roleBadge="New Student"
      headline="Set up once. Check in effortlessly all semester."
      description="Create your student profile and optionally capture a quick face check so teachers can mark your attendance automatically."
      alternateHref="/student/login"
      alternateLabel="Existing Student Sign In"
      highlights={[
        {
          label: "Consent First",
          detail: "You review and confirm permission before any face check data is saved.",
        },
        {
          label: "No Photos Stored",
          detail: "Camera snapshots are discarded right on your device immediately after setup.",
        },
        {
          label: "Single Face Check",
          detail: "Setup ensures only your face is clearly framed before continuing.",
        },
      ]}
    >
      <StudentRegisterForm
        initialStudentId={initialStudentId}
        joinCode={joinCode}
      />
    </AuthShell>
  );
}
