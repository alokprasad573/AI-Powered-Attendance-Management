"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface PlatinumParticlesProps {
  compact: boolean;
  reducedMotion: boolean;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WAVE_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aPhase;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec3 pos = position;
    float wave = sin(pos.x * 1.15 + uTime * 0.55 + aPhase) * 0.14
               + cos(pos.y * 0.9 + uTime * 0.42 + aPhase) * 0.08;
    pos.y += wave;
    pos.z += sin(pos.x * 0.8 + uTime * 0.35) * 0.1;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aScale * uPixelRatio * (26.0 / max(-mvPosition.z, 1.0));
    vAlpha = 0.24 + 0.32 * (0.5 + 0.5 * sin(uTime * 0.75 + aPhase));
  }
`;

const WAVE_FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float soft = smoothstep(0.5, 0.08, dist);
    gl_FragColor = vec4(vColor, soft * vAlpha);
  }
`;

export function PlatinumParticles({
  compact,
  reducedMotion,
}: PlatinumParticlesProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const elapsedRef = useRef(0);
  const count = compact ? 54 : 112;

  const { geometry, material } = useMemo(() => {
    const rand = createSeededRandom(20260511);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);

    const platinum = new THREE.Color("#B9D0D8");
    const silverBlue = new THREE.Color("#91AAB4");
    const paleGold = new THREE.Color("#CDBF9D");

    for (let i = 0; i < count; i += 1) {
      const col = i % 16;
      const row = Math.floor(i / 16);
      const x = (col / 15 - 0.5) * 6.4 + (rand() - 0.5) * 0.45;
      const y = (row / Math.max(1, Math.ceil(count / 16) - 1) - 0.5) * 3.8 + (rand() - 0.5) * 0.4;
      const z = -1.1 - rand() * 1.6;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const pick =
        i % 9 === 0 ? paleGold : i % 3 === 0 ? silverBlue : platinum;
      colors[i * 3] = pick.r;
      colors[i * 3 + 1] = pick.g;
      colors[i * 3 + 2] = pick.b;

      scales[i] = 0.65 + rand() * 0.95;
      phases[i] = rand() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const pixelRatio =
      typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;

    const mat = new THREE.ShaderMaterial({
      vertexShader: WAVE_VERTEX_SHADER,
      fragmentShader: WAVE_FRAGMENT_SHADER,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
    });

    return { geometry: geo, material: mat };
  }, [count]);

  useEffect(() => {
    materialRef.current = material;
    return () => {
      geometry.dispose();
      material.dispose();
      materialRef.current = null;
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (reducedMotion || !materialRef.current) return;
    elapsedRef.current += Math.min(delta, 0.05);
    const uniform = materialRef.current.uniforms.uTime;
    if (uniform) {
      uniform.value = elapsedRef.current;
    }
  });

  return <points geometry={geometry} material={material} />;
}
