import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/home/landing-nav";
import { PortalHome } from "@/components/home/portal-home";
import { AppHeader } from "@/components/layout/app-header";
import { TransitionLink } from "@/components/motion/route-transition-provider";
import { Button } from "@/components/ui/button";
import { PUBLIC_ROUTES, SITE_DESCRIPTION, SITE_TITLE_DEFAULT } from "@/constants/seo";
import { subjectCodeSchema } from "@/lib/validations/subjects";
import { buildMetadata } from "@/services/seo";
import {
  getOptionalAuthenticatedStudent,
  getOptionalAuthenticatedTeacher,
} from "@/services/session-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  path: PUBLIC_ROUTES.home,
  title: SITE_TITLE_DEFAULT,
  description: SITE_DESCRIPTION,
  indexable: true,
});

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
        centerSlot={<LandingNav />}
        rightSlot={
          <div className="flex items-center gap-2">
            {teacher ? (
              <Button size="sm" asChild>
                <TransitionLink href="/teacher/dashboard">
                  Teacher Dashboard
                </TransitionLink>
              </Button>
            ) : student ? (
              <Button size="sm" asChild>
                <TransitionLink href="/student/dashboard">
                  Student Dashboard
                </TransitionLink>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="px-2.5 sm:px-3.5" asChild>
                  <TransitionLink href="/student/login">Student Sign In</TransitionLink>
                </Button>
                <Button size="sm" className="px-3 sm:px-3.5" asChild>
                  <TransitionLink href="/teacher/login">Teacher Sign In</TransitionLink>
                </Button>
              </>
            )}
          </div>
        }
      />
      <PortalHome
        activeTeacherId={teacher?.id ?? null}
        activeStudentId={student?.id ?? null}
        invalidJoinCode={Boolean(joinCode && !subjectCodeSchema.safeParse(joinCode).success)}
      />
    </>
  );
}
