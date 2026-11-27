import { describe, expect, it } from "vitest";
import {
  LEGACY_DLIB_DIMENSION,
  LEGACY_DLIB_MODEL_ID,
  TARGET_BIOMETRIC_CONTRACT,
  areTemplatesComparable,
  classifyStudentBiometricState,
  validateEmbeddingVector,
} from "@/domain/biometrics";
import {
  ARCFACE_112_DST_POINTS,
  SFACE_ONNX_TENSOR_SPEC,
  applySimilarityTransform2D,
  deriveFivePointsFromDetectorKeypoints,
  estimateSimilarityTransform2D,
  extractFivePointsFromFaceLandmarker,
  imageDataToOnnxFloat32Tensor,
} from "@/features/face-recognition/engine/alignment";
import {
  DEFAULT_MATCHER_CONFIG,
  l2Normalize,
  matchEmbeddingAgainstGallery,
} from "@/features/face-recognition/engine/matcher";
import { ProductionFaceRecognitionEngine } from "@/features/face-recognition/engine/production-adapter";
import { SyntheticTestRecognitionEngine } from "@/features/face-recognition/engine/synthetic-test-adapter";
import type {
  EnrollmentTemplate,
  RecognitionGallery,
} from "@/features/face-recognition/types";

function unitBasis(dim: number, index: number, secondaryIndex?: number, secondaryWeight = 0) {
  const raw = Array.from({ length: dim }, (_, i) => {
    if (i === index) return 1;
    if (secondaryIndex !== undefined && i === secondaryIndex) return secondaryWeight;
    return 0;
  });
  return l2Normalize(raw);
}

function makeTemplate(
  vector: number[],
  overrides: Partial<EnrollmentTemplate> = {}
): EnrollmentTemplate {
  return {
    modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
    modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
    preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
    embeddingDimension: vector.length,
    vector,
    ...overrides,
  };
}

