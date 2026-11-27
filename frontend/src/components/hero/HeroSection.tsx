"use client";

import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";
import { LiveFaceScanner } from "@/components/biometric/LiveFaceScanner";
import type { LiveMeshBridge } from "@/components/biometric/types";
import {
  KineticHeadline,
  MagneticFrame,
} from "@/components/motion/primitives";
import { useLenisScroll } from "@/components/motion/lenis-provider";
import { TransitionLink } from "@/components/motion/route-transition-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureGsapRegistered, gsap, isReducedMotionPreferred, useGSAP } from "@/lib/gsap";
import { BiometricScene } from "./BiometricScene";

interface HeroSectionProps {
  activeTeacherId?: string | null;
  activeStudentId?: string | null;
}

export function HeroSection({
  activeTeacherId = null,
  activeStudentId = null,
}: HeroSectionProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const { scrollTo } = useLenisScroll();

  const liveBridgeRef = useRef<LiveMeshBridge>({
    landmarks: null,
    faces: [],
    active: false,
  });
  const [isLiveTracking, setIsLiveTracking] = useState(false);

  useGSAP(
    () => {
      ensureGsapRegistered();
      if (isReducedMotionPreferred()) return;

      const tl = gsap.timeline({ defaults: { ease: "haziriOut" } });

      tl.from(".hero-stagger", {
        y: 22,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        delay: 0.16,
        clearProps: "transform",
      }).from(
        ".hero-stage-panel",
        {
          y: 28,
          opacity: 0,
          scale: 0.985,
          duration: 0.8,
          stagger: 0.1,
          clearProps: "transform",
        },
        "-=0.42"
      );

      gsap.to(".hero-mesh-parallax", {
        yPercent: -4,
        ease: "none",
        scrollTrigger: {
          trigger: "#biometric-stage",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      aria-label="Hero showcase"
      className="relative space-y-10 pb-8 pt-2 sm:space-y-12 lg:space-y-14"
    >
      {/* Immersive Editorial Hero Header */}
      <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div className="max-w-3xl space-y-5">
          <div className="hero-stagger flex flex-wrap items-center gap-2.5">
            <Badge variant="neural">Private Classroom Attendance</Badge>
            <span className="telemetry-num text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              Fast · On-Device · No Photos Saved
            </span>
          </div>

          <KineticHeadline
            as="h1"
            delay={0.05}
            className="font-display text-[clamp(2.4rem,5.4vw,4.5rem)] font-semibold leading-[1.03] tracking-[-0.035em] text-[var(--text-primary)]"
          >
            <span>Skip Register.</span> <br />
            <span className="text-[var(--accent-highlight)]">Start the Class.</span>
          </KineticHeadline>

          <p className="hero-stagger max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            Create classes, invite students with scannable QR codes, and take
            attendance from classroom photos in seconds — all while keeping
            student photos private on your device.
          </p>

          <div className="hero-stagger flex flex-wrap items-center gap-3 pt-1">
            {activeTeacherId ? (
              <MagneticFrame>
                <Button size="lg" asChild>
                  <TransitionLink href="/teacher/dashboard">
                    Open Teacher Dashboard ({activeTeacherId})
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </TransitionLink>
                </Button>
              </MagneticFrame>
            ) : activeStudentId ? (
              <MagneticFrame>
                <Button size="lg" asChild>
                  <TransitionLink href="/student/dashboard">
                    Open Student Dashboard ({activeStudentId})
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </TransitionLink>
                </Button>
              </MagneticFrame>
            ) : (
              <>
                <MagneticFrame>
                  <Button size="lg" asChild>
                    <TransitionLink href="/teacher/login">
                      Teacher Workspace
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </TransitionLink>
                  </Button>
                </MagneticFrame>
                <MagneticFrame>
                  <Button variant="secondary" size="lg" asChild>
                    <TransitionLink href="/student/login">
                      Student Workspace
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </TransitionLink>
                  </Button>
                </MagneticFrame>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => scrollTo("#pipeline")}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              How it works
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Clean Benefit Highlights */}
        <dl className="hero-stagger grid grid-cols-2 gap-4 border-t border-[var(--border-hairline)] pt-5 sm:min-w-[320px] lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <div className="space-y-1">
            <dt className="telemetry-num text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Photos Saved
            </dt>
            <dd className="metric-value text-2xl font-semibold text-[var(--accent-primary)]">
              Zero
            </dd>
            <dd className="text-xs text-[var(--text-secondary)]">
              Stays on your device
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="telemetry-num text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Class Join
            </dt>
            <dd className="metric-value text-2xl font-semibold text-[var(--accent-highlight)]">
              1 Scan
            </dd>
            <dd className="text-xs text-[var(--text-secondary)]">
              Quick QR code setup
            </dd>
          </div>
        </dl>
      </div>

      {/* Interactive Dual-Pane Face Preview Stage */}
      <div
        id="biometric-stage"
        className="spatial-glass relative overflow-hidden rounded-[26px] p-4 sm:p-6 lg:p-8"
      >
        <span
          aria-hidden="true"
          className="specular-rule pointer-events-none absolute inset-x-12 top-0 h-px"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Left: 3D Metallic Platinum Face Preview */}
          <div className="hero-stage-panel relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[20px] border border-[var(--border-default)] bg-[#060708]/94 sm:min-h-[400px] lg:col-span-6 lg:min-h-[470px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 48%, rgba(185, 208, 216, 0.13) 0%, rgba(145, 170, 180, 0.04) 44%, rgba(6, 7, 8, 0) 74%)",
              }}
            />

            <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-4">
              <Badge variant={isLiveTracking ? "present" : "neutral"}>
                {isLiveTracking
                  ? "Tracking Face Live"
                  : "Standby Reference Mesh"}
              </Badge>
              <span className="telemetry-num text-[11px] text-[var(--text-secondary)]">
                {isLiveTracking ? "LIVE PREVIEW" : "PREVIEW"}
              </span>
            </div>

            <div className="hero-mesh-parallax relative min-h-[260px] flex-1 sm:min-h-[340px] lg:min-h-[420px]">
              <BiometricScene
                liveBridgeRef={liveBridgeRef}
                isLiveTracking={isLiveTracking}
                className="absolute inset-0 h-full w-full"
              />
            </div>

            <div className="relative z-10 flex items-center justify-between border-t border-[var(--border-hairline)] bg-[#090A0B]/78 px-4 py-3 text-[11px] text-[var(--text-secondary)] backdrop-blur-md">
              <span>
                {isLiveTracking
                  ? "Following your face movement in real time"
                  : "Turn on your camera to see live face tracking"}
              </span>
              <span className="telemetry-num hidden text-[var(--accent-highlight)] sm:inline">
                {isLiveTracking ? "On Your Device" : "Camera Off"}
              </span>
            </div>
          </div>

          {/* Right: Live Biometric Face Scanner */}
          <div className="hero-stage-panel lg:col-span-6">
            <LiveFaceScanner
              liveBridgeRef={liveBridgeRef}
              onLiveTrackingChange={setIsLiveTracking}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
