"use client";

import { motion } from "framer-motion";
import { Camera, CameraOff, CheckCircle2, RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MediaPipeFacePipeline } from "@/features/face-recognition/engine/mediapipe-detector";
import { hudReticleVariants } from "@/lib/motion";
import { ScannerOverlay } from "./ScannerOverlay";
import type { LiveMeshBridge } from "./types";

export interface CapturedFramePayload {
  blob: Blob;
  previewUrl: string;
  imageElement: HTMLImageElement;
  fileName: string;
}

interface CameraHudProps {
  title?: string;
  statusLabel: string;
  confidencePercent?: number | null;
  verified?: boolean;
  scanning?: boolean;
  allowUploadFallback?: boolean;
  onCapture: (payload: CapturedFramePayload) => void | Promise<void>;
  disabled?: boolean;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode selected image."));
    img.src = url;
  });
}

export function CameraHud({
  title = "Camera Preview",
  statusLabel,
  confidencePercent = null,
  verified = false,
  scanning = false,
  allowUploadFallback = true,
  onCapture,
  disabled = false,
}: CameraHudProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewPipelineRef = useRef<MediaPipeFacePipeline | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const analyzingPreviewRef = useRef(false);
  const mountedRef = useRef(true);
  const liveBridgeRef = useRef<LiveMeshBridge>({
    landmarks: null,
    faces: [],
    active: false,
  });

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [busy, setBusy] = useState(false);
  const [liveLandmarksCount, setLiveLandmarksCount] = useState<number | null>(null);
  const [liveDetectionConfidence, setLiveDetectionConfidence] = useState<number | null>(
    null
  );

  const stopPreviewTracking = useCallback(() => {
    if (previewTimerRef.current !== null) {
      window.clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    analyzingPreviewRef.current = false;
    liveBridgeRef.current.active = false;
    liveBridgeRef.current.faces = [];
    liveBridgeRef.current.landmarks = null;
    setLiveLandmarksCount(null);
    setLiveDetectionConfidence(null);
  }, []);

  const stopCameraStream = useCallback(() => {
    stopPreviewTracking();
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, [stopPreviewTracking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCameraStream();
      if (previewPipelineRef.current) {
        void previewPipelineRef.current.dispose();
        previewPipelineRef.current = null;
      }
    };
  }, [stopCameraStream]);

  async function startCamera(nextFacing: "user" | "environment" = facingMode) {
    setCameraError(null);
    stopCameraStream();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is unavailable in this browser context. Use photo upload fallback instead."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      liveBridgeRef.current.active = true;

      // Best-effort live MediaPipe landmark HUD overlay during camera preview
      void (async () => {
        try {
          if (!previewPipelineRef.current) {
            previewPipelineRef.current = new MediaPipeFacePipeline();
          }
          await previewPipelineRef.current.initialize({ enableLandmarker: true });
          if (!mountedRef.current || !liveBridgeRef.current.active) return;

          previewTimerRef.current = window.setInterval(() => {
            if (
              !mountedRef.current ||
              analyzingPreviewRef.current ||
              !videoRef.current ||
              !previewPipelineRef.current ||
              videoRef.current.readyState < 2
            ) {
              return;
            }
            analyzingPreviewRef.current = true;
            void previewPipelineRef.current
              .analyzeLiveVideoFrame(videoRef.current)
              .then((res) => {
                if (!mountedRef.current || !liveBridgeRef.current.active) return;
                liveBridgeRef.current.faces = res.faces;
                const first = res.faces[0];
                if (first) {
                  liveBridgeRef.current.landmarks = first.roiLandmarks ?? null;
                  setLiveLandmarksCount(
                    first.landmarksCount > 0 ? first.landmarksCount : null
                  );
                  setLiveDetectionConfidence(first.detectionConfidence * 100);
                } else {
                  liveBridgeRef.current.landmarks = null;
                  setLiveLandmarksCount(null);
                  setLiveDetectionConfidence(null);
                }
              })
              .catch(() => {
                // Non-fatal: capture still works even if live preview overlay cannot run
              })
              .finally(() => {
                analyzingPreviewRef.current = false;
              });
          }, 140);
        } catch {
          // Non-fatal: fallback to standard reticle framing if WASM model unavailable offline
        }
      })();
    } catch {
      setCameraError(
        "Camera permission denied or no camera device detected. You can upload an image instead."
      );
    }
  }

  async function handleSnapFrame() {
    if (!videoRef.current || !cameraActive) return;

    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Unable to prepare photo capture right now.");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    setBusy(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (generated) => {
            if (generated) resolve(generated);
            else reject(new Error("Frame encoding failed."));
          },
          "image/jpeg",
          0.92
        );
      });

      const previewUrl = URL.createObjectURL(blob);
      const imageElement = await loadImageElement(previewUrl);
      await onCapture({
        blob,
        previewUrl,
        imageElement,
        fileName: `camera-capture-${Date.now()}.jpg`,
      });
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Failed to capture frame.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setCameraError("Please select a valid JPG, JPEG, or PNG image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCameraError("Selected image must be smaller than 10 MB.");
      return;
    }

    setCameraError(null);
    setBusy(true);
    const previewUrl = URL.createObjectURL(file);
    try {
      const imageElement = await loadImageElement(previewUrl);
      await onCapture({
        blob: file,
        previewUrl,
        imageElement,
        fileName: file.name,
      });
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setCameraError(err instanceof Error ? err.message : "Corrupt or unreadable image.");
    } finally {
      setBusy(false);
    }
  }

  const hudState = verified ? "verified" : scanning || cameraActive ? "scanning" : "idle";
  const bracketColor = verified ? "border-[#76C4A4]" : "border-[#B9D0D8]/85";
  const displayConfidence =
    typeof confidencePercent === "number"
      ? confidencePercent
      : liveDetectionConfidence;

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] border border-[var(--border-default)] bg-[#060708]"
        aria-label={title}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${
            facingMode === "user" ? "-scale-x-100" : ""
          } ${cameraActive ? "opacity-100" : "opacity-0"}`}
        />

        {!cameraActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="inline-flex h-13 w-13 items-center justify-center rounded-[14px] border border-[#B9D0D8]/28 bg-[#141719]/90 text-[var(--accent-primary)] shadow-[inset_0_1px_0_rgba(245,246,246,0.12)]">
              <Camera className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
            <p className="max-w-xs text-xs leading-relaxed text-[var(--text-secondary)]">
              Your camera opens only when you tap Start Camera, and photos never leave your device.
            </p>
          </div>
        ) : null}

        {/* Architectural Corner Reticles */}
        <motion.div
          variants={hudReticleVariants}
          animate={hudState}
          className="pointer-events-none absolute inset-x-4 top-4 bottom-14"
        >
          <span
            className={`absolute left-0 top-0 h-7 w-7 rounded-tl-lg border-l-2 border-t-2 ${bracketColor}`}
          />
          <span
            className={`absolute right-0 top-0 h-7 w-7 rounded-tr-lg border-r-2 border-t-2 ${bracketColor}`}
          />
          <span
            className={`absolute bottom-0 left-0 h-7 w-7 rounded-bl-lg border-b-2 border-l-2 ${bracketColor}`}
          />
          <span
            className={`absolute bottom-0 right-0 h-7 w-7 rounded-br-lg border-b-2 border-r-2 ${bracketColor}`}
          />
        </motion.div>

        {/* Live MediaPipe Bounding Frame + 478-Point Landmark Mesh Overlay + Scan Beam */}
        <ScannerOverlay
          videoRef={videoRef}
          liveBridgeRef={liveBridgeRef}
          cameraActive={cameraActive}
          mirrored={facingMode === "user"}
          scanning={scanning}
          verified={verified}
        />

        {/* Bottom Telemetry Pill */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-full border border-[var(--border-default)] bg-[#090A0B]/84 px-3.5 py-1.5 backdrop-blur-md">
          <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.02em] text-[var(--text-primary)]">
            {verified ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[#76C4A4]" aria-hidden="true" />
            ) : null}
            {statusLabel}
          </span>
          <div className="flex items-center gap-2.5">
            {liveLandmarksCount ? (
              <span className="telemetry-num text-[11px] text-[var(--accent-highlight)]">
                Aligned
              </span>
            ) : null}
            {typeof displayConfidence === "number" ? (
              <span className="telemetry-num text-xs font-medium text-[var(--accent-primary)]">
                Clarity {displayConfidence.toFixed(0)}%
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {cameraError ? (
        <Alert variant="warning" aria-live="polite">
          {cameraError}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        {!cameraActive ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void startCamera()}
            disabled={disabled || busy}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => void handleSnapFrame()}
              disabled={disabled || busy}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {busy ? "Processing..." : "Capture Photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const next = facingMode === "user" ? "environment" : "user";
                setFacingMode(next);
                void startCamera(next);
              }}
              disabled={disabled || busy}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Switch Camera
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={stopCameraStream}
              disabled={busy}
            >
              <CameraOff className="h-4 w-4" aria-hidden="true" />
              Stop Camera
            </Button>
          </>
        )}

        {allowUploadFallback ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              suppressHydrationWarning
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload image fallback"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || busy}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload Image
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
