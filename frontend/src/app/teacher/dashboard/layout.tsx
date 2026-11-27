import type { Metadata } from "next";
import {
  BookOpen,
  Camera,
  ClipboardList,
  LayoutDashboard,
  Mail,
  Phone,
  UserCheck,
} from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { LogoutButton } from "@/components/layout/logout-button";
import { PortalNav } from "@/components/layout/portal-nav";
import { Badge } from "@/components/ui/badge";
import { getTeacherHonorific, getTimeGreeting } from "@/domain/ids";
import { buildMetadata } from "@/services/seo";
import {
  AuthorizationError,
  requireAuthenticatedTeacher,
} from "@/services/session-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  path: "/teacher/dashboard",
  title: "Teacher Dashboard",
  description: "Private Haziri.AI teacher operations dashboard.",
  indexable: false,
});

export default async function TeacherDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let teacher;
  try {
    teacher = await requireAuthenticatedTeacher();
  } catch (err) {
    if (err instanceof AuthorizationError && err.status === 401) {
      redirect("/teacher/login?next=/teacher/dashboard");
    }
    redirect("/teacher/login");
  }

  const hour = new Date().getHours();
  const greeting = getTimeGreeting(hour, "teacher");
  const { displayName, honorific } = getTeacherHonorific(
    teacher.name,
    teacher.gender
  );

  const navItems = [
    {
      href: "/teacher/dashboard",
      label: "Overview",
      exact: true,
      icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: "/teacher/dashboard/attendance",
      label: "Take Attendance",
      icon: <Camera className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: "/teacher/dashboard/subjects",
      label: "Manage Subjects",
      icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
    },
    {
      href: "/teacher/dashboard/records",
      label: "Attendance Records",
      icon: <ClipboardList className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  return (
    <>
      <AppHeader
        subtitle="Teacher Portal"
        homeHref="/teacher/dashboard"
        rightSlot={<LogoutButton redirectTo="/" />}
      />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <section
          aria-label="Teacher profile"
          className="spatial-glass relative overflow-hidden rounded-[22px] p-6"
        >
          <span
            aria-hidden="true"
            className="specular-rule pointer-events-none absolute inset-x-10 top-0 h-px"
          />

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>
                  Teacher ID: <span className="telemetry-num">{teacher.id}</span>
                </Badge>
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                {greeting}, {honorific}
              </h1>
              <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <UserCheck className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <span className="font-medium text-[var(--text-primary)]">{displayName}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="glass-row flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 text-sm">
                <Mail className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Email ID
                  </p>
                  <p className="font-medium text-[var(--text-primary)]">{teacher.emailId}</p>
                </div>
              </div>
              <div className="glass-row flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 text-sm">
                <Phone className="h-4 w-4 text-[var(--accent-secondary)]" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Contact
                  </p>
                  <p className="telemetry-num font-medium text-[var(--text-primary)]">
                    +91 {teacher.mobileNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PortalNav items={navItems} label="Teacher Portal Navigation" />

        {children}
      </main>

      <AppFooter compact />
    </>
  );
}
