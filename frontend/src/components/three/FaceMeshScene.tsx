"use client";

import { Float } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import type { LiveMeshBridge } from "@/components/biometric/types";
import {
  FEATURE_LANDMARK_INDICES,
  GOLD_ANCHOR_INDICES,
  MEDIAPIPE_CONTOUR_EDGES,
} from "@/features/face-recognition/landmarks-topology";
import { cn } from "@/lib/utils";
import { BiometricHUD } from "./BiometricHUD";
import { Lighting } from "./Lighting";
import { PlatinumParticles } from "./PlatinumParticles";
import { StaticFaceMeshFallback } from "./StaticFaceMeshFallback";

interface PointerVector {
  x: number;
  y: number;
}

const THREE_CLOCK_PATCH_FLAG = "__haziriThreeClockWarnFilterInstalled";

/**
 * `@react-three/fiber@9` instantiates `new THREE.Clock()` internally on Canvas mount,
 * which triggers a harmless deprecation warning on `three@0.187+`.
 * Filter strictly that upstream message so browser/dev logs stay clean.
 */
function installUpstreamThreeClockFilter(): void {
  if (typeof window === "undefined" || typeof console === "undefined") {
    return;
  }
  const win = window as unknown as Record<string, unknown>;
  if (win[THREE_CLOCK_PATCH_FLAG]) {
    return;
  }
  win[THREE_CLOCK_PATCH_FLAG] = true;
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("THREE.Clock: This module has been deprecated")
    ) {
      return;
    }
    origWarn.apply(console, args);
  };
}

installUpstreamThreeClockFilter();

const LANDMARK_POINT_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScanY;
  attribute float aSize;
  varying vec3 vColor;
  varying float vGlow;

  void main() {
    vColor = color;
    float scanBand = exp(-pow((position.y - uScanY) / 0.36, 2.0));
    vGlow = 0.55 + scanBand * 0.75;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float pulse = 1.0 + scanBand * 0.42;
    gl_PointSize = aSize * pulse * uPixelRatio * (34.0 / max(-mvPosition.z, 1.0));
  }
`;

const LANDMARK_POINT_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vGlow;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.12, dist);
    float halo = smoothstep(0.5, 0.0, dist) * 0.5;
    vec3 finalColor = mix(vColor, vec3(0.96, 0.965, 0.965), core * 0.45 * vGlow);
    gl_FragColor = vec4(finalColor, clamp((core + halo) * vGlow, 0.0, 1.0));
  }
`;

function detectWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false });
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * Canonical studio reference 3D facial topology used strictly when the camera
 * is in Standby (clearly labelled as Standby Reference Mesh, never live output).
 */
function sampleReferenceFace(u: number, v: number): THREE.Vector3 {
  const cu = Math.max(-1, Math.min(1, u));
  const cv = Math.max(-0.995, Math.min(0.995, v));

  const oval = Math.sqrt(Math.max(0.0004, 1 - cv * cv));
  const jawTaper =
    cv < 0.08
      ? 0.75 + 0.25 * Math.pow(Math.max(0, (cv + 1) / 1.08), 0.58)
      : 1 + 0.03 * Math.exp(-Math.pow((cv - 0.34) / 0.28, 2));

  const x = cu * oval * jawTaper * 1.04;
  const y = cv * 1.36;

  const cosU = Math.cos(cu * Math.PI * 0.5);
  const verticalDome = Math.pow(Math.max(0, 1 - cv * cv * 0.7), 0.44);
  const zBase = 0.64 * cosU * verticalDome;

  const browRidge =
    0.085 *
    Math.exp(-Math.pow((y - 0.37) / 0.14, 2)) *
    Math.exp(-Math.pow(x / 0.64, 2));
  const eyeSockets =
    -0.135 *
    (Math.exp(-Math.pow((x - 0.34) / 0.18, 2) - Math.pow((y - 0.17) / 0.12, 2)) +
      Math.exp(-Math.pow((x + 0.34) / 0.18, 2) - Math.pow((y - 0.17) / 0.12, 2)));
  const noseBridge =
    0.17 *
    Math.exp(-Math.pow(x / 0.105, 2)) *
    Math.exp(-Math.pow((y + 0.02) / 0.27, 2));
  const noseTip =
    0.19 *
    Math.exp(-Math.pow(x / 0.135, 2)) *
    Math.exp(-Math.pow((y + 0.2) / 0.105, 2));
  const cheekbones =
    0.085 *
    (Math.exp(-Math.pow((x - 0.5) / 0.23, 2) - Math.pow((y + 0.08) / 0.22, 2)) +
      Math.exp(-Math.pow((x + 0.5) / 0.23, 2) - Math.pow((y + 0.08) / 0.22, 2)));
  const upperLip =
    0.075 *
    Math.exp(-Math.pow(x / 0.24, 2)) *
    Math.exp(-Math.pow((y + 0.53) / 0.06, 2));
  const lipCrease =
    -0.042 *
    Math.exp(-Math.pow(x / 0.22, 2)) *
    Math.exp(-Math.pow((y + 0.59) / 0.026, 2));
  const lowerLip =
    0.068 *
    Math.exp(-Math.pow(x / 0.2, 2)) *
    Math.exp(-Math.pow((y + 0.65) / 0.065, 2));
  const chin =
    0.08 *
    Math.exp(-Math.pow(x / 0.22, 2)) *
    Math.exp(-Math.pow((y + 1.04) / 0.16, 2));

  const edgeAtten = cosU * Math.sqrt(Math.max(0, 1 - cv * cv));
  const relief =
    (browRidge +
      eyeSockets +
      noseBridge +
      noseTip +
      cheekbones +
      upperLip +
      lipCrease +
      lowerLip +
      chin) *
    edgeAtten;

  return new THREE.Vector3(x, y, zBase + relief - 0.22);
}

