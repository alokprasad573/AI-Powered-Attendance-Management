"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { gsap } from "@/lib/gsap";

interface MotionPauseContextValue {
  isPaused: boolean;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  registerDecorativeTween: (
    tween: gsap.core.Tween | gsap.core.Timeline
  ) => () => void;
}

const MotionPauseContext = createContext<MotionPauseContextValue>({
  isPaused: false,
  togglePause: () => undefined,
  setPaused: () => undefined,
  registerDecorativeTween: () => () => undefined,
});

export function MotionPauseProvider({ children }: { children: ReactNode }) {
  const [isPaused, setIsPaused] = useState(false);
  const tweensRef = useRef<Set<gsap.core.Tween | gsap.core.Timeline>>(new Set());

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const setPaused = useCallback((paused: boolean) => {
    setIsPaused(paused);
  }, []);

  useEffect(() => {
    tweensRef.current.forEach((tween) => {
      if (isPaused) {
        tween.pause();
      } else {
        tween.play();
      }
    });

    if (typeof document !== "undefined") {
      document.documentElement.dataset.motionPaused = isPaused ? "true" : "false";
    }
  }, [isPaused]);

  const registerDecorativeTween = useCallback(
    (tween: gsap.core.Tween | gsap.core.Timeline) => {
      tweensRef.current.add(tween);
      if (isPaused) {
        tween.pause();
      }
      return () => {
        tweensRef.current.delete(tween);
      };
    },
    [isPaused]
  );

  return (
    <MotionPauseContext.Provider
      value={{
        isPaused,
        togglePause,
        setPaused,
        registerDecorativeTween,
      }}
    >
      {children}
    </MotionPauseContext.Provider>
  );
}

export function useDecorativeMotionPause() {
  return useContext(MotionPauseContext);
}
