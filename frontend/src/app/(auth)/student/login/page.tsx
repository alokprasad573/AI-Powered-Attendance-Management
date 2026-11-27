import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { StudentLoginForm } from "@/components/auth/student-login-form";
import { PUBLIC_ROUTES } from "@/constants/seo";
import { subjectCodeSchema } from "@/lib/validations/subjects";
import { buildMetadata } from "@/services/seo";

export const metadata: Metadata = buildMetadata({
  path: PUBLIC_ROUTES.studentLogin,
  title: "Student Login",
  description:
    "Sign in to your Haziri.AI student account with your password or a quick face check.",
});

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawJoin = params["join-class"];
  const joinRaw = Array.isArray(rawJoin) ? rawJoin[0] : rawJoin;
  const parsedJoin = joinRaw ? subjectCodeSchema.safeParse(joinRaw) : null;
  const joinCode = parsedJoin?.success ? parsedJoin.data : null;

  const rawId = params.id;
  const prefillStudentId = Array.isArray(rawId) ? rawId[0] : rawId;

  const rawError = params.error;
  const initialAuthError = Array.isArray(rawError) ? rawError[0] : rawError;

  return (
    <AuthShell
      headerSubtitle="Student Sign In"
      roleBadge="Student Portal"
      headline="Sign in quickly. Check your attendance anywhere."
      description="Use your Student ID or email with your password, or sign in hands-free with a quick face check and email link."
      alternateHref="/student/register"
      alternateLabel="Create Student Account"
      highlights={[
        {
          label: "Private Check-In",
          detail: "Face checks run directly on your device without saving or uploading photos.",
        },
        {
          label: "Email Confirmation",
          detail: "Face sign-in confirms through your registered email for added security.",
        },
        {
          label: "Seamless Class Joining",
          detail: "Any class QR link you scanned stays ready as soon as you sign in.",
        },
      ]}
    >
      <StudentLoginForm
        prefillStudentId={prefillStudentId ?? ""}
        joinCode={joinCode}
        initialAuthError={initialAuthError ?? null}
      />
    </AuthShell>
  );
}
