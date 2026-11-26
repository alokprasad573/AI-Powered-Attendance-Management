import { Canvas } from "@/components/layout/canvas";

export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[var(--bg-primary)]"
    >
      {/* Layer 0: Shader Caustics & Refracted Glass Light Beams (WebGL2 GLSL) */}
      <Canvas />

      {/* Subtle Optical Glass Micro-Grain */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.024] mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="haziri-atmosphere-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#haziri-atmosphere-grain)" />
      </svg>
    </div>
  );
}
