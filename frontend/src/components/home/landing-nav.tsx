"use client";

import { useLenisScroll } from "@/components/motion/lenis-provider";

const NAV_ANCHORS = [
  { id: "#biometric-stage", label: "Live Preview" },
  { id: "#pipeline", label: "How It Works" },
  { id: "#portals", label: "Get Started" },
  { id: "#architecture", label: "Privacy" },
] as const;

export function LandingNav() {
  const { scrollTo } = useLenisScroll();

  return (
    <ul className="flex items-center gap-1">
      {NAV_ANCHORS.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => scrollTo(item.id)}
            className="cursor-pointer rounded-[8px] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:bg-[#22272A]/70 hover:text-[var(--text-primary)]"
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
