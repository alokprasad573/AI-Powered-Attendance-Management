import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StudentRegisterForm } from "@/components/auth/student-register-form";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { generateStudentId } from "@/domain/ids";
import { subjectCodeSchema } from "@/lib/validations/subjects";

export const dynamic = "force-dynamic";

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
    <>
      <AppHeader
        subtitle="New Student Enrollment"
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
        <StudentRegisterForm
          initialStudentId={initialStudentId}
          joinCode={joinCode}
        />
      </main>
    </>
  );
}
