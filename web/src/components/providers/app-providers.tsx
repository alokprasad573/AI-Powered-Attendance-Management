"use client";

import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { LenisProvider } from "@/components/motion/lenis-provider";
import { MotionPauseProvider } from "@/components/motion/motion-pause-context";
import { OpticalCursor } from "@/components/motion/primitives";
import { RouteTransitionProvider } from "@/components/motion/route-transition-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <MotionPauseProvider>
        <LenisProvider>
          <RouteTransitionProvider>
            {children}
            <OpticalCursor />
          </RouteTransitionProvider>
        </LenisProvider>
      </MotionPauseProvider>
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        toastOptions={{
          className:
            "border border-[var(--border-specular)] bg-[#141719]/95 text-[#F5F6F6] backdrop-blur-xl shadow-2xl",
        }}
      />
    </MotionConfig>
  );
}
