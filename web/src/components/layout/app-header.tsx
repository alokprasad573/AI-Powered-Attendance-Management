"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { TransitionLink } from "@/components/motion/route-transition-provider";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  subtitle?: string;
  centerSlot?: ReactNode;
  rightSlot?: ReactNode;
  homeHref?: string;
}

export function AppHeader({
  subtitle,
  centerSlot,
  rightSlot,
  homeHref = "/",
}: AppHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 18);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-[16px] border px-3.5 py-2.5 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 sm:gap-4 sm:px-5 sm:py-3",
          scrolled
            ? "border-[var(--border-default)] bg-[#090A0B]/88 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(185,208,216,0.16)]"
            : "border-[var(--border-hairline)] bg-[#090A0B]/62 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(245,246,246,0.08)]"
        )}
      >
        <TransitionLink
          href={homeHref}
          className="group flex shrink-0 items-center gap-2.5 rounded-[10px] focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] sm:gap-3"
        >
          <div className="relative h-9 w-9 overflow-hidden rounded-[10px] border border-[#B9D0D8]/28 bg-[var(--bg-secondary)] shadow-[inset_0_1px_0_rgba(245,246,246,0.16)] transition-[border-color,transform] duration-200 group-hover:scale-[1.03] group-hover:border-[#B9D0D8]/55 sm:h-10 sm:w-10">
            <Image
              src="/brand/haziri-mark.svg"
              alt="Haziri.AI emblem"
              width={40}
              height={40}
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-base font-semibold leading-none tracking-tight text-[var(--text-primary)] sm:text-xl">
              Haziri.AI
            </span>
            {subtitle ? (
              <span className="telemetry-num mt-0.5 hidden text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)] sm:block">
                {subtitle}
              </span>
            ) : null}
          </div>
        </TransitionLink>

        {centerSlot ? (
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {centerSlot}
          </nav>
        ) : null}

        {rightSlot ? (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </header>
  );
}
