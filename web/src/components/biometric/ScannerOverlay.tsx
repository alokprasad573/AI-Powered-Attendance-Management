"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  FEATURE_LANDMARK_INDICES,
  GOLD_ANCHOR_INDICES,
  MEDIAPIPE_CONTOUR_EDGES,
} from "@/features/face-recognition/landmarks-topology";
import type { LiveMeshBridge } from "./types";

interface ScannerOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  liveBridgeRef: React.MutableRefObject<LiveMeshBridge>;
  cameraActive: boolean;
  mirrored: boolean;
  scanning: boolean;
  verified: boolean;
}

const GOLD_INDEX_SET = new Set<number>(GOLD_ANCHOR_INDICES);

/**
 * Maps normalized source video coordinates [0..1] onto a container rendering
 * the video with CSS `object-cover`.
 */
function mapNormalizedToCoverCanvas(
  nx: number,
  ny: number,
  videoW: number,
  videoH: number,
  canvasW: number,
  canvasH: number,
  mirrored: boolean
): { x: number; y: number } {
  const safeVW = Math.max(videoW, 1);
  const safeVH = Math.max(videoH, 1);
  const scale = Math.max(canvasW / safeVW, canvasH / safeVH);
  const renderedW = safeVW * scale;
  const renderedH = safeVH * scale;
  const offsetX = (canvasW - renderedW) / 2;
  const offsetY = (canvasH - renderedH) / 2;

  const effX = mirrored ? 1 - nx : nx;
  return {
    x: offsetX + effX * renderedW,
    y: offsetY + ny * renderedH,
  };
}

function drawCornerFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  const corner = Math.max(12, Math.min(26, Math.min(w, h) * 0.22));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  ctx.beginPath();
  // Top-left
  ctx.moveTo(x, y + corner);
  ctx.lineTo(x, y);
  ctx.lineTo(x + corner, y);
  // Top-right
  ctx.moveTo(x + w - corner, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + corner);
  // Bottom-left
  ctx.moveTo(x, y + h - corner);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + corner, y + h);
  // Bottom-right
  ctx.moveTo(x + w - corner, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - corner);
  ctx.stroke();
}

export function ScannerOverlay({
  videoRef,
  liveBridgeRef,
  cameraActive,
  mirrored,
  scanning,
  verified,
}: ScannerOverlayProps) {
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!cameraActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let rafId = 0;

    const renderFrame = () => {
      const video = videoRef.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.max(1, Math.round(rect.width * dpr));
      const targetH = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const faces = liveBridgeRef.current.faces;
      const videoW = video?.videoWidth || rect.width;
      const videoH = video?.videoHeight || rect.height;

      for (const face of faces) {
        const box = face.boundingBox;
        const p1 = mapNormalizedToCoverCanvas(
          box.originX,
          box.originY,
          videoW,
          videoH,
          rect.width,
          rect.height,
          mirrored
        );
        const p2 = mapNormalizedToCoverCanvas(
          box.originX + box.width,
          box.originY + box.height,
          videoW,
          videoH,
          rect.width,
          rect.height,
          mirrored
        );

        const bx = Math.min(p1.x, p2.x);
        const by = Math.min(p1.y, p2.y);
        const bw = Math.abs(p2.x - p1.x);
        const bh = Math.abs(p2.y - p1.y);

        const boxColor = verified
          ? "#76C4A4"
          : faces.length > 1
          ? "#CDBF9D"
          : "#B9D0D8";

        drawCornerFrame(ctx, bx, by, bw, bh, boxColor);

        // Draw subtle confidence tag above bounding box
        const confLabel = `${(face.detectionConfidence * 100).toFixed(0)}%`;
        ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
        const textW = ctx.measureText(confLabel).width;
        const tagY = Math.max(16, by - 8);
        ctx.fillStyle = "rgba(9, 10, 11, 0.78)";
        ctx.fillRect(bx, tagY - 12, textW + 10, 15);
        ctx.fillStyle = boxColor;
        ctx.fillText(confLabel, bx + 5, tagY - 1);

        // Draw real MediaPipe 478-point anatomical contours if extracted
        const lms = face.landmarks;
        if (lms && lms.length >= 468) {
          ctx.beginPath();
          ctx.strokeStyle = verified
            ? "rgba(118, 196, 164, 0.45)"
            : "rgba(185, 208, 216, 0.42)";
          ctx.lineWidth = 0.85;

          for (const [idxA, idxB] of MEDIAPIPE_CONTOUR_EDGES) {
            const lmA = lms[idxA];
            const lmB = lms[idxB];
            if (!lmA || !lmB) continue;
            const ptA = mapNormalizedToCoverCanvas(
              lmA.x,
              lmA.y,
              videoW,
              videoH,
              rect.width,
              rect.height,
              mirrored
            );
            const ptB = mapNormalizedToCoverCanvas(
              lmB.x,
              lmB.y,
              videoW,
              videoH,
              rect.width,
              rect.height,
              mirrored
            );
            ctx.moveTo(ptA.x, ptA.y);
            ctx.lineTo(ptB.x, ptB.y);
          }
          ctx.stroke();

          // Key facial feature anchor points
          for (const lmIdx of FEATURE_LANDMARK_INDICES) {
            const lm = lms[lmIdx];
            if (!lm) continue;
            const pt = mapNormalizedToCoverCanvas(
              lm.x,
              lm.y,
              videoW,
              videoH,
              rect.width,
              rect.height,
              mirrored
            );
            const isGold = GOLD_INDEX_SET.has(lmIdx);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isGold ? 2.1 : 1.35, 0, Math.PI * 2);
            ctx.fillStyle = isGold ? "#CDBF9D" : "#F5F6F6";
            ctx.fill();
          }
        } else if (face.keypoints.length > 0) {
          // Fallback to real MediaPipe FaceDetector 6 keypoints when multiple faces or distant face
          for (const kp of face.keypoints) {
            const pt = mapNormalizedToCoverCanvas(
              kp.x,
              kp.y,
              videoW,
              videoH,
              rect.width,
              rect.height,
              mirrored
            );
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = "#B9D0D8";
            ctx.fill();
          }
        }
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      window.cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [cameraActive, liveBridgeRef, mirrored, verified, videoRef]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Restrained Animated Horizontal Optical Scan Beam */}
      {(cameraActive || scanning) && !shouldReduceMotion ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-5 right-5 h-px bg-gradient-to-r from-transparent via-[#B9D0D8]/85 to-transparent"
          animate={{ top: ["14%", "82%", "14%"] }}
          transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </>
  );
}
