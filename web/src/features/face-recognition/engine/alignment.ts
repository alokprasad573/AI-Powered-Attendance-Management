import type { FaceKeypoint } from "../types";

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Orientation-preserving 2D similarity matrix:
 *   x' = a * x - b * y + tx
 *   y' = b * x + a * y + ty
 * Matches CanvasRenderingContext2D.setTransform(a, b, -b, a, tx, ty).
 */
export interface SimilarityTransform2D {
  a: number;
  b: number;
  tx: number;
  ty: number;
}

export interface OnnxTensorSpec {
  width: number;
  height: number;
  channelOrder: "RGB" | "BGR";
  normalization: "0_255" | "minus1_1";
}

export const SFACE_ONNX_TENSOR_SPEC: OnnxTensorSpec = {
  width: 112,
  height: 112,
  channelOrder: "RGB",
  normalization: "0_255",
};

/**
 * Canonical 5-point destination template verified in OpenCV `face_recognize.cpp`
 * (`FaceRecognizerSFImpl::getSimilarityTransformMatrix`):
 * [viewerLeftEye, viewerRightEye, noseTip, viewerLeftMouth, viewerRightMouth].
 */
export const ARCFACE_112_DST_POINTS: readonly [
  Point2D,
  Point2D,
  Point2D,
  Point2D,
  Point2D,
] = [
  { x: 38.2946, y: 51.6963 },
  { x: 73.5318, y: 51.5014 },
  { x: 56.0252, y: 71.7366 },
  { x: 41.5493, y: 92.3655 },
  { x: 70.7299, y: 92.2041 },
];

export type FivePointLandmarks = readonly [
  Point2D,
  Point2D,
  Point2D,
  Point2D,
  Point2D,
];

function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function toPixelPoint(
  lm: { x: number; y: number },
  width: number,
  height: number,
  offsetX: number,
  offsetY: number
): Point2D {
  return {
    x: offsetX + lm.x * width,
    y: offsetY + lm.y * height,
  };
}

/**
 * Maps MediaPipe FaceLandmarker 468/478 normalized landmarks to the 5 canonical
 * ArcFace/SFace keypoints in full-image pixel coordinates.
 *
 * Uses iris centers (468, 473) when 478 refined landmarks are present, falling back
 * to eye-corner midpoints (33/133 and 362/263), plus nose tip (1) and mouth corners (61, 291).
 */
export function extractFivePointsFromFaceLandmarker(
  landmarks: ReadonlyArray<{ x: number; y: number }>,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0
): FivePointLandmarks | null {
  if (landmarks.length < 363 || width <= 0 || height <= 0) {
    return null;
  }

  const p1 = landmarks[1];
  const p61 = landmarks[61];
  const p291 = landmarks[291];
  const p33 = landmarks[33];
  const p133 = landmarks[133];
  const p362 = landmarks[362];
  const p263 = landmarks[263];

  if (!p1 || !p61 || !p291 || !p33 || !p133 || !p362 || !p263) {
    return null;
  }

  const leftIris = landmarks[468];
  const rightIris = landmarks[473];

  const leftEye = leftIris
    ? toPixelPoint(leftIris, width, height, offsetX, offsetY)
    : midpoint(
        toPixelPoint(p33, width, height, offsetX, offsetY),
        toPixelPoint(p133, width, height, offsetX, offsetY)
      );

  const rightEye = rightIris
    ? toPixelPoint(rightIris, width, height, offsetX, offsetY)
    : midpoint(
        toPixelPoint(p362, width, height, offsetX, offsetY),
        toPixelPoint(p263, width, height, offsetX, offsetY)
      );

  const nose = toPixelPoint(p1, width, height, offsetX, offsetY);
  const leftMouth = toPixelPoint(p61, width, height, offsetX, offsetY);
  const rightMouth = toPixelPoint(p291, width, height, offsetX, offsetY);

  return [leftEye, rightEye, nose, leftMouth, rightMouth];
}

/**
 * Fallback 5-point estimation from MediaPipe FaceDetector 6 normalized keypoints
 * ([rightEye, leftEye, noseTip, mouthCenter, ...]) when faces are too small/distant
 * for FaceLandmarker.
 */
export function deriveFivePointsFromDetectorKeypoints(
  keypoints: readonly FaceKeypoint[],
  width: number,
  height: number
): FivePointLandmarks | null {
  if (keypoints.length < 4 || width <= 0 || height <= 0) {
    return null;
  }

  const kp0 = keypoints[0];
  const kp1 = keypoints[1];
  const kpNose = keypoints[2];
  const kpMouth = keypoints[3];
  if (!kp0 || !kp1 || !kpNose || !kpMouth) {
    return null;
  }

  const e0: Point2D = { x: kp0.x * width, y: kp0.y * height };
  const e1: Point2D = { x: kp1.x * width, y: kp1.y * height };
  const leftEye = e0.x <= e1.x ? e0 : e1;
  const rightEye = e0.x <= e1.x ? e1 : e0;

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const eyeDist = Math.hypot(dx, dy);
  if (!Number.isFinite(eyeDist) || eyeDist < 2) {
    return null;
  }

  const ux = dx / eyeDist;
  const uy = dy / eyeDist;
  const mouthCenter: Point2D = { x: kpMouth.x * width, y: kpMouth.y * height };
  const halfMouthWidth = eyeDist * 0.42;

  return [
    leftEye,
    rightEye,
    { x: kpNose.x * width, y: kpNose.y * height },
    {
      x: mouthCenter.x - ux * halfMouthWidth,
      y: mouthCenter.y - uy * halfMouthWidth,
    },
    {
      x: mouthCenter.x + ux * halfMouthWidth,
      y: mouthCenter.y + uy * halfMouthWidth,
    },
  ];
}

