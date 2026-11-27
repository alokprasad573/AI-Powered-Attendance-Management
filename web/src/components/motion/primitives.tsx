"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  SplitText,
  ensureGsapRegistered,
  gsap,
  isFinePointerDevice,
  isReducedMotionPreferred,
  useGSAP,
} from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface KineticHeadlineProps {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
  scrollTrigger?: boolean;
  delay?: number;
}

/**
 * Masked word-level GSAP SplitText reveal with native wrapping preservation
 * and instant fallback when `prefers-reduced-motion: reduce` is enabled.
 */
export function KineticHeadline({
  as = "h2",
  className,
  children,
  scrollTrigger = false,
  delay = 0.08,
}: KineticHeadlineProps) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const Tag = as;

  useGSAP(
    () => {
      ensureGsapRegistered();
      const el = ref.current;
      if (!el || isReducedMotionPreferred()) return;

      const split = SplitText.create(el, {
        type: "words",
        mask: "words",
        aria: "auto",
      });

      gsap.from(split.words, {
        yPercent: 108,
        opacity: 0,
        duration: 0.72,
        stagger: 0.042,
        delay,
        ease: "haziriOut",
        ...(scrollTrigger
          ? {
              scrollTrigger: {
                trigger: el,
                start: "top 86%",
                once: true,
              },
            }
          : {}),
      });

      return () => {
        split.revert();
      };
    },
    { scope: ref, revertOnUpdate: true, dependencies: [scrollTrigger, delay] }
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

interface MagneticFrameProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

/**
 * Subtle magnetic cursor pull active strictly on desktop fine-pointer devices.
 */
export function MagneticFrame({
  children,
  className,
  strength = 0.22,
}: MagneticFrameProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !isFinePointerDevice() || isReducedMotionPreferred()) {
      return;
    }

    ensureGsapRegistered();
    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });

    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = event.clientX - (rect.left + rect.width / 2);
      const relY = event.clientY - (rect.top + rect.height / 2);
      xTo(relX * strength);
      yTo(relY * strength);
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave, { passive: true });

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength]);

  return (
    <div ref={ref} className={cn("inline-block", className)}>
      {children}
    </div>
  );
}

interface ArchitecturalRevealProps {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  staggerSelector?: string;
}

export function ArchitecturalReveal({
  children,
  className,
  y = 20,
  delay = 0,
  staggerSelector,
}: ArchitecturalRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      ensureGsapRegistered();
      const el = ref.current;
      if (!el || isReducedMotionPreferred()) return;

      const targets = staggerSelector
        ? el.querySelectorAll(staggerSelector)
        : el;

      gsap.from(targets, {
        y,
        opacity: 0,
        duration: 0.56,
        delay,
        stagger: staggerSelector ? 0.065 : 0,
        ease: "haziriOut",
        clearProps: "transform",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true,
        },
      });
    },
    { scope: ref, dependencies: [y, delay, staggerSelector] }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Lightweight fine-pointer optical reticle halo that enhances the monochrome
 * platinum cursor presence without blocking clicks or scrolling.
 */
export function OpticalCursor() {
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ringRef.current;
    if (!el || !isFinePointerDevice() || isReducedMotionPreferred()) {
      return;
    }

    ensureGsapRegistered();
    const xTo = gsap.quickTo(el, "x", { duration: 0.24, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.24, ease: "power3.out" });

    let activeHover = false;

    const handleMove = (event: PointerEvent) => {
      xTo(event.clientX);
      yTo(event.clientY);

      const target = event.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest("a, button, [role='button'], summary, [data-cursor='interactive']")
      );

      if (isInteractive !== activeHover) {
        activeHover = isInteractive;
        gsap.to(el, {
          scale: isInteractive ? 1.55 : 1,
          borderColor: isInteractive
            ? "rgba(205, 191, 157, 0.72)"
            : "rgba(185, 208, 216, 0.36)",
          duration: 0.2,
          ease: "power2.out",
        });
      }

      gsap.set(el, { opacity: 1 });
    };

    const handleLeave = () => {
      gsap.to(el, { opacity: 0, duration: 0.18 });
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerleave", handleLeave);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerleave", handleLeave);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[80] hidden h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#B9D0D8]/36 opacity-0 mix-blend-screen md:block"
    />
  );
}
