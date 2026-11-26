"use client";

import type {
  FaceDetector,
  FaceLandmarker,
} from "@mediapipe/tasks-vision";
import type {
  DetectedFace,
  FaceKeypoint,
  FaceLandmark3D,
  LiveScanFace,
  LiveScanFrameResult,
  RecognitionImageInput,
} from "../types";
import {
  ARCFACE_112_DST_POINTS,
  deriveFivePointsFromDetectorKeypoints,
  estimateSimilarityTransform2D,
  extractFivePointsFromFaceLandmarker,
  warpFaceTo112ImageData,
} from "./alignment";

const MEDIAPIPE_WASM_BASE =
  process.env.NEXT_PUBLIC_MEDIAPIPE_WASM_URL?.trim() ||
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";

const FACE_DETECTOR_MODEL_URL =
  process.env.NEXT_PUBLIC_MEDIAPIPE_FACE_DETECTOR_MODEL?.trim() ||
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

const FACE_LANDMARKER_MODEL_URL =
  process.env.NEXT_PUBLIC_MEDIAPIPE_FACE_LANDMARKER_MODEL?.trim() ||
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function getInputDimensions(image: RecognitionImageInput): {
  width: number;
  height: number;
} {
  if (image instanceof HTMLVideoElement) {
    return {
      width: image.videoWidth || image.clientWidth || 1,
      height: image.videoHeight || image.clientHeight || 1,
    };
  }
  if (image instanceof HTMLImageElement) {
    return {
      width: image.naturalWidth || image.width || 1,
      height: image.naturalHeight || image.height || 1,
    };
  }
  return {
    width: image.width || 1,
    height: image.height || 1,
  };
}

function drawInputToCanvas(
  image: RecognitionImageInput,
  width: number,
  height: number
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  if (image instanceof ImageData) {
    ctx.putImageData(image, 0, 0);
  } else {
    ctx.drawImage(image, 0, 0, width, height);
  }
  return canvas;
}

const HARMLESS_MEDIAPIPE_STDERR_PATTERNS = [
  /INFO:\s*Created TensorFlow Lite/i,
  /OpenGL error checking is disabled/i,
  /Sets FaceBlendshapesGraph acceleration/i,
  /gl_context\.cc:\d+\]/i,
  /face_landmarker_graph\.cc:\d+\]/i,
  /vision_wasm_internal/i,
];

let quietDepth = 0;
let originalConsoleError: typeof console.error | null = null;
let originalConsoleWarn: typeof console.warn | null = null;

function isHarmlessMediaPipeStderr(args: unknown[]): boolean {
  const combined = args
    .map((arg) => (typeof arg === "string" ? arg : ""))
    .join(" ");
  if (!combined) {
    return false;
  }
  return HARMLESS_MEDIAPIPE_STDERR_PATTERNS.some((pattern) =>
    pattern.test(combined)
  );
}

function enterQuietMediaPipe(): void {
  if (typeof console === "undefined") {
    return;
  }
  if (quietDepth === 0) {
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    const origError = originalConsoleError;
    const origWarn = originalConsoleWarn;
    console.error = (...args: unknown[]) => {
      if (isHarmlessMediaPipeStderr(args)) {
        return;
      }
      origError.apply(console, args);
    };
    console.warn = (...args: unknown[]) => {
      if (isHarmlessMediaPipeStderr(args)) {
        return;
      }
      origWarn.apply(console, args);
    };
  }
  quietDepth += 1;
}

function exitQuietMediaPipe(): void {
  if (quietDepth <= 0) {
    return;
  }
  quietDepth -= 1;
  if (quietDepth === 0) {
    if (originalConsoleError) {
      console.error = originalConsoleError;
      originalConsoleError = null;
    }
    if (originalConsoleWarn) {
      console.warn = originalConsoleWarn;
      originalConsoleWarn = null;
    }
  }
}

function withQuietMediaPipeSync<T>(fn: () => T): T {
  enterQuietMediaPipe();
  try {
    return fn();
  } finally {
    exitQuietMediaPipe();
  }
}

async function withQuietMediaPipeAsync<T>(fn: () => Promise<T>): Promise<T> {
  enterQuietMediaPipe();
  try {
    return await fn();
  } finally {
    exitQuietMediaPipe();
  }
}

