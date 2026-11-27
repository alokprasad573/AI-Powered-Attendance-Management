"use client";

import { useEffect, useRef } from "react";
import { useDecorativeMotionPause } from "@/components/motion/motion-pause-context";
import { ensureGsapRegistered, gsap, useGSAP } from "@/lib/gsap";

interface MatrixBuffers {
  count: number;
  cols: number;
  rows: number;
  x: Float32Array;
  y: Float32Array;
  angle: Float32Array;
  heat: Float32Array;
  bucketIndex: Uint8Array;
  segX0: Float32Array;
  segY0: Float32Array;
  segX1: Float32Array;
  segY1: Float32Array;
}

interface PointerTracker {
  active: boolean;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface CalibrationRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface MatrixUniforms {
  entranceWave: number;
  scrollAngle: number;
  parallaxY: number;
}

/**
 * Monochrome Platinum optical ramp (quantized into 5 batched stroke tiers
 * to render 1,000+ hairline dashes at 60+ FPS with near-zero CPU overhead):
 * Tier 0: Muted Charcoal (#22272A subtly lifted to #2E3438 so dashes read crisply on #090A0B)
 * Tier 1: Cool Charcoal-Silver transition
 * Tier 2: Silver Blue (#91AAB4)
 * Tier 3: Luminous Platinum (#B9D0D8)
 * Tier 4: Selective Pale Gold focal core (#CDBF9D)
 */
const BUCKET_COLORS = [
  "rgba(42, 48, 52, 0.88)", // Tier 0 — muted Charcoal (#22272A register)
  "rgba(96, 114, 122, 0.82)", // Tier 1 — Slate bridge
  "rgba(145, 170, 180, 0.88)", // Tier 2 — Silver Blue (#91AAB4)
  "rgba(185, 208, 216, 0.96)", // Tier 3 — Luminous Platinum (#B9D0D8)
  "rgba(205, 191, 157, 1.0)", // Tier 4 — Pale Gold focal peak (#CDBF9D)
] as const;

const BUCKET_WIDTHS = [1.0, 1.0, 1.08, 1.15, 1.25] as const;

const REST_AXIS_ANGLE = -Math.PI * 0.25; // Clean -45deg Swiss calibrated alignment

function buildMatrixBuffers(width: number, height: number, isMobile: boolean): MatrixBuffers {
  const pitch = isMobile ? 32 : 36;
  const cols = Math.max(4, Math.floor((width - 24) / pitch) + 1);
  const rows = Math.max(4, Math.floor((height - 24) / pitch) + 1);
  const count = cols * rows;

  const offsetX = (width - (cols - 1) * pitch) * 0.5;
  const offsetY = (height - (rows - 1) * pitch) * 0.5;

  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const angle = new Float32Array(count);
  const heat = new Float32Array(count);
  const bucketIndex = new Uint8Array(count);
  const segX0 = new Float32Array(count);
  const segY0 = new Float32Array(count);
  const segX1 = new Float32Array(count);
  const segY1 = new Float32Array(count);

  let idx = 0;
  for (let r = 0; r < rows; r += 1) {
    const cy = offsetY + r * pitch;
    for (let c = 0; c < cols; c += 1) {
      x[idx] = offsetX + c * pitch;
      y[idx] = cy;
      angle[idx] = REST_AXIS_ANGLE;
      heat[idx] = 0;
      bucketIndex[idx] = 0;
      idx += 1;
    }
  }

  return {
    count,
    cols,
    rows,
    x,
    y,
    angle,
    heat,
    bucketIndex,
    segX0,
    segY0,
    segX1,
    segY1,
  };
}

function wrapAngleDelta(delta: number): number {
  let d = delta % Math.PI;
  if (d > Math.PI * 0.5) d -= Math.PI;
  if (d < -Math.PI * 0.5) d += Math.PI;
  return d;
}

/**
 * Layer 0 Interactive Magnetic Vector Field (Precision Swiss Needle / Dash Matrix)
 *
 * Ultra-lightweight calibrated Swiss matrix of hairline dashes (6px x 1px) inspired by
 * Braun / Apple optical engineering. Dashes hold an aligned resting bearing in Charcoal
 * (#22272A) and smoothly rotate like iron filings toward the cursor, illuminating from
 * Silver Blue (#91AAB4) through Platinum (#B9D0D8) to Pale Gold (#CDBF9D).
 */
export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { registerDecorativeTween } = useDecorativeMotionPause();

  const uniformsRef = useRef<MatrixUniforms>({
    entranceWave: 1,
    scrollAngle: 0,
    parallaxY: 0,
  });

