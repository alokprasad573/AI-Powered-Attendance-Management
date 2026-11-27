"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { MOTION_TIMING, ensureGsapRegistered, gsap, isReducedMotionPreferred } from "@/lib/gsap";

interface RouteTransitionContextValue {
  navigateWithTransition: (href: string) => void;
  isTransitioning: boolean;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  navigateWithTransition: () => undefined,
  isTransitioning: false,
});

function isSafeInternalRoute(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/\\")) {
    return false;
  }
  return true;
}

function RouteListener({
  onRouteSettled,
}: {
  onRouteSettled: (fullPath: string) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const full = query ? `${pathname}?${query}` : pathname;
    onRouteSettled(full);
  }, [pathname, searchParams, onRouteSettled]);

  return null;
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const beamRef = useRef<HTMLDivElement | null>(null);
  const pendingTargetRef = useRef<string | null>(null);
  const navIdRef = useRef(0);
  const safetyTimerRef = useRef<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const lowerCurtain = useCallback((expectedNavId: number) => {
    if (expectedNavId !== navIdRef.current) return;
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    const curtain = curtainRef.current;
    if (!curtain || isReducedMotionPreferred()) {
      if (curtain) {
        gsap.set(curtain, { autoAlpha: 0, clipPath: "inset(0 0 100% 0)" });
      }
      pendingTargetRef.current = null;
      setIsTransitioning(false);
      return;
    }

    gsap.killTweensOf(curtain);
    gsap.to(curtain, {
      clipPath: "inset(0 0 100% 0)",
      autoAlpha: 0,
      duration: MOTION_TIMING.curtain,
      ease: "haziriOut",
      onComplete: () => {
        if (expectedNavId !== navIdRef.current) return;
        pendingTargetRef.current = null;
        setIsTransitioning(false);
        const main = document.getElementById("main-content");
        if (main) {
          if (!main.hasAttribute("tabindex")) {
            main.setAttribute("tabindex", "-1");
          }
          main.focus({ preventScroll: true });
        }
      },
    });
  }, []);

  const handleRouteSettled = useCallback(
    (fullPath: string) => {
      if (!pendingTargetRef.current) return;
      const targetPathname = pendingTargetRef.current.split("?")[0] ?? "/";
      const currentPathname = fullPath.split("?")[0] ?? "/";
      if (
        fullPath === pendingTargetRef.current ||
        currentPathname === targetPathname
      ) {
        lowerCurtain(navIdRef.current);
      }
    },
    [lowerCurtain]
  );

  useEffect(() => {
    const curtainNode = curtainRef.current;
    return () => {
      if (safetyTimerRef.current !== null) {
        window.clearTimeout(safetyTimerRef.current);
      }
      if (curtainNode) {
        gsap.killTweensOf(curtainNode);
      }
    };
  }, []);

  const navigateWithTransition = useCallback(
    (href: string) => {
      if (!isSafeInternalRoute(href)) {
        return;
      }

      const targetPath = href.split("?")[0] ?? "/";
      if (href === pathname || targetPath === pathname) {
        router.push(href);
        return;
      }

      ensureGsapRegistered();
      navIdRef.current += 1;
      const activeNavId = navIdRef.current;

      if (isReducedMotionPreferred() || !curtainRef.current) {
        router.push(href);
        return;
      }

      pendingTargetRef.current = href;
      setIsTransitioning(true);

      if (safetyTimerRef.current !== null) {
        window.clearTimeout(safetyTimerRef.current);
      }
      safetyTimerRef.current = window.setTimeout(() => {
        lowerCurtain(activeNavId);
      }, 1400);

      const curtain = curtainRef.current;
      const beam = beamRef.current;

      gsap.killTweensOf([curtain, beam]);
      gsap.set(curtain, {
        autoAlpha: 1,
        clipPath: "inset(100% 0 0% 0)",
      });
      if (beam) {
        gsap.set(beam, { yPercent: 100, opacity: 0.9 });
        gsap.to(beam, {
          yPercent: -100,
          duration: 0.48,
          ease: "haziriOut",
        });
      }

      gsap.to(curtain, {
        clipPath: "inset(0% 0 0% 0)",
        duration: 0.28,
        ease: "haziriCouture",
        onComplete: () => {
          if (activeNavId !== navIdRef.current) return;
          router.push(href);
        },
      });
    },
    [lowerCurtain, pathname, router]
  );

  return (
    <RouteTransitionContext.Provider
      value={{ navigateWithTransition, isTransitioning }}
    >
      <Suspense fallback={null}>
        <RouteListener onRouteSettled={handleRouteSettled} />
      </Suspense>
      {children}
      <div
        ref={curtainRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[90] opacity-0"
        style={{
          background:
            "linear-gradient(160deg, #060708 0%, #090A0B 52%, #141719 100%)",
          clipPath: "inset(0 0 100% 0)",
        }}
      >
        <div
          ref={beamRef}
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#B9D0D8]/24 via-[#91AAB4]/10 to-transparent"
        />
      </div>
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  return useContext(RouteTransitionContext);
}

interface TransitionLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    LinkProps {
  children: ReactNode;
}

export function TransitionLink({
  href,
  onClick,
  children,
  ...rest
}: TransitionLinkProps) {
  const { navigateWithTransition } = useRouteTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    const hrefStr = typeof href === "string" ? href : href.pathname ?? "";
    if (!isSafeInternalRoute(hrefStr)) {
      return;
    }

    event.preventDefault();
    navigateWithTransition(hrefStr);
  };

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
