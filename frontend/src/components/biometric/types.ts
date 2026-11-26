import type { FaceLandmark3D, LiveScanFace } from "@/features/face-recognition/types";

/**
 * Exhaustive 11 real biometric scanner interaction states.
 * Never faked — always driven by actual browser camera & MediaPipe / server state.
 */
export type BiometricInteractionState =
  | "standby"
  | "camera_initializing"
  | "camera_permission_required"
  | "camera_active"
  | "face_detected"
  | "analyzing_landmarks"
  | "matching_identity"
  | "recognition_successful"
  | "recognition_failed"
  | "no_face_detected"
  | "multiple_faces_detected"
  | "camera_error";

export type WorkflowStageId =
  | "face_detection"
  | "landmark_analysis"
  | "identity_matching"
  | "recognition_complete";

export type WorkflowStageStatus = "idle" | "active" | "complete" | "error";

export interface BiometricTelemetrySnapshot {
  state: BiometricInteractionState;
  detectedFacesCount: number;
  landmarksCount: number | null;
  /** Supplied strictly by the real MediaPipe / SFace model, or null when unavailable. */
  detectionConfidencePercent: number | null;
  /** Supplied strictly by actual server/gallery identity matching, or null in preview mode. */
  matchConfidencePercent: number | null;
  /** Human-readable result grounded in real detection/match state (never fabricated). */
  resultLabel: string;
  /** Timestamp or label of last real completed scan/verification in this session. */
  lastRecognitionLabel: string | null;
  processingMs: number | null;
}

export interface LiveMeshBridge {
  /** Real MediaPipe 468/478 ROI-normalized 3D landmarks (mutated in-place per frame; zero React re-renders). */
  landmarks: readonly FaceLandmark3D[] | null;
  /** Latest detected faces in full-frame normalized coordinates for 2D overlay drawing. */
  faces: readonly LiveScanFace[];
  /** True when live MediaPipe tracking is actively running on an open camera stream. */
  active: boolean;
}

export const INTERACTION_STATE_LABELS: Record<BiometricInteractionState, string> = {
  standby: "Standby",
  camera_initializing: "Camera Initializing",
  camera_permission_required: "Camera Permission Required",
  camera_active: "Camera Active",
  face_detected: "Face Detected",
  analyzing_landmarks: "Analyzing Landmarks",
  matching_identity: "Matching Identity",
  recognition_successful: "Recognition Successful",
  recognition_failed: "Recognition Failed",
  no_face_detected: "No Face Detected",
  multiple_faces_detected: "Multiple Faces Detected",
  camera_error: "Camera Error",
};

export interface WorkflowStageDescriptor {
  id: WorkflowStageId;
  index: number;
  label: string;
  status: WorkflowStageStatus;
}

/** Pure derivation of the 4 recognition workflow stages from the real interaction state. */
export function deriveWorkflowStages(
  state: BiometricInteractionState,
  landmarksCount: number | null
): WorkflowStageDescriptor[] {
  const hasLandmarks = typeof landmarksCount === "number" && landmarksCount > 0;

  let detection: WorkflowStageStatus = "idle";
  let landmarks: WorkflowStageStatus = "idle";
  let matching: WorkflowStageStatus = "idle";
  let complete: WorkflowStageStatus = "idle";

  switch (state) {
    case "standby":
      break;
    case "camera_initializing":
    case "camera_active":
      detection = "active";
      break;
    case "no_face_detected":
      detection = "active";
      break;
    case "multiple_faces_detected":
    case "camera_permission_required":
    case "camera_error":
      detection = "error";
      break;
    case "face_detected":
      detection = "complete";
      landmarks = hasLandmarks ? "complete" : "active";
      break;
    case "analyzing_landmarks":
      detection = "complete";
      landmarks = "active";
      break;
    case "matching_identity":
      detection = "complete";
      landmarks = "complete";
      matching = "active";
      break;
    case "recognition_successful":
      detection = "complete";
      landmarks = "complete";
      matching = "complete";
      complete = "complete";
      break;
    case "recognition_failed":
      detection = "complete";
      landmarks = hasLandmarks ? "complete" : "error";
      matching = "error";
      complete = "error";
      break;
  }

  return [
    { id: "face_detection", index: 1, label: "Face Detection", status: detection },
    {
      id: "landmark_analysis",
      index: 2,
      label: "Facial Landmark Analysis",
      status: landmarks,
    },
    { id: "identity_matching", index: 3, label: "Identity Matching", status: matching },
    {
      id: "recognition_complete",
      index: 4,
      label: "Recognition Complete",
      status: complete,
    },
  ];
}

/** Pure derivation of circular scanner progress (0..100) strictly from real pipeline state. */
export function deriveScannerProgressPercent(
  state: BiometricInteractionState,
  landmarksCount: number | null
): number {
  const hasLandmarks = typeof landmarksCount === "number" && landmarksCount > 0;
  switch (state) {
    case "standby":
    case "camera_permission_required":
    case "camera_error":
      return 0;
    case "camera_initializing":
      return 12;
    case "camera_active":
    case "no_face_detected":
      return 24;
    case "multiple_faces_detected":
      return 32;
    case "face_detected":
      return hasLandmarks ? 62 : 42;
    case "analyzing_landmarks":
      return 58;
    case "matching_identity":
      return 84;
    case "recognition_successful":
      return 100;
    case "recognition_failed":
      return hasLandmarks ? 72 : 35;
  }
}
