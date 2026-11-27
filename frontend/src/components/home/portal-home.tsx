"use client";

import {
  ArrowUpRight,
  Database,
  GraduationCap,
  KeyRound,
  QrCode,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useRef } from "react";
import { AppFooter } from "@/components/layout/app-footer";
import { HeroSection } from "@/components/hero/HeroSection";
import {
  ArchitecturalReveal,
  KineticHeadline,
  MagneticFrame,
} from "@/components/motion/primitives";
import { TransitionLink } from "@/components/motion/route-transition-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureGsapRegistered, gsap, isReducedMotionPreferred, useGSAP } from "@/lib/gsap";
import { PipelineStory } from "./pipeline-story";

interface PortalHomeProps {
  activeTeacherId: string | null;
  activeStudentId: string | null;
  invalidJoinCode: boolean;
}

const PRIVACY_HIGHLIGHTS = [
  {
    icon: ScanFace,
    label: "Private Processing",
    title: "Stays on Your Device",
    detail:
      "Face detection and matching run inside your web browser so classroom photos are never uploaded or saved.",
  },
  {
    icon: ShieldCheck,
    label: "Built-In Safety",
    title: "Verified Every Session",
    detail:
      "Automatic integrity checks verify that only authentic, untampered software runs when scanning faces.",
  },
  {
    icon: Database,
    label: "Protected Records",
    title: "Role-Specific Access",
    detail:
      "Teachers can only view and manage their own subjects, while students only see their personal attendance records.",
  },
  {
    icon: KeyRound,
    label: "Account Security",
    title: "One-Time Email Confirmation",
    detail:
      "Passwordless face sign-in confirms through your registered email and protects against repeated sign-in attempts.",
  },
] as const;

