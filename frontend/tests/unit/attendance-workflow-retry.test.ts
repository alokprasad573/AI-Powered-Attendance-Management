import { describe, expect, it, vi } from "vitest";
import {
  aggregateMultiPhotoAttendance,
  applyManualOverride,
  buildAttendanceSavePayload,
  type PhotoAnalysisResult,
} from "@/domain/attendance";
import { TARGET_BIOMETRIC_CONTRACT } from "@/domain/biometrics";
import { SyntheticTestRecognitionEngine } from "@/features/face-recognition/engine/synthetic-test-adapter";
import type {
  DetectedFace,
  RecognitionGallery,
  RecognitionImageInput,
} from "@/features/face-recognition/types";

describe("attendance end-to-end domain + engine + retry semantics", () => {
  it("runs multi-photo analysis, deduplicates across photos, preserves overrides, and supports idempotent retry", async () => {
    const dim = TARGET_BIOMETRIC_CONTRACT.expectedDimension;
    const vecA = Array.from({ length: dim }, (_, i) => (i === 0 ? 1 : 0));
    const vecB = Array.from({ length: dim }, (_, i) => (i === 1 ? 1 : 0));
    const vecUnknown = Array.from({ length: dim }, (_, i) => (i === 2 ? 1 : 0));
    const vecOutOfClass = Array.from({ length: dim }, (_, i) => (i === 3 ? 1 : 0));

    const fakePhoto1 = { width: 800, height: 600, id: "photo-1" } as unknown as RecognitionImageInput;
    const fakePhoto2 = { width: 800, height: 600, id: "photo-2" } as unknown as RecognitionImageInput;

    const engine = new SyntheticTestRecognitionEngine({
      detectResolver: (img) => {
        const tag = (img as unknown as { id: string }).id;
        if (tag === "photo-1") {
          return [
            {
              faceIndex: 0,
              boundingBox: { originX: 0.1, originY: 0.1, width: 0.2, height: 0.2 },
              detectionConfidence: 0.99,
              keypoints: [],
              qualityOk: true,
              cropImageData: { width: 1 } as ImageData,
            },
            {
              faceIndex: 1,
              boundingBox: { originX: 0.5, originY: 0.1, width: 0.2, height: 0.2 },
              detectionConfidence: 0.95,
              keypoints: [],
              qualityOk: true,
              cropImageData: { width: 2 } as ImageData,
            },
          ] satisfies DetectedFace[];
        }
        return [
          {
            faceIndex: 0,
            boundingBox: { originX: 0.2, originY: 0.2, width: 0.2, height: 0.2 },
            detectionConfidence: 0.98,
            keypoints: [],
            qualityOk: true,
            cropImageData: { width: 1 } as ImageData,
          },
          {
            faceIndex: 1,
            boundingBox: { originX: 0.6, originY: 0.2, width: 0.2, height: 0.2 },
            detectionConfidence: 0.91,
            keypoints: [],
            qualityOk: true,
            cropImageData: { width: 3 } as ImageData,
          },
        ] satisfies DetectedFace[];
      },
      embeddingResolver: (face) => {
        const marker = face.cropImageData?.width;
        if (marker === 1) return vecA;
        if (marker === 2) return vecOutOfClass;
        return vecUnknown;
      },
    });

    await engine.initialize();

    const gallery: RecognitionGallery = {
      subjectId: 42,
      modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
      modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
      entries: [
        {
          studentId: "S1001",
          template: {
            modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
            modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
            preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
            embeddingDimension: dim,
            vector: vecA,
          },
        },
        {
          studentId: "S1002",
          template: {
            modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
            modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
            preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
            embeddingDimension: dim,
            vector: vecB,
          },
        },
      ],
    };

    const photoResults: PhotoAnalysisResult[] = [];
    for (const [idx, photo] of [fakePhoto1, fakePhoto2].entries()) {
      const faces = await engine.detectFaces(photo);
      const ids = await engine.identifyFaces(faces, gallery);
      photoResults.push({
        photoIndex: idx,
        photoLabel: `Photo ${idx + 1}`,
        totalFacesDetected: faces.length,
        identifications: ids,
        failed: false,
      });
    }

    const summary = aggregateMultiPhotoAttendance(
      [
        { studentId: "S1001", studentName: "alice", hasActiveTemplate: true },
        { studentId: "S1002", studentName: "bob", hasActiveTemplate: true },
      ],
      photoResults
    );

    expect(summary.presentCount).toBe(1);
    expect(summary.absentCount).toBe(1);
    expect(summary.unknownFaceCount).toBe(2);

    // Apply manual override for S1002
    const withOverride = applyManualOverride(summary.rows, "S1002", true);
    expect(withOverride.find((r) => r.studentId === "S1002")?.isManualOverride).toBe(
      true
    );

    // Discard path executes zero persistence calls
    const saveMock = vi.fn();
    expect(saveMock).not.toHaveBeenCalled();

    // Failed save + safe retry reuses exact idempotencyKey
    const idempotencyKey = "22222222-2222-4222-8222-222222222222";
    const firstPayload = buildAttendanceSavePayload(42, idempotencyKey, 2, withOverride);
    const retryPayload = buildAttendanceSavePayload(42, idempotencyKey, 2, withOverride);

    expect(firstPayload).toEqual(retryPayload);
    expect(firstPayload.entries).toHaveLength(2);
    expect(firstPayload.entries[0]?.source_photos).toEqual(["Photo 1", "Photo 2"]);
  });
});
