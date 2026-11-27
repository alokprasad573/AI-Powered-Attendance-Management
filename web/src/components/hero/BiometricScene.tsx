"use client";

import dynamic from "next/dynamic";
import type { FaceMeshSceneProps } from "@/components/three/FaceMeshScene";
import { StaticFaceMeshFallback } from "@/components/three/StaticFaceMeshFallback";

const DynamicFaceMeshScene = dynamic(
  () => import("@/components/three/FaceMeshScene"),
  {
    ssr: false,
    loading: () => <StaticFaceMeshFallback />,
  }
);

export function BiometricScene({
  liveBridgeRef,
  isLiveTracking,
  className,
}: FaceMeshSceneProps) {
  return (
    <DynamicFaceMeshScene
      liveBridgeRef={liveBridgeRef}
      isLiveTracking={isLiveTracking}
      className={className}
    />
  );
}