describe("domain/biometrics, alignment, 1:N matcher & engines", () => {
  it("classifies legacy 128D dlib descriptors as needing re-enrollment", () => {
    const legacyVector = [Array.from({ length: LEGACY_DLIB_DIMENSION }, () => 0.1)];
    expect(
      classifyStudentBiometricState({
        activeTemplates: [],
        legacyFaceEmbeddings: legacyVector,
      })
    ).toBe("legacy_dlib_needs_reenroll");

    expect(
      classifyStudentBiometricState({
        activeTemplates: [
          {
            id: "tpl-1",
            studentId: "S1001",
            modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
            modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
            preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
            embeddingDimension: TARGET_BIOMETRIC_CONTRACT.expectedDimension,
            isActive: true,
            consentGrantedAt: "2026-11-25T00:00:00Z",
          },
        ],
        legacyFaceEmbeddings: legacyVector,
      })
    ).toBe("enrolled_v2");
  });

  it("never compares legacy 128D dlib vectors with new 128D SFace templates or mismatched versions", () => {
    expect(
      areTemplatesComparable(
        {
          modelId: LEGACY_DLIB_MODEL_ID,
          modelVersion: "1",
          embeddingDimension: 128,
        },
        {
          modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
          modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
          embeddingDimension: TARGET_BIOMETRIC_CONTRACT.expectedDimension,
        }
      )
    ).toBe(false);

    expect(
      areTemplatesComparable(
        {
          modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
          modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
          embeddingDimension: 128,
        },
        {
          modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
          modelVersion: "different-version",
          embeddingDimension: 128,
        }
      )
    ).toBe(false);
  });

  it("validates embedding vector dimensions, finiteness, and norm", () => {
    expect(validateEmbeddingVector([1, 0, 0], 3).valid).toBe(true);
    expect(validateEmbeddingVector([0, 0, 0], 3).valid).toBe(false);
    expect(validateEmbeddingVector([1, Number.NaN, 0], 3).valid).toBe(false);
    expect(validateEmbeddingVector([1, 0], 3).valid).toBe(false);
  });

  it("recovers exact 2D similarity alignment and rejects degenerate landmarks", () => {
    const angle = (22 * Math.PI) / 180;
    const scale = 2.4;
    const shiftX = 140;
    const shiftY = 85;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const syntheticSrc = ARCFACE_112_DST_POINTS.map((dst) => ({
      x: scale * (cos * dst.x - sin * dst.y) + shiftX,
      y: scale * (sin * dst.x + cos * dst.y) + shiftY,
    }));

    const transform = estimateSimilarityTransform2D(
      syntheticSrc,
      ARCFACE_112_DST_POINTS
    );
    expect(transform).not.toBeNull();

    if (transform) {
      syntheticSrc.forEach((srcPt, idx) => {
        const mapped = applySimilarityTransform2D(transform, srcPt);
        const expected = ARCFACE_112_DST_POINTS[idx]!;
        expect(Math.abs(mapped.x - expected.x)).toBeLessThan(1e-4);
        expect(Math.abs(mapped.y - expected.y)).toBeLessThan(1e-4);
      });
    }

    expect(
      estimateSimilarityTransform2D([
        { x: 10, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 10 },
      ])
    ).toBeNull();
  });

  it("extracts 5 alignment points from 478 iris landmarks, 468 fallback, and 6 detector keypoints", () => {
    const blankLandmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    blankLandmarks[468] = { x: 0.3, y: 0.4 };
    blankLandmarks[473] = { x: 0.7, y: 0.4 };
    blankLandmarks[1] = { x: 0.5, y: 0.55 };
    blankLandmarks[61] = { x: 0.35, y: 0.75 };
    blankLandmarks[291] = { x: 0.65, y: 0.75 };

    const pts478 = extractFivePointsFromFaceLandmarker(blankLandmarks, 200, 100, 50, 20);
    expect(pts478).not.toBeNull();
    expect(pts478?.[0]).toEqual({ x: 110, y: 60 });
    expect(pts478?.[1]).toEqual({ x: 190, y: 60 });
    expect(pts478?.[2]).toEqual({ x: 150, y: 75 });

    const landmarks468 = blankLandmarks.slice(0, 468);
    landmarks468[33] = { x: 0.25, y: 0.4 };
    landmarks468[133] = { x: 0.35, y: 0.4 };
    landmarks468[362] = { x: 0.65, y: 0.4 };
    landmarks468[263] = { x: 0.75, y: 0.4 };

    const pts468 = extractFivePointsFromFaceLandmarker(landmarks468, 200, 100);
    expect(pts468?.[0].x).toBeCloseTo(60);
    expect(pts468?.[1].x).toBeCloseTo(140);

    const detectorPts = deriveFivePointsFromDetectorKeypoints(
      [
        { x: 0.35, y: 0.4 },
        { x: 0.65, y: 0.4 },
        { x: 0.5, y: 0.55 },
        { x: 0.5, y: 0.75 },
      ],
      100,
      100
    );
    expect(detectorPts).not.toBeNull();
    expect(detectorPts?.[3].x).toBeLessThan(detectorPts![4].x);
  });

  it("converts 112x112 RGBA ImageData to planar NCHW [1, 3, 112, 112] RGB [0, 255] Float32 tensor", () => {
    const size = 112 * 112;
    const rgba = new Uint8ClampedArray(size * 4);
    rgba[0] = 210; // R
    rgba[1] = 120; // G
    rgba[2] = 45;  // B
    rgba[3] = 255; // A

    const tensor = imageDataToOnnxFloat32Tensor(
      { width: 112, height: 112, data: rgba },
      SFACE_ONNX_TENSOR_SPEC
    );

    expect(tensor.length).toBe(3 * size);
    expect(tensor[0]).toBe(210);
    expect(tensor[size]).toBe(120);
    expect(tensor[size * 2]).toBe(45);
  });

  it("enforces unknown, ambiguity margin, version matching, and multi-template 1:N matching", () => {
    const dim = TARGET_BIOMETRIC_CONTRACT.expectedDimension;
    const vecS1 = unitBasis(dim, 0);
    const vecS2 = unitBasis(dim, 1);
    const vecUnknown = unitBasis(dim, 2);

    const gallery: RecognitionGallery = {
      subjectId: 10,
      modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
      modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
      entries: [
        { studentId: "S1001", template: makeTemplate(vecS1) },
        {
          studentId: "S1001",
          template: makeTemplate(unitBasis(dim, 0, 3, 0.25)),
        },
        { studentId: "S1002", template: makeTemplate(vecS2) },
        {
          studentId: "S9999",
          template: makeTemplate(vecUnknown, { modelId: LEGACY_DLIB_MODEL_ID }),
        },
      ],
    };

    const exact = matchEmbeddingAgainstGallery(0, makeTemplate(vecS1), gallery);
    expect(exact).toMatchObject({ faceIndex: 0, studentId: "S1001", accepted: true });

    const unknown = matchEmbeddingAgainstGallery(1, makeTemplate(vecUnknown), gallery);
    expect(unknown).toMatchObject({
      faceIndex: 1,
      studentId: null,
      accepted: false,
      reason: "unknown",
    });

    const ambiguousProbe = makeTemplate(unitBasis(dim, 0, 1, 0.96));
    const ambiguous = matchEmbeddingAgainstGallery(2, ambiguousProbe, gallery, {
      ...DEFAULT_MATCHER_CONFIG,
      cosineThreshold: 0.363,
      ambiguityMargin: 0.08,
    });
    expect(ambiguous).toMatchObject({
      faceIndex: 2,
      studentId: null,
      accepted: false,
      reason: "ambiguous",
    });
  });

  it("marks ProductionFaceRecognitionEngine ready and rejects low-quality faces without WASM invocation", async () => {
    const dim = TARGET_BIOMETRIC_CONTRACT.expectedDimension;
    const prod = new ProductionFaceRecognitionEngine();
    expect(prod.isProductionMatchReady).toBe(true);

    const results = await prod.identifyFaces(
      [
        {
          faceIndex: 0,
          boundingBox: { originX: 0.1, originY: 0.1, width: 0.02, height: 0.02 },
          detectionConfidence: 0.4,
          keypoints: [],
          qualityOk: false,
          qualityIssue: "low_confidence",
        },
      ],
      {
        subjectId: 1,
        modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
        modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
        entries: [{ studentId: "S1001", template: makeTemplate(unitBasis(dim, 0)) }],
      }
    );

    expect(results).toEqual([
      {
        faceIndex: 0,
        studentId: null,
        confidence: null,
        accepted: false,
        reason: "low_quality",
      },
    ]);

    const synth = new SyntheticTestRecognitionEngine({
      embeddingResolver: (face) =>
        face.faceIndex === 0 ? unitBasis(dim, 0) : unitBasis(dim, 2),
    });
    await synth.initialize();

    const synthResults = await synth.identifyFaces(
      [
        {
          faceIndex: 0,
          boundingBox: { originX: 0.1, originY: 0.1, width: 0.3, height: 0.3 },
          detectionConfidence: 0.99,
          keypoints: [],
          qualityOk: true,
        },
        {
          faceIndex: 1,
          boundingBox: { originX: 0.5, originY: 0.1, width: 0.3, height: 0.3 },
          detectionConfidence: 0.97,
          keypoints: [],
          qualityOk: true,
        },
      ],
      {
        subjectId: 1,
        modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
        modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
        entries: [
          { studentId: "S1001", template: makeTemplate(unitBasis(dim, 0)) },
          { studentId: "S1002", template: makeTemplate(unitBasis(dim, 1)) },
        ],
      }
    );

    expect(synthResults[0]).toMatchObject({
      faceIndex: 0,
      studentId: "S1001",
      accepted: true,
    });
    expect(synthResults[1]).toMatchObject({
      faceIndex: 1,
      studentId: null,
      accepted: false,
      reason: "unknown",
    });
  });
});
