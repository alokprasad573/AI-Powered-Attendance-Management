import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeacherRegisterForm } from "@/components/auth/teacher-register-form";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { generateTeacherId } from "@/domain/ids";

export const dynamic = "force-dynamic";

export default function TeacherRegisterPage() {
  const initialTeacherId = generateTeacherId();

  return (
    <>
      <AppHeader
        subtitle="Teacher Registration"
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
        <TeacherRegisterForm initialTeacherId={initialTeacherId} />
      </main>
    </>
  );
}