const REFERENCE_FEATURE_UV: ReadonlyArray<
  readonly [number, number, "platinum" | "silver" | "gold"]
> = [
  [0, 0.78, "silver"],
  [-0.38, 0.31, "silver"],
  [0.38, 0.31, "silver"],
  [0, 0.24, "platinum"],
  [-0.52, 0.13, "platinum"],
  [0.52, 0.13, "platinum"],
  [-0.35, 0.13, "gold"],
  [0.35, 0.13, "gold"],
  [-0.18, 0.12, "silver"],
  [0.18, 0.12, "silver"],
  [0, -0.02, "silver"],
  [0, -0.15, "gold"],
  [-0.16, -0.18, "silver"],
  [0.16, -0.18, "silver"],
  [-0.62, -0.07, "silver"],
  [0.62, -0.07, "silver"],
  [-0.29, -0.44, "gold"],
  [0.29, -0.44, "gold"],
  [0, -0.43, "platinum"],
  [-0.68, -0.48, "silver"],
  [0.68, -0.48, "silver"],
  [-0.44, -0.76, "silver"],
  [0.44, -0.76, "silver"],
  [0, -0.88, "gold"],
];

interface FaceMeshRigProps {
  liveBridgeRef: React.MutableRefObject<LiveMeshBridge>;
  pointerRef: React.MutableRefObject<PointerVector>;
  reducedMotion: boolean;
  compact: boolean;
  isLiveTracking: boolean;
}

