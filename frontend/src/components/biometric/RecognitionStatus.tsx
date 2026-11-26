"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ARCHITECTURAL_EASE } from "@/lib/motion";
import {
  INTERACTION_STATE_LABELS,
  type BiometricInteractionState,
  type BiometricTelemetrySnapshot,
} from "./types";

function getBadgeVariant(
  state: BiometricInteractionState
): "default" | "present" | "override" | "absent" | "neutral" {
  switch (state) {
    case "standby":
      return "neutral";
    case "recognition_successful":
      return "present";
    case "face_detected":
    case "analyzing_landmarks":
    case "matching_identity":
    case "camera_active":
      return "default";
    case "multiple_faces_detected":
    case "no_face_detected":
    case "camera_initializing":
      return "override";
    case "camera_permission_required":
    case "camera_error":
    case "recognition_failed":
      return "absent";
  }
}

interface RecognitionStatusProps {
  telemetry: BiometricTelemetrySnapshot;
}

export function RecognitionStatus({ telemetry }: RecognitionStatusProps) {
  const statusText = INTERACTION_STATE_LABELS[telemetry.state];
  const confidenceValue =
    telemetry.matchConfidencePercent ?? telemetry.detectionConfidencePercent;

  return (
    <div className="space-y-2.5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={telemetry.state}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: ARCHITECTURAL_EASE }}
          >
            <Badge variant={getBadgeVariant(telemetry.state)}>
              {statusText}
            </Badge>
          </motion.div>
        </AnimatePresence>

        {telemetry.processingMs !== null ? (
          <span className="telemetry-num text-[11px] text-[var(--text-secondary)]">
            {Math.round(telemetry.processingMs)} ms/frame
          </span>
        ) : null}
      </div>

      {/* Real Model Telemetry Grid — never shows fabricated metrics */}
      <dl className="grid grid-cols-3 gap-2">
        <div className="glass-row rounded-[10px] px-3 py-2">
          <dt className="text-[11px] text-[var(--text-secondary)]">Faces</dt>
          <dd className="telemetry-num mt-0.5 text-sm font-medium text-[var(--text-primary)]">
            {telemetry.detectedFacesCount}
          </dd>
        </div>
        <div className="glass-row rounded-[10px] px-3 py-2">
          <dt className="text-[11px] text-[var(--text-secondary)]">Landmarks</dt>
          <dd className="telemetry-num mt-0.5 text-sm font-medium text-[var(--accent-primary)]">
            {telemetry.landmarksCount ? `${telemetry.landmarksCount} pts` : "—"}
          </dd>
        </div>
        <div className="glass-row rounded-[10px] px-3 py-2">
          <dt className="text-[11px] text-[var(--text-secondary)]">Confidence</dt>
          <dd className="telemetry-num mt-0.5 text-sm font-medium text-[var(--accent-highlight)]">
            {typeof confidenceValue === "number"
              ? `${confidenceValue.toFixed(1)}%`
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
        <span className="truncate">{telemetry.resultLabel}</span>
        {telemetry.lastRecognitionLabel ? (
          <span className="telemetry-num shrink-0 text-[11px] text-[var(--accent-secondary)]">
            {telemetry.lastRecognitionLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
