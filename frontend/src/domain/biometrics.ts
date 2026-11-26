export const LEGACY_DLIB_MODEL_ID = "dlib-resnet-v1";
export const LEGACY_DLIB_DIMENSION = 128;

/**
 * Approved Option A browser embedding contract:
 * OpenCV Zoo SFace (MobileFaceNet + SFace loss, Apache-2.0) running via onnxruntime-web WASM.
 * Never compare legacy 128D dlib descriptors against new-model templates despite matching dimensionality.
 */
export const TARGET_BIOMETRIC_CONTRACT = {
  modelId: "opencv-sface-mobilefacenet-onnx",
  modelVersion: "2021dec-int8@3d708243",
  preprocessingVersion: "mediapipe-5pt-arcface-112-rgb-255-v1",
  expectedDimension: 128,
} as const;

export type StudentBiometricState =
  | "enrolled_v2"
  | "legacy_dlib_needs_reenroll"
  | "not_enrolled";

export interface VersionedTemplateRecord {
  id: string;
  studentId: string;
  modelId: string;
  modelVersion: string;
  preprocessingVersion: string;
  embeddingDimension: number;
  isActive: boolean;
  consentGrantedAt: string;
}

export function hasLegacyDlibDescriptor(rawFaceEmbeddings: unknown): boolean {
  if (!Array.isArray(rawFaceEmbeddings) || rawFaceEmbeddings.length === 0) {
    return false;
  }
  const first = rawFaceEmbeddings[0];
  if (Array.isArray(first)) {
    return first.length === LEGACY_DLIB_DIMENSION;
  }
  return rawFaceEmbeddings.length === LEGACY_DLIB_DIMENSION;
}

export function classifyStudentBiometricState(input: {
  activeTemplates: readonly VersionedTemplateRecord[];
  legacyFaceEmbeddings: unknown;
  expectedModelId?: string;
}): StudentBiometricState {
  const targetModel = input.expectedModelId ?? TARGET_BIOMETRIC_CONTRACT.modelId;
  const hasCurrentTemplate = input.activeTemplates.some(
    (tpl) => tpl.isActive && tpl.modelId === targetModel && tpl.embeddingDimension > 0
  );

  if (hasCurrentTemplate) {
    return "enrolled_v2";
  }

  if (hasLegacyDlibDescriptor(input.legacyFaceEmbeddings)) {
    return "legacy_dlib_needs_reenroll";
  }

  return "not_enrolled";
}

export function validateEmbeddingVector(
  vector: readonly number[],
  expectedDimension: number
): { valid: true; l2Norm: number } | { valid: false; reason: string } {
  if (!Array.isArray(vector) || vector.length !== expectedDimension) {
    return {
      valid: false,
      reason: `Expected ${expectedDimension}-dimensional vector, got ${Array.isArray(vector) ? vector.length : "non-array"}.`,
    };
  }

  let sqSum = 0;
  for (let i = 0; i < vector.length; i += 1) {
    const val = vector[i];
    if (typeof val !== "number" || !Number.isFinite(val)) {
      return {
        valid: false,
        reason: `Vector contains non-finite value at index ${i}.`,
      };
    }
    sqSum += val * val;
  }

  const l2Norm = Math.sqrt(sqSum);
  if (l2Norm < 1e-6) {
    return {
      valid: false,
      reason: "Vector norm is near zero and cannot represent a valid face embedding.",
    };
  }

  return { valid: true, l2Norm };
}

export function areTemplatesComparable(
  a: { modelId: string; modelVersion: string; embeddingDimension: number },
  b: { modelId: string; modelVersion: string; embeddingDimension: number }
): boolean {
  if (a.modelId === LEGACY_DLIB_MODEL_ID || b.modelId === LEGACY_DLIB_MODEL_ID) {
    return false;
  }
  return (
    a.modelId === b.modelId &&
    a.modelVersion === b.modelVersion &&
    a.embeddingDimension === b.embeddingDimension
  );
}
