"use client";

import type {
  DetectedFace,
  EnrollmentTemplate,
  FaceRecognitionEngine,
  IdentificationResult,
  RecognitionGallery,
  RecognitionImageInput,
} from "../types";
import { matchEmbeddingAgainstGallery } from "./matcher";
import { MediaPipeFacePipeline } from "./mediapipe-detector";
import { OnnxFaceEmbedder } from "./onnx-embedder";

/**
 * Production Option A browser recognition adapter:
 * - Face Detection & 5-Point Alignment: @mediapipe/tasks-vision (FaceDetector + FaceLandmarker)
 * - Face Embedding Extraction: Apache-2.0 OpenCV SFace MobileFaceNet via onnxruntime-web WASM
 * - 1:N Student Identification: Subject-scoped L2 cosine similarity with unknown & ambiguity rejection
 */
export class ProductionFaceRecognitionEngine implements FaceRecognitionEngine {
  readonly engineName = "mediapipe-detector-landmarker + onnx-sface-cosine";
  readonly isProductionMatchReady = true;

  private readonly detector = new MediaPipeFacePipeline();
  private readonly embedder = new OnnxFaceEmbedder();

  async initialize(): Promise<void> {
    await Promise.all([
      this.detector.initialize({ enableLandmarker: true }),
      this.embedder.initialize(),
    ]);
  }

  async detectFaces(image: RecognitionImageInput): Promise<DetectedFace[]> {
    return this.detector.detectFaces(image);
  }

  async createEnrollmentTemplate(
    face: DetectedFace
  ): Promise<EnrollmentTemplate> {
    if (!face.qualityOk || !face.cropImageData) {
      throw new Error(
        `Face crop cannot generate biometric template (${face.qualityIssue ?? "low_quality"}).`
      );
    }

    return this.embedder.extractEmbedding(face.cropImageData);
  }

  async identifyFaces(
    faces: DetectedFace[],
    gallery: RecognitionGallery
  ): Promise<IdentificationResult[]> {
    const results: IdentificationResult[] = [];

    for (const face of faces) {
      if (!face.qualityOk || !face.cropImageData) {
        results.push({
          faceIndex: face.faceIndex,
          studentId: null,
          confidence: null,
          accepted: false,
          reason: "low_quality",
        });
        continue;
      }

      const probe = await this.embedder.extractEmbedding(face.cropImageData);
      results.push(matchEmbeddingAgainstGallery(face.faceIndex, probe, gallery));
    }

    return results;
  }

  async dispose(): Promise<void> {
    await Promise.all([this.detector.dispose(), this.embedder.dispose()]);
  }
}
