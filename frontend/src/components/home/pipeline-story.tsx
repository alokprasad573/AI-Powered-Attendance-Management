"use client";

import { useRef, useState } from "react";
import { KineticHeadline } from "@/components/motion/primitives";
import { Badge } from "@/components/ui/badge";
import {
  ScrollTrigger,
  ensureGsapRegistered,
  gsap,
  isReducedMotionPreferred,
  useGSAP,
} from "@/lib/gsap";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  {
    step: "01",
    phase: "FIND",
    title: "Spot Every Student in View",
    detail:
      "Haziri.AI finds faces in your camera view or class photos right on your device — pictures never leave your screen.",
    spec: "Runs privately on your device",
  },
  {
    step: "02",
    phase: "MATCH",
    title: "Verify Identity Safely",
    detail:
      "Each face is compared against your enrolled class roster using a secure digital signature instead of keeping raw photographs.",
    spec: "No photo copies stored",
  },
  {
    step: "03",
    phase: "REVIEW",
    title: "Review & Save Attendance",
    detail:
      "Combine multiple class photos, adjust anyone manually with a single click, and save the attendance sheet cleanly.",
    spec: "Full teacher control before saving",
  },
] as const;

export function PipelineStory() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useGSAP(
    () => {
      ensureGsapRegistered();
      const root = sectionRef.current;
      if (!root) return;

      const reduced = isReducedMotionPreferred();
      if (reduced) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".pipeline-step-card", root);

        gsap.to(".pipeline-progress-fill", {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".pipeline-track",
            start: "top 68%",
            end: "bottom 55%",
            scrub: true,
          },
        });

        cards.forEach((card, idx) => {
          ScrollTrigger.create({
            trigger: card,
            start: "top 58%",
            end: "bottom 42%",
            onEnter: () => setActiveIndex(idx),
            onEnterBack: () => setActiveIndex(idx),
          });

          gsap.from(card, {
            y: 28,
            opacity: 0.35,
            duration: 0.6,
            ease: "haziriOut",
            scrollTrigger: {
              trigger: card,
              start: "top 82%",
              once: true,
            },
          });
        });
      });

      mm.add("(max-width: 1023px)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".pipeline-step-card", root);
        gsap.from(cards, {
          y: 20,
          opacity: 0,
          duration: 0.55,
          stagger: 0.1,
          ease: "haziriOut",
          clearProps: "transform",
          scrollTrigger: {
            trigger: root,
            start: "top 82%",
            once: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  const activeStep = PIPELINE_STEPS[activeIndex] ?? PIPELINE_STEPS[0];

  return (
    <section
      id="pipeline"
      ref={sectionRef}
      aria-label="How Haziri.AI works"
      className="relative py-16 lg:py-24"
    >
      <div className="mb-10 flex flex-col gap-4 border-b border-[var(--border-hairline)] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <Badge variant="neutral">Three Simple Steps · Zero Photos Uploaded</Badge>
          <KineticHeadline
            as="h2"
            scrollTrigger
            className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl"
          >
            From class photo to attendance sheet in seconds.
          </KineticHeadline>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          Every check happens quietly inside your browser, keeping classroom
          photos off external servers.
        </p>
      </div>

      <div className="pipeline-track relative grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Sticky Preview Diagram (Desktop) */}
        <div className="lg:sticky lg:top-28 lg:col-span-5">
          <div className="spatial-glass relative overflow-hidden rounded-[22px] p-6">
            <span
              aria-hidden="true"
              className="specular-rule pointer-events-none absolute inset-x-8 top-0 h-px"
            />
            <div className="mb-5 flex items-center justify-between">
              <span className="telemetry-num text-xs uppercase tracking-[0.16em] text-[var(--accent-primary)]">
                Step {activeStep.step} · {activeStep.phase}
              </span>
              <span className="telemetry-num text-[11px] text-[var(--accent-highlight)]">
                ON DEVICE
              </span>
            </div>

            {/* Precision Optical Schematic SVG */}
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[14px] border border-[var(--border-hairline)] bg-[#060708]/95">
              <svg
                viewBox="0 0 360 270"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full p-4"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="pipeGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#B9D0D8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#090A0B" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="360" height="270" fill="url(#pipeGlow)" />
                {/* Calibration Rings */}
                <circle
                  cx="180"
                  cy="135"
                  r="96"
                  stroke="#91AAB4"
                  strokeOpacity={activeIndex === 0 ? "0.52" : "0.18"}
                  strokeDasharray="4 6"
                />
                <circle
                  cx="180"
                  cy="135"
                  r="72"
                  stroke="#B9D0D8"
                  strokeOpacity={activeIndex === 1 ? "0.62" : "0.22"}
                />
                {/* Stage 01: Outer face oval + 5 anchor landmarks */}
                <ellipse
                  cx="180"
                  cy="135"
                  rx="44"
                  ry="56"
                  stroke="#B9D0D8"
                  strokeOpacity={activeIndex === 0 ? "0.85" : "0.35"}
                  strokeWidth="1.4"
                />
                {/* Stage 02: 112x112 square normalization alignment crop */}
                <rect
                  x="130"
                  y="85"
                  width="100"
                  height="100"
                  rx="8"
                  stroke="#CDBF9D"
                  strokeOpacity={activeIndex === 1 ? "0.9" : "0.22"}
                  strokeWidth="1.5"
                  strokeDasharray={activeIndex === 1 ? "none" : "3 5"}
                />
                {/* Stage 03: Cosine matching lock vector lines */}
                <path
                  d="M160 120L200 120L180 142L166 164L194 164Z"
                  stroke="#76C4A4"
                  strokeOpacity={activeIndex === 2 ? "0.85" : "0.25"}
                  strokeWidth="1.2"
                />
                {/* 5-Point Keypoints */}
                <circle cx="160" cy="120" r="3.2" fill="#B9D0D8" />
                <circle cx="200" cy="120" r="3.2" fill="#B9D0D8" />
                <circle cx="180" cy="140" r="3.2" fill="#F5F6F6" />
                <circle cx="166" cy="164" r="3.2" fill="#CDBF9D" />
                <circle cx="194" cy="164" r="3.2" fill="#CDBF9D" />
              </svg>
            </div>

            <div className="mt-5 space-y-1.5">
              <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
                {activeStep.title}
              </p>
              <p className="telemetry-num text-xs text-[var(--accent-secondary)]">
                {activeStep.spec}
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Progression Beats */}
        <div className="relative space-y-6 pl-0 lg:col-span-7 lg:pl-8">
          {/* Desktop Vertical Progress Rail */}
          <div
            aria-hidden="true"
            className="absolute bottom-4 left-2 top-4 hidden w-px bg-[var(--border-hairline)] lg:block"
          >
            <div className="pipeline-progress-fill h-full w-full origin-top scale-y-0 bg-gradient-to-b from-[#B9D0D8] via-[#91AAB4] to-[#CDBF9D]" />
          </div>

          {PIPELINE_STEPS.map((item, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <article
                key={item.step}
                onMouseEnter={() => setActiveIndex(idx)}
                onFocus={() => setActiveIndex(idx)}
                className={cn(
                  "pipeline-step-card relative rounded-[20px] border p-6 transition-colors duration-300 sm:p-8",
                  isSelected
                    ? "border-[#B9D0D8]/45 bg-[#141719]/92 shadow-[0_20px_48px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(185,208,216,0.18)]"
                    : "border-[var(--border-hairline)] bg-[#090A0B]/70 hover:border-[var(--border-default)]"
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="telemetry-num text-xs font-medium tracking-[0.16em] text-[var(--accent-highlight)]">
                    STEP {item.step} · {item.phase}
                  </span>
                  <span className="telemetry-num text-[11px] text-[var(--text-muted)]">
                    {item.spec}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                  {item.detail}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
