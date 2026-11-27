"use client";

import { Camera, CameraOff, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MediaPipeFacePipeline } from "@/features/face-recognition/engine/mediapipe-detector";
import { RecognitionStatus } from "./RecognitionStatus";
import { ScannerOverlay } from "./ScannerOverlay";
import type {
  BiometricTelemetrySnapshot,
  LiveMeshBridge,
} from "./types";

interface LiveFaceScannerProps {
  liveBridgeRef: React.MutableRefObject<LiveMeshBridge>;
  onLiveTrackingChange?: (active: boolean) => void;
}

const INITIAL_TELEMETRY: BiometricTelemetrySnapshot = {
  state: "standby",
  detectedFacesCount: 0,
  landmarksCount: null,
  detectionConfidencePercent: null,
  matchConfidencePercent: null,
  resultLabel: "Camera ready — press Start Scanning to preview live face detection.",
  lastRecognitionLabel: null,
  processingMs: null,
};

/**
 * Real-time browser-local Biometric Face Scanner connected directly to
 * MediaPipe FaceDetector + 478-point FaceLandmarker.
 *
 * Security & honesty contract:
 * - Zero camera frames leave browser memory.
 * - Never simulates an authenticated identity match; identity matching runs
 *   exclusively inside authenticated Student/Teacher portals via server RLS/RPC.
 */