async function createWithDelegateFallback<T>(
  factory: (delegate: "GPU" | "CPU") => Promise<T>
): Promise<T> {
  return withQuietMediaPipeAsync(async () => {
    try {
      return await factory("GPU");
    } catch {
      return factory("CPU");
    }
  });
}

function mapRoiLandmarksToFrame(
  raw: ReadonlyArray<{ x: number; y: number; z?: number }>,
  roiX: number,
  roiY: number,
  roiW: number,
  roiH: number,
  frameW: number,
  frameH: number
): {
  frameLandmarks: FaceLandmark3D[];
  roiLandmarks: FaceLandmark3D[];
} {
  const invW = 1 / Math.max(frameW, 1);
  const invH = 1 / Math.max(frameH, 1);
  const frameLandmarks: FaceLandmark3D[] = new Array(raw.length);
  const roiLandmarks: FaceLandmark3D[] = new Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    const lm = raw[i];
    if (!lm) continue;
    const z = typeof lm.z === "number" && Number.isFinite(lm.z) ? lm.z : 0;
    roiLandmarks[i] = { x: lm.x, y: lm.y, z };
    frameLandmarks[i] = {
      x: (roiX + lm.x * roiW) * invW,
      y: (roiY + lm.y * roiH) * invH,
      z,
    };
  }

  return { frameLandmarks, roiLandmarks };
}

export class MediaPipeFacePipeline {
  private detector: FaceDetector | null = null;
  private landmarker: FaceLandmarker | null = null;
  private initializing: Promise<void> | null = null;
  private liveWorkCanvas: HTMLCanvasElement | null = null;
  private liveRoiCanvas: HTMLCanvasElement | null = null;