/**
 * Closed-form least-squares solver for an orientation-preserving 2D similarity transform
 * mapping `srcPoints` onto `dstPoints`. Returns `null` for degenerate inputs.
 */
export function estimateSimilarityTransform2D(
  srcPoints: readonly Point2D[],
  dstPoints: readonly Point2D[] = ARCFACE_112_DST_POINTS
): SimilarityTransform2D | null {
  if (srcPoints.length < 2 || srcPoints.length !== dstPoints.length) {
    return null;
  }

  const n = srcPoints.length;
  let sumSx = 0;
  let sumSy = 0;
  let sumDx = 0;
  let sumDy = 0;

  for (let i = 0; i < n; i += 1) {
    const s = srcPoints[i];
    const d = dstPoints[i];
    if (
      !s ||
      !d ||
      !Number.isFinite(s.x) ||
      !Number.isFinite(s.y) ||
      !Number.isFinite(d.x) ||
      !Number.isFinite(d.y)
    ) {
      return null;
    }
    sumSx += s.x;
    sumSy += s.y;
    sumDx += d.x;
    sumDy += d.y;
  }

  const meanSx = sumSx / n;
  const meanSy = sumSy / n;
  const meanDx = sumDx / n;
  const meanDy = sumDy / n;

  let denom = 0;
  let numA = 0;
  let numB = 0;

  for (let i = 0; i < n; i += 1) {
    const s = srcPoints[i]!;
    const d = dstPoints[i]!;
    const px = s.x - meanSx;
    const py = s.y - meanSy;
    const qx = d.x - meanDx;
    const qy = d.y - meanDy;

    denom += px * px + py * py;
    numA += px * qx + py * qy;
    numB += px * qy - py * qx;
  }

  if (!Number.isFinite(denom) || denom < 1e-6) {
    return null;
  }

  const a = numA / denom;
  const b = numB / denom;
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.hypot(a, b) < 1e-6) {
    return null;
  }

  const tx = meanDx - (a * meanSx - b * meanSy);
  const ty = meanDy - (b * meanSx + a * meanSy);

  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    return null;
  }

  return { a, b, tx, ty };
}

export function applySimilarityTransform2D(
  transform: SimilarityTransform2D,
  point: Point2D
): Point2D {
  return {
    x: transform.a * point.x - transform.b * point.y + transform.tx,
    y: transform.b * point.x + transform.a * point.y + transform.ty,
  };
}

/**
 * Warps a source face onto a transient 112x112 HTMLCanvasElement in browser memory
 * and extracts its raw RGBA ImageData. Zero pixels leave the browser.
 */
export function warpFaceTo112ImageData(
  sourceCanvas: HTMLCanvasElement,
  transform: SimilarityTransform2D,
  size = 112
): ImageData | null {
  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = size;
  dstCanvas.height = size;
  const ctx = dstCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(
    transform.a,
    transform.b,
    -transform.b,
    transform.a,
    transform.tx,
    transform.ty
  );
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, size, size);
  dstCanvas.width = 0;
  dstCanvas.height = 0;
  return imageData;
}

/**
 * Converts RGBA `ImageData` (width * height * 4) into a planar NCHW Float32Array
 * `[1, 3, height, width]` matching the verified ONNX model contract.
 */
export function imageDataToOnnxFloat32Tensor(
  imageData: Pick<ImageData, "data" | "width" | "height">,
  spec: OnnxTensorSpec = SFACE_ONNX_TENSOR_SPEC
): Float32Array {
  if (imageData.width !== spec.width || imageData.height !== spec.height) {
    throw new Error(
      `Expected ${spec.width}x${spec.height} aligned face crop, got ${imageData.width}x${imageData.height}.`
    );
  }

  const pixelCount = spec.width * spec.height;
  const tensor = new Float32Array(3 * pixelCount);
  const rgba = imageData.data;

  const ch0Offset = 0;
  const ch1Offset = pixelCount;
  const ch2Offset = pixelCount * 2;
  const isRgb = spec.channelOrder === "RGB";
  const normalizeMinusOneToOne = spec.normalization === "minus1_1";

  for (let i = 0; i < pixelCount; i += 1) {
    const rgbaIdx = i * 4;
    const r = rgba[rgbaIdx] ?? 0;
    const g = rgba[rgbaIdx + 1] ?? 0;
    const b = rgba[rgbaIdx + 2] ?? 0;

    const c0 = isRgb ? r : b;
    const c1 = g;
    const c2 = isRgb ? b : r;

    if (normalizeMinusOneToOne) {
      tensor[ch0Offset + i] = (c0 - 127.5) / 127.5;
      tensor[ch1Offset + i] = (c1 - 127.5) / 127.5;
      tensor[ch2Offset + i] = (c2 - 127.5) / 127.5;
    } else {
      tensor[ch0Offset + i] = c0;
      tensor[ch1Offset + i] = c1;
      tensor[ch2Offset + i] = c2;
    }
  }

  return tensor;
}