export function LiveFaceScanner({
  liveBridgeRef,
  onLiveTrackingChange,
}: LiveFaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pipelineRef = useRef<MediaPipeFacePipeline | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const isAnalyzingRef = useRef(false);
  const mountedRef = useRef(true);

  const [cameraActive, setCameraActive] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [telemetry, setTelemetry] =
    useState<BiometricTelemetrySnapshot>(INITIAL_TELEMETRY);

  const stopLiveLoop = useCallback(() => {
    if (loopTimerRef.current !== null) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    isAnalyzingRef.current = false;
    liveBridgeRef.current.active = false;
    liveBridgeRef.current.faces = [];
    liveBridgeRef.current.landmarks = null;
  }, [liveBridgeRef]);

  const stopScanner = useCallback(() => {
    stopLiveLoop();
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
    setInitializing(false);
    onLiveTrackingChange?.(false);
    setTelemetry((prev) => ({
      ...INITIAL_TELEMETRY,
      lastRecognitionLabel: prev.lastRecognitionLabel,
    }));
  }, [onLiveTrackingChange, stopLiveLoop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopLiveLoop();
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
      if (pipelineRef.current) {
        void pipelineRef.current.dispose();
        pipelineRef.current = null;
      }
    };
  }, [stopLiveLoop]);

  async function startScanner(nextFacing: "user" | "environment" = facingMode) {
    setCameraError(null);
    stopLiveLoop();

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        "Camera access is unavailable in this browser context."
      );
      setTelemetry({
        state: "camera_error",
        detectedFacesCount: 0,
        landmarksCount: null,
        detectionConfidencePercent: null,
        matchConfidencePercent: null,
        resultLabel: "Camera access isn't supported in this browser window.",
        lastRecognitionLabel: null,
        processingMs: null,
      });
      return;
    }

    setInitializing(true);
    setTelemetry({
      state: "camera_initializing",
      detectedFacesCount: 0,
      landmarksCount: null,
      detectionConfidencePercent: null,
      matchConfidencePercent: null,
      resultLabel: "Turning on your camera...",
      lastRecognitionLabel: telemetry.lastRecognitionLabel,
      processingMs: null,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacing,
          width: { ideal: 960 },
          height: { ideal: 720 },
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

      if (!pipelineRef.current) {
        pipelineRef.current = new MediaPipeFacePipeline();
      }
      await pipelineRef.current.initialize({ enableLandmarker: true });

      if (!mountedRef.current) return;

      setCameraActive(true);
      setInitializing(false);
      liveBridgeRef.current.active = true;
      onLiveTrackingChange?.(true);

      setTelemetry((prev) => ({
        ...prev,
        state: "camera_active",
        resultLabel: "Camera is active — center your face in the frame.",
      }));

      // Run MediaPipe detection independently of Three.js & Framer Motion loops (~9 FPS)
      loopTimerRef.current = window.setInterval(() => {
        if (
          !mountedRef.current ||
          isAnalyzingRef.current ||
          !videoRef.current ||
          !pipelineRef.current ||
          videoRef.current.readyState < 2
        ) {
          return;
        }

        isAnalyzingRef.current = true;
        void pipelineRef.current
          .analyzeLiveVideoFrame(videoRef.current)
          .then((result) => {
            if (!mountedRef.current || !liveBridgeRef.current.active) return;

            liveBridgeRef.current.faces = result.faces;
            const primary = result.faces[0];

            if (result.faces.length === 0) {
              liveBridgeRef.current.landmarks = null;
              setTelemetry((prev) => ({
                ...prev,
                state: "no_face_detected",
                detectedFacesCount: 0,
                landmarksCount: null,
                detectionConfidencePercent: null,
                matchConfidencePercent: null,
                resultLabel: "No face detected — position your face within the frame.",
                processingMs: result.processingMs,
              }));
              return;
            }

            if (result.faces.length > 1) {
              liveBridgeRef.current.landmarks = null;
              setTelemetry((prev) => ({
                ...prev,
                state: "multiple_faces_detected",
                detectedFacesCount: result.faces.length,
                landmarksCount: null,
                detectionConfidencePercent: primary
                  ? primary.detectionConfidence * 100
                  : null,
                matchConfidencePercent: null,
                resultLabel: `${result.faces.length} faces in view — show only one face for clear alignment.`,
                processingMs: result.processingMs,
              }));
              return;
            }

            if (primary && primary.roiLandmarks && primary.landmarksCount > 0) {
              liveBridgeRef.current.landmarks = primary.roiLandmarks;
              const nowLabel = new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              setTelemetry({
                state: "face_detected",
                detectedFacesCount: 1,
                landmarksCount: primary.landmarksCount,
                detectionConfidencePercent: primary.detectionConfidence * 100,
                matchConfidencePercent: null,
                resultLabel:
                  "Sign in through Student Portal to verify your attendance profile.",
                lastRecognitionLabel: `Updated ${nowLabel}`,
                processingMs: result.processingMs,
              });
              return;
            }

            liveBridgeRef.current.landmarks = null;
            setTelemetry((prev) => ({
              ...prev,
              state: "analyzing_landmarks",
              detectedFacesCount: 1,
              landmarksCount: null,
              detectionConfidencePercent: primary
                ? primary.detectionConfidence * 100
                : null,
              matchConfidencePercent: null,
              resultLabel: "Face spotted — centering details...",
              processingMs: result.processingMs,
            }));
          })
          .catch(() => {
            if (!mountedRef.current) return;
            setTelemetry((prev) => ({
              ...prev,
              state: "camera_error",
              resultLabel: "Camera check interrupted — please try starting again.",
            }));
          })
          .finally(() => {
            isAnalyzingRef.current = false;
          });
      }, 110);
    } catch (err) {
      if (!mountedRef.current) return;
      const isDenied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setInitializing(false);
      setCameraActive(false);
      onLiveTrackingChange?.(false);
      setCameraError(
        isDenied
          ? "Camera permission was denied. Allow camera access in your browser to preview live face tracking."
          : "Unable to open your camera right now. Please check that a camera is connected."
      );
      setTelemetry({
        state: isDenied ? "camera_permission_required" : "camera_error",
        detectedFacesCount: 0,
        landmarksCount: null,
        detectionConfidencePercent: null,
        matchConfidencePercent: null,
        resultLabel: isDenied
          ? "Camera permission required."
          : "Could not start camera.",
        lastRecognitionLabel: telemetry.lastRecognitionLabel,
        processingMs: null,
      });
    }
  }

  return (
    <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-[20px] border border-[var(--border-default)] bg-[#141719]/84 p-4 shadow-[inset_0_1px_0_rgba(245,246,246,0.12)] sm:p-5">
      <span
        aria-hidden="true"
        className="specular-rule pointer-events-none absolute inset-x-10 top-0 h-px"
      />
      {/* Scanner Viewport */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[#060708]"
        aria-label="Live Biometric Face Scanner"
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
          <div className="obsidian-grid absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-4 h-5 w-5 rounded-tl-[6px] border-l-2 border-t-2 border-[#B9D0D8]/45"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-4 h-5 w-5 rounded-tr-[6px] border-r-2 border-t-2 border-[#B9D0D8]/45"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 left-4 h-5 w-5 rounded-bl-[6px] border-b-2 border-l-2 border-[#91AAB4]/35"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-4 right-4 h-5 w-5 rounded-br-[6px] border-b-2 border-r-2 border-[#91AAB4]/35"
            />
            <div className="inline-flex h-13 w-13 items-center justify-center rounded-[14px] border border-[#B9D0D8]/30 bg-[#141719]/95 text-[var(--accent-primary)] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(245,246,246,0.16)]">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-sm font-semibold tracking-tight text-[var(--text-primary)] sm:text-base">
                {initializing
                  ? "Starting Camera..."
                  : "Live Biometric Face Scanner"}
              </p>
              <p className="max-w-xs text-xs leading-relaxed text-[var(--text-secondary)]">
                Private camera preview. Click Start Scanning to see live face tracking on your device.
              </p>
            </div>
          </div>
        ) : null}

        <ScannerOverlay
          videoRef={videoRef}
          liveBridgeRef={liveBridgeRef}
          cameraActive={cameraActive}
          mirrored={facingMode === "user"}
          scanning={initializing}
          verified={false}
        />

        {/* Top-left camera indicator */}
        <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[#090A0B]/82 px-2.5 py-1 backdrop-blur-md">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              cameraActive
                ? "bg-[#76C4A4]"
                : initializing
                ? "bg-[#CDBF9D]"
                : "bg-[#767E82]"
            }`}
          />
          <span className="telemetry-num text-[10px] text-[var(--text-primary)]">
            {cameraActive ? "CAMERA ON" : initializing ? "STARTING" : "READY"}
          </span>
        </div>
      </div>

      {cameraError ? (
        <Alert variant="warning" aria-live="polite">
          {cameraError}
        </Alert>
      ) : null}

      {/* Real-time Telemetry & 4-Stage Pipeline */}
      <RecognitionStatus telemetry={telemetry} />
    
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {!cameraActive ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void startScanner()}
              disabled={initializing}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {initializing ? "Initializing..." : "Start Scanning"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = facingMode === "user" ? "environment" : "user";
                  setFacingMode(next);
                  void startScanner(next);
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Switch Camera
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={stopScanner}
              >
                <CameraOff className="h-4 w-4" aria-hidden="true" />
                Stop Scanner
              </Button>
            </>
          )}
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
          <ShieldCheck
            className="h-3.5 w-3.5 text-[var(--accent-highlight)]"
            aria-hidden="true"
          />
          Runs On Your Device
        </span>
      </div>
    </div>
  );
}
