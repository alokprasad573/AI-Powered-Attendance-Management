import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeacherLoginForm } from "@/components/auth/teacher-login-form";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";

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
    <>
      <AppHeader
        subtitle="Teacher Portal Authentication"
        rightSlot={
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
        }
      />
      <main id="main-content" className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:py-14">
        <TeacherLoginForm
          prefillTeacherId={prefillTeacherId ?? ""}
          nextPath={nextPath ?? "/teacher/dashboard"}
          initialAuthError={authError ?? null}
        />
      </main>
    </>
  );
}