function FaceMeshRig({
  liveBridgeRef,
  pointerRef,
  reducedMotion,
  compact,
  isLiveTracking,
}: FaceMeshRigProps) {
  const standbyGroupRef = useRef<THREE.Group | null>(null);
  const liveGroupRef = useRef<THREE.Group | null>(null);
  const pointMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const elapsedRef = useRef(0);

  const goldSet = useMemo(() => new Set<number>(GOLD_ANCHOR_INDICES), []);

  const assets = useMemo(() => {
    const uSteps = compact ? 14 : 20;
    const vSteps = compact ? 16 : 24;

    // 1. Standby Metallic Platinum Reference Face Surface + Wireframe
    const gridPos: number[] = [];
    const triIdx: number[] = [];

    for (let iv = 0; iv <= vSteps; iv += 1) {
      const v = -0.96 + (iv / vSteps) * 1.92;
      for (let iu = 0; iu <= uSteps; iu += 1) {
        const u = -1 + (iu / uSteps) * 2;
        const p = sampleReferenceFace(u, v);
        gridPos.push(p.x, p.y, p.z);
      }
    }

    const stride = uSteps + 1;
    for (let iv = 0; iv < vSteps; iv += 1) {
      for (let iu = 0; iu < uSteps; iu += 1) {
        const a = iv * stride + iu;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        triIdx.push(a, b, d, a, d, c);
      }
    }

    const refSurfaceGeo = new THREE.BufferGeometry();
    refSurfaceGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(gridPos, 3)
    );
    refSurfaceGeo.setIndex(triIdx);
    refSurfaceGeo.computeVertexNormals();

    const refWireGeo = new THREE.WireframeGeometry(refSurfaceGeo);

    // Standby feature landmark points
    const refPointPos = new Float32Array(REFERENCE_FEATURE_UV.length * 3);
    const refPointCol = new Float32Array(REFERENCE_FEATURE_UV.length * 3);
    const refPointSize = new Float32Array(REFERENCE_FEATURE_UV.length);

    const cPlatinum = new THREE.Color("#B9D0D8");
    const cSilver = new THREE.Color("#91AAB4");
    const cGold = new THREE.Color("#CDBF9D");

    REFERENCE_FEATURE_UV.forEach(([u, v, tone], idx) => {
      const pt = sampleReferenceFace(u, v);
      refPointPos[idx * 3] = pt.x;
      refPointPos[idx * 3 + 1] = pt.y;
      refPointPos[idx * 3 + 2] = pt.z + 0.025;

      const c = tone === "gold" ? cGold : tone === "platinum" ? cPlatinum : cSilver;
      refPointCol[idx * 3] = c.r;
      refPointCol[idx * 3 + 1] = c.g;
      refPointCol[idx * 3 + 2] = c.b;
      refPointSize[idx] = tone === "gold" ? 1.55 : tone === "platinum" ? 1.25 : 0.95;
    });

    const refPointsGeo = new THREE.BufferGeometry();
    refPointsGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(refPointPos, 3)
    );
    refPointsGeo.setAttribute("color", new THREE.BufferAttribute(refPointCol, 3));
    refPointsGeo.setAttribute("aSize", new THREE.BufferAttribute(refPointSize, 1));

    // 2. Live MediaPipe 478-Point Dynamic Buffers (pre-allocated, mutated in-place inside useFrame)
    const liveEdgePositions = new Float32Array(
      MEDIAPIPE_CONTOUR_EDGES.length * 2 * 3
    );
    const liveLinesGeo = new THREE.BufferGeometry();
    const liveLineAttr = new THREE.BufferAttribute(liveEdgePositions, 3);
    liveLineAttr.setUsage(THREE.DynamicDrawUsage);
    liveLinesGeo.setAttribute("position", liveLineAttr);

    const liveIndices = [
      ...FEATURE_LANDMARK_INDICES,
      ...GOLD_ANCHOR_INDICES.filter(
        (id) => !FEATURE_LANDMARK_INDICES.includes(id)
      ),
    ];
    const livePointPos = new Float32Array(liveIndices.length * 3);
    const livePointCol = new Float32Array(liveIndices.length * 3);
    const livePointSize = new Float32Array(liveIndices.length);

    liveIndices.forEach((lmIdx, i) => {
      const isGold = goldSet.has(lmIdx);
      const col = isGold ? cGold : i % 2 === 0 ? cPlatinum : cSilver;
      livePointCol[i * 3] = col.r;
      livePointCol[i * 3 + 1] = col.g;
      livePointCol[i * 3 + 2] = col.b;
      livePointSize[i] = isGold ? 1.65 : 1.15;
    });

    const livePointsGeo = new THREE.BufferGeometry();
    const livePointAttr = new THREE.BufferAttribute(livePointPos, 3);
    livePointAttr.setUsage(THREE.DynamicDrawUsage);
    livePointsGeo.setAttribute("position", livePointAttr);
    livePointsGeo.setAttribute("color", new THREE.BufferAttribute(livePointCol, 3));
    livePointsGeo.setAttribute("aSize", new THREE.BufferAttribute(livePointSize, 1));

    // 3. Materials — Metallic Platinum Wireframe + Studio Graphite Glass + Glowing Landmark Shader
    const refSurfaceMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#22272A"),
      emissive: new THREE.Color("#141719"),
      emissiveIntensity: 0.42,
      metalness: 0.48,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.14,
      flatShading: true,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const wireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#B9D0D8"),
      transparent: true,
      opacity: 0.42,
    });

    const liveWireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#B9D0D8"),
      transparent: true,
      opacity: 0.72,
    });

    const pixelRatio =
      typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;

    const landmarkShaderMat = new THREE.ShaderMaterial({
      vertexShader: LANDMARK_POINT_VERTEX_SHADER,
      fragmentShader: LANDMARK_POINT_FRAGMENT_SHADER,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uScanY: { value: 0.15 },
      },
    });

    return {
      refSurfaceGeo,
      refWireGeo,
      refPointsGeo,
      liveLinesGeo,
      livePointsGeo,
      liveIndices,
      refSurfaceMat,
      wireMat,
      liveWireMat,
      landmarkShaderMat,
    };
  }, [compact, goldSet]);

  useEffect(() => {
    pointMatRef.current = assets.landmarkShaderMat;
    return () => {
      assets.refSurfaceGeo.dispose();
      assets.refWireGeo.dispose();
      assets.refPointsGeo.dispose();
      assets.liveLinesGeo.dispose();
      assets.livePointsGeo.dispose();
      assets.refSurfaceMat.dispose();
      assets.wireMat.dispose();
      assets.liveWireMat.dispose();
      assets.landmarkShaderMat.dispose();
      pointMatRef.current = null;
    };
  }, [assets]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const decorativePaused =
      typeof document !== "undefined" &&
      document.documentElement.dataset.motionPaused === "true";

    if (!decorativePaused) {
      elapsedRef.current += dt;
    }
    const t = elapsedRef.current;
    const liveLandmarks = liveBridgeRef.current.landmarks;
    const hasLiveMesh = Boolean(
      liveBridgeRef.current.active && liveLandmarks && liveLandmarks.length >= 468
    );

    // Update dynamic landmark illumination shader wave
    if (pointMatRef.current) {
      const uTime = pointMatRef.current.uniforms.uTime;
      const uScanY = pointMatRef.current.uniforms.uScanY;
      if (uTime) uTime.value = t;
      if (uScanY) {
        uScanY.value =
          reducedMotion || decorativePaused ? 0.15 : Math.sin(t * 1.05) * 1.28;
      }
    }

    // Smooth camera depth transition when live landmark tracking activates
    const targetCamZ = hasLiveMesh ? 5.15 : 5.65;
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      targetCamZ,
      dt * 3
    );

    if (standbyGroupRef.current) {
      standbyGroupRef.current.visible = !hasLiveMesh;
      if (!hasLiveMesh && !reducedMotion && !decorativePaused) {
        const targetRotY =
          pointerRef.current.x * 0.3 + Math.sin(t * 0.36) * 0.28;
        const targetRotX =
          -pointerRef.current.y * 0.16 + Math.cos(t * 0.28) * 0.05;
        standbyGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          standbyGroupRef.current.rotation.y,
          targetRotY,
          dt * 2.5
        );
        standbyGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          standbyGroupRef.current.rotation.x,
          targetRotX,
          dt * 2.5
        );
      }
    }

    if (liveGroupRef.current) {
      liveGroupRef.current.visible = hasLiveMesh;

      if (hasLiveMesh && liveLandmarks) {
        // Project actual MediaPipe ROI 3D coordinates directly into dynamic BufferAttributes
        const lineAttr = assets.liveLinesGeo.getAttribute(
          "position"
        ) as THREE.BufferAttribute;
        const lineArr = lineAttr.array as Float32Array;
        const scaleXY = 3.1;
        const scaleZ = 2.6;
        const smooth = 0.42;

        for (let i = 0; i < MEDIAPIPE_CONTOUR_EDGES.length; i += 1) {
          const pair = MEDIAPIPE_CONTOUR_EDGES[i];
          if (!pair) continue;
          const lmA = liveLandmarks[pair[0]];
          const lmB = liveLandmarks[pair[1]];
          if (!lmA || !lmB) continue;

          const base = i * 6;
          // Mirror X for natural interactive face-tracking feel
          const ax = -(lmA.x - 0.5) * scaleXY;
          const ay = -(lmA.y - 0.5) * scaleXY;
          const az = -lmA.z * scaleZ;

          const bx = -(lmB.x - 0.5) * scaleXY;
          const by = -(lmB.y - 0.5) * scaleXY;
          const bz = -lmB.z * scaleZ;

          lineArr[base] = THREE.MathUtils.lerp(lineArr[base] ?? ax, ax, smooth);
          lineArr[base + 1] = THREE.MathUtils.lerp(lineArr[base + 1] ?? ay, ay, smooth);
          lineArr[base + 2] = THREE.MathUtils.lerp(lineArr[base + 2] ?? az, az, smooth);
          lineArr[base + 3] = THREE.MathUtils.lerp(lineArr[base + 3] ?? bx, bx, smooth);
          lineArr[base + 4] = THREE.MathUtils.lerp(lineArr[base + 4] ?? by, by, smooth);
          lineArr[base + 5] = THREE.MathUtils.lerp(lineArr[base + 5] ?? bz, bz, smooth);
        }
        lineAttr.needsUpdate = true;

        const ptAttr = assets.livePointsGeo.getAttribute(
          "position"
        ) as THREE.BufferAttribute;
        const ptArr = ptAttr.array as Float32Array;

        for (let i = 0; i < assets.liveIndices.length; i += 1) {
          const lmIdx = assets.liveIndices[i];
          if (lmIdx === undefined) continue;
          const lm = liveLandmarks[lmIdx];
          if (!lm) continue;

          const px = -(lm.x - 0.5) * scaleXY;
          const py = -(lm.y - 0.5) * scaleXY;
          const pz = -lm.z * scaleZ + 0.02;

          ptArr[i * 3] = THREE.MathUtils.lerp(ptArr[i * 3] ?? px, px, smooth);
          ptArr[i * 3 + 1] = THREE.MathUtils.lerp(ptArr[i * 3 + 1] ?? py, py, smooth);
          ptArr[i * 3 + 2] = THREE.MathUtils.lerp(ptArr[i * 3 + 2] ?? pz, pz, smooth);
        }
        ptAttr.needsUpdate = true;
      }
    }
  });

  const sceneScale = compact ? 0.86 : 0.96;

  return (
    <group scale={sceneScale}>
      <Lighting />
      <PlatinumParticles compact={compact} reducedMotion={reducedMotion} />
      <BiometricHUD
        reducedMotion={reducedMotion}
        isLiveTracking={isLiveTracking}
      />

      {/* Standby Reference Platinum Facial Mesh (wrapped with Drei Float) */}
      <Float
        enabled={!reducedMotion && !isLiveTracking}
        speed={1.3}
        rotationIntensity={0.08}
        floatIntensity={0.22}
      >
        <group ref={standbyGroupRef} scale={0.9} rotation={[0.04, -0.18, 0]}>
          <mesh
            geometry={assets.refSurfaceGeo}
            material={assets.refSurfaceMat}
          />
          <lineSegments geometry={assets.refWireGeo} material={assets.wireMat} />
          <points
            geometry={assets.refPointsGeo}
            material={assets.landmarkShaderMat}
          />
        </group>
      </Float>

      {/* Live Real-Time MediaPipe 478-Point 3D Facial Mesh */}
      <group ref={liveGroupRef} scale={0.9} visible={false}>
        <lineSegments
          geometry={assets.liveLinesGeo}
          material={assets.liveWireMat}
        />
        <points
          geometry={assets.livePointsGeo}
          material={assets.landmarkShaderMat}
        />
      </group>
    </group>
  );
}

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeCompactViewport(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getCompactSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function getServerFalseSnapshot(): boolean {
  return false;
}

export interface FaceMeshSceneProps {
  liveBridgeRef: React.MutableRefObject<LiveMeshBridge>;
  isLiveTracking: boolean;
  className?: string;
}

export default function FaceMeshScene({
  liveBridgeRef,
  isLiveTracking,
  className,
}: FaceMeshSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pointerRef = useRef<PointerVector>({ x: 0, y: 0 });

  const [webglReady, setWebglReady] = useState<boolean>(() =>
    detectWebGLSupport()
  );
  const [contextLost, setContextLost] = useState(false);
  const [inView, setInView] = useState(true);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerFalseSnapshot
  );

  const compact = useSyncExternalStore(
    subscribeCompactViewport,
    getCompactSnapshot,
    getServerFalseSnapshot
  );

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || reducedMotion) return;
    function onPointerMove(event: PointerEvent) {
      pointerRef.current.x = Math.max(
        -1,
        Math.min(1, (event.clientX / window.innerWidth) * 2 - 1)
      );
      pointerRef.current.y = Math.max(
        -1,
        Math.min(1, (event.clientY / window.innerHeight) * 2 - 1)
      );
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [reducedMotion]);

  if (!webglReady || contextLost) {
    return <StaticFaceMeshFallback className={className} />;
  }

  const frameloop = !inView
    ? "never"
    : reducedMotion && !isLiveTracking
    ? "demand"
    : "always";

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative h-full w-full select-none",
        className
      )}
    >
      <Canvas
        dpr={compact ? [1, 1.25] : [1, 1.5]}
        frameloop={frameloop}
        camera={{ position: [0, 0.04, 5.65], fov: 38, near: 0.1, far: 40 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          const canvasEl = gl.domElement;
          const onLost = (event: Event) => {
            event.preventDefault();
            setContextLost(true);
            setWebglReady(false);
          };
          canvasEl.addEventListener("webglcontextlost", onLost, false);
          cleanupRef.current?.();
          cleanupRef.current = () => {
            canvasEl.removeEventListener("webglcontextlost", onLost, false);
          };
        }}
      >
        <FaceMeshRig
          liveBridgeRef={liveBridgeRef}
          pointerRef={pointerRef}
          reducedMotion={reducedMotion}
          compact={compact}
          isLiveTracking={isLiveTracking}
        />
      </Canvas>
    </div>
  );
}
