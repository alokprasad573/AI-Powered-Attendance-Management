"use client";

import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ScrollTrigger, ensureGsapRegistered, gsap } from "@/lib/gsap";

interface LenisContextValue {
  scrollTo: (target: string | number | HTMLElement) => void;
}

const LenisContext = createContext<LenisContextValue>({
  scrollTo: (target) => {
    if (typeof window === "undefined") return;
    if (typeof target === "number") {
      window.scrollTo({ top: target, behavior: "smooth" });
      return;
    }
    const el =
      typeof target === "string"
        ? (() => {
            try {
              return document.querySelector(target);
            } catch {
              return document.getElementById(target.replace(/^#/, ""));
            }
          })()
        : target;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  },
});

let globalActiveLenisController: Lenis | null = null;

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

function resolveScrollTarget(target: string | HTMLElement): HTMLElement | null {
  if (typeof target !== "string") return target;
  try {
    return document.querySelector<HTMLElement>(target);
  } catch {
    return document.getElementById(target.replace(/^#/, ""));
  }
}

function InnerLenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );

  useEffect(() => {
    ensureGsapRegistered();

    if (reducedMotion) {
      if (globalActiveLenisController) {
        globalActiveLenisController.destroy();
        globalActiveLenisController = null;
      }
      lenisRef.current = null;
      ScrollTrigger.refresh();
      return;
    }

    if (globalActiveLenisController) {
      globalActiveLenisController.destroy();
      globalActiveLenisController = null;
    }

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      prevent: (node) =>
        Boolean(
          node.closest(
            '[role="dialog"], [data-radix-popper-content-wrapper], [data-lenis-prevent]'
          )
        ),
    });

    globalActiveLenisController = lenis;
    lenisRef.current = lenis;

    const handleLenisScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on("scroll", handleLenisScroll);

    const tickerFn = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);

    return () => {
      gsap.ticker.remove(tickerFn);
      lenis.off("scroll", handleLenisScroll);
      lenis.destroy();
      if (globalActiveLenisController === lenis) {
        globalActiveLenisController = null;
      }
      lenisRef.current = null;
    };
  }, [reducedMotion]);

  const scrollTo = useCallback(
    (target: string | number | HTMLElement) => {
      if (typeof window === "undefined") return;

      const focusTarget = (el: HTMLElement | null) => {
        if (!el) return;
        const hadTabIndex = el.hasAttribute("tabindex");
        if (!hadTabIndex) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      };

      if (reducedMotion || !lenisRef.current) {
        if (typeof target === "number") {
          window.scrollTo({ top: target, behavior: "auto" });
        } else {
          const el = resolveScrollTarget(target);
          el?.scrollIntoView({ behavior: "auto", block: "start" });
          focusTarget(el);
        }
        return;
      }

      if (typeof target === "number") {
        lenisRef.current.scrollTo(target, { offset: -72 });
        return;
      }

      const el = resolveScrollTarget(target);
      if (!el) return;
      lenisRef.current.scrollTo(el, {
        offset: -76,
        onComplete: () => {
          focusTarget(el);
        },
      });
    },
    [reducedMotion]
  );

  return (
    <LenisContext.Provider value={{ scrollTo }}>
      {children}
    </LenisContext.Provider>
  );
}

export function LenisProvider({ children }: { children: ReactNode }) {
  return <InnerLenisProvider>{children}</InnerLenisProvider>;
}

export function useLenisScroll() {
  return useContext(LenisContext);
}
