import {
  TARGET_BIOMETRIC_CONTRACT,
  validateEmbeddingVector,
} from "@/domain/biometrics";
import type {
  DetectedFace,
  EnrollmentTemplate,
  FaceRecognitionEngine,
  IdentificationResult,
  RecognitionGallery,
  RecognitionImageInput,
} from "../types";
import {
  DEFAULT_MATCHER_CONFIG,
  l2Normalize,
  matchEmbeddingAgainstGallery,
} from "./matcher";

export interface SyntheticDetectionFixture {
  detections: DetectedFace[];
}

export interface SyntheticTestEngineOptions {
  /** Maps faceIndex (or photo token via synthetic labels) to a deterministic embedding or matched studentId */
  detectResolver?: (image: RecognitionImageInput) => DetectedFace[];
  embeddingResolver?: (face: DetectedFace) => number[];
  /** Optional explicit cosine acceptance threshold for synthetic unit/E2E verification */
  cosineThreshold?: number;
  ambiguityMargin?: number;
  failInitialize?: boolean;
}

/**
 * Deterministic test-only FaceRecognitionEngine used exclusively inside
 * automated Vitest and Playwright harnesses (never enabled in production builds).
 * Reuses the shared 1:N cosine-similarity matcher so tests cover identical boundary rules.
 */
export class SyntheticTestRecognitionEngine implements FaceRecognitionEngine {
  readonly engineName = "synthetic-test-recognition-engine";
  readonly isProductionMatchReady = false;

  private initialized = false;
  private readonly options: SyntheticTestEngineOptions;

  constructor(options: SyntheticTestEngineOptions = {}) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    if (this.options.failInitialize) {
      throw new Error("Simulated AI model initialization failure.");
    }
    this.initialized = true;
  }

  async detectFaces(image: RecognitionImageInput): Promise<DetectedFace[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (this.options.detectResolver) {
      return this.options.detectResolver(image);
    }
    return [
      {
        faceIndex: 0,
        boundingBox: { originX: 0.25, originY: 0.2, width: 0.5, height: 0.6 },
        detectionConfidence: 0.98,
        keypoints: [
          { x: 0.4, y: 0.4, name: "right_eye" },
          { x: 0.6, y: 0.4, name: "left_eye" },
          { x: 0.5, y: 0.55, name: "nose_tip" },
        ],
        qualityOk: true,
        qualityIssue: "none",
      },
    ];
  }

  async createEnrollmentTemplate(face: DetectedFace): Promise<EnrollmentTemplate> {
    if (!face.qualityOk) {
      throw new Error(`Face failed quality gate: ${face.qualityIssue ?? "low_quality"}`);
    }

    const raw = this.options.embeddingResolver
      ? this.options.embeddingResolver(face)
      : Array.from(
          { length: TARGET_BIOMETRIC_CONTRACT.expectedDimension },
          (_, idx) => (idx === 0 ? 1 : 0)
        );

    const validation = validateEmbeddingVector(
      raw,
      TARGET_BIOMETRIC_CONTRACT.expectedDimension
    );
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const normalized = l2Normalize(raw);

    return {
      modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
      modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
      preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
      embeddingDimension: TARGET_BIOMETRIC_CONTRACT.expectedDimension,
      vector: normalized,
    };
  }

  async identifyFaces(
    faces: DetectedFace[],
    gallery: RecognitionGallery
  ): Promise<IdentificationResult[]> {
    const matcherConfig = {
      cosineThreshold:
        this.options.cosineThreshold ?? DEFAULT_MATCHER_CONFIG.cosineThreshold,
      ambiguityMargin:
        this.options.ambiguityMargin ?? DEFAULT_MATCHER_CONFIG.ambiguityMargin,
    };

    const results: IdentificationResult[] = [];
    for (const face of faces) {
      if (!face.qualityOk) {
        results.push({
          faceIndex: face.faceIndex,
          studentId: null,
          confidence: null,
          accepted: false,
          reason: "low_quality",
        });
        continue;
      }

      const probe = await this.createEnrollmentTemplate(face);
      results.push(
        matchEmbeddingAgainstGallery(face.faceIndex, probe, gallery, matcherConfig)
      );
    }

    return results;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }
}