  useGSAP(() => {
    ensureGsapRegistered();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const u = uniformsRef.current;

    if (reduced) {
      u.entranceWave = 1;
      u.scrollAngle = 0;
      u.parallaxY = 0;
      return;
    }

    u.entranceWave = 0;
    const entranceTl = gsap.timeline({ defaults: { ease: "haziriOut" } });
    entranceTl.to(u, {
      entranceWave: 1,
      duration: 1.05,
    });

    const unregisterEntrance = registerDecorativeTween(entranceTl);

    // Subtle ScrollTrigger calibration sweep across page sections
    const scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.65,
      },
    });

    scrollTl.to(u, {
      scrollAngle: Math.PI * 0.22,
      parallaxY: -18,
      ease: "none",
      duration: 1,
    });

    return () => {
      unregisterEntrance();
      entranceTl.kill();
      scrollTl.scrollTrigger?.kill();
      scrollTl.kill();
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let ambientPaused =
      document.documentElement.getAttribute("data-motion-paused") === "true";

    let width = Math.max(1, window.innerWidth);
    let height = Math.max(1, window.innerHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let isMobile = width < 768;

    const pointer: PointerTracker = {
      active: false,
      targetX: width * 0.5,
      targetY: height * 0.5,
      x: width * 0.5,
      y: height * 0.5,
      vx: 0,
      vy: 0,
    };

    const ripples: CalibrationRipple[] = [];
    let matrix = buildMatrixBuffers(width, height, isMobile);

    function handleResize() {
      if (!canvas || !ctx) return;
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      isMobile = width < 768;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      matrix = buildMatrixBuffers(width, height, isMobile);
    }

    function drawFrame(dt: number) {
      if (!ctx) return;
      const u = uniformsRef.current;
      const wave = reducedMotion ? 1 : u.entranceWave;
      const restAngle = REST_AXIS_ANGLE + u.scrollAngle;
      const dtSafe = Math.min(0.05, Math.max(0.008, dt));
      const stepFactor = dt > 0 ? Math.min(1, dtSafe * 10.5) : 1;

      // Damped pointer interpolation
      const prevX = pointer.x;
      const prevY = pointer.y;
      pointer.x += (pointer.targetX - pointer.x) * 0.18;
      pointer.y += (pointer.targetY - pointer.y) * 0.18;
      pointer.vx = pointer.x - prevX;
      pointer.vy = pointer.y - prevY;

      ctx.clearRect(0, 0, width, height);

      // Subtle optical reticle luminance behind active cursor
      if (pointer.active && wave > 0.05) {
        const auraRadius = isMobile ? 165 : 240;
        const aura = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          auraRadius
        );
        aura.addColorStop(0, `rgba(205, 191, 157, ${(0.042 * wave).toFixed(3)})`);
        aura.addColorStop(0.38, `rgba(185, 208, 216, ${(0.048 * wave).toFixed(3)})`);
        aura.addColorStop(1, "rgba(9, 10, 11, 0)");
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, width, height);
      }

      const influenceRadius = isMobile ? 185 : 265;
      const influenceRadiusSq = influenceRadius * influenceRadius;
      const maxSpan = Math.hypot(width, height) || 1;
      const baseHalfLen = 3.0; // Exact 6px hairline dash (2 * 3.0px)

      const {
        count,
        x: arrX,
        y: arrY,
        angle: arrAngle,
        heat: arrHeat,
        bucketIndex: arrBucket,
        segX0,
        segY0,
        segX1,
        segY1,
      } = matrix;

      // Pass 1: Update needle angles, heat, and 3D depth foreshortening in flat buffers
      for (let i = 0; i < count; i += 1) {
        const nx = arrX[i] ?? 0;
        const ny = (arrY[i] ?? 0) + u.parallaxY * 0.35;

        // Progressive diagonal Swiss reveal during entrance
        const diagProgress = (nx * 0.65 + ny * 0.35) / maxSpan;
        const localGain = reducedMotion
          ? 1
          : Math.max(0, Math.min(1, (wave * 1.35 - diagProgress * 0.35)));

        if (localGain <= 0.01) {
          arrBucket[i] = 255; // skip
          continue;
        }

        let targetAngle = restAngle;
        let targetHeat = 0;

        if (pointer.active) {
          const dx = pointer.x - nx;
          const dy = pointer.y - ny;
          const distSq = dx * dx + dy * dy;

          if (distSq < influenceRadiusSq) {
            const dist = Math.sqrt(distSq);
            const falloff = 1 - dist / influenceRadius;
            // Iron-filing attraction: needle aligns cleanly toward pointer radial vector
            const alignAngle = Math.atan2(dy, dx);
            const alignBlend = falloff * falloff * (3 - 2 * falloff);
            const angleDiff = wrapAngleDelta(alignAngle - restAngle);
            targetAngle = restAngle + angleDiff * Math.min(1, alignBlend * 1.15);
            targetHeat = falloff;
          }
        }

        // Subtle Pale Gold / Platinum pulse across calibration click waves
        for (let w = 0; w < ripples.length; w += 1) {
          const r = ripples[w];
          if (!r) continue;
          const dx = r.x - nx;
          const dy = r.y - ny;
          const dist = Math.hypot(dx, dy);
          const ringDelta = Math.abs(dist - r.radius);
          if (ringDelta < 42) {
            const ringHeat = (1 - ringDelta / 42) * r.alpha * 1.45;
            if (ringHeat > targetHeat) {
              targetHeat = ringHeat;
            }
          }
        }

        const clampedHeat = Math.max(0, Math.min(1, targetHeat));

        if (!reducedMotion && dt > 0) {
          const curA = arrAngle[i] ?? restAngle;
          const stepA = wrapAngleDelta(targetAngle - curA);
          arrAngle[i] = curA + stepA * stepFactor;
          const curH = arrHeat[i] ?? 0;
          arrHeat[i] = curH + (clampedHeat - curH) * Math.min(1, stepFactor * 1.25);
        } else {
          arrAngle[i] = targetAngle;
          arrHeat[i] = clampedHeat;
        }

        const theta = arrAngle[i] ?? restAngle;
        const h = arrHeat[i] ?? 0;

        // Quantize color tier: Charcoal (0) -> Slate (1) -> Silver Blue (2) -> Platinum (3) -> Pale Gold (4)
        let bucket = 0;
        if (h > 0.72) bucket = 4;
        else if (h > 0.42) bucket = 3;
        else if (h > 0.18) bucket = 2;
        else if (h > 0.04) bucket = 1;
        arrBucket[i] = bucket;

        // Crisp 6px length at rest, lengthening slightly to ~7.5px near pointer focus + entrance scale
        const halfLen = (baseHalfLen + h * 0.85) * localGain;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        segX0[i] = nx - cosT * halfLen;
        segY0[i] = ny - sinT * halfLen;
        segX1[i] = nx + cosT * halfLen;
        segY1[i] = ny + sinT * halfLen;
      }

      // Pass 2: 5 Batched Stroke Calls across the whole viewport
      ctx.lineCap = "round";
      for (let tier = 0; tier < 5; tier += 1) {
        let hasSegments = false;
        ctx.beginPath();
        for (let i = 0; i < count; i += 1) {
          if (arrBucket[i] !== tier) continue;
          ctx.moveTo(segX0[i] ?? 0, segY0[i] ?? 0);
          ctx.lineTo(segX1[i] ?? 0, segY1[i] ?? 0);
          hasSegments = true;
        }
        if (hasSegments) {
          ctx.strokeStyle = BUCKET_COLORS[tier] ?? BUCKET_COLORS[0];
          ctx.lineWidth = BUCKET_WIDTHS[tier] ?? 1.0;
          ctx.stroke();
        }
      }

      // Pass 3: Advance & fade calibration pulse waves
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const r = ripples[i];
        if (!r) continue;
        if (!reducedMotion && dt > 0) {
          r.radius += 340 * dtSafe;
          r.alpha *= Math.pow(0.14, dtSafe);
        }
        if (r.alpha <= 0.015 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(185, 208, 216, ${(r.alpha * 0.42).toFixed(3)})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      pointer.active = true;
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType !== "touch") {
        pointer.active = true;
        pointer.targetX = event.clientX;
        pointer.targetY = event.clientY;
      }
      if (!reducedMotion && !ambientPaused) {
        ripples.push({
          x: event.clientX,
          y: event.clientY,
          radius: 10,
          maxRadius: Math.min(340, Math.max(width, height) * 0.36),
          alpha: 0.65,
        });
      }
    }

    function handlePointerLeave() {
      pointer.active = false;
    }

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    let rafId = 0;
    let lastTimestamp = performance.now();

    function tick(now: number) {
      if (reducedMotion || ambientPaused || document.hidden) {
        rafId = 0;
        return;
      }
      const dt = (now - lastTimestamp) * 0.001;
      lastTimestamp = now;
      drawFrame(dt);
      rafId = window.requestAnimationFrame(tick);
    }

    function syncLoop() {
      if (reducedMotion) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        drawFrame(0);
        return;
      }
      if (ambientPaused || document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        return;
      }
      if (!rafId) {
        lastTimestamp = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    }

    const handleMotionChange = () => {
      reducedMotion = motionQuery.matches;
      syncLoop();
    };
    const handleVisibilityChange = () => {
      syncLoop();
    };
    const pauseObserver = new MutationObserver(() => {
      ambientPaused =
        document.documentElement.getAttribute("data-motion-paused") === "true";
      syncLoop();
    });

    motionQuery.addEventListener("change", handleMotionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    pauseObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion-paused"],
    });

    if (reducedMotion || ambientPaused) {
      drawFrame(0);
    } else {
      syncLoop();
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerleave", handlePointerLeave);
      motionQuery.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      pauseObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="fluid-canvas-bg"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
