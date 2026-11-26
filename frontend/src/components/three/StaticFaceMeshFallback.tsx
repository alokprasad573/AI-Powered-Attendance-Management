import { cn } from "@/lib/utils";

interface StaticFaceMeshFallbackProps {
  className?: string;
}

/**
 * Monochrome Platinum static fallback rendered during SSR, dynamic load,
 * or on low-powered / WebGL-unavailable devices.
 */
export function StaticFaceMeshFallback({
  className,
}: StaticFaceMeshFallbackProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative flex h-full w-full items-center justify-center overflow-hidden select-none",
        className
      )}
    >
      <div
        className="absolute h-[82%] w-[82%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, rgba(185, 208, 216, 0.12) 0%, rgba(145, 170, 180, 0.04) 48%, rgba(9, 10, 11, 0) 74%)",
        }}
      />

      <svg
        viewBox="0 0 360 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 h-full w-full max-w-[330px] opacity-90"
      >
        <circle
          cx="180"
          cy="180"
          r="128"
          stroke="#91AAB4"
          strokeOpacity="0.24"
          strokeWidth="1"
          strokeDasharray="3 7"
        />
        <circle
          cx="180"
          cy="180"
          r="108"
          stroke="#B9D0D8"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        <g transform="translate(180 180) scale(0.9) translate(-180 -180)">
          <path
            d="M180 64C228 64 256 100 256 156C256 208 234 254 204 280C194 289 187 293 180 293C173 293 166 289 156 280C126 254 104 208 104 156C104 100 132 64 180 64Z"
            fill="#141719"
            fillOpacity="0.55"
            stroke="#B9D0D8"
            strokeOpacity="0.55"
            strokeWidth="1.3"
          />
          <path
            d="M180 64V293M124 146L154 154L180 148L206 154L236 146M114 190L148 200L180 194L212 200L246 190M132 238L162 246L180 242L198 246L228 238"
            stroke="#91AAB4"
            strokeOpacity="0.34"
            strokeWidth="0.95"
          />
          <path
            d="M144 162L180 148L216 162L180 198L144 162ZM144 162L134 204L180 238L226 204L216 162M158 238L180 276L202 238"
            stroke="#B9D0D8"
            strokeOpacity="0.48"
            strokeWidth="1.05"
          />
          <circle cx="144" cy="162" r="3.2" fill="#B9D0D8" />
          <circle cx="216" cy="162" r="3.2" fill="#B9D0D8" />
          <circle cx="180" cy="148" r="2.6" fill="#F5F6F6" />
          <circle cx="180" cy="198" r="3" fill="#B9D0D8" />
          <circle cx="158" cy="238" r="2.6" fill="#CDBF9D" />
          <circle cx="202" cy="238" r="2.6" fill="#CDBF9D" />
          <circle cx="180" cy="276" r="3" fill="#CDBF9D" />
        </g>
      </svg>
    </div>
  );
}