export function PortalHome({
  activeTeacherId,
  activeStudentId,
  invalidJoinCode,
}: PortalHomeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      ensureGsapRegistered();
      if (isReducedMotionPreferred()) return;

      gsap.from(".portal-panel", {
        y: 26,
        opacity: 0,
        duration: 0.68,
        stagger: 0.12,
        ease: "haziriOut",
        clearProps: "transform",
        scrollTrigger: {
          trigger: "#portals",
          start: "top 82%",
          once: true,
        },
      });
    },
    { scope: rootRef }
  );

  return (
    <>
      <main id="main-content" ref={rootRef} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
        {invalidJoinCode ? (
          <Alert variant="warning" className="mb-6">
            The subject join code in the URL was invalid. Choose a portal below to sign in or
            enter a valid subject code manually.
          </Alert>
        ) : null}

        {/* Act 1: Immersive Hero + Live 3D Biometric Stage */}
        <HeroSection
          activeTeacherId={activeTeacherId}
          activeStudentId={activeStudentId}
        />

        {/* Act 2: Scroll-Driven Pipeline Storytelling */}
        <PipelineStory />

        {/* Act 3: Dual Role-Scoped Portals */}
        <section id="portals" aria-label="Student and Teacher Portals" className="py-12 lg:py-20">
          <div className="mb-10 flex flex-col gap-4 border-b border-[var(--border-hairline)] pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="neural">Dedicated Workspaces</Badge>
              <KineticHeadline
                as="h2"
                scrollTrigger
                className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl"
              >
                Simple workspaces for students and teachers.
              </KineticHeadline>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              Each workspace gives students and faculty the exact tools they need without extra clutter.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Student Portal Panel */}
            <article className="portal-panel spatial-glass-glow relative flex flex-col justify-between overflow-hidden rounded-[24px] p-7 sm:p-9 lg:col-span-6">
              <span
                aria-hidden="true"
                className="specular-rule pointer-events-none absolute inset-x-10 top-0 h-px"
              />
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#B9D0D8]/30 bg-[#141719]/92 text-[var(--accent-primary)]">
                    <GraduationCap className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span className="telemetry-num text-[11px] uppercase tracking-[0.16em] text-[var(--accent-primary)]">
                    For Students
                  </span>
                </div>

                <div className="space-y-2.5">
                  <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                    I&apos;m a Student
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                    Set up your face profile with clear consent, join classes with a QR code,
                    sign in quickly, and track your attendance progress.
                  </p>
                </div>

                <ul className="space-y-3 border-t border-[var(--border-hairline)] pt-5 text-sm text-[var(--text-primary)]">
                  <li className="flex items-center gap-3">
                    <ScanFace className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
                    <span>Quick face setup that never stores personal photos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <QrCode className="h-4 w-4 shrink-0 text-[var(--accent-secondary)]" aria-hidden="true" />
                    <span>Instant class enrollment using a join link or code</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 pt-4">
                {activeStudentId ? (
                  <MagneticFrame className="w-full">
                    <Button className="w-full" size="lg" asChild>
                      <TransitionLink href="/student/dashboard">
                        Open Student Dashboard ({activeStudentId})
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </TransitionLink>
                    </Button>
                  </MagneticFrame>
                ) : (
                  <>
                    <Button className="flex-1" size="lg" asChild>
                      <TransitionLink href="/student/login">
                        Student Portal
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </TransitionLink>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <TransitionLink href="/student/register">Register</TransitionLink>
                    </Button>
                  </>
                )}
              </div>
            </article>

            {/* Teacher Portal Panel */}
            <article className="portal-panel spatial-glass-glow relative flex flex-col justify-between overflow-hidden rounded-[24px] p-7 sm:p-9 lg:col-span-6">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#CDBF9D]/45 to-transparent"
              />
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#CDBF9D]/30 bg-[#141719]/92 text-[var(--accent-highlight)]">
                    <UserCheck className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span className="telemetry-num text-[11px] uppercase tracking-[0.16em] text-[var(--accent-highlight)]">
                    For Teachers
                  </span>
                </div>

                <div className="space-y-2.5">
                  <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                    I&apos;m a Teacher
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                    Organize classes, share printable QR join codes, take roll from multiple
                    classroom photos, and download spreadsheets anytime.
                  </p>
                </div>

                <ul className="space-y-3 border-t border-[var(--border-hairline)] pt-5 text-sm text-[var(--text-primary)]">
                  <li className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent-secondary)]" aria-hidden="true" />
                    <span>Scan multiple classroom photos in one quick session</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
                    <span>Review matches, edit anyone manually, and export reports</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 pt-4">
                {activeTeacherId ? (
                  <MagneticFrame className="w-full">
                    <Button variant="secondary" className="w-full" size="lg" asChild>
                      <TransitionLink href="/teacher/dashboard">
                        Open Teacher Dashboard ({activeTeacherId})
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </TransitionLink>
                    </Button>
                  </MagneticFrame>
                ) : (
                  <>
                    <Button className="flex-1" size="lg" asChild>
                      <TransitionLink href="/teacher/login">
                        Teacher Portal
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </TransitionLink>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <TransitionLink href="/teacher/register">Register</TransitionLink>
                    </Button>
                  </>
                )}
              </div>
            </article>
          </div>
        </section>

        {/* Act 4: Privacy & Trust Highlights */}
        <section id="architecture" aria-label="Security and privacy architecture" className="py-12 lg:py-16">
          <ArchitecturalReveal staggerSelector=".arch-spec-item">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="telemetry-num text-xs uppercase tracking-[0.18em] text-[var(--accent-secondary)]">
                  Privacy &amp; Trust
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                  Built to protect student privacy from day one.
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[22px] border border-[var(--border-default)] bg-[var(--border-hairline)] sm:grid-cols-2 lg:grid-cols-4">
              {PRIVACY_HIGHLIGHTS.map((spec) => {
                const Icon = spec.icon;
                return (
                  <div
                    key={spec.title}
                    className="arch-spec-item flex flex-col justify-between gap-4 bg-[#090A0B]/92 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="telemetry-num text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        {spec.label}
                      </span>
                      <Icon className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                        {spec.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                        {spec.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <details className="mt-5 rounded-[16px] border border-[var(--border-hairline)] bg-[#090A0B]/70 px-5 py-3.5 text-xs text-[var(--text-secondary)]">
              <summary className="cursor-pointer select-none font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent-primary)]">
                Technical details (for school IT reviewers)
              </summary>
              <p className="mt-2.5 leading-relaxed">
                Face localization and 128-dimension compact recognition signatures run
                strictly inside browser memory, verified by model checksums before
                use. No raw camera frames or classroom photographs are transmitted to
                or persisted in cloud storage. Academic records and templates are stored
                in role-isolated database tables with rate-limited email sign-in
                verification and safe spreadsheet export.
              </p>
            </details>
          </ArchitecturalReveal>
        </section>

        {/* Act 5: Editorial Conversion Banner */}
        <section aria-label="Get started" className="pt-8">
          <ArchitecturalReveal>
            <div className="spatial-glass relative overflow-hidden rounded-[26px] px-6 py-10 sm:px-10 sm:py-12">
              <span
                aria-hidden="true"
                className="specular-rule pointer-events-none absolute inset-x-14 top-0 h-px"
              />
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="max-w-2xl space-y-2.5">
                  <p className="telemetry-num text-xs uppercase tracking-[0.18em] text-[var(--accent-highlight)]">
                    Ready to Begin
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                    Start taking private classroom attendance today.
                  </h2>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    Create a teacher account to share class QR codes, or join as a
                    student to set up your profile in under a minute.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <MagneticFrame>
                    <Button size="lg" asChild>
                      <TransitionLink href="/teacher/register">
                        Create Teacher Account
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </TransitionLink>
                    </Button>
                  </MagneticFrame>
                  <MagneticFrame>
                    <Button variant="outline" size="lg" asChild>
                      <TransitionLink href="/student/register">
                        Create Student Account
                      </TransitionLink>
                    </Button>
                  </MagneticFrame>
                </div>
              </div>
            </div>
          </ArchitecturalReveal>
        </section>
      </main>
      <AppFooter />
    </>
  );
}
