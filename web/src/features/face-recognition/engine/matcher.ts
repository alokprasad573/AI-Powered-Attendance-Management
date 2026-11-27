import { areTemplatesComparable } from "@/domain/biometrics";
import type {
  EnrollmentTemplate,
  IdentificationResult,
  RecognitionGallery,
} from "../types";

export interface MatcherConfig {
  /** Minimum L2-normalized cosine similarity required to accept top-1 match (SFace official default: 0.363). */
  cosineThreshold: number;
  /** Minimum margin between top-1 and top-2 distinct student similarities to avoid ambiguous false accepts. */
  ambiguityMargin: number;
}

/**
 * Calibrated starting defaults verified from OpenCV Zoo SFace (`sface.py` `_threshold_cosine = 0.363`)
 * combined with an explicit 0.08 ambiguity separation guard across 1:N classroom rosters.
 */
export const DEFAULT_MATCHER_CONFIG: MatcherConfig = {
  cosineThreshold: 0.363,
  ambiguityMargin: 0.08,
};

export function l2Normalize(vector: readonly number[]): number[] {
  let sqSum = 0;
  for (let i = 0; i < vector.length; i += 1) {
    const v = vector[i] ?? 0;
    sqSum += v * v;
  }
  const norm = Math.sqrt(sqSum);
  if (!Number.isFinite(norm) || norm < 1e-12) {
    throw new Error("Cannot L2-normalize a zero-norm or non-finite vector.");
  }
  return vector.map((v) => v / norm);
}

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[]
): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

/**
 * Matches a single versioned probe embedding strictly against the subject-scoped
 * enrolled gallery using L2 cosine similarity, unknown rejection, and top-1 vs top-2
 * ambiguity margin rejection. Supports multiple active templates per student by taking
 * the maximum similarity per studentId.
 */
export function matchEmbeddingAgainstGallery(
  faceIndex: number,
  probe: EnrollmentTemplate,
  gallery: RecognitionGallery,
  config: MatcherConfig = DEFAULT_MATCHER_CONFIG
): IdentificationResult {
  if (gallery.entries.length === 0) {
    return {
      faceIndex,
      studentId: null,
      confidence: null,
      accepted: false,
      reason: "unknown",
    };
  }

  const bestPerStudent = new Map<string, number>();

  for (const entry of gallery.entries) {
    if (!areTemplatesComparable(probe, entry.template)) {
      continue;
    }
    const similarity = cosineSimilarity(probe.vector, entry.template.vector);
    const existing = bestPerStudent.get(entry.studentId);
    if (existing === undefined || similarity > existing) {
      bestPerStudent.set(entry.studentId, similarity);
    }
  }

  if (bestPerStudent.size === 0) {
    return {
      faceIndex,
      studentId: null,
      confidence: null,
      accepted: false,
      reason: "unknown",
    };
  }

  const ranked = Array.from(bestPerStudent.entries())
    .map(([studentId, similarity]) => ({ studentId, similarity }))
    .sort((a, b) => b.similarity - a.similarity);

  const top1 = ranked[0];
  const top2 = ranked[1];

  if (!top1 || top1.similarity < config.cosineThreshold) {
    return {
      faceIndex,
      studentId: null,
      confidence: top1 ? clampScore(top1.similarity) : null,
      accepted: false,
      reason: "unknown",
    };
  }

  if (top2 && top1.similarity - top2.similarity < config.ambiguityMargin) {
    return {
      faceIndex,
      studentId: null,
      confidence: clampScore(top1.similarity),
      accepted: false,
      reason: "ambiguous",
    };
  }

  return {
    faceIndex,
    studentId: top1.studentId,
    confidence: clampScore(top1.similarity),
    accepted: true,
  };
}
