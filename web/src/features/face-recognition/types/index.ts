export type FaceQualityIssue =
  | "none"
  | "no_face"
  | "multiple_faces"
  | "low_confidence"
  | "face_too_small"
  | "blurred";

export interface NormalizedBoundingBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface FaceKeypoint {
  x: number;
  y: number;
  name?: string;
}

/** Normalized 3D facial landmark from MediaPipe FaceLandmarker (468/478 points). */
export interface FaceLandmark3D {
  x: number;
  y: number;
  z: number;
}

export interface DetectedFace {
  faceIndex: number;
  boundingBox: NormalizedBoundingBox;
  detectionConfidence: number;
  keypoints: FaceKeypoint[];
  landmarksCount?: number;
  /** Full-frame normalized [0..1] 3D facial landmarks from MediaPipe FaceLandmarker. */
  landmarks?: readonly FaceLandmark3D[];
  /** Face-ROI normalized [0..1] 3D facial landmarks suitable for centered 3D mesh mapping. */
  roiLandmarks?: readonly FaceLandmark3D[];
  qualityOk: boolean;
  qualityIssue?: FaceQualityIssue;
  /** Transient cropped image buffer used strictly in memory during inference */
  cropImageData?: ImageData;
}

export interface LiveScanFace {
  boundingBox: NormalizedBoundingBox;
  detectionConfidence: number;
  keypoints: readonly FaceKeypoint[];
  landmarks?: readonly FaceLandmark3D[];
  roiLandmarks?: readonly FaceLandmark3D[];
  landmarksCount: number;
}

export interface LiveScanFrameResult {
  faces: readonly LiveScanFace[];
  processingMs: number;
}

export interface EnrollmentTemplate {
  modelId: string;
  modelVersion: string;
  preprocessingVersion: string;
  embeddingDimension: number;
  vector: number[];
}

export interface RecognitionGalleryEntry {
  studentId: string;
  template: EnrollmentTemplate;
}

export interface RecognitionGallery {
  subjectId: number;
  modelId: string;
  modelVersion: string;
  entries: readonly RecognitionGalleryEntry[];
}

export interface IdentificationResult {
  faceIndex: number;
  studentId: string | null;
  confidence: number | null;
  accepted: boolean;
  reason?: "unknown" | "low_quality" | "ambiguous";
}

export type RecognitionImageInput =
  | ImageData
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement;

export interface FaceRecognitionEngine {
  readonly engineName: string;
  readonly isProductionMatchReady: boolean;
  initialize(): Promise<void>;
  detectFaces(image: RecognitionImageInput): Promise<DetectedFace[]>;
  createEnrollmentTemplate(face: DetectedFace): Promise<EnrollmentTemplate>;
  identifyFaces(
    faces: DetectedFace[],
    gallery: RecognitionGallery
  ): Promise<IdentificationResult[]>;
  dispose(): Promise<void>;
}

export class AiCompatibilityGateError extends Error {
  readonly code = "AI_COMPATIBILITY_GATE_PENDING";

  constructor(message?: string) {
    super(
      message ??
        "Production 1:N embedding matching is halted at BLK-01 pending owner decision on FaceX/FaceNet-ArcFace compatibility (see docs/implementation/BLOCKERS.md)."
    );
    this.name = "AiCompatibilityGateError";
  }
}
