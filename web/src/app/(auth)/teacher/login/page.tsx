import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { TeacherLoginForm } from "@/components/auth/teacher-login-form";
import { PUBLIC_ROUTES } from "@/constants/seo";
import { buildMetadata } from "@/services/seo";

export const metadata: Metadata = buildMetadata({
  path: PUBLIC_ROUTES.teacherLogin,
  title: "Teacher Login",
  description:
    "Sign in to the Haziri.AI Teacher Portal to create subjects, share QR join links, and capture multi-photo classroom attendance.",
});

export default async function TeacherLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawId = params.id;
  const prefillTeacherId = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawNext = params.next;
  const nextPath = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  const rawError = params.error;
  const authError = Array.isArray(rawError) ? rawError[0] : rawError;

  return (
    <AuthShell
      headerSubtitle="Teacher Sign In"
      roleBadge="Teacher Portal"
      headline="Manage classes, rosters, and photo attendance in one place."
      description="Sign in with your Teacher ID or email to open your classes, take roll from classroom photos, and download attendance reports."
      alternateHref="/teacher/register"
      alternateLabel="Create Teacher Account"
      highlights={[
        {
          label: "Private Class Lists",
          detail: "Only you can view and manage the subjects and rosters you create.",
        },
        {
          label: "Duplicate-Safe Saves",
          detail: "Retrying a save never creates duplicate classroom attendance records.",
        },
        {
          label: "Clean Spreadsheet Export",
          detail: "Download well-formatted attendance reports ready for your gradebook.",
        },
      ]}
    >
      <TeacherLoginForm
        prefillTeacherId={prefillTeacherId ?? ""}
        nextPath={nextPath ?? "/teacher/dashboard"}
        initialAuthError={authError ?? null}
      />
    </AuthShell>
  );
}
