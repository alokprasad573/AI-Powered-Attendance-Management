"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { LiveFaceScanner } from "@/components/biometric/LiveFaceScanner";
import type { LiveMeshBridge } from "@/components/biometric/types";
import { Badge } from "@/components/ui/badge";
import { bentoCardVariants } from "@/lib/motion";
import { BiometricScene } from "./BiometricScene";

export function HeroSection() {
  const liveBridgeRef = useRef<LiveMeshBridge>({
    landmarks: null,
    faces: [],
    active: false,
  });
  const [isLiveTracking, setIsLiveTracking] = useState(false);

  return (
    <motion.section
      variants={bentoCardVariants}
      className="spatial-glass relative overflow-hidden rounded-[24px] p-6 sm:p-8 lg:p-10"
    >
      {/* Top Platinum Specular Edge */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#B9D0D8]/55 to-transparent"
      />

      {/* Swiss Editorial Header Row */}
      <div className="flex flex-col gap-6 pb-8 lg:flex-row lg:items-end lg:justify-between">

        <div className="max-w-2xl space-y-3.5">
          <h1 className="font-display text-3xl font-semibold leading-[1.08] tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Smarter Classrooms.<br /><span className="text-[var(--accent-primary)]">Sharper Recognition.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            Manage subjects, onboard students through QR invitations,
            build multi-photo facial rosters, automate attendance
            with AI-powered face recognition, and maintain
            transparent records with privacy-first processing.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
          <div className="glass-row rounded-[14px] px-4 py-2.5">
            <p className="font-display text-base font-semibold text-[var(--text-primary)] sm:text-lg">
              AI-powered
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Multi-photo face recognition
            </p>
          </div>
          <div className="glass-row rounded-[14px] px-4 py-3.5">
            <p className="font-display text-base font-semibold text-[var(--text-primary)] sm:text-lg">
              Privacy-First
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              In-memory photo processing
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side 3D Platinum Facial Landmark Mesh + Live Biometric Face Scanner */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left: 3D Metallic Platinum Facial Landmark Mesh */}
        <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[#060708]/92 sm:min-h-[380px] lg:col-span-6 lg:min-h-[460px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 48%, rgba(185, 208, 216, 0.11) 0%, rgba(145, 170, 180, 0.04) 44%, rgba(6, 7, 8, 0) 74%)",
            }}
          />

          {/* Honest Mode Indicator — clearly distinguishes standby reference vs live 478-pt feed */}
          <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-3.5">
            <Badge variant={isLiveTracking ? "present" : "neutral"}>
              {isLiveTracking
                ? "Real-Time 478-Point 3D Face Tracking"
                : "Standby Reference Mesh"}
            </Badge>
            <span className="telemetry-num text-[11px] text-[var(--text-secondary)]">
              3D TOPOLOGY
            </span>
          </div>

          <div className="relative min-h-[260px] flex-1 sm:min-h-[340px] lg:min-h-[440px]">
            <BiometricScene
              liveBridgeRef={liveBridgeRef}
              isLiveTracking={isLiveTracking}
              className="absolute inset-0 h-full w-full"
            />
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-[var(--border-hairline)] bg-[#090A0B]/70 px-4 py-2.5 text-[11px] text-[var(--text-secondary)] backdrop-blur-sm">
            <span>
  {isLiveTracking
    ? "Tracking your face and eye movements in real time"
    : "Start camera to begin live face and eye tracking"}
</span>

            <span className="telemetry-num hidden text-[var(--accent-highlight)] sm:inline">
              {isLiveTracking ? "Tracking Engine : Mediapipe" : "AWAITING STREAM"}
            </span>
          </div>
        </div>

        {/* Right: Live Biometric Face Scanner */}
        <div className="lg:col-span-6">
          <LiveFaceScanner
            liveBridgeRef={liveBridgeRef}
            onLiveTrackingChange={setIsLiveTracking}
          />
        </div>
      </div>
    </motion.section>
  );
}
