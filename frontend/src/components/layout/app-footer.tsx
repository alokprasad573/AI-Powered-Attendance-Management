"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useDecorativeMotionPause } from "@/components/motion/motion-pause-context";
import { TransitionLink } from "@/components/motion/route-transition-provider";

export function AppFooter({ compact = false }: { compact?: boolean }) {
  const { isPaused, togglePause } = useDecorativeMotionPause();

  return (
    <footer className="relative z-10 mt-auto border-t border-[var(--border-hairline)] bg-[#060708]/88 backdrop-blur-xl">
      <span
        aria-hidden="true"
        className="specular-rule pointer-events-none absolute inset-x-12 top-0 h-px"
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {!compact ? (
          <div className="grid grid-cols-1 gap-8 pb-8 md:grid-cols-12">
            <div className="space-y-3 md:col-span-5">
              <TransitionLink
                href="/"
                className="inline-flex items-center gap-2.5 rounded-[10px]"
              >
                <div className="relative h-8 w-8 overflow-hidden rounded-[8px] border border-[#B9D0D8]/25 bg-[var(--bg-secondary)]">
                  <Image
                    src="/brand/haziri-mark.svg"
                    alt="Haziri.AI emblem"
                    width={32}
                    height={32}
                  />
                </div>
                <span className="font-display text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                  Haziri.AI
                </span>
              </TransitionLink>
              <p className="max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
                Private classroom attendance that works right on your device, keeps
                student photos off our servers, and helps teachers manage classes effortlessly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:col-span-7">
              <div className="space-y-2.5">
                <p className="telemetry-num text-[11px] uppercase tracking-[0.16em] text-[var(--accent-primary)]">
                  Student
                </p>
                <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                  <li>
                    <TransitionLink
                      href="/student/login"
                      className="transition-colors hover:text-[var(--text-primary)]"
                    >
                      Student Sign In
                    </TransitionLink>
                  </li>
                  <li>
                    <TransitionLink
                      href="/student/register"
                      className="transition-colors hover:text-[var(--text-primary)]"
                    >
                      Create Student Account
                    </TransitionLink>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <p className="telemetry-num text-[11px] uppercase tracking-[0.16em] text-[var(--accent-secondary)]">
                  Teachers
                </p>
                <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                  <li>
                    <TransitionLink
                      href="/teacher/login"
                      className="transition-colors hover:text-[var(--text-primary)]"
                    >
                      Teacher Sign In
                    </TransitionLink>
                  </li>
                  <li>
                    <TransitionLink
                      href="/teacher/register"
                      className="transition-colors hover:text-[var(--text-primary)]"
                    >
                      Create Teacher Account
                    </TransitionLink>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5 col-span-2 sm:col-span-1">
                <p className="telemetry-num text-[11px] uppercase tracking-[0.16em] text-[var(--accent-highlight)]">
                  Highlights
                </p>
                <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  <li>On-Device Face Check-In</li>
                  <li>Photos Never Saved</li>
                  <li>Private Class Records</li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={
            compact
              ? "flex flex-wrap items-center justify-between gap-3"
              : "flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-6"
          }
        >
          <p className="telemetry-num text-xs text-[var(--text-muted)]">
            Haziri.AI · Private Classroom Attendance
          </p>
          <button
            type="button"
            onClick={togglePause}
            aria-label={
              isPaused
                ? "Resume decorative ambient motion"
                : "Pause decorative ambient motion"
            }
            className="telemetry-num inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[#141719]/85 px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition-colors hover:border-[#B9D0D8]/40 hover:text-[var(--text-primary)]"
          >
            {isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>Resume Ambient Motion</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>Pause Ambient Motion</span>
              </>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
