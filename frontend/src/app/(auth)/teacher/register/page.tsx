import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { TeacherRegisterForm } from "@/components/auth/teacher-register-form";
import { PUBLIC_ROUTES } from "@/constants/seo";
import { generateTeacherId } from "@/domain/ids";
import { buildMetadata } from "@/services/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  path: PUBLIC_ROUTES.teacherRegister,
  title: "Teacher Registration",
  description:
    "Create your Haziri.AI Teacher ID to manage classroom subjects, distribute QR enrollment links, and automate attendance.",
});

export default function TeacherRegisterPage() {
  const initialTeacherId = generateTeacherId();

  return (
    <AuthShell
      headerSubtitle="Teacher Registration"
      roleBadge="New Teacher"
      headline="Start taking smart classroom attendance in under a minute."
      description="Enter your contact details below to get your personal Teacher ID and start setting up your classes."
      alternateHref="/teacher/login"
      alternateLabel="Teacher Sign In"
      highlights={[
        {
          label: "Easy QR Invites",
          detail: "Generate printable QR codes so students join each class with one quick scan.",
        },
        {
          label: "Multi-Angle Class Photos",
          detail: "Combine several photos of your classroom in a single session to catch every seat.",
        },
        {
          label: "Simple Manual Edits",
          detail: "Review everyone detected and adjust any student with one click before saving.",
        },
      ]}
    >
      <TeacherRegisterForm initialTeacherId={initialTeacherId} />
    </AuthShell>
  );
}