  async initialize(options?: { enableLandmarker?: boolean }): Promise<void> {
    const needLandmarker = options?.enableLandmarker ?? true;

    if (this.detector && (!needLandmarker || this.landmarker)) {
      return;
    }
    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = (async () => {
      if (typeof window === "undefined") {
        throw new Error("MediaPipe face pipeline can run only in the browser.");
      }

      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await withQuietMediaPipeAsync(() =>
        vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE)
      );

      if (!this.detector) {
        this.detector = await createWithDelegateFallback((delegate) =>
          vision.FaceDetector.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: FACE_DETECTOR_MODEL_URL,
              delegate,
            },
            runningMode: "IMAGE",
            minDetectionConfidence: 0.5,
            minSuppressionThreshold: 0.3,
          })
        );
      }

      if (needLandmarker && !this.landmarker) {
        this.landmarker = await createWithDelegateFallback((delegate) =>
          vision.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: FACE_LANDMARKER_MODEL_URL,
              delegate,
            },
            runningMode: "IMAGE",
            numFaces: 1,
            minFaceDetectionConfidence: 0.45,
            minFacePresenceConfidence: 0.45,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          })
        );
      }
    })();

    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  /**
   * Lightweight real-time video frame detector + 478-point landmark extractor.
   * Reuses two offscreen canvases to avoid per-frame DOM allocations during live HUD preview.
   */
  async analyzeLiveVideoFrame(
    video: HTMLVideoElement
  ): Promise<LiveScanFrameResult> {
    const start = performance.now();
    if (!this.detector || !this.landmarker) {
      await this.initialize({ enableLandmarker: true });
    }
    if (!this.detector) {
      throw new Error("Face detector failed to initialize.");
    }

    const srcW = video.videoWidth || 0;
    const srcH = video.videoHeight || 0;
    if (srcW < 16 || srcH < 16) {
      return { faces: [], processingMs: 0 };
    }

    // Downscale preview analysis to max 480px width for fast, consistent frame rates
    const scale = srcW > 480 ? 480 / srcW : 1;
    const width = Math.max(16, Math.round(srcW * scale));
    const height = Math.max(16, Math.round(srcH * scale));

    if (!this.liveWorkCanvas) {
      this.liveWorkCanvas = document.createElement("canvas");
    }
    if (!this.liveRoiCanvas) {
      this.liveRoiCanvas = document.createElement("canvas");
    }

    const workCanvas = this.liveWorkCanvas;
    const roiCanvas = this.liveRoiCanvas;
    if (workCanvas.width !== width || workCanvas.height !== height) {
      workCanvas.width = width;
      workCanvas.height = height;
    }

    const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });
    const roiCtx = roiCanvas.getContext("2d", { willReadFrequently: true });
    if (!workCtx) {
      return { faces: [], processingMs: 0 };
    }

    workCtx.drawImage(video, 0, 0, width, height);
    const detector = this.detector;
    const result = withQuietMediaPipeSync(() => detector.detect(workCanvas));

    const faces: LiveScanFace[] = result.detections.map((detection) => {
      const box = detection.boundingBox;
      const confidence = detection.categories[0]?.score ?? 0;

      const bx = box ? Math.max(0, box.originX) : 0;
      const by = box ? Math.max(0, box.originY) : 0;
      const bw = box ? Math.min(width - bx, box.width) : 0;
      const bh = box ? Math.min(height - by, box.height) : 0;

      const keypoints: FaceKeypoint[] = (detection.keypoints ?? []).map((kp) => ({
        x: kp.x,
        y: kp.y,
        name: kp.label,
      }));

      let landmarks: FaceLandmark3D[] | undefined;
      let roiLandmarks: FaceLandmark3D[] | undefined;
      let landmarksCount = 0;

      // Run 478-point FaceLandmarker on primary single-face detections
      if (
        result.detections.length === 1 &&
        this.landmarker &&
        roiCtx &&
        bw >= 24 &&
        bh >= 24
      ) {
        const pad = Math.max(bw, bh) * 0.35;
        const roiX = Math.max(0, Math.floor(bx - pad));
        const roiY = Math.max(0, Math.floor(by - pad));
        const roiW = Math.min(width - roiX, Math.ceil(bw + pad * 2));
        const roiH = Math.min(height - roiY, Math.ceil(bh + pad * 2));

        if (roiW >= 24 && roiH >= 24) {
          if (roiCanvas.width !== roiW || roiCanvas.height !== roiH) {
            roiCanvas.width = roiW;
            roiCanvas.height = roiH;
          }
          roiCtx.clearRect(0, 0, roiW, roiH);
          roiCtx.drawImage(
            workCanvas,
            roiX,
            roiY,
            roiW,
            roiH,
            0,
            0,
            roiW,
            roiH
          );

          const landmarker = this.landmarker;
          const lmResult = withQuietMediaPipeSync(() =>
            landmarker.detect(roiCanvas)
          );
          const firstFaceLm = lmResult.faceLandmarks[0];
          if (firstFaceLm && firstFaceLm.length > 0) {
            const mapped = mapRoiLandmarksToFrame(
              firstFaceLm,
              roiX,
              roiY,
              roiW,
              roiH,
              width,
              height
            );
            landmarks = mapped.frameLandmarks;
            roiLandmarks = mapped.roiLandmarks;
            landmarksCount = firstFaceLm.length;
          }
        }
      }

      return {
        boundingBox: {
          originX: bx / Math.max(width, 1),
          originY: by / Math.max(height, 1),
          width: bw / Math.max(width, 1),
          height: bh / Math.max(height, 1),
        },
        detectionConfidence: confidence,
        keypoints,
        landmarks,
        roiLandmarks,
        landmarksCount,
      };
    });

    return {
      faces,
      processingMs: performance.now() - start,
    };
  }

  async detectFaces(image: RecognitionImageInput): Promise<DetectedFace[]> {
    if (!this.detector || !this.landmarker) {
      await this.initialize({ enableLandmarker: true });
    }
    if (!this.detector) {
      throw new Error("Face detector failed to initialize.");
    }

    const { width, height } = getInputDimensions(image);
    const workCanvas = drawInputToCanvas(image, width, height);
    if (!workCanvas) {
      throw new Error("Unable to allocate browser canvas for face detection.");
    }

    const roiCanvas = document.createElement("canvas");

    const detector = this.detector;

    try {
      const result = withQuietMediaPipeSync(() =>
        detector.detect(workCanvas)
      );
      const roiCtx = roiCanvas.getContext("2d", { willReadFrequently: true });

      return result.detections.map((detection, index): DetectedFace => {
        const box = detection.boundingBox;
        const confidence = detection.categories[0]?.score ?? 0;

        const bx = box ? Math.max(0, box.originX) : 0;
        const by = box ? Math.max(0, box.originY) : 0;
        const bw = box ? Math.min(width - bx, box.width) : 0;
        const bh = box ? Math.min(height - by, box.height) : 0;

        const normWidth = bw / Math.max(width, 1);
        const normHeight = bh / Math.max(height, 1);

        const tooSmall = normWidth < 0.04 || normHeight < 0.04;
        const lowConf = confidence < 0.55;

        const keypoints: FaceKeypoint[] = (detection.keypoints ?? []).map((kp) => ({
          x: kp.x,
          y: kp.y,
          name: kp.label,
        }));

        let landmarksCount: number | undefined;
        let landmarks: FaceLandmark3D[] | undefined;
        let roiLandmarks: FaceLandmark3D[] | undefined;
        let cropImageData: ImageData | undefined;

        if (!tooSmall && !lowConf) {
          let fivePoints = null;

          if (this.landmarker && roiCtx && bw >= 12 && bh >= 12) {
            const pad = Math.max(bw, bh) * 0.35;
            const roiX = Math.max(0, Math.floor(bx - pad));
            const roiY = Math.max(0, Math.floor(by - pad));
            const roiW = Math.min(width - roiX, Math.ceil(bw + pad * 2));
            const roiH = Math.min(height - roiY, Math.ceil(bh + pad * 2));

            if (roiW >= 16 && roiH >= 16) {
              roiCanvas.width = roiW;
              roiCanvas.height = roiH;
              roiCtx.clearRect(0, 0, roiW, roiH);
              roiCtx.drawImage(
                workCanvas,
                roiX,
                roiY,
                roiW,
                roiH,
                0,
                0,
                roiW,
                roiH
              );

              const landmarker = this.landmarker;
              const lmResult = withQuietMediaPipeSync(() =>
                landmarker.detect(roiCanvas)
              );
              const firstFaceLm = lmResult.faceLandmarks[0];
              if (firstFaceLm && firstFaceLm.length > 0) {
                landmarksCount = firstFaceLm.length;
                const mapped = mapRoiLandmarksToFrame(
                  firstFaceLm,
                  roiX,
                  roiY,
                  roiW,
                  roiH,
                  width,
                  height
                );
                landmarks = mapped.frameLandmarks;
                roiLandmarks = mapped.roiLandmarks;
                fivePoints = extractFivePointsFromFaceLandmarker(
                  firstFaceLm,
                  roiW,
                  roiH,
                  roiX,
                  roiY
                );
              }
            }
          }

          if (!fivePoints) {
            fivePoints = deriveFivePointsFromDetectorKeypoints(
              keypoints,
              width,
              height
            );
          }

          if (fivePoints) {
            const transform = estimateSimilarityTransform2D(
              fivePoints,
              ARCFACE_112_DST_POINTS
            );
            if (transform) {
              cropImageData =
                warpFaceTo112ImageData(workCanvas, transform, 112) ?? undefined;
            }
          }
        }

        const alignedOk = Boolean(cropImageData);

        return {
          faceIndex: index,
          boundingBox: {
            originX: bx / Math.max(width, 1),
            originY: by / Math.max(height, 1),
            width: normWidth,
            height: normHeight,
          },
          detectionConfidence: confidence,
          keypoints,
          landmarksCount,
          landmarks,
          roiLandmarks,
          cropImageData,
          qualityOk: !tooSmall && !lowConf && alignedOk,
          qualityIssue: lowConf
            ? "low_confidence"
            : tooSmall || !alignedOk
            ? "face_too_small"
            : "none",
        };
      });
    } finally {
      workCanvas.width = 0;
      workCanvas.height = 0;
      roiCanvas.width = 0;
      roiCanvas.height = 0;
    }
  }

  async dispose(): Promise<void> {
    if (this.detector) {
      this.detector.close();
      this.detector = null;
    }
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    if (this.liveWorkCanvas) {
      this.liveWorkCanvas.width = 0;
      this.liveWorkCanvas.height = 0;
      this.liveWorkCanvas = null;
    }
    if (this.liveRoiCanvas) {
      this.liveRoiCanvas.width = 0;
      this.liveRoiCanvas.height = 0;
      this.liveRoiCanvas = null;
    }
    this.initializing = null;
  }
}
