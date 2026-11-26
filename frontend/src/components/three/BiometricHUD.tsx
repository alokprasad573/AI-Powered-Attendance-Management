"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface BiometricHUDProps {
  reducedMotion: boolean;
  isLiveTracking: boolean;
}

/**
 * Circular metallic Platinum & Silver Blue biometric calibration rings
 * and precision degree ticks surrounding the 3D facial landmark mesh.
 */
export function BiometricHUD({
  reducedMotion,
  isLiveTracking,
}: BiometricHUDProps) {
  const outerTicksRef = useRef<THREE.LineSegments | null>(null);
  const innerRingRef = useRef<THREE.Group | null>(null);

  const assets = useMemo(() => {
    const outerRingGeo = new THREE.TorusGeometry(1.836, 0.006, 12, 128);
    const innerRingGeo = new THREE.TorusGeometry(1.566, 0.0045, 10, 96);
    const notchGeo = new THREE.BoxGeometry(0.09, 0.018, 0.014);

    // 72 radial precision calibration ticks around r = 1.881..1.998 (10% reduced radius)
    const tickPositions: number[] = [];
    const totalTicks = 72;
    for (let i = 0; i < totalTicks; i += 1) {
      const angle = (i / totalTicks) * Math.PI * 2;
      const isMajor = i % 9 === 0;
      const rInner = 1.881;
      const rOuter = isMajor ? 1.998 : 1.935;
      tickPositions.push(
        Math.cos(angle) * rInner,
        Math.sin(angle) * rInner,
        0,
        Math.cos(angle) * rOuter,
        Math.sin(angle) * rOuter,
        0
      );
    }
    const ticksGeo = new THREE.BufferGeometry();
    ticksGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(tickPositions, 3)
    );

    const outerRingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#91AAB4"),
      metalness: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0.38,
    });

    const innerRingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#B9D0D8"),
      metalness: 0.65,
      roughness: 0.25,
      transparent: true,
      opacity: 0.26,
    });

    const ticksMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#B9D0D8"),
      transparent: true,
      opacity: 0.42,
    });

    const goldNotchMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#CDBF9D"),
      emissive: new THREE.Color("#CDBF9D"),
      emissiveIntensity: 0.45,
      metalness: 0.5,
      roughness: 0.25,
    });

    return {
      outerRingGeo,
      innerRingGeo,
      notchGeo,
      ticksGeo,
      outerRingMat,
      innerRingMat,
      ticksMat,
      goldNotchMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      assets.outerRingGeo.dispose();
      assets.innerRingGeo.dispose();
      assets.notchGeo.dispose();
      assets.ticksGeo.dispose();
      assets.outerRingMat.dispose();
      assets.innerRingMat.dispose();
      assets.ticksMat.dispose();
      assets.goldNotchMat.dispose();
    };
  }, [assets]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.05);
    const speed = isLiveTracking ? 0.14 : 0.06;

    if (outerTicksRef.current) {
      outerTicksRef.current.rotation.z += dt * speed;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= dt * speed * 1.4;
    }
  });

  return (
    <group position={[0, 0, -0.45]}>
      <mesh geometry={assets.outerRingGeo} material={assets.outerRingMat} />
      <lineSegments
        ref={outerTicksRef}
        geometry={assets.ticksGeo}
        material={assets.ticksMat}
      />

      <group ref={innerRingRef}>
        <mesh geometry={assets.innerRingGeo} material={assets.innerRingMat} />
        <mesh
          position={[1.566, 0, 0.01]}
          geometry={assets.notchGeo}
          material={assets.goldNotchMat}
        />
        <mesh
          position={[-1.566, 0, 0.01]}
          geometry={assets.notchGeo}
          material={assets.goldNotchMat}
        />
      </group>
    </group>
  );
}
