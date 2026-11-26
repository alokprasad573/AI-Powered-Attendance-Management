import { redirect } from "next/navigation";
import { PortalHome } from "@/components/home/portal-home";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { subjectCodeSchema } from "@/lib/validations/subjects";
import {
  getOptionalAuthenticatedStudent,
  getOptionalAuthenticatedTeacher,
} from "@/services/session-guard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Forward Supabase auth email sign-in callbacks if Site URL fallback landed on "/".
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const rawTokenHash = Array.isArray(params.token_hash)
    ? params.token_hash[0]
    : params.token_hash;
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;

  if (rawCode || (rawTokenHash && rawType)) {
    const callbackParams = new URLSearchParams();
    if (rawCode) callbackParams.set("code", rawCode);
    if (rawTokenHash) callbackParams.set("token_hash", rawTokenHash);
    if (rawType) callbackParams.set("type", rawType);
    if (rawNext) callbackParams.set("next", rawNext);
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const rawJoin = params["join-class"];
  const joinCode = Array.isArray(rawJoin) ? rawJoin[0] : rawJoin;

  if (joinCode) {
    const parsed = subjectCodeSchema.safeParse(joinCode);
    const safeCode = parsed.success ? parsed.data : null;

    if (safeCode) {
      const student = await getOptionalAuthenticatedStudent();
      if (student) {
        redirect(`/student/dashboard?join-class=${encodeURIComponent(safeCode)}`);
      }
      redirect(`/student/login?join-class=${encodeURIComponent(safeCode)}`);
    }
  }

  const [teacher, student] = await Promise.all([
    getOptionalAuthenticatedTeacher(),
    getOptionalAuthenticatedStudent(),
  ]);

  return (
    <>
      <AppHeader
        rightSlot={
          <div className="flex items-center gap-2">
            {teacher ? (
              <Button size="sm" asChild>
                <Link href="/teacher/dashboard">Teacher Dashboard</Link>
              </Button>
            ) : student ? (
              <Button size="sm" asChild>
                <Link href="/student/dashboard">Student Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="px-2.5 sm:px-3.5" asChild>
                  <Link href="/student/login">Student Sign In</Link>
                </Button>
                <Button size="sm" className="px-3 sm:px-3.5" asChild>
                  <Link href="/teacher/login">Teacher Sign In</Link>
                </Button>
              </>
            )}
          </div>
        }
      />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
        <PortalHome
          activeTeacherId={teacher?.id ?? null}
          activeStudentId={student?.id ?? null}
          invalidJoinCode={Boolean(joinCode && !subjectCodeSchema.safeParse(joinCode).success)}
        />
      </main>
    </>
  );
}
