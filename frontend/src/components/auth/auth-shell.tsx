"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { KineticHeadline } from "@/components/motion/primitives";
import { TransitionLink } from "@/components/motion/route-transition-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureGsapRegistered, gsap, isReducedMotionPreferred, useGSAP } from "@/lib/gsap";

interface AuthHighlight {
  label: string;
  detail: string;
}

interface AuthShellProps {
  headerSubtitle: string;
  roleBadge: string;
  headline: string;
  description: string;
  highlights: readonly AuthHighlight[];
  alternateHref: string;
  alternateLabel: string;
  children: ReactNode;
}

export function AuthShell({
  headerSubtitle,
  roleBadge,
  headline,
  description,
  highlights,
  alternateHref,
  alternateLabel,
  children,
}: AuthShellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      ensureGsapRegistered();
      if (isReducedMotionPreferred()) return;

      const tl = gsap.timeline({ defaults: { ease: "haziriOut" } });
      tl.from(".auth-aside-item", {
        y: 18,
        opacity: 0,
        duration: 0.55,
        stagger: 0.07,
        clearProps: "transform",
      }).from(
        ".auth-form-stage",
        {
          y: 22,
          opacity: 0,
          duration: 0.62,
          clearProps: "transform",
        },
        "-=0.38"
      );
    },
    { scope: containerRef }
  );

  return (
    <>
      <AppHeader
        subtitle={headerSubtitle}
        rightSlot={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <TransitionLink href={alternateHref}>{alternateLabel}</TransitionLink>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <TransitionLink href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Home
              </TransitionLink>
            </Button>
          </div>
        }
      />

      <main
        id="main-content"
        ref={containerRef}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:py-14"
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Editorial Role & Privacy Rail */}
          <aside className="space-y-6 lg:sticky lg:top-28 lg:col-span-5 lg:pr-4">
            <div className="auth-aside-item flex flex-wrap items-center gap-2">
              <Badge variant="neural">{roleBadge}</Badge>
              <span className="telemetry-num text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Haziri.AI Account
              </span>
            </div>

            <KineticHeadline
              as="h2"
              delay={0.04}
              className="font-display text-3xl font-semibold leading-[1.08] tracking-tight text-[var(--text-primary)] sm:text-4xl"
            >
              {headline}
            </KineticHeadline>

            <p className="auth-aside-item text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
              {description}
            </p>

            <div className="auth-aside-item spatial-glass relative overflow-hidden rounded-[20px] p-5">
              <span
                aria-hidden="true"
                className="specular-rule pointer-events-none absolute inset-x-8 top-0 h-px"
              />
              <div className="mb-4 flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
                <ShieldCheck
                  className="h-4 w-4 text-[var(--accent-highlight)]"
                  aria-hidden="true"
                />
                <span>How Your Privacy Is Protected</span>
              </div>
              <dl className="space-y-3 border-t border-[var(--border-hairline)] pt-4">
                {highlights.map((item) => (
                  <div key={item.label} className="space-y-0.5">
                    <dt className="telemetry-num text-[11px] uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                      {item.label}
                    </dt>
                    <dd className="text-xs leading-relaxed text-[var(--text-secondary)]">
                      {item.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>

          {/* Interactive Authentication Form Stage */}
          <div className="auth-form-stage lg:col-span-7">{children}</div>
        </div>
      </main>

      <AppFooter compact />
    </>
  );
}
