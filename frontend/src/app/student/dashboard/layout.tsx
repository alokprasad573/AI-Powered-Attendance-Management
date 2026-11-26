import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Phone,
} from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { LogoutButton } from "@/components/layout/logout-button";
import { PortalNav } from "@/components/layout/portal-nav";
import { Badge } from "@/components/ui/badge";
import { formatDisplayName, getTimeGreeting } from "@/domain/ids";
import {
  AuthorizationError,
  requireAuthenticatedStudent,
} from "@/services/session-guard";
import { getStudentBiometricOverview } from "@/services/templates.service";

export const dynamic = "force-dynamic";

export default async function StudentDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let student;
  try {
    student = await requireAuthenticatedStudent();
  } catch (err) {
    if (err instanceof AuthorizationError && err.status === 401) {
      redirect("/student/login");
    }
    redirect("/student/login");
  }

  const biometric = await getStudentBiometricOverview(
    student.id,
    student.legacyFaceEmbeddings
  );

  const hour = new Date().getHours();
  const greeting = getTimeGreeting(hour, "student");
  const displayName = formatDisplayName(student.name);
  const displayGender = formatDisplayName(student.gender);

  const navItems = [
    {
      href: "/student/dashboard",
      label: "Overview",
      exact: true,
      icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: "/student/dashboard/subjects",
      label: "Enrolled Subjects",
      icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: "/student/dashboard/attendance",
      label: "Attendance History",
      icon: <ClipboardCheck className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  return (
    <>
      <AppHeader
        subtitle="Student Academic Portal"
        homeHref="/student/dashboard"
        rightSlot={<LogoutButton redirectTo="/" />}
      />

      <main id="main-content" className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <section
          aria-label="Student profile"
          className="spatial-glass relative overflow-hidden rounded-[20px] p-6"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#B9D0D8]/45 to-transparent"
          />
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neural">
                  Student ID: <span className="telemetry-num">{student.id}</span>
                </Badge>
                <Badge
                  variant={
                    biometric.state === "enrolled_v2"
                      ? "present"
                      : biometric.state === "legacy_dlib_needs_reenroll"
                      ? "override"
                      : "neutral"
                  }
                >
                  {biometric.state === "enrolled_v2"
                    ? "Face Template Active"
                    : biometric.state === "legacy_dlib_needs_reenroll"
                    ? "Legacy Face — Re-Enrollment Required"
                    : "Face Template Pending"}
                </Badge>
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                {greeting}
              </h1>
              <p className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                  <GraduationCap
                    className="h-4 w-4 text-[var(--accent-primary)]"
                    aria-hidden="true"
                  />
                  {displayName}
                </span>
                <span className="text-[var(--text-muted)]">•</span>
                <span>Gender: {displayGender}</span>
                <span className="text-[var(--text-muted)]">•</span>
                <span>
                  Age: <span className="telemetry-num text-[var(--text-primary)]">{student.age}</span>
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="glass-row flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 text-sm">
                <Mail className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Email ID
                  </p>
                  <p className="font-medium text-[var(--text-primary)]">{student.emailId}</p>
                </div>
              </div>
              <div className="glass-row flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 text-sm">
                <Phone className="h-4 w-4 text-[var(--accent-secondary)]" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Contact
                  </p>
                  <p className="telemetry-num font-medium text-[var(--text-primary)]">
                    +91 {student.mobileNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PortalNav items={navItems} label="Student Portal Navigation" />

        {children}
      </main>
    </>
  );
}
