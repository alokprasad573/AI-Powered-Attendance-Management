"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  GraduationCap,
  ScanFace,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { HeroSection } from "@/components/hero/HeroSection";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  bentoCardVariants,
  bentoContainerVariants,
} from "@/lib/motion";

interface PortalHomeProps {
  activeTeacherId: string | null;
  activeStudentId: string | null;
  invalidJoinCode: boolean;
}

export function PortalHome({
  activeTeacherId,
  activeStudentId,
  invalidJoinCode,
}: PortalHomeProps) {
  return (
    <motion.div
      variants={bentoContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {invalidJoinCode ? (
        <Alert variant="warning">
          The subject join code in the URL was invalid. Choose a portal below to sign in or
          enter a valid subject code manually.
        </Alert>
      ) : null}

      <HeroSection />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Student Portal Card */}
        <motion.article variants={bentoCardVariants} className="md:col-span-6">
          <Card className="spatial-glass-glow relative flex h-full flex-col justify-between overflow-hidden p-1.5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#B9D0D8]/45 to-transparent"
            />
            <CardHeader>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#B9D0D8]/28 bg-[#141719]/92 text-[var(--accent-primary)] shadow-[inset_0_1px_0_rgba(245,246,246,0.12)]">
                <GraduationCap className="h-6 w-6" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">I&apos;m a Student</CardTitle>
              <CardDescription>
                Enroll in subjects via code or QR link, manage your biometric template,
                and inspect per-subject attendance statistics and history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <div className="glass-row flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[var(--text-primary)]">
                <ScanFace
                  className="h-4 w-4 shrink-0 text-[var(--accent-primary)]"
                  aria-hidden="true"
                />
                <span>Guided versioned face template enrollment</span>
              </div>
              <div className="glass-row flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[var(--text-primary)]">
                <UserCheck
                  className="h-4 w-4 shrink-0 text-[var(--accent-secondary)]"
                  aria-hidden="true"
                />
                <span>Instant subject join via QR code or course ID</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              {activeStudentId ? (
                <Button className="w-full" asChild>
                  <Link href="/student/dashboard">
                    Open Student Dashboard ({activeStudentId})
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button className="flex-1" asChild>
                    <Link href="/student/login">
                      Student Portal
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/student/register">Register</Link>
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </motion.article>

        {/* Teacher Portal Card */}
        <motion.article variants={bentoCardVariants} className="md:col-span-6">
          <Card className="spatial-glass-glow relative flex h-full flex-col justify-between overflow-hidden p-1.5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#91AAB4]/45 to-transparent"
            />
            <CardHeader>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#91AAB4]/30 bg-[#141719]/92 text-[var(--accent-secondary)] shadow-[inset_0_1px_0_rgba(245,246,246,0.12)]">
                <UserCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">I&apos;m a Teacher</CardTitle>
              <CardDescription>
                Create subjects, distribute join QR codes, run multi-photo attendance
                analysis with manual overrides, and export session reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <div className="glass-row flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[var(--text-primary)]">
                <ScanFace
                  className="h-4 w-4 shrink-0 text-[var(--accent-secondary)]"
                  aria-hidden="true"
                />
                <span>Multi-photo classroom scan with source attribution</span>
              </div>
              <div className="glass-row flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[var(--text-primary)]">
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-[var(--accent-highlight)]"
                  aria-hidden="true"
                />
                <span>Idempotent save, manual override &amp; CSV reports</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              {activeTeacherId ? (
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/teacher/dashboard">
                    Open Teacher Dashboard ({activeTeacherId})
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button className="flex-1" asChild>
                    <Link href="/teacher/login">
                      Teacher Portal
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/teacher/register">Register</Link>
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </motion.article>
      </div>
    </motion.div>
  );
}
