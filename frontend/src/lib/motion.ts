import type { Transition, Variants } from "framer-motion";

export const ARCHITECTURAL_EASE = [0.22, 1, 0.36, 1] as const;

export const BIOMETRIC_EASE = ARCHITECTURAL_EASE;

export const SPATIAL_SPRING: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 28,
  mass: 0.95,
};

export const HUD_LOCK_SPRING: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 30,
};

export const PAGE_TRANSITION: Transition = {
  duration: 0.28,
  ease: ARCHITECTURAL_EASE,
};

export const TACTILE_TAP = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.985 },
} as const;

export const bentoContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.03,
    },
  },
};

export const bentoCardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.26,
      ease: ARCHITECTURAL_EASE,
    },
  },
};

export const hudReticleVariants: Variants = {
  idle: { scale: 1.03, opacity: 0.7 },
  scanning: {
    scale: [1.01, 0.985, 1.01],
    opacity: 1,
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  },
  verified: {
    scale: 0.96,
    opacity: 1,
    transition: HUD_LOCK_SPRING,
  },
};

export const attendanceRowVariants: Variants = {
  initial: {
    opacity: 0,
    x: -10,
    backgroundColor: "rgba(185, 208, 216, 0.14)",
  },
  animate: {
    opacity: 1,
    x: 0,
    backgroundColor: "rgba(34, 39, 42, 0.48)",
    transition: { duration: 0.28, ease: ARCHITECTURAL_EASE },
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: { duration: 0.18, ease: ARCHITECTURAL_EASE },
  },
};
