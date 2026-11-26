import { ArrowUpRight, BookOpen, Camera, ClipboardList, Users } from "lucide-react";
import Link from "next/link";
import { RecognitionStats } from "@/components/dashboard/RecognitionStats";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuthenticatedTeacher } from "@/services/session-guard";
import { listTeacherSubjects } from "@/services/subjects.service";

export const dynamic = "force-dynamic";

export default async function TeacherOverviewPage() {
  const teacher = await requireAuthenticatedTeacher();
  const subjects = await listTeacherSubjects(teacher.id);

  const totalEnrollments = subjects.reduce(
    (sum, item) => sum + item.totalStudents,
    0
  );
  const totalSessions = subjects.reduce(
    (sum, item) => sum + item.totalSessions,
    0
  );

  return (
    <div className="space-y-6">
      <RecognitionStats
          items={[
          {
            label: "Owned Subjects",
            value: subjects.length,
            detail: "Active teacher courses",
            accent: "platinum",
          },
          {
            label: "Total Enrollments",
            value: totalEnrollments,
            detail: "Registered class rosters",
            accent: "silver",
          },
          {
            label: "Recorded Classes",
            value: totalSessions,
            detail: "Saved attendance sessions",
            accent: "gold",
          },
          {
            label: "Recognition Engine Status",
            value: "Ready",
            detail: "Running in browser",
            accent: "present",
          },
        ]}
      />

      {subjects.length === 0 ? (
        <Alert variant="info">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">No subjects found yet</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Create your first subject to generate a student join QR code and run
                multi-photo classroom attendance.
              </p>
            </div>
            <Button asChild>
              <Link href="/teacher/dashboard/subjects">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Manage Subjects
              </Link>
            </Button>
          </div>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <Card className="spatial-glass-glow flex flex-col justify-between md:col-span-4">
          <CardHeader>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#B9D0D8]/28 bg-[#141719]/92 text-[var(--accent-primary)]">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle>Take Attendance</CardTitle>
            <CardDescription>
              Add class photos, verify face matches, override manually, and save safely
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/teacher/dashboard/attendance">
                Start Attendance Session
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="spatial-glass-glow flex flex-col justify-between md:col-span-4">
          <CardHeader>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#91AAB4]/28 bg-[#141719]/92 text-[var(--accent-secondary)]">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle>Manage Subjects</CardTitle>
            <CardDescription>
              Create courses with normalized naming/sections and share QR join links with
              your students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/teacher/dashboard/subjects">
                Open Subject Manager
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="spatial-glass-glow flex flex-col justify-between md:col-span-4">
          <CardHeader>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#CDBF9D]/28 bg-[#141719]/92 text-[var(--accent-highlight)]">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              Filter historical sessions by subject or date, inspect student entries, and
              export CSV reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/teacher/dashboard/records">
                View Records &amp; Export
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
