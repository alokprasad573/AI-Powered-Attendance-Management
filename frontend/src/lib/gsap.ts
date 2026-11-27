"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let pluginsRegistered = false;

export function ensureGsapRegistered(): void {
  if (typeof window === "undefined" || pluginsRegistered) {
    return;
  }
  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase, SplitText);

  CustomEase.create("haziriOut", "M0,0 C0.19,1 0.22,1 1,1");
  CustomEase.create("haziriCouture", "M0,0 C0.65,0 0.35,1 1,1");
  pluginsRegistered = true;
}

if (typeof window !== "undefined") {
  ensureGsapRegistered();
}

export function isReducedMotionPreferred(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isFinePointerDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(pointer: fine)").matches;
}

export const MOTION_TIMING = {
  feedback: 0.18,
  hover: 0.24,
  card: 0.55,
  heroStagger: 0.08,
  headlineChar: 0.028,
  curtain: 0.42,
} as const;

export { CustomEase, ScrollTrigger, SplitText, gsap, useGSAP };
