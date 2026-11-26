"use client";

import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
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
