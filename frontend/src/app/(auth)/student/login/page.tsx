import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StudentLoginForm } from "@/components/auth/student-login-form";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { subjectCodeSchema } from "@/lib/validations/subjects";

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
    <>
      <AppHeader
        subtitle="Student Portal Authentication"
        rightSlot={
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
        }
      />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
        <StudentLoginForm
          prefillStudentId={prefillStudentId ?? ""}
          joinCode={joinCode}
          initialAuthError={initialAuthError ?? null}
        />
      </main>
    </>
  );
}
