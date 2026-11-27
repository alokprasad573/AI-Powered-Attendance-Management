"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleAlert } from "lucide-react";
import { ARCHITECTURAL_EASE } from "@/lib/motion";
import {
  deriveScannerProgressPercent,
  deriveWorkflowStages,
  type BiometricInteractionState,
} from "./types";

interface RecognitionProgressProps {
  state: BiometricInteractionState;
  landmarksCount: number | null;
  compact?: boolean;
}

export function RecognitionProgress({
  state,
  landmarksCount,
  compact = false,
}: RecognitionProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  const stages = deriveWorkflowStages(state, landmarksCount);
  const progress = deriveScannerProgressPercent(state, landmarksCount);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress / 100);

  const strokeColor =
    state === "recognition_successful"
      ? "#76C4A4"
      : state === "recognition_failed" ||
        state === "camera_error" ||
        state === "camera_permission_required"
      ? "#DF848E"
      : state === "multiple_faces_detected"
      ? "#CDBF9D"
      : "#B9D0D8";

  return (
    <div className="space-y-3">
      {/* Circular Scanning Progress Gauge + Active Stage Readout */}
      <div className="glass-row flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0" aria-hidden="true">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke="rgba(245, 246, 246, 0.1)"
                strokeWidth="2.5"
              />
              <motion.circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={false}
                animate={{ strokeDashoffset: dashOffset }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.35, ease: ARCHITECTURAL_EASE }
                }
              />
            </svg>
            <span className="telemetry-num absolute inset-0 flex items-center justify-center text-[10px] font-medium text-[var(--text-primary)]">
              {progress}%
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)]">
              Biometric Pipeline
            </p>
            <p className="truncate text-[11px] text-[var(--text-secondary)]">
              {progress === 100
                ? "Verification complete"
                : progress >= 58
                ? "Face aligned clearly"
                : progress >= 24
                ? "Looking for your face"
                : "Turn on your camera to begin"}
            </p>
          </div>
        </div>
      </div>

      {/* 4-Stage Recognition Workflow Stepper */}
      {!compact ? (
        <ol
          aria-label="Recognition workflow stages"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {stages.map((stage) => {
            const isComplete = stage.status === "complete";
            const isActive = stage.status === "active";
            const isError = stage.status === "error";

            return (
              <li
                key={stage.id}
                className={`rounded-[10px] border px-2.5 py-2 transition-colors duration-200 ${
                  isComplete
                    ? "border-[#76C4A4]/35 bg-[#76C4A4]/[0.07]"
                    : isError
                    ? "border-[#DF848E]/35 bg-[#DF848E]/[0.08]"
                    : isActive
                    ? "border-[#B9D0D8]/38 bg-[#22272A]/85"
                    : "border-[var(--border-hairline)] bg-[#141719]/60"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="telemetry-num text-[10px] text-[var(--text-secondary)]">
                    0{stage.index}
                  </span>
                  {isComplete ? (
                    <Check
                      className="h-3 w-3 text-[#76C4A4]"
                      aria-hidden="true"
                    />
                  ) : isError ? (
                    <CircleAlert
                      className="h-3 w-3 text-[#DF848E]"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-[#B9D0D8]" : "bg-[#767E82]/45"
                      }`}
                    />
                  )}
                </div>
                <p className="mt-1 text-[11px] font-medium leading-snug text-[var(--text-primary)]">
                  {stage.label}
                </p>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
